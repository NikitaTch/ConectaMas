# Propuesta Técnica: Conecta2

## 1. Tecnologías
- **Frontend:** HTML/CSS/JS (UI simple y accesible).
- **Voz:** Web Speech API (Nativa del navegador).
- **Video:** WebRTC (Peer-to-Peer para videollamada) con un servidor de señalización simple (Socket.io/Flask-SocketIO).
- **Backend:** Flask (Python) para API y lógica de matching.
- **Base de Datos:** PostgreSQL con SQLAlchemy.

## 2. Componentes Clave
1. **Captura:** Interfaz de voz a texto -> API REST de guardado.
2. **Dashboard:** Centro de Mando.
3. **Señalización (Video):** Servidor WebSockets para conectar a los usuarios.
4. **Matching:** Función Python que evalúa afinidad de intereses.

## 3. Modelo de Datos
- `users`: id, nombre.
- `interests`: id, user_id, palabra_clave.
- `contacts`: id, user_id, contact_id (Relación para "Guardar como contacto").

## 4. Pruebas
- Validación de contrastes y tamaños (Lighthouse).
- Pruebas P2P (WebRTC) en red local.