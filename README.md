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
- **Túnel HTTPS opcional:** `cloudflared` es un ejecutable independiente, no una dependencia de Python. En Windows, instala el MSI de 64 bits desde la [guía oficial de Cloudflare](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). El lanzador busca el ejecutable en las rutas habituales de instalación y después en `PATH`.

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

Cloudflare proporciona una dirección HTTPS para probar desde otro ordenador y acceder a cámara y micrófono. No hace falta instalar un certificado. El túnel rápido genera una dirección temporal `trycloudflare.com`, que cambia al cerrar y volver a iniciar el túnel.

**Opción A: iniciar Flask y el túnel juntos.** Desde `Conecta2/`, con el puerto 5000 libre, ejecuta:

```powershell
python lanzar_conecta2.py
```

Este lanzador inicia ambos procesos. No lo ejecutes si `python app.py` ya está corriendo, porque intentaría iniciar un segundo servidor Flask en el mismo puerto.

**Opción B: conectar el túnel a un Flask que ya está iniciado.** Mantén `python app.py` abierto en una terminal y, en una segunda terminal, ejecuta:

```powershell
cloudflared tunnel --url http://localhost:5000
```

Si Windows no reconoce `cloudflared` porque no está en `PATH`, usa la ruta del ejecutable instalado. Por ejemplo:

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5000
```

Abre la dirección HTTPS que muestre `cloudflared` en ambos ordenadores y mantén Flask y el túnel ejecutándose. Para probar en el mismo ordenador, `http://localhost:5000` basta; una dirección HTTP de red local (`http://192.168...`) no sustituye al enlace HTTPS.

Cloudflare proporciona el HTTPS y transporta las peticiones a Flask; no retransmite el audio o vídeo WebRTC. La aplicación usa servidores STUN públicos, pero algunas redes requieren además un servidor TURN para completar la conexión entre ordenadores.

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
