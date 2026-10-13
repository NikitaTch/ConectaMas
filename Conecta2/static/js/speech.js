/**
 * Conecta2 - Módulo de Voz (Web Speech API)
 * Incluye reconocimiento de voz (Speech-to-Text) y síntesis de voz (Text-to-Speech).
 */

const VoiceManager = (() => {
    let recognition = null;
    let isListening = false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    function isSupported() {
        return !!SpeechRecognition;
    }

    /**
     * Inicia el reconocimiento de voz en español.
     * @param {Object} options - { onResult, onError, onStart, onEnd }
     */
    function startListening({ onResult, onError, onStart, onEnd }) {
        if (!isSupported()) {
            if (onError) onError('El reconocimiento de voz no está soportado en este navegador. Utiliza Google Chrome o Edge.');
            return false;
        }

        stopListening();

        try {
            recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                isListening = true;
                if (onStart) onStart();
            };

            recognition.onresult = (event) => {
                const text = event.results?.[0]?.[0]?.transcript?.trim();
                if (text && onResult) {
                    onResult(text);
                }
            };

            recognition.onerror = (event) => {
                isListening = false;
                let message = 'No te he escuchado bien, ¿puedes repetirlo?';
                if (event.error === 'not-allowed') {
                    message = 'El navegador no tiene permiso para acceder al micrófono. Por favor, actívalo en la barra de direcciones.';
                } else if (event.error === 'no-speech') {
                    message = 'No se ha detectado sonido. Pulsa el botón y habla claramente.';
                }
                if (onError) onError(message, event.error);
            };

            recognition.onend = () => {
                isListening = false;
                if (onEnd) onEnd();
            };

            recognition.start();
            return true;
        } catch (error) {
            isListening = false;
            if (onError) onError('No se pudo iniciar el micrófono: ' + error.message);
            return false;
        }
    }

    function stopListening() {
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {}
            recognition = null;
        }
        isListening = false;
    }

    /**
     * Lee un texto en voz alta (Text-to-Speech).
     */
    function speak(text, onEnd) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95; // Ligeramente pausado para personas mayores
        utterance.pitch = 1.0;

        if (onEnd) {
            utterance.onend = onEnd;
        }

        window.speechSynthesis.speak(utterance);
    }

    return {
        isSupported,
        startListening,
        stopListening,
        speak,
        get listening() { return isListening; }
    };
})();
