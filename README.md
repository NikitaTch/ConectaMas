# Conecta2 - Videollamadas Accesibles para Personas Mayores

Aplicación web diseñada específicamente para personas mayores de 65 a 80+ años. Incluye:
- **Autenticación súper accesible:** Selector de cuenta visual de 1 clic + Teclado numérico táctil gigante con PIN de 4 números y persistencia por token de dispositivo.
- **Onboarding por voz o texto:** Reconocimiento de voz nativo (Web Speech API) para registrar nombre y aficiones.
- **Menú principal:** Botón verde gigante de videollamada, acceso a intereses, contactos y asistente de ayuda.
- **Videollamadas P2P en tiempo real:** Conexión directa mediante WebRTC con señalización Socket.IO y botón de colgar con doble confirmación.
- **Chatbot Asistente:** Resuelve dudas sobre la aplicación por voz y texto.

El repositorio también contiene un proyecto .NET en la raíz. El backend Flask de Conecta2 y sus instrucciones de ejecución están en `Conecta2/`.

## Tecnologías y dependencias

- **Backend:** Python 3.10 o superior, Flask, Flask-SocketIO y SQLAlchemy.
- **Base de datos:** SQLite por defecto. Para PostgreSQL, configura un servidor y define `DATABASE_URL`; el controlador de Python está incluido en `requirements.txt`.
- **Asistente:** Funciona con respuestas locales. Para habilitar Gemini, instala las dependencias incluidas en `requirements.txt` y configura `GEMINI_API_KEY`.
- **Túnel HTTPS opcional:** `cloudflared` es un ejecutable independiente, no una dependencia de Python. Instálalo por separado y déjalo disponible en `PATH`. Consulta la [guía oficial de Cloudflare](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/).

---

## 🚀 Cómo ejecutar la aplicación (Conecta2)

### 1. Entrar a la carpeta del proyecto
```bash
cd Conecta2
```

### 2. Crear entorno virtual e instalar dependencias
```bash
python -m venv .venv
# En Windows:
.\.venv\Scripts\activate
# En Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

Esto instala Flask y las bibliotecas Python del proyecto en el entorno virtual. No instala `cloudflared`; ese programa solo hace falta para publicar la aplicación mediante un túnel HTTPS.

### 3. Iniciar el servidor
```bash
python app.py
```
La aplicación quedará disponible inmediatamente en:
👉 **`http://localhost:5000`**

### Abrir la aplicación a través de Cloudflare (opcional)

Instala `cloudflared` siguiendo la guía oficial anterior y confirma que `cloudflared --version` funciona en una terminal nueva. Después, desde `Conecta2/`, ejecuta:

```bash
python lanzar_conecta2.py
```

El lanzador inicia Flask y crea un túnel temporal `trycloudflare.com`. Para usar la aplicación solo en tu equipo no necesitas Cloudflare.

---

## 🔑 Inicio de sesión y PIN
- **Usuarios de prueba incluidos:** Carmen, Antonio, Teresa y Manuel.
- **PIN demo por defecto:** `1234` (válido para todos los usuarios iniciales).
- **Crear nuevo usuario:** Pulsa el botón `SOY NUEVO / CREAR MI PERFIL`. Puedes escribir tu propio PIN de 4 números o dejar el PIN por defecto (`1234`) para entrar sin complicaciones.

---

## 🧪 Pruebas automatizadas (pytest)
Dentro de la carpeta `Conecta2`, ejecuta:
```bash
pytest tests -v
```
Hay 19 pruebas definidas para modelos, autenticación, matching y API REST.
