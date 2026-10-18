# Tareas del MVP: Conecta2

| ID | Tarea | Dependencias | Hecho cuando... |
|---|---|---|---|
| T00 | Autenticación accesible (PIN táctil + Token dispositivo) | Ninguna | Selector de cuenta, teclado táctil numérico y sesión persistente. |
| T01 | Setup de Flask, BD y SocketIO | Ninguna | Servidor activo localmente con SQLite/PostgreSQL. |
| T02 | Crear modelo DB (Users, Interests, Contacts con pin y token) | T01 | Tablas creadas con `pin_hash` y `device_token`. |
| T03 | UI: Presentación y registro por voz (Speech API) | Ninguna | El audio se transcribe y muestra en pantalla. |
| T04 | API: Guardar perfil e intereses | T02, T03 | La transcripción se guarda como tags en la BD. |
| T05 | UI: Menú principal | T00 | Pantalla replicada de Figma (Botón verde gigante, Intereses, Contactos, Asistente). |
| T06 | Motor de Matching | T04 | El sistema devuelve el ID del usuario más compatible en < 3s. |
| T07 | Integrar WebRTC (Videollamada básica) | T01, T05 | Dos navegadores ven sus cámaras cruzadas. |
| T08 | UI: Botones Video (Siguiente / Colgar) | T07 | Modal de confirmación al colgar funciona. |
| T09 | UI: Fin de llamada y Guardar Contacto | T02, T08 | El usuario se guarda en la tabla `contacts`. |
| T10 | UI: Asistente y Chatbot de ayuda inmediata | T05 | Responde dudas de uso por voz y texto. |
| T11 | Pruebas de usabilidad y tests automatizados | T09, T10 | Las 19 pruebas automatizadas pasan en pytest. |
