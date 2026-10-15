# Especificaciones SDD: Conecta2

## 1. Objetivo del MVP
Desarrollar una web-app accesible donde personas mayores registran sus intereses por voz, buscan perfiles afines e inician una videollamada en tiempo real, finalizando con la opción de guardar el contacto.

## 2. Alcance (Basado en Figma)
- Inicio de sesión accesible (Selector visual de perfil + teclado táctil de PIN de 4 números con persistencia de dispositivo).
- Presentación y registro por voz.
- Menú principal (con botón gigante verde de llamar, acceso a intereses, contactos y asistente).
- Algoritmo de emparejamiento por intereses en < 3 segundos.
- Videollamada (WebRTC) con opciones: "Siguiente" y "Colgar" (con doble confirmación).
- Pantalla de resumen para "Guardar contacto".
- Asistente y Chatbot de ayuda inmediata por voz y texto.
- Gestión interactiva de "Mis Intereses" y consulta de "Mis Contactos".

## 3. Requisitos Funcionales (EARS)
- **RF0 (Autenticación Accesible):** El sistema deberá permitir iniciar sesión seleccionando el perfil y marcando un PIN de 4 dígitos en teclado táctil gigante, o recordando el dispositivo validado sin necesidad de contraseñas complejas.
- **RF1:** El sistema deberá transcribir la voz del usuario a texto para extraer intereses.
- **RF2:** El sistema deberá buscar coincidencias en la BD y conectar a los usuarios vía videollamada.
- **RF3:** Si el usuario pulsa "Colgar", el sistema deberá mostrar un aviso de confirmación antes de cortar.
- **RF4:** Si el usuario pulsa "Siguiente", el sistema deberá buscar un nuevo match sin salir de la videollamada.
- **RF5:** Al finalizar la llamada, el sistema deberá permitir guardar el perfil en la lista de "Contactos".
- **RF6:** El usuario podrá consultar sus contactos guardados y consultar/añadir/eliminar sus intereses en cualquier momento desde el Menú principal.
- **RF7:** El usuario dispondrá de un botón de ayuda con asistente virtual que responderá dudas por voz y texto.

## 4. Criterios de Aceptación
- Un usuario sin permisos de cámara/micro recibe instrucciones visuales claras.
- El algoritmo debe tardar <3 segundos en proponer un match o mostrar "Buscando...".
- Todos los botones interactivos cumplen con el tamaño mínimo accesible (>60-76px de altura) y contraste superior a 7:1 (WCAG AAA).