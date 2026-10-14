# Tareas del MVP: Conecta2

| ID | Tarea | Dependencias | Hecho cuando... |
|---|---|---|---|
| T01 | Setup de Flask, BD y SocketIO | Ninguna | Servidor activo localmente. |
| T02 | Crear modelo DB (Users, Interests, Contacts) | T01 | Tablas creadas en PostgreSQL. |
| T03 | UI: Presentación por voz (Speech API) | Ninguna | El audio se transcribe y muestra en pantalla. |
| T04 | API: Guardar perfil e intereses | T02, T03 | La transcripción se guarda como tags en la BD. |
| T05 | UI: Centro de Mando | Ninguna | Pantalla replicada de Figma (Botón verde gigante). |
| T06 | Motor de Matching | T04 | El sistema devuelve el ID del usuario más compatible. |
| T07 | Integrar WebRTC (Videollamada básica) | T01, T05 | Dos navegadores ven sus cámaras cruzadas. |
| T08 | UI: Botones Video (Siguiente / Colgar) | T07 | Modal de confirmación al colgar funciona. |
| T09 | UI: Fin de llamada y Guardar Contacto | T02, T08 | El usuario se guarda en la tabla `contacts`. |
| T10 | Pruebas de usabilidad (End-to-End) | T09 | Flujo completo funciona desde presentación hasta fin. |