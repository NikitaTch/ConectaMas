# Especificaciones SDD: Conecta2

## 1. Objetivo del MVP
Desarrollar una web-app accesible donde personas mayores registran sus intereses por voz, buscan perfiles afines e inician una videollamada en tiempo real, finalizando con la opción de guardar el contacto.

## 2. Alcance (Basado en Figma)
- Presentación por voz.
- "Centro de Mando" (Menú principal con botón gigante de llamar).
- Algoritmo de emparejamiento por intereses.
- Videollamada (WebRTC) con opciones: "Siguiente" y "Colgar" (con doble confirmación).
- Pantalla de resumen para "Guardar contacto".

## 3. Requisitos Funcionales (EARS)
- **RF1:** El sistema deberá transcribir la voz del usuario a texto para extraer intereses.
- **RF2:** El sistema deberá buscar coincidencias en la BD y conectar a los usuarios vía videollamada.
- **RF3:** Si el usuario pulsa "Colgar", el sistema deberá mostrar un aviso de confirmación antes de cortar.
- **RF4:** Si el usuario pulsa "Siguiente", el sistema deberá buscar un nuevo match sin salir de la videollamada.
- **RF5:** Al finalizar la llamada, el sistema deberá permitir guardar el perfil en la lista de "Contactos".

## 4. Criterios de Aceptación
- Un usuario sin permisos de cámara/micro recibe instrucciones visuales claras.
- El algoritmo debe tardar <3 segundos en proponer un match o mostrar "Buscando...".