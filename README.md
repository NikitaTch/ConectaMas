# Conecta+

Prototipo en C# y Blazor basado en `prototipo conecta+.html`. Incluye inicio y ayuda por voz, intereses, contactos y videollamadas entre dos pestañas abiertas en el mismo localhost. La llamada usa WebRTC para enviar audio y vídeo directamente entre los dos navegadores; el servidor local solo empareja las pestañas e intercambia los mensajes de conexión.

## Ejecutar una llamada local

1. Desde esta carpeta, ejecuta `dotnet run`.
2. Abre la dirección `http://localhost:5125` en dos pestañas del navegador.
3. En cada pestaña, pulsa **Iniciar llamada** y permite el uso de cámara y micrófono.

La segunda pestaña se emparejará con la primera. **Siguiente** busca otra pestaña que esté esperando; **Finalizar** cierra la llamada y apaga cámara y micrófono. Esta versión está pensada para probar en el mismo equipo, no conecta participantes por Internet.
