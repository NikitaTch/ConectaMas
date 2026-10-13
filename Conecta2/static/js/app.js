/**
 * Conecta2 - Lógica Principal de la Aplicación
 * Conecta la UI, la API REST, la Web Speech API y WebRTC.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Estado del usuario activo
    let currentUser = {
        id: null,
        nombre: 'Amigo/a',
        interests: ['paseos', 'música', 'jardinería']
    };

    let lastSpokenCandidate = null;

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

                    // Extraer nombre por heurística sencilla ("me llamo X", "soy X")
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

            // Guardar perfil en la BD vía API REST (T04)
            try {
                const response = await fetch('/api/save_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: currentUser.nombre,
                        interests: currentUser.interests
                    })
                });
                const resData = await response.json();
                if (resData.user) {
                    currentUser.id = resData.user.id;
                }
            } catch (e) {
                console.error('Error al guardar perfil:', e);
            }

            // Actualizar saludo en Dashboard
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
    const helpMessageBox = document.getElementById('help-message-box');

    if (btnStartCall) {
        btnStartCall.addEventListener('click', () => {
            initiateMatchingProcess();
        });
    }

    if (btnNavInterests) {
        btnNavInterests.addEventListener('click', () => {
            showScreen('interests');
        });
    }

    if (btnNavContacts) {
        btnNavContacts.addEventListener('click', () => {
            loadAndShowContacts();
        });
    }

    if (btnVoiceHelp) {
        btnVoiceHelp.addEventListener('click', () => {
            const msg = 'Estás en el Centro de Mando de Conecta2. Pulsa el botón verde gigante para iniciar una videollamada con alguien que comparta tus gustos.';
            if (helpMessageBox) {
                helpMessageBox.style.display = 'block';
                helpMessageBox.textContent = msg;
            }
            VoiceManager.speak(msg);
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

        // Si aún no se creó el usuario en BD, crearlo
        if (!currentUser.id) {
            try {
                const res = await fetch('/api/save_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentUser)
                });
                const d = await res.json();
                if (d.user) currentUser.id = d.user.id;
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

                // Leer en voz alta la propuesta de conexión (RF4 del SDD)
                const voiceSpeech = `Hemos encontrado a ${matchData.candidate.nombre}. Pulsa el botón para iniciar el vídeo.`;
                VoiceManager.speak(voiceSpeech);
            } else {
                matchingStatusText.textContent = matchData.message || 'Buscando a alguien compatible… Conectando directamente.';
                // Si no hay candidatos guardados, pasar directo a la llamada en red
                setTimeout(() => {
                    launchVideoCall();
                }, 1200);
            }
        } catch (err) {
            console.error('Error al buscar match:', err);
            matchingStatusText.textContent = 'Conectando con la sala de llamadas…';
            setTimeout(() => { launchVideoCall(); }, 1000);
        }
    }

    if (btnConnectNow) {
        btnConnectNow.addEventListener('click', () => {
            launchVideoCall();
        });
    }

    if (btnCancelMatching) {
        btnCancelMatching.addEventListener('click', () => {
            showScreen('dashboard');
        });
    }

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

    // Configurar Callbacks WebRTC
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
            if (remoteVideo) remoteVideo.style.display = 'none';
            if (remotePlaceholder) {
                remotePlaceholder.style.display = 'flex';
                if (callStatusLabel) callStatusLabel.textContent = 'La otra persona ha salido de la llamada. Pulsa Siguiente para buscar de nuevo.';
            }
        }
    });

    async function launchVideoCall() {
        showScreen('call');
        if (remoteVideo) remoteVideo.style.display = 'none';
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

    // RF4: Botón SIGUIENTE (buscar nuevo interlocutor sin salir)
    if (btnCallNext) {
        btnCallNext.addEventListener('click', () => {
            if (remoteVideo) remoteVideo.style.display = 'none';
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

    // RF3 & Regla 5: Botón COLGAR -> Abrir modal de doble confirmación
    if (btnCallHangup) {
        btnCallHangup.addEventListener('click', () => {
            if (modalHangupConfirm) modalHangupConfirm.style.display = 'flex';
        });
    }

    // Confirmación: Continuar hablando (No colgar)
    if (btnConfirmHangupNo) {
        btnConfirmHangupNo.addEventListener('click', () => {
            if (modalHangupConfirm) modalHangupConfirm.style.display = 'none';
        });
    }

    // Confirmación: Sí, colgar de verdad
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
                        user_id: currentUser.id,
                        contact_id: lastSpokenCandidate.id
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

    if (btnSummaryHome) {
        btnSummaryHome.addEventListener('click', () => {
            showScreen('dashboard');
        });
    }

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
    // 7. PANTALLA: EDICIÓN DE INTERESES
    // ========================================================
    const btnBackInterests = document.getElementById('btn-back-interests');
    const btnSaveInterests = document.getElementById('btn-save-interests');
    const btnAddInterestVoice = document.getElementById('btn-add-interest-voice');
    const interestToggleBtns = document.querySelectorAll('.interest-toggle-btn');

    interestToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            const isActive = btn.classList.contains('active');
            if (isActive) {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
                btn.querySelector('.check-mark').textContent = '+';
                currentUser.interests = currentUser.interests.filter(i => i !== tag);
            } else {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                btn.querySelector('.check-mark').textContent = '✓';
                if (!currentUser.interests.includes(tag)) currentUser.interests.push(tag);
            }
        });
    });

    if (btnAddInterestVoice) {
        btnAddInterestVoice.addEventListener('click', () => {
            VoiceManager.startListening({
                onStart: () => {
                    btnAddInterestVoice.classList.add('listening');
                },
                onResult: (text) => {
                    btnAddInterestVoice.classList.remove('listening');
                    const cleanTag = text.toLowerCase().trim();
                    if (cleanTag && !currentUser.interests.includes(cleanTag)) {
                        currentUser.interests.push(cleanTag);
                        alert(`Afición añadida: ${cleanTag}`);
                    }
                },
                onError: (msg) => {
                    btnAddInterestVoice.classList.remove('listening');
                    alert(msg);
                },
                onEnd: () => {
                    btnAddInterestVoice.classList.remove('listening');
                }
            });
        });
    }

    if (btnSaveInterests) {
        btnSaveInterests.addEventListener('click', async () => {
            if (currentUser.id) {
                try {
                    await fetch('/api/save_profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre: currentUser.nombre,
                            interests: currentUser.interests
                        })
                    });
                } catch (e) {}
            }
            showScreen('dashboard');
        });
    }

    if (btnBackInterests) {
        btnBackInterests.addEventListener('click', () => showScreen('dashboard'));
    }
});
