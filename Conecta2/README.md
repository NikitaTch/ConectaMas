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

### 1. Activar el entorno virtual

El proyecto incluye un entorno virtual ya preparado en `.venv`:

En Windows (PowerShell):
```powershell
.\.venv\Scripts\Activate.ps1
```
O ejecutando directamente el intérprete:
```powershell
& ".\.venv\Scripts\python.exe" app.py
```

### 2. Variables de entorno (Opcional)

Por defecto, la aplicación utiliza SQLite (`conecta2.db`) para funcionar inmediatamente sin configuración previa. Si deseas utilizar PostgreSQL como describe el SDD, crea un archivo `.env` o define la variable de entorno:

```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/conecta2
SECRET_KEY=conecta2-super-secret-key-2026
```

### 3. Iniciar el servidor

```bash
python app.py
```

La aplicación quedará disponible en:
👉 **`http://localhost:5000`**

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

Para ejecutar las 18 pruebas unitarias (modelos, autenticación PIN, motor de matching < 3s, contactos y endpoints REST):

```powershell
& ".\.venv\Scripts\python.exe" -m pytest tests -v
```

