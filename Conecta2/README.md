# Conecta2 - Videollamadas Accesibles para Personas Mayores

Aplicación web de videollamadas entre personas mayores con los mismos intereses.

---

## 📋 Arquitectura y Tecnologías

* **Frontend Accesible:** HTML5 semántico, Bootstrap 5, CSS3 con tipografía grande (texto base 20px, encabezados 28-34px) y botones gigantes táctiles (alto contraste WCAG AAA/AA).
* **Interacción por Voz:** Web Speech API nativa (`SpeechRecognition` y `SpeechSynthesis`).
* **Videollamadas en Tiempo Real:** WebRTC Peer-to-Peer con señalización mediante **Flask-SocketIO**.
* **Backend y API:** Python 3 (Flask) con arquitectura REST y Blueprint modular.
* **Persistencia y Modelos:** PostgreSQL / SQLite mediante **SQLAlchemy ORM** (`User`, `Interest`, `Contact`).
* **Motor de Emparejamiento:** Algoritmo en Python de evaluación de afinidad por intereses en tiempo real (< 3 segundos).

---

## 🎯 Cumplimiento de Reglas y Requisitos del SDD

1. **Constitución y Accesibilidad Extrema (`constitution.md`):**
   * **Regla 1:** Botones gigantes táctiles y tipografía de alto contraste.
   * **Regla 2:** Flujos guiados de máximo un botón de acción principal por pantalla.
   * **Regla 3:** Entrada y asistencia por voz prioritarias.
   * **Regla 4:** Sin recolección de datos sensibles (solo alias o nombre de pila).
   * **Regla 5:** **Doble confirmación al colgar** mediante modal accesible para evitar cortes involuntarios.
   * **Regla 6:** Backend Flask desacoplado de la interfaz vía API REST.
2. **Requisitos Funcionales (`spec.md`):**
   * **RF1:** Transcripción de voz a texto y extracción inteligente de palabras clave de aficiones.
   * **RF2:** Búsqueda en base de datos y emparejamiento mediante videollamada WebRTC.
   * **RF3:** Modal de aviso y confirmación antes de cortar la llamada.
   * **RF4:** Botón **"Siguiente"** que reconecta con otro participante sin salir de la vista de vídeo.
   * **RF5:** Pantalla de resumen final con botón para **"Guardar en mis Contactos"** en la base de datos.
3. **Tareas del Plan de Trabajo (`tasks.md`):**
   * T01 a T10 implementadas y verificadas con suite de pruebas automatizadas en `tests/`.

---

## 🚀 Puesta en Marcha

Este README corresponde al backend Python de esta carpeta. El repositorio también contiene un proyecto .NET en la raíz.

### 1. Crear el entorno virtual e instalar dependencias

Ejecuta los comandos desde esta carpeta.

En Windows (PowerShell):
```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

En Linux/macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

`requirements.txt` instala Flask y las dependencias Python de la aplicación. También incluye el cliente opcional de Gemini y el controlador PostgreSQL. `cloudflared` no se instala con `pip`: es un programa independiente de Cloudflare.

### 2. Variables de entorno (Opcional)

Por defecto, la aplicación utiliza SQLite (`conecta2.db`) para funcionar inmediatamente sin configuración previa. Si deseas utilizar PostgreSQL como describe el SDD, crea un archivo `.env` o define la variable de entorno:

```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/conecta2
SECRET_KEY=conecta2-super-secret-key-2026
GEMINI_API_KEY=tu-clave-de-gemini
```

`GEMINI_API_KEY` es opcional: sin ella, el asistente usa respuestas locales. `DATABASE_URL` también es opcional; sin ella se usa SQLite. PostgreSQL requiere además un servidor accesible.

### 3. Iniciar el servidor

```bash
python app.py
```

La aplicación quedará disponible en:
👉 **`http://localhost:5000`**

### Túnel HTTPS con Cloudflare (opcional)

Para que otra persona acceda desde Internet y el navegador permita cámara y micrófono, instala `cloudflared` por separado siguiendo la [guía oficial de Cloudflare](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). Añade el ejecutable a `PATH`, abre una terminal nueva y comprueba `cloudflared --version`. Luego, desde esta carpeta, ejecuta:

```powershell
python lanzar_conecta2.py
```

El lanzador arranca Flask y crea un túnel temporal. No hace falta configurar Cloudflare para ejecutar la app localmente. `iniciar_tunel.bat` usa una ruta fija de Windows; se recomienda el lanzador Python, que también busca `cloudflared` en `PATH`.

---

## 🧪 Pruebas de la Aplicación

### Videollamada entre dos pestañas
1. Abre `http://localhost:5000` en una pestaña del navegador (Chrome o Edge recomendado para Web Speech API).
2. Elige tu usuario (o crea uno nuevo con PIN) y entra al **Menú principal**.
3. Abre una segunda pestaña (o ventana de incógnito) en `http://localhost:5000` e introduce otro usuario.
4. En ambas pestañas, pulsa el botón verde gigante **"INICIAR LLAMADA"** y acepta los permisos de cámara y micrófono.
5. Ambas pestañas se emparejarán automáticamente mediante WebRTC y compartirán vídeo y audio en directo.
6. Pulsa **"Siguiente"** para saltar de usuario o **"Colgar"** para ver el modal de doble confirmación y la pantalla de resumen para guardar el contacto.

### Ejecutar Suite de Tests Automatizados

Para ejecutar las 19 pruebas automatizadas (modelos, autenticación, motor de matching y API REST):

```powershell
python -m pytest tests -v
```

