window.conectaMas = (() => {
    let cameraStream = null;
    let recognition = null;
    let socket = null;
    let peerConnection = null;
    let callDotNet = null;
    let localVideo = null;
    let remoteVideo = null;
    let remotePlaceholder = null;
    let activeCall = false;
    let remoteDescriptionReady = false;
    let pendingIceCandidates = [];
    let incomingMessages = Promise.resolve();

    function reportCallStatus(message) {
        if (callDotNet) callDotNet.invokeMethodAsync("OnCallStatus", message).catch(() => {});
    }

    async function startPeerCall(localElement, remoteElement, placeholderElement, dotNet) {
        await endPeerCall();
        localVideo = localElement;
        remoteVideo = remoteElement;
        remotePlaceholder = placeholderElement;
        callDotNet = dotNet;

        if (!navigator.mediaDevices?.getUserMedia) {
            reportCallStatus("Este navegador no permite acceder a la cámara y al micrófono en esta dirección.");
            return;
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: true
            });
            localVideo.srcObject = cameraStream;
            await localVideo.play();
        } catch (error) {
            reportCallStatus(error?.name === "NotAllowedError"
                ? "Permite el acceso a la cámara y al micrófono para iniciar la llamada."
                : "No se pudo abrir la cámara o el micrófono. Comprueba que estén disponibles.");
            stopMedia();
            return;
        }

        activeCall = true;
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        try {
            socket = new WebSocket(`${protocol}//${location.host}/call-signal`);
        } catch (error) {
            reportCallStatus("No se pudo conectar con el servidor de llamadas local.");
            await endPeerCall();
            return;
        }

        socket.onopen = () => {
            if (!activeCall) return;
            sendMessage({ type: "join" });
            reportCallStatus("Buscando a otra persona en este localhost…");
        };
        socket.onmessage = event => {
            incomingMessages = incomingMessages
                .then(() => handleServerMessage(JSON.parse(event.data)))
                .catch(error => reportCallStatus(`Error de conexión: ${error.message}`));
        };
        socket.onerror = () => reportCallStatus("No se pudo conectar con el servidor de llamadas local.");
        socket.onclose = () => {
            if (!activeCall) return;
            activeCall = false;
            closePeerConnection();
            stopMedia();
            reportCallStatus("Se cerró la conexión con el servidor. Finaliza la llamada para volver al inicio.");
        };
    }

    function sendMessage(message) {
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    }

    async function handleServerMessage(message) {
        if (!activeCall) return;

        if (message.type === "waiting") {
            reportCallStatus("Esperando a otra persona. Abre localhost en otra pestaña y pulsa Iniciar llamada.");
        } else if (message.type === "matched") {
            await createPeerConnection();
            reportCallStatus("Conectando la videollamada…");
            if (message.initiator) {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                sendMessage({ type: "signal", signal: { kind: "description", description: peerConnection.localDescription } });
            }
        } else if (message.type === "peer-left") {
            closePeerConnection();
            showRemotePlaceholder(true);
            reportCallStatus("La otra persona salió de la llamada. Pulsa Siguiente para buscar de nuevo.");
        } else if (message.type === "signal") {
            await handlePeerSignal(message.signal);
        }
    }

    async function createPeerConnection() {
        if (peerConnection) return;
        // Sin servidores externos: las dos pestañas en localhost conectan directamente.
        peerConnection = new RTCPeerConnection({ iceServers: [] });
        remoteDescriptionReady = false;
        pendingIceCandidates = [];

        cameraStream.getTracks().forEach(track => peerConnection.addTrack(track, cameraStream));
        peerConnection.onicecandidate = event => {
            if (event.candidate) sendMessage({ type: "signal", signal: { kind: "candidate", candidate: event.candidate.toJSON() } });
        };
        peerConnection.ontrack = async event => {
            remoteVideo.srcObject = event.streams[0];
            showRemotePlaceholder(false);
            try { await remoteVideo.play(); }
            catch { reportCallStatus("Conexión establecida. Pulsa el vídeo para activar el sonido."); }
        };
        peerConnection.onconnectionstatechange = () => {
            if (peerConnection?.connectionState === "connected") reportCallStatus("Conectados. Ya podéis hablar.");
            if (peerConnection?.connectionState === "failed") reportCallStatus("No se pudo establecer la llamada. Pulsa Siguiente para intentarlo otra vez.");
        };
    }

    async function handlePeerSignal(signal) {
        if (!peerConnection) await createPeerConnection();

        if (signal.kind === "description") {
            await peerConnection.setRemoteDescription(signal.description);
            remoteDescriptionReady = true;
            for (const candidate of pendingIceCandidates) await peerConnection.addIceCandidate(candidate);
            pendingIceCandidates = [];

            if (signal.description.type === "offer") {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                sendMessage({ type: "signal", signal: { kind: "description", description: peerConnection.localDescription } });
            }
        } else if (signal.kind === "candidate" && signal.candidate) {
            const candidate = new RTCIceCandidate(signal.candidate);
            if (remoteDescriptionReady) await peerConnection.addIceCandidate(candidate);
            else pendingIceCandidates.push(candidate);
        }
    }

    function showRemotePlaceholder(show) {
        if (remotePlaceholder) remotePlaceholder.hidden = !show;
        if (remoteVideo) {
            if (show) {
                remoteVideo.classList.remove("connected");
                remoteVideo.srcObject = null;
            } else {
                remoteVideo.classList.add("connected");
            }
        }
    }

    function closePeerConnection() {
        if (!peerConnection) return;
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
        peerConnection = null;
        remoteDescriptionReady = false;
        pendingIceCandidates = [];
        showRemotePlaceholder(true);
    }

    function stopMedia() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
    }

    function nextPeer() {
        if (!activeCall || socket?.readyState !== WebSocket.OPEN) return;
        closePeerConnection();
        reportCallStatus("Buscando a otra persona…");
        sendMessage({ type: "next" });
    }

    async function endPeerCall() {
        activeCall = false;
        if (socket) {
            const currentSocket = socket;
            socket = null;
            currentSocket.onclose = null;
            currentSocket.onmessage = null;
            if (currentSocket.readyState === WebSocket.OPEN) {
                currentSocket.send(JSON.stringify({ type: "leave" }));
                currentSocket.close();
            } else if (currentSocket.readyState === WebSocket.CONNECTING) {
                currentSocket.close();
            }
        }
        closePeerConnection();
        stopMedia();
        callDotNet = null;
        localVideo = null;
        remoteVideo = null;
        remotePlaceholder = null;
    }

    function stopVoiceRecognition() {
        if (!recognition) return;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
        recognition = null;
    }

    function startVoiceRecognition(dotNet, purpose) {
        stopVoiceRecognition();
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return false;

        recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = event => {
            const transcript = event.results?.[0]?.[0]?.transcript?.trim();
            if (transcript) dotNet.invokeMethodAsync("OnVoiceResult", transcript, purpose);
        };
        recognition.onerror = event => {
            const message = event.error === "not-allowed"
                ? "Activa el permiso del micrófono en el navegador e inténtalo de nuevo."
                : "No se pudo reconocer la voz. Pulsa el botón para intentarlo otra vez.";
            dotNet.invokeMethodAsync("OnVoiceError", message);
            recognition = null;
        };
        recognition.onend = () => { recognition = null; };

        try {
            recognition.start();
            return true;
        } catch (error) {
            recognition = null;
            return false;
        }
    }

    return { startPeerCall, nextPeer, endPeerCall, startVoiceRecognition, stopVoiceRecognition };
})();
