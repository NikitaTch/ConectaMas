# Conecta2 - Videollamadas Accesibles para Personas Mayores

Aplicación web diseñada específicamente para personas mayores de 65 a 80+ años. Incluye:
- **Autenticación súper accesible:** Selector de cuenta visual de 1 clic + Teclado numérico táctil gigante con PIN de 4 números y persistencia por token de dispositivo.
- **Onboarding por voz o texto:** Reconocimiento de voz nativo (Web Speech API) para registrar nombre y aficiones.
- **Menú principal:** Botón verde gigante de videollamada, acceso a intereses, contactos y asistente de ayuda.
- **Videollamadas P2P en tiempo real:** Conexión directa mediante WebRTC con señalización Socket.IO y botón de colgar con doble confirmación.
- **Chatbot Asistente:** Resuelve dudas sobre la aplicación por voz y texto.

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

### 3. Iniciar el servidor
```bash
python app.py
```
La aplicación quedará disponible inmediatamente en:
👉 **`http://localhost:5000`**

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
Pasa el 100% de las 19 pruebas unitarias (modelos, matching < 3s, API REST y autenticación).
