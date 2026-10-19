# Software Design Document (SDD) - Conecta+

**Equipo Conectadores:** Nikolai Fuertes Tchobanou, Edgar Ortiz, Nil Rivera, Marc Ayala.

> **Nota sobre el estado actual:** este documento describe el diseño inicial de Conecta+. La implementación de Conecta2 ha evolucionado e incluye videollamadas WebRTC y señalización Flask-SocketIO. Para ejecutar la implementación actual y exponerla temporalmente por HTTPS con Cloudflare Tunnel, consulta `Conecta2/README.md`; `cloudflared` es un ejecutable externo y no forma parte de las dependencias Python.

## 1. Visión General
El objetivo de **Conecta+** (MVP) es desarrollar una aplicación web funcional centrada en mitigar la soledad no deseada en personas mayores (65+ años) con barreras tecnológicas. 

La plataforma permite a los usuarios registrar sus intereses utilizando exclusivamente su voz, recibiendo propuestas de conexión con personas afines. El diseño se rige por el principio de "La tecnología se adapta a la persona", minimizando la carga cognitiva, los clics y las interfaces complejas.

## 2. Arquitectura y Stack Tecnológico
El sistema mantiene una separación estricta entre frontend y backend, comunicándose mediante una API REST. Se prioriza la legibilidad del código (PEP 8) sobre la optimización prematura.

*   **Frontend (Interfaz):** HTML5 semántico, CSS/Bootstrap 5 (alto contraste), JavaScript Vanilla (ES6+).
*   **Reconocimiento de Voz:** Web Speech API nativa (SpeechRecognition y SpeechSynthesis) ejecutada en el cliente.
*   **Backend (API):** Python 3.10+ con el microframework Flask.
*   **Base de Datos:** PostgreSQL utilizando SQLAlchemy (ORM).

## 3. Modelo de Datos y Privacidad
El diseño de datos es mínimo para el MVP, priorizando el anonimato. No se solicitan, procesan ni almacenan datos sensibles (ubicación, apellidos, teléfono).

*   **`users`:** `id` (PK), `alias` (String, seudonimizado), `created_at` (Timestamp).
*   **`interests`:** `id` (PK), `user_id` (FK), `keyword` (String), `type` (Enum: positivo/negativo).
*   *Nota:* Las preferencias negativas se tratan con la misma prioridad que las positivas para garantizar la seguridad.

## 4. Diseño UI/UX y Accesibilidad
La accesibilidad extrema es una regla inquebrantable.
*   **UI Básica:** Cero menús hamburguesa, cero iconos sin texto explicativo. Flujos de máximo 3 pasos. Un solo botón de acción principal por pantalla.
*   **Tipografía y Botones:** Fuentes de gran tamaño (mínimo 18px texto, 24px botones). Botones táctiles de mínimo 48x48 píxeles.
*   **Contraste:** Cumplimiento mínimo de WCAG AA (ratio 4.5:1), idealmente AAA.
*   **Interacción Principal:** Un botón de micrófono gigante omnipresente. El sistema lee en voz alta los resultados del match (Text-to-Speech).

## 5. Algoritmo de Emparejamiento (Scoring)
*   **Lógica Base:** Función en Python que busca coincidencias de intereses (palabras clave) en PostgreSQL.
*   **Rendimiento:** El tiempo de respuesta desde la recepción del texto hasta la devolución del match debe ser inferior a 2 segundos.
*   **Alcance:** En el MVP, el "Match" muestra un mensaje de éxito/conexión sugerida. El chat en tiempo real (WebRTC/WebSockets) queda excluido para fases posteriores.

## 6. Casos Límite y Manejo de Errores
1.  **Permisos:** Si el navegador no tiene permisos de micrófono, se muestra un aviso visual grande explicando cómo activarlo.
2.  **Entorno Ruidoso:** Si la API no reconoce palabras, el sistema solicita amablemente: *"No te he escuchado bien, ¿puedes repetirlo?"*.
3.  **Sin Matches:** Si es el primer usuario o no hay coincidencias, el sistema indica: *"Hemos guardado tus gustos. Te avisaremos cuando llegue alguien compatible"*.

## 7. Planificación y Reparto de Tareas del MVP

| Tarea | Descripción | Responsable |
| :--- | :--- | :--- |
| **T01, T05** | Inicializar Git, estructura Flask, conexión DB y endpoint `/api/save_profile`. | Nikolai |
| **T02, T07** | Crear tablas con SQLAlchemy y desarrollar algoritmo de scoring en Python. | Edgar |
| **T03, T06** | Maquetar pantalla principal accesible y conectar Fetch API (Front a Back). | Nil |
| **T04, T08** | Implementar Web Speech API (Voz a texto) y maquetar pantalla de Match. | Marc |
| **T09, T10** | Integración del flujo completo y pruebas de accesibilidad/casos límite. | Equipo |

---
**Pendiente de Resolución:** Decidir la profundidad del procesamiento de lenguaje para la extracción de intereses (Palabras clave exactas vs. NLP básico en Python).
