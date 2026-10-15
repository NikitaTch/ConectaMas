# Propuesta Técnica: Conecta2

## 1. Tecnologías
- **Frontend:** HTML/CSS/JS (UI simple y accesible).
- **Voz:** Web Speech API (Nativa del navegador).
- **Video:** WebRTC (Peer-to-Peer para videollamada) con un servidor de señalización simple (Socket.io/Flask-SocketIO).
- **Backend:** Flask (Python) para API, WebSocket y lógica de matching.
- **Base de Datos:** SQLite por defecto (`conecta2.db`) con soporte para PostgreSQL vía `DATABASE_URL`.

## 2. Componentes Clave
0. **Autenticación Accesible:** Selector visual de cuenta de 1 clic + Teclado táctil gigante para PIN numérico de 4 dígitos (Opción 1) y persistencia segura por token de dispositivo (Opción 3).
1. **Captura:** Interfaz de voz a texto -> API REST de guardado y extracción de aficiones.
2. **Dashboard:** Menú principal con botón gigante de llamada, acceso a intereses, contactos y asistente.
3. **Señalización (Video):** Servidor WebSockets (Flask-SocketIO) para conectar a los usuarios.
4. **Matching:** Función Python (`matching.py`) que evalúa afinidad de intereses en < 3s.
5. **Asistente Virtual:** Chatbot con respuestas guiadas por voz y texto (`assistant.py`).

## 3. Modelo de Datos
- `users`: id, nombre, pin_hash (hash seguro de PIN numérico), device_token (token opaco para recordar dispositivo).
- `interests`: id, user_id, palabra_clave.
- `contacts`: id, user_id, contact_id (Relación para "Guardar como contacto").

## 4. Pruebas
- Validación de contrastes y tamaños (WCAG AAA/AA).
- Pruebas P2P (WebRTC) en red local.
- Pruebas unitarias automatizadas (`pytest`) con cobertura de API, modelos y autenticación.