/**
 * Conecta2 - Lógica Principal de la Aplicación
 * Conecta la UI, la API REST, la Web Speech API, WebRTC y el Asistente Virtual.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Lista de sugerencias populares para aficiones
    const POPULAR_SUGGESTIONS = [
        'jardinería', 'paseos', 'música', 'cocina', 'tejer',
        'lectura', 'naturaleza', 'animales', 'cine', 'dominó',
        'pintura', 'radio', 'viajes', 'manualidades'
    ];

    // Estado del usuario activo
    let currentUser = {
        id: null,
        nombre: 'Amigo/a',
        interests: ['paseos', 'música', 'jardinería']
    };

    let lastSpokenCandidate = null;

    // Elementos de pantalla
    const screens = {
        login: document.getElementById('screen-login'),
        onboarding: document.getElementById('screen-onboarding'),
        dashboard: document.getElementById('screen-dashboard'),
        matching: document.getElementById('screen-matching'),
        call: document.getElementById('screen-call'),
        summary: document.getElementById('screen-summary'),
        contacts: document.getElementById('screen-contacts'),
        interests: document.getElementById('screen-interests')
    };

    function showScreen(screenKey) {
        Object.entries(screens).forEach(([key, element]) => {
            if (element) {
                if (key === screenKey) {
                    element.classList.add('active');
                } else {
                    element.classList.remove('active');
                }
            }
        });

        // Al cambiar de pantalla, detener escuchas de voz activas
        VoiceManager.stopListening();
    }

    function persistSession() {
        try {
            localStorage.setItem('conecta2_current_user', JSON.stringify(currentUser));
        } catch (e) {}
    }

    function updateDashboardGreeting() {
        const greeting = document.getElementById('user-greeting');
        if (greeting) greeting.textContent = `Hola, ${currentUser.nombre}`;
        const inputNombre = document.getElementById('input-nombre');
        if (inputNombre) inputNombre.value = currentUser.nombre;
        renderDetectedTags(currentUser.interests);
    }

    // ========================================================
    // 0. PANTALLA: INICIO DE SESIÓN ACCESIBLE (T00, OP. 1 Y 3)
    // ========================================================
    let selectedLoginUser = null;
    let enteredPin = '';

    const loginUsersSection = document.getElementById('login-users-section');
    const loginUsersGrid = document.getElementById('login-users-grid');
    const loginPinSection = document.getElementById('login-pin-section');
    const loginSelectedName = document.getElementById('login-selected-name');
    const pinDots = document.querySelectorAll('#login-pin-dots .pin-dot');
    const pinLoginError = document.getElementById('pin-login-error');
    const btnBackToUsers = document.getElementById('btn-back-to-users');
    const btnGotoOnboarding = document.getElementById('btn-goto-onboarding');
    const btnBackToLogin = document.getElementById('btn-back-to-login');
    const inputOnboardingPin = document.getElementById('input-onboarding-pin');
    const onboardingErrorBox = document.getElementById('onboarding-error-box');
    const btnLogout = document.getElementById('btn-logout');

    function updatePinDots() {
        pinDots.forEach((dot, index) => {
            if (index < enteredPin.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    }

    async function loadUsersForLogin() {
        if (!loginUsersGrid) return;
        loginUsersGrid.innerHTML = '<p class="status-indicator-text">Buscando usuarios…</p>';
        try {
            const res = await fetch('/api/auth/users_list');
            const data = await res.json();
            loginUsersGrid.innerHTML = '';
            if (data.users && data.users.length > 0) {
                data.users.forEach(u => {
                    const btn = document.createElement('button');
                    btn.className = 'user-card-btn';
                    btn.type = 'button';
                    const mainInterest = (u.interests && u.interests.length > 0) ? `Le gusta: ${u.interests[0]}` : 'Conecta2';
                    btn.innerHTML = `
                        <div class="avatar-circle" aria-hidden="true">👤</div>
                        <div class="user-card-info">
                            <span class="user-card-name">${u.nombre}</span>
                            <span class="user-card-tag">${mainInterest}</span>
                        </div>
                    `;
                    btn.addEventListener('click', () => onUserSelectedForLogin(u));
                    loginUsersGrid.appendChild(btn);
                });
            } else {
                loginUsersGrid.innerHTML = '<p class="empty-state">No hay usuarios registrados aún. Pulsa el botón de abajo para empezar.</p>';
            }
        } catch (e) {
            loginUsersGrid.innerHTML = '<p class="empty-state">No se pudo cargar la lista de usuarios.</p>';
        }
    }

    function onUserSelectedForLogin(user) {
        selectedLoginUser = user;
        enteredPin = '';
        updatePinDots();
        if (pinLoginError) pinLoginError.style.display = 'none';

        if (user.has_pin) {
            if (loginUsersSection) loginUsersSection.style.display = 'none';
            if (loginPinSection) loginPinSection.style.display = 'block';
            if (loginSelectedName) loginSelectedName.textContent = user.nombre;
            VoiceManager.speak(`Hola ${user.nombre}. Pulsa tus cuatro números secretos en la pantalla.`);
        } else {
            currentUser = {
                id: user.id,
                nombre: user.nombre,
                interests: user.interests || []
            };
            persistSession();
            updateDashboardGreeting();
            VoiceManager.speak(`Bienvenido/a, ${currentUser.nombre}`);
            showScreen('dashboard');
        }
    }

    if (btnBackToUsers) {
        btnBackToUsers.addEventListener('click', () => {
            if (loginPinSection) loginPinSection.style.display = 'none';
            if (loginUsersSection) loginUsersSection.style.display = 'block';
            enteredPin = '';
            updatePinDots();
        });
    }

    // Teclado numérico táctil gigante (Opción 1)
    const keypadButtons = document.querySelectorAll('.keypad-btn');
    keypadButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const digit = btn.getAttribute('data-digit');
            const action = btn.getAttribute('data-action');

            if (digit !== null) {
                if (enteredPin.length < 4) {
                    enteredPin += digit;
                    updatePinDots();
                    if (enteredPin.length === 4) {
                        submitPinLogin();
                    }
                }
            } else if (action === 'backspace') {
                if (enteredPin.length > 0) {
                    enteredPin = enteredPin.slice(0, -1);
                    updatePinDots();
                }
            } else if (action === 'enter') {
                if (enteredPin.length === 4) {
                    submitPinLogin();
                } else {
                    if (pinLoginError) {
                        pinLoginError.textContent = 'Introduce los 4 números de tu PIN.';
                        pinLoginError.style.display = 'block';
                    }
                }
            }
        });
    });

    async function submitPinLogin() {
        if (!selectedLoginUser || enteredPin.length !== 4) return;
        if (pinLoginError) pinLoginError.style.display = 'none';

        try {
            const res = await fetch('/api/auth/login_pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedLoginUser.id,
                    pin: enteredPin
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                currentUser = data.user;
                if (data.device_token) {
                    localStorage.setItem('conecta2_device_token', data.device_token);
                }
                persistSession();
                updateDashboardGreeting();
                VoiceManager.speak(`¡Hola de nuevo, ${currentUser.nombre}!`);
                showScreen('dashboard');
            } else {
                if (pinLoginError) {
                    pinLoginError.textContent = data.message || 'Código PIN incorrecto.';
                    pinLoginError.style.display = 'block';
                }
                VoiceManager.speak(data.message || 'El código PIN no es correcto.');
                enteredPin = '';
                updatePinDots();
            }
        } catch (e) {
            if (pinLoginError) {
                pinLoginError.textContent = 'Error de conexión. Inténtalo de nuevo.';
                pinLoginError.style.display = 'block';
            }
            enteredPin = '';
            updatePinDots();
        }
    }

    if (btnGotoOnboarding) {
        btnGotoOnboarding.addEventListener('click', () => {
            if (inputNombre) inputNombre.value = '';
            if (inputOnboardingPin) inputOnboardingPin.value = '';
            currentUser = { id: null, nombre: 'Amigo/a', interests: ['paseos', 'música'] };
            renderDetectedTags(currentUser.interests);
            if (onboardingErrorBox) onboardingErrorBox.style.display = 'none';
            showScreen('onboarding');
        });
    }

    if (btnBackToLogin) {
        btnBackToLogin.addEventListener('click', () => {
            if (loginPinSection) loginPinSection.style.display = 'none';
            if (loginUsersSection) loginUsersSection.style.display = 'block';
            loadUsersForLogin();
            showScreen('login');
        });
    }

    // Inicialización inteligente: comprobar dispositivo recordado (Opción 3)
    async function initAppSession() {
        const token = localStorage.getItem('conecta2_device_token');
        if (token) {
            try {
                const res = await fetch('/api/auth/validate_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_token: token })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.user) {
                        currentUser = data.user;
                        persistSession();
                        updateDashboardGreeting();
                        showScreen('dashboard');
                        return;
                    }
                }
            } catch (e) {
                console.warn('No se pudo validar el token de dispositivo:', e);
            }
            localStorage.removeItem('conecta2_device_token');
        }

        // Si no hay sesión recordada, mostrar pantalla de inicio
        loadUsersForLogin();
        showScreen('login');
    }

    initAppSession();

    // ========================================================
    // 1. PANTALLA: ONBOARDING POR VOZ
    // ========================================================
    const btnVoiceOnboarding = document.getElementById('btn-voice-onboarding');
    const voiceOnboardingLabel = document.getElementById('voice-onboarding-label');
    const voiceTranscriptBox = document.getElementById('voice-transcript-box');
    const voiceTranscriptText = document.getElementById('voice-transcript-text');
    const inputNombre = document.getElementById('input-nombre');
    const detectedTagsContainer = document.getElementById('detected-tags');
    const btnContinueDashboard = document.getElementById('btn-continue-dashboard');

    if (btnVoiceOnboarding) {
        btnVoiceOnboarding.addEventListener('click', () => {
            if (VoiceManager.listening) {
                VoiceManager.stopListening();
                btnVoiceOnboarding.classList.remove('listening');
                voiceOnboardingLabel.textContent = 'PULSA AQUÍ Y HABLA';
                return;
            }

            btnVoiceOnboarding.classList.add('listening');
            voiceOnboardingLabel.textContent = 'ESCUCHANDO… HABLA AHORA';

            VoiceManager.startListening({
                onStart: () => {
                    voiceOnboardingLabel.textContent = 'ESCUCHANDO… HABLA AHORA';
                },
                onResult: async (transcript) => {
                    btnVoiceOnboarding.classList.remove('listening');
                    voiceOnboardingLabel.textContent = 'PULSA AQUÍ Y HABLA';

                    voiceTranscriptBox.style.display = 'block';
                    voiceTranscriptText.textContent = `«${transcript}»`;

                    // Extraer nombre por patrones comunes
                    const nameMatch = transcript.match(/(?:me llamo|soy|mi nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)/i);
                    if (nameMatch && nameMatch[1]) {
                        inputNombre.value = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
                    }

                    // Enviar al backend para extraer etiquetas de intereses
                    try {
                        const response = await fetch('/api/extract_tags', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: transcript })
                        });
                        const data = await response.json();
                        if (data.tags && data.tags.length > 0) {
                            currentUser.interests = data.tags;
                            renderDetectedTags(currentUser.interests);
                        }
                    } catch (err) {
                        console.error('Error al extraer tags:', err);
                    }
                },
                onError: (message) => {
                    btnVoiceOnboarding.classList.remove('listening');
                    voiceOnboardingLabel.textContent = 'PULSA AQUÍ Y HABLA';
                    alert(message);
                },
                onEnd: () => {
                    btnVoiceOnboarding.classList.remove('listening');
                    voiceOnboardingLabel.textContent = 'PULSA AQUÍ Y HABLA';
                }
            });
        });
    }

    function renderDetectedTags(tags) {
        if (!detectedTagsContainer) return;
        detectedTagsContainer.innerHTML = '';
        tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag-badge';
            span.textContent = tag;
            detectedTagsContainer.appendChild(span);
        });
    }

    if (btnContinueDashboard) {
        btnContinueDashboard.addEventListener('click', async () => {
            const nombre = inputNombre ? inputNombre.value.trim() : '';
            const pin = inputOnboardingPin ? inputOnboardingPin.value.trim() : '';

            if (!nombre) {
                if (onboardingErrorBox) {
                    onboardingErrorBox.textContent = 'Por favor, escribe tu nombre o dilo con el botón de hablar.';
                    onboardingErrorBox.style.display = 'block';
                }
                VoiceManager.speak('Por favor, indica tu nombre.');
                return;
            }

            if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
                if (onboardingErrorBox) {
                    onboardingErrorBox.textContent = 'Elige un código PIN de 4 números (por ejemplo: 1234).';
                    onboardingErrorBox.style.display = 'block';
                }
                VoiceManager.speak('Elige un código PIN de cuatro números.');
                return;
            }

            if (onboardingErrorBox) onboardingErrorBox.style.display = 'none';

            // Registrar nuevo usuario con PIN y token de dispositivo
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: nombre,
                        pin: pin,
                        interests: currentUser.interests
                    })
                });
                const resData = await response.json();
                if (response.ok && resData.user) {
                    currentUser = resData.user;
                    if (resData.device_token) {
                        localStorage.setItem('conecta2_device_token', resData.device_token);
                    }
                    persistSession();
                    updateDashboardGreeting();
                    VoiceManager.speak(`¡Bienvenido a Conecta2, ${currentUser.nombre}! Entrando al menú principal.`);
                    showScreen('dashboard');
                } else {
                    if (onboardingErrorBox) {
                        onboardingErrorBox.textContent = resData.error || 'No se pudo crear el usuario.';
                        onboardingErrorBox.style.display = 'block';
                    }
                }
            } catch (e) {
                console.error('Error al registrar usuario:', e);
            }
        });
    }

    // ========================================================
    // 2. PANTALLA: MENÚ PRINCIPAL (DASHBOARD)
    // ========================================================
    const btnStartCall = document.getElementById('btn-start-call');
    const btnNavInterests = document.getElementById('btn-nav-interests');
    const btnNavContacts = document.getElementById('btn-nav-contacts');
    const btnVoiceHelp = document.getElementById('btn-voice-help');

    if (btnStartCall) {
        btnStartCall.addEventListener('click', () => {
            initiateMatchingProcess();
        });
    }

    if (btnNavInterests) {
        btnNavInterests.addEventListener('click', () => {
            loadAndShowInterestsScreen();
        });
    }

    if (btnNavContacts) {
        btnNavContacts.addEventListener('click', () => {
            loadAndShowContacts();
        });
    }

    // Botón de ayuda: abre el Chatbot Asistente Virtual
    if (btnVoiceHelp) {
        btnVoiceHelp.addEventListener('click', () => {
            openAssistantModal();
        });
    }

    // Botón de salir / cambiar de usuario
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const token = localStorage.getItem('conecta2_device_token');
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_token: token, user_id: currentUser.id })
                });
            } catch (e) {}
            localStorage.removeItem('conecta2_device_token');
            localStorage.removeItem('conecta2_current_user');
            currentUser = { id: null, nombre: 'Amigo/a', interests: [] };
            if (loginPinSection) loginPinSection.style.display = 'none';
            if (loginUsersSection) loginUsersSection.style.display = 'block';
            loadUsersForLogin();
            showScreen('login');
            VoiceManager.speak('Has salido de tu cuenta.');
        });
    }


    // ========================================================
    // MODAL DEL CHATBOT ASISTENTE VIRTUAL
    // ========================================================
    const modalAssistantChat = document.getElementById('modal-assistant-chat');
    const btnCloseAssistant = document.getElementById('btn-close-assistant');
    const assistantChatHistory = document.getElementById('assistant-chat-history');
    const inputAssistantText = document.getElementById('input-assistant-text');
    const btnAssistantSend = document.getElementById('btn-assistant-send');
    const btnAssistantVoice = document.getElementById('btn-assistant-voice');
    const btnAssistantVoiceLabel = document.getElementById('btn-assistant-voice-label');

    function openAssistantModal() {
        if (modalAssistantChat) {
            modalAssistantChat.style.display = 'flex';
            if (inputAssistantText) inputAssistantText.focus();
        }
    }

    function closeAssistantModal() {
        if (modalAssistantChat) {
            modalAssistantChat.style.display = 'none';
        }
        VoiceManager.stopListening();
    }

    if (btnCloseAssistant) btnCloseAssistant.addEventListener('click', closeAssistantModal);

    function appendChatMessage(sender, text) {
        if (!assistantChatHistory) return;
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        const p = document.createElement('p');
        p.textContent = text;
        bubble.appendChild(p);
        assistantChatHistory.appendChild(bubble);
        assistantChatHistory.scrollTop = assistantChatHistory.scrollHeight;
    }

    async function sendQuestionToAssistant(question) {
        const cleanQ = question.trim();
        if (!cleanQ) return;

        appendChatMessage('user', cleanQ);
        if (inputAssistantText) inputAssistantText.value = '';

        try {
            const res = await fetch('/api/assistant/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: cleanQ, user_id: currentUser.id })
            });
            const data = await res.json();
            const answer = data.answer || 'Disculpa, no he podido procesar tu pregunta.';
            appendChatMessage('assistant', answer);
            VoiceManager.speak(answer);
        } catch (err) {
            const fallback = 'Puedes pulsar el botón verde para iniciar una llamada o pulsar Mis Intereses para ver tus gustos.';
            appendChatMessage('assistant', fallback);
            VoiceManager.speak(fallback);
        }
    }

    if (btnAssistantSend) {
        btnAssistantSend.addEventListener('click', () => {
            const q = inputAssistantText ? inputAssistantText.value : '';
            sendQuestionToAssistant(q);
        });
    }

    if (inputAssistantText) {
        inputAssistantText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendQuestionToAssistant(inputAssistantText.value);
            }
        });
    }

    // Botones de preguntas rápidas
    document.querySelectorAll('.quick-question-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const q = btn.getAttribute('data-q');
            if (q) sendQuestionToAssistant(q);
        });
    });

    // Preguntar por voz al asistente
    if (btnAssistantVoice) {
        btnAssistantVoice.addEventListener('click', () => {
            if (VoiceManager.listening) {
                VoiceManager.stopListening();
                btnAssistantVoice.classList.remove('listening');
                if (btnAssistantVoiceLabel) btnAssistantVoiceLabel.textContent = 'HABLAR';
                return;
            }

            btnAssistantVoice.classList.add('listening');
            if (btnAssistantVoiceLabel) btnAssistantVoiceLabel.textContent = 'ESCUCHANDO…';

            VoiceManager.startListening({
                onResult: (text) => {
                    btnAssistantVoice.classList.remove('listening');
                    if (btnAssistantVoiceLabel) btnAssistantVoiceLabel.textContent = 'HABLAR';
                    sendQuestionToAssistant(text);
                },
                onError: (msg) => {
                    btnAssistantVoice.classList.remove('listening');
                    if (btnAssistantVoiceLabel) btnAssistantVoiceLabel.textContent = 'HABLAR';
                    alert(msg);
                },
                onEnd: () => {
                    btnAssistantVoice.classList.remove('listening');
                    if (btnAssistantVoiceLabel) btnAssistantVoiceLabel.textContent = 'HABLAR';
                }
            });
        });
    }

    // ========================================================
    // 3. PANTALLA: MOTOR DE MATCHING
    // ========================================================
    const matchingStatusText = document.getElementById('matching-status-text');
    const matchResultCard = document.getElementById('match-result-card');
    const matchCandidateName = document.getElementById('match-candidate-name');
    const matchAffinityInfo = document.getElementById('match-affinity-info');
    const matchCommonTags = document.getElementById('match-common-tags');
    const btnConnectNow = document.getElementById('btn-connect-now');
    const btnCancelMatching = document.getElementById('btn-cancel-matching');

    async function initiateMatchingProcess() {
        showScreen('matching');
        if (matchResultCard) matchResultCard.style.display = 'none';
        if (matchingStatusText) matchingStatusText.textContent = 'Analizando tus gustos y buscando a una persona compatible…';

        // Asegurar que el usuario existe en base de datos
        if (!currentUser.id) {
            try {
                const res = await fetch('/api/save_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentUser)
                });
                const d = await res.json();
                if (d.user) {
                    currentUser.id = d.user.id;
                    persistSession();
                }
            } catch (e) {}
        }

        // Consultar el algoritmo de matching en el backend (< 3 segundos)
        try {
            const res = await fetch(`/api/users/${currentUser.id}/match`);
            const matchData = await res.json();

            if (matchData.found && matchData.candidate) {
                lastSpokenCandidate = matchData.candidate;
                matchCandidateName.textContent = matchData.candidate.nombre;
                matchAffinityInfo.textContent = matchData.has_common_interests
                    ? `¡Os une la afinidad en vuestros gustos!`
                    : `Disponible para charlar contigo.`;

                // Mostrar intereses comunes
                matchCommonTags.innerHTML = '';
                const tagsToShow = matchData.common_interests.length > 0 ? matchData.common_interests : matchData.candidate.interests;
                tagsToShow.forEach(tag => {
                    const sp = document.createElement('span');
                    sp.className = 'tag-badge';
                    sp.textContent = tag;
                    matchCommonTags.appendChild(sp);
                });

                matchResultCard.style.display = 'block';
                matchingStatusText.textContent = '¡Persona compatible encontrada!';

                const voiceSpeech = `Hemos encontrado a ${matchData.candidate.nombre}. Pulsa el botón para iniciar el vídeo.`;
                VoiceManager.speak(voiceSpeech);
            } else {
                matchingStatusText.textContent = matchData.message || 'Buscando a alguien compatible… Conectando directamente.';
                setTimeout(() => { launchVideoCall(); }, 1200);
            }
        } catch (err) {
            console.error('Error al buscar match:', err);
            matchingStatusText.textContent = 'Conectando con la sala de llamadas…';
            setTimeout(() => { launchVideoCall(); }, 1000);
        }
    }

    if (btnConnectNow) btnConnectNow.addEventListener('click', launchVideoCall);
    if (btnCancelMatching) btnCancelMatching.addEventListener('click', () => showScreen('dashboard'));

    // ========================================================
    // 4. PANTALLA: VIDEOLLAMADA WEBRTC
    // ========================================================
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    const remotePlaceholder = document.getElementById('remote-placeholder');
    const callStatusLabel = document.getElementById('call-status-label');
    const callPeerBanner = document.getElementById('call-peer-banner');
    const callPeerName = document.getElementById('call-peer-name');
    const btnCallNext = document.getElementById('btn-call-next');
    const btnCallHangup = document.getElementById('btn-call-hangup');

    // Modal de doble confirmación
    const modalHangupConfirm = document.getElementById('modal-hangup-confirm');
    const btnConfirmHangupYes = document.getElementById('btn-confirm-hangup-yes');
    const btnConfirmHangupNo = document.getElementById('btn-confirm-hangup-no');

    WebRTCManager.setCallbacks({
        onLocalStream: (stream) => {
            if (localVideo) localVideo.srcObject = stream;
        },
        onRemoteStream: (stream) => {
            if (remoteVideo) {
                remoteVideo.srcObject = stream;
                remoteVideo.style.display = 'block';
            }
            if (remotePlaceholder) remotePlaceholder.style.display = 'none';
        },
        onStatus: (msg) => {
            if (callStatusLabel) callStatusLabel.textContent = msg;
        },
        onMatched: (peer) => {
            lastSpokenCandidate = peer;
            if (callPeerBanner) callPeerBanner.style.display = 'flex';
            if (callPeerName) callPeerName.textContent = `Hablando con ${peer.nombre}`;
            if (callStatusLabel) callStatusLabel.textContent = `Conectando con ${peer.nombre}…`;
        },
        onPeerLeft: () => {
            if (remoteVideo) {
                remoteVideo.srcObject = null;
                remoteVideo.style.display = 'none';
            }
            if (remotePlaceholder) {
                remotePlaceholder.style.display = 'flex';
                if (callStatusLabel) callStatusLabel.textContent = 'La otra persona ha salido de la llamada. Pulsa Siguiente para buscar de nuevo.';
            }
        }
    });

    async function launchVideoCall() {
        showScreen('call');
        if (remoteVideo) {
            remoteVideo.srcObject = null;
            remoteVideo.style.display = 'none';
        }
        if (remotePlaceholder) remotePlaceholder.style.display = 'flex';
        if (callStatusLabel) callStatusLabel.textContent = 'Solicitando acceso a la cámara y al micrófono…';

        try {
            await WebRTCManager.startCall({
                user_id: currentUser.id,
                nombre: currentUser.nombre,
                interests: currentUser.interests
            });
        } catch (error) {
            alert(error.message);
            showScreen('dashboard');
        }
    }

    if (btnCallNext) {
        btnCallNext.addEventListener('click', () => {
            if (remoteVideo) {
                remoteVideo.srcObject = null;
                remoteVideo.style.display = 'none';
            }
            if (remotePlaceholder) {
                remotePlaceholder.style.display = 'flex';
                if (callStatusLabel) callStatusLabel.textContent = 'Buscando a otra persona…';
            }
            WebRTCManager.nextPeer({
                user_id: currentUser.id,
                nombre: currentUser.nombre,
                interests: currentUser.interests
            });
        });
    }

    if (btnCallHangup) {
        btnCallHangup.addEventListener('click', () => {
            if (modalHangupConfirm) modalHangupConfirm.style.display = 'flex';
        });
    }

    if (btnConfirmHangupNo) {
        btnConfirmHangupNo.addEventListener('click', () => {
            if (modalHangupConfirm) modalHangupConfirm.style.display = 'none';
        });
    }

    if (btnConfirmHangupYes) {
        btnConfirmHangupYes.addEventListener('click', () => {
            if (modalHangupConfirm) modalHangupConfirm.style.display = 'none';
            WebRTCManager.hangup();
            WebRTCManager.stopMedia();
            showSummaryScreen();
        });
    }

    // ========================================================
    // 5. PANTALLA: RESUMEN DE LLAMADA Y GUARDAR CONTACTO (T09, RF5)
    // ========================================================
    const summaryPeerName = document.getElementById('summary-peer-name');
    const btnSaveContact = document.getElementById('btn-save-contact');
    const saveContactFeedback = document.getElementById('save-contact-feedback');
    const btnSummaryHome = document.getElementById('btn-summary-home');

    function showSummaryScreen() {
        showScreen('summary');
        const peerName = lastSpokenCandidate ? lastSpokenCandidate.nombre : 'tu interlocutor/a';
        if (summaryPeerName) summaryPeerName.textContent = peerName;
        if (saveContactFeedback) saveContactFeedback.style.display = 'none';
        if (btnSaveContact) {
            btnSaveContact.disabled = false;
            btnSaveContact.style.opacity = '1';
        }
    }

    if (btnSaveContact) {
        btnSaveContact.addEventListener('click', async () => {
            if (!currentUser.id || !lastSpokenCandidate || !lastSpokenCandidate.id) {
                if (saveContactFeedback) {
                    saveContactFeedback.style.display = 'block';
                    saveContactFeedback.textContent = '¡Contacto guardado en tu libreta!';
                }
                btnSaveContact.disabled = true;
                return;
            }

            try {
                const response = await fetch('/api/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: parseInt(currentUser.id, 10),
                        contact_id: parseInt(lastSpokenCandidate.id, 10)
                    })
                });
                const data = await response.json();
                if (saveContactFeedback) {
                    saveContactFeedback.style.display = 'block';
                    saveContactFeedback.textContent = data.message || 'Contacto guardado con éxito.';
                }
                btnSaveContact.disabled = true;
                btnSaveContact.style.opacity = '0.6';
            } catch (err) {
                console.error('Error al guardar contacto:', err);
            }
        });
    }

    if (btnSummaryHome) btnSummaryHome.addEventListener('click', () => showScreen('dashboard'));

    // ========================================================
    // 6. PANTALLA: CONSULTA DE CONTACTOS
    // ========================================================
    const contactsListContainer = document.getElementById('contacts-list-container');
    const btnBackContacts = document.getElementById('btn-back-contacts');
    const btnContactsBackDashboard = document.getElementById('btn-contacts-back-dashboard');

    async function loadAndShowContacts() {
        showScreen('contacts');
        if (!contactsListContainer) return;
        contactsListContainer.innerHTML = '<p class="empty-state">Cargando tus contactos…</p>';

        if (!currentUser.id) {
            contactsListContainer.innerHTML = '<p class="empty-state">Aún no tienes contactos guardados.</p>';
            return;
        }

        try {
            const res = await fetch(`/api/contacts/${currentUser.id}`);
            const data = await res.json();
            if (data.contacts && data.contacts.length > 0) {
                contactsListContainer.innerHTML = '';
                data.contacts.forEach(c => {
                    const card = document.createElement('div');
                    card.className = 'contact-item-card';
                    card.innerHTML = `
                        <div>
                            <h3 class="contact-item-name">👤 ${c.contact_nombre || 'Amigo/a'}</h3>
                            <p class="contact-item-date">Guardado recientemente</p>
                        </div>
                    `;
                    contactsListContainer.appendChild(card);
                });
            } else {
                contactsListContainer.innerHTML = '<p class="empty-state">Aún no tienes contactos guardados. Habla con personas e incorpóralas al finalizar la llamada.</p>';
            }
        } catch (e) {
            contactsListContainer.innerHTML = '<p class="empty-state">No se pudieron cargar los contactos.</p>';
        }
    }

    if (btnBackContacts) btnBackContacts.addEventListener('click', () => showScreen('dashboard'));
    if (btnContactsBackDashboard) btnContactsBackDashboard.addEventListener('click', () => showScreen('dashboard'));

    // ========================================================
    // 7. PANTALLA: EDICIÓN DINÁMICA DE INTERESES (CORREGIDO)
    // ========================================================
    const myActiveInterestsList = document.getElementById('my-active-interests-list');
    const suggestedInterestsGrid = document.getElementById('suggested-interests-grid');
    const inputCustomInterest = document.getElementById('input-custom-interest');
    const btnAddCustomInterest = document.getElementById('btn-add-custom-interest');
    const btnAddInterestVoice = document.getElementById('btn-add-interest-voice');
    const btnAddInterestVoiceText = document.getElementById('btn-add-interest-voice-text');
    const btnSaveInterests = document.getElementById('btn-save-interests');
    const interestsSaveFeedback = document.getElementById('interests-save-feedback');
    const btnBackInterests = document.getElementById('btn-back-interests');

    async function loadAndShowInterestsScreen() {
        showScreen('interests');
        if (interestsSaveFeedback) interestsSaveFeedback.style.display = 'none';

        // Si el usuario existe en BD, consultar sus intereses más recientes
        if (currentUser.id) {
            try {
                const res = await fetch(`/api/users/${currentUser.id}`);
                if (res.ok) {
                    const userData = await res.json();
                    if (userData.interests && userData.interests.length > 0) {
                        currentUser.interests = userData.interests;
                        persistSession();
                    }
                }
            } catch (e) {
                console.error('Error al sincronizar intereses:', e);
            }
        }

        renderMyInterestsUI();
    }

    function renderMyInterestsUI() {
        // 1. Renderizar lista activa con botones de eliminar (✖)
        if (myActiveInterestsList) {
            myActiveInterestsList.innerHTML = '';
            if (currentUser.interests.length === 0) {
                myActiveInterestsList.innerHTML = '<p class="text-muted m-0 p-2">No has seleccionado ninguna afición todavía. Añade una abajo.</p>';
            } else {
                currentUser.interests.forEach(tag => {
                    const badge = document.createElement('div');
                    badge.className = 'tag-badge-editable';

                    const spanText = document.createElement('span');
                    spanText.textContent = tag;
                    badge.appendChild(spanText);

                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'tag-remove-btn';
                    removeBtn.type = 'button';
                    removeBtn.setAttribute('aria-label', `Quitar afición ${tag}`);
                    removeBtn.textContent = '✕';
                    removeBtn.addEventListener('click', () => {
                        removeInterest(tag);
                    });

                    badge.appendChild(removeBtn);
                    myActiveInterestsList.appendChild(badge);
                });
            }
        }

        // 2. Renderizar sugerencias populares actualizadas
        if (suggestedInterestsGrid) {
            suggestedInterestsGrid.innerHTML = '';
            POPULAR_SUGGESTIONS.forEach(sug => {
                const isSelected = currentUser.interests.some(i => i.toLowerCase() === sug.toLowerCase());
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `interest-toggle-btn ${isSelected ? 'active' : ''}`;
                btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
                btn.innerHTML = `
                    <span class="check-mark">${isSelected ? '✓' : '+'}</span>
                    <span>${sug.charAt(0).toUpperCase() + sug.slice(1)}</span>
                `;
                btn.addEventListener('click', () => {
                    if (isSelected) {
                        removeInterest(sug);
                    } else {
                        addInterest(sug);
                    }
                });
                suggestedInterestsGrid.appendChild(btn);
            });
        }
    }

    function addInterest(tag) {
        const clean = tag.trim().toLowerCase();
        if (!clean) return;
        if (!currentUser.interests.some(i => i.toLowerCase() === clean)) {
            currentUser.interests.push(clean);
            renderMyInterestsUI();
        }
    }

    function removeInterest(tag) {
        const clean = tag.trim().toLowerCase();
        currentUser.interests = currentUser.interests.filter(i => i.toLowerCase() !== clean);
        renderMyInterestsUI();
    }

    // Añadir afición escribiendo
    function handleAddCustom() {
        if (!inputCustomInterest) return;
        const val = inputCustomInterest.value.trim();
        if (val) {
            addInterest(val);
            inputCustomInterest.value = '';
            inputCustomInterest.focus();
        }
    }

    if (btnAddCustomInterest) btnAddCustomInterest.addEventListener('click', handleAddCustom);
    if (inputCustomInterest) {
        inputCustomInterest.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
            }
        });
    }

    // Añadir afición por voz
    if (btnAddInterestVoice) {
        btnAddInterestVoice.addEventListener('click', () => {
            if (VoiceManager.listening) {
                VoiceManager.stopListening();
                btnAddInterestVoice.classList.remove('listening');
                if (btnAddInterestVoiceText) btnAddInterestVoiceText.textContent = 'Pulsar y decir afición por voz';
                return;
            }

            btnAddInterestVoice.classList.add('listening');
            if (btnAddInterestVoiceText) btnAddInterestVoiceText.textContent = 'ESCUCHANDO… DI TU AFICIÓN';

            VoiceManager.startListening({
                onResult: async (text) => {
                    btnAddInterestVoice.classList.remove('listening');
                    if (btnAddInterestVoiceText) btnAddInterestVoiceText.textContent = 'Pulsar y decir afición por voz';

                    // Extraer palabras clave con el backend
                    try {
                        const res = await fetch('/api/extract_tags', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text })
                        });
                        const d = await res.json();
                        if (d.tags && d.tags.length > 0) {
                            d.tags.forEach(t => addInterest(t));
                        } else {
                            addInterest(text);
                        }
                    } catch (e) {
                        addInterest(text);
                    }
                },
                onError: (msg) => {
                    btnAddInterestVoice.classList.remove('listening');
                    if (btnAddInterestVoiceText) btnAddInterestVoiceText.textContent = 'Pulsar y decir afición por voz';
                    alert(msg);
                },
                onEnd: () => {
                    btnAddInterestVoice.classList.remove('listening');
                    if (btnAddInterestVoiceText) btnAddInterestVoiceText.textContent = 'Pulsar y decir afición por voz';
                }
            });
        });
    }

    // Guardar intereses en la base de datos
    if (btnSaveInterests) {
        btnSaveInterests.addEventListener('click', async () => {
            if (currentUser.interests.length === 0) {
                currentUser.interests = ['paseos', 'música'];
            }

            persistSession();

            try {
                const response = await fetch('/api/save_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        nombre: currentUser.nombre,
                        interests: currentUser.interests
                    })
                });
                const data = await response.json();
                if (data.user) {
                    currentUser.id = data.user.id;
                    currentUser.interests = data.user.interests;
                    persistSession();
                }

                if (interestsSaveFeedback) {
                    interestsSaveFeedback.style.display = 'block';
                    interestsSaveFeedback.textContent = '✓ ¡Tus aficiones se han guardado con éxito en la base de datos!';
                    setTimeout(() => {
                        interestsSaveFeedback.style.display = 'none';
                        showScreen('dashboard');
                    }, 1500);
                } else {
                    showScreen('dashboard');
                }
            } catch (err) {
                console.error('Error al guardar intereses:', err);
                showScreen('dashboard');
            }
        });
    }

    if (btnBackInterests) btnBackInterests.addEventListener('click', () => showScreen('dashboard'));
});
