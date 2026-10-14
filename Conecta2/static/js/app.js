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

    // Cargar usuario persistido en localStorage si existe
    function loadSavedSession() {
        try {
            const saved = localStorage.getItem('conecta2_current_user');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.id) {
                    currentUser = parsed;
                    const greeting = document.getElementById('user-greeting');
                    if (greeting) greeting.textContent = `Hola, ${currentUser.nombre}`;
                    const inputNombre = document.getElementById('input-nombre');
                    if (inputNombre) inputNombre.value = currentUser.nombre;
                    renderDetectedTags(currentUser.interests);
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }

    function persistSession() {
        try {
            localStorage.setItem('conecta2_current_user', JSON.stringify(currentUser));
        } catch (e) {}
    }

    // Elementos de pantalla
    const screens = {
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

    // Inicializar sesión previa si existe
    if (loadSavedSession()) {
        showScreen('dashboard');
    }

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
            const nombre = inputNombre.value.trim() || 'Amigo/a';
            currentUser.nombre = nombre;

            // Guardar o actualizar perfil en la BD (T04)
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
                const resData = await response.json();
                if (resData.user) {
                    currentUser.id = resData.user.id;
                    currentUser.interests = resData.user.interests;
                    persistSession();
                }
            } catch (e) {
                console.error('Error al guardar perfil:', e);
            }

            const greeting = document.getElementById('user-greeting');
            if (greeting) greeting.textContent = `Hola, ${currentUser.nombre}`;

            showScreen('dashboard');
        });
    }

    // ========================================================
    // 2. PANTALLA: CENTRO DE MANDO (DASHBOARD)
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
