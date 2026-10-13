/**
 * Conecta2 - Módulo de Videollamada (WebRTC + Socket.io)
 * Maneja la captura de medios, señalización en tiempo real y conexión P2P.
 */

const WebRTCManager = (() => {
    let socket = null;
    let localStream = null;
    let peerConnection = null;
    let currentRoom = null;
    let currentPeerInfo = null;

    let remoteDescriptionReady = false;
    let pendingIceCandidates = [];
    let signalQueue = Promise.resolve();

    let callbacks = {
        onLocalStream: null,
        onRemoteStream: null,
        onStatus: null,
        onMatched: null,
        onPeerLeft: null
    };

    function setCallbacks(cb) {
        callbacks = { ...callbacks, ...cb };
    }

    function reportStatus(msg) {
        if (callbacks.onStatus) callbacks.onStatus(msg);
    }

    /**
     * Inicia la captura de cámara y micrófono local.
     */
    async function setupLocalMedia() {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Tu navegador no permite acceso a cámara y micrófono. Usa un navegador moderno.');
        }

        if (localStream) return localStream;

        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: true
            });

            if (callbacks.onLocalStream) {
                callbacks.onLocalStream(localStream);
            }
            return localStream;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Debes permitir el acceso a la cámara y al micrófono para iniciar la videollamada.');
            }
            throw new Error('No se pudo acceder a los dispositivos de vídeo o audio: ' + error.message);
        }
    }

    /**
     * Inicializa la conexión de Socket.io y entra a la sala de llamadas.
     */
    async function startCall({ user_id, nombre, interests }) {
        await setupLocalMedia();

        if (!socket) {
            socket = io({
                transports: ['websocket', 'polling']
            });

            socket.on('connect', () => {
                reportStatus('Conectado al servidor de llamadas.');
            });

            socket.on('waiting', (data) => {
                reportStatus(data.message || 'Buscando a otra persona para conectar…');
            });

            socket.on('matched', async (data) => {
                currentRoom = data.room;
                currentPeerInfo = {
                    id: data.peer_id,
                    nombre: data.peer_nombre,
                    affinity: data.affinity_score
                };

                reportStatus(`Conectando con ${data.peer_nombre}…`);
                if (callbacks.onMatched) callbacks.onMatched(currentPeerInfo);

                await createPeerConnection();

                if (data.initiator) {
                    try {
                        const offer = await peerConnection.createOffer();
                        await peerConnection.setLocalDescription(offer);
                        socket.emit('signal', {
                            room: currentRoom,
                            signal: { kind: 'description', description: peerConnection.localDescription }
                        });
                    } catch (e) {
                        reportStatus('Error al iniciar llamada: ' + e.message);
                    }
                }
            });

            socket.on('signal', (signal) => {
                signalQueue = signalQueue
                    .then(() => handlePeerSignal(signal))
                    .catch((err) => reportStatus('Error de señalización: ' + err.message));
            });

            socket.on('peer_left', (data) => {
                closePeerConnection();
                reportStatus(data.message || 'Tu interlocutor ha abandonado la llamada.');
                if (callbacks.onPeerLeft) callbacks.onPeerLeft(currentPeerInfo);
            });
        }

        // Unirse a la cola de llamadas
        reportStatus('Buscando a una persona compatible…');
        socket.emit('join_call', { user_id, nombre, interests });
    }

    /**
     * Crea y configura la conexión RTCPeerConnection.
     */
    async function createPeerConnection() {
        closePeerConnection();

        // Configuración ICE (servidor local y STUN público de Google para redes diversas)
        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ];

        peerConnection = new RTCPeerConnection({ iceServers });
        remoteDescriptionReady = false;
        pendingIceCandidates = [];

        // Añadir pistas de vídeo y audio locales
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStream);
            });
        }

        peerConnection.onicecandidate = (event) => {
            if (event.candidate && currentRoom) {
                socket.emit('signal', {
                    room: currentRoom,
                    signal: { kind: 'candidate', candidate: event.candidate.toJSON() }
                });
            }
        };

        peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                if (callbacks.onRemoteStream) {
                    callbacks.onRemoteStream(event.streams[0]);
                }
            }
        };

        peerConnection.onconnectionstatechange = () => {
            if (peerConnection?.connectionState === 'connected') {
                reportStatus(`Conectado. Hablando con ${currentPeerInfo?.nombre || 'tu interlocutor'}.`);
            } else if (peerConnection?.connectionState === 'failed') {
                reportStatus('Se perdió la conexión. Pulsa Siguiente para reconectar.');
            }
        };
    }

    /**
     * Procesa las señales recibidas del peer (SDP Offer/Answer o candidatos ICE).
     */
    async function handlePeerSignal(signal) {
        if (!peerConnection) await createPeerConnection();

        if (signal.kind === 'description') {
            await peerConnection.setRemoteDescription(signal.description);
            remoteDescriptionReady = true;

            // Procesar candidatos acumulados
            for (const candidate of pendingIceCandidates) {
                await peerConnection.addIceCandidate(candidate);
            }
            pendingIceCandidates = [];

            if (signal.description.type === 'offer') {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('signal', {
                    room: currentRoom,
                    signal: { kind: 'description', description: peerConnection.localDescription }
                });
            }
        } else if (signal.kind === 'candidate' && signal.candidate) {
            const candidate = new RTCIceCandidate(signal.candidate);
            if (remoteDescriptionReady) {
                await peerConnection.addIceCandidate(candidate);
            } else {
                pendingIceCandidates.push(candidate);
            }
        }
    }

    /**
     * RF4: Pasa al siguiente peer sin salir de la videollamada.
     */
    function nextPeer({ user_id, nombre, interests }) {
        closePeerConnection();
        if (socket) {
            socket.emit('next_peer', { user_id, nombre, interests });
        }
    }

    /**
     * RF3: Cuelga la videollamada.
     */
    function hangup() {
        if (socket) {
            socket.emit('hangup', {});
        }
        closePeerConnection();
    }

    function closePeerConnection() {
        if (peerConnection) {
            peerConnection.onicecandidate = null;
            peerConnection.ontrack = null;
            peerConnection.onconnectionstatechange = null;
            peerConnection.close();
            peerConnection = null;
        }
        remoteDescriptionReady = false;
        pendingIceCandidates = [];
    }

    function stopMedia() {
        closePeerConnection();
        if (localStream) {
            localStream.getTracks().forEach((t) => t.stop());
            localStream = null;
        }
    }

    return {
        setCallbacks,
        setupLocalMedia,
        startCall,
        nextPeer,
        hangup,
        stopMedia,
        get currentPeer() { return currentPeerInfo; }
    };
})();
