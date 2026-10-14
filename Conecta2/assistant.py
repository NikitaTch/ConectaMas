"""
Asistente Virtual / Chatbot de Ayuda para Conecta2
Proporciona respuestas empáticas, claras y adaptadas para personas mayores (65-80+ años).
Soporta:
1. Integración con Google Gemini API si existe GEMINI_API_KEY.
2. Motor de conocimiento experto local (offline / zero-config).
"""

import os
import re

KNOWLEDGE_BASE = [
    {
        'keywords': ['llamar', 'llamada', 'videollamada', 'empezar', 'iniciar', 'conectar', 'hablar'],
        'answer': 'Para iniciar una videollamada, ve al Centro de Mando y pulsa el botón verde gigante que dice "INICIAR LLAMADA". El sistema buscará automáticamente a una persona con aficiones parecidas a las tuyas y os conectará.'
    },
    {
        'keywords': ['interes', 'intereses', 'gustos', 'aficion', 'aficiones', 'pasatiempo', 'cambiar gustos'],
        'answer': 'Puedes ver y añadir tus gustos en el botón "Mis Intereses" del Centro de Mando. Allí puedes escribir nuevas aficiones, pulsar el micrófono para decirlas con tu voz, o pulsar las sugerencias para activarlas. No olvides pulsar "Guardar Cambios".'
    },
    {
        'keywords': ['contacto', 'contactos', 'guardar', 'amigo', 'amigos'],
        'answer': 'Al terminar una videollamada, aparecerá la pantalla de resumen. Solo tienes que pulsar el botón verde "Guardar en mis Contactos" y esa persona quedará registrada en tu lista para recordarla.'
    },
    {
        'keywords': ['camara', 'cámara', 'microfono', 'micrófono', 'permiso', 'permisos', 'escuchan', 'veo', 'negro', 'sonido'],
        'answer': 'Si no se ve la cámara o no se escucha el micrófono, comprueba los permisos del navegador. En la barra de arriba (donde pone la dirección web) suele haber un candado o icono de cámara: pulsa sobre él y selecciona "Permitir" para cámara y micrófono.'
    },
    {
        'keywords': ['seguro', 'seguridad', 'privacidad', 'datos', 'dinero', 'gratis', 'peligro'],
        'answer': 'Conecta2 es totalmente gratuito, seguro y privado. Nunca te pediremos apellidos reales, número de teléfono, dirección ni datos bancarios. Solo compartes tu nombre de pila y tus aficiones.'
    },
    {
        'keywords': ['siguiente', 'cambiar persona', 'otra persona', 'otro'],
        'answer': 'Si estás en una videollamada y quieres hablar con otra persona, pulsa el botón azul "SIGUIENTE" que verás abajo en la pantalla. Buscará a otro participante sin necesidad de colgar.'
    },
    {
        'keywords': ['colgar', 'terminar', 'salir', 'cerrar'],
        'answer': 'Para terminar una llamada, pulsa el botón rojo "COLGAR". Por seguridad para no pulsar por error, te mostraremos un aviso preguntando si estás seguro. Si confirmas, la llamada finalizará y podrás guardar el contacto.'
    },
    {
        'keywords': ['hola', 'buenos dias', 'buenas tardes', 'saludos', 'ayuda', 'quien eres'],
        'answer': '¡Hola! Soy tu asistente de Conecta2. Estoy aquí para ayudarte a usar la aplicación de forma fácil y sin complicaciones. ¿Tienes alguna pregunta sobre cómo llamar, guardar amigos o añadir tus gustos?'
    }
]


def ask_assistant(question: str) -> str:
    """
    Responde a la duda del usuario. Si hay GEMINI_API_KEY configurada, intenta
    usar Gemini; si no o ante cualquier error, usa la base de conocimiento local experta.
    """
    clean_q = question.strip() if question else ""
    if not clean_q:
        return "No he escuchado ninguna pregunta. Pulsa el botón del micrófono y dime en qué te puedo ayudar."

    # Intentar responder con Gemini si la API key está disponible
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = (
                "Eres el asistente amigable y paciente de la aplicación web 'Conecta2', diseñada para personas "
                "mayores de 80 años para combatir la soledad no deseada mediante videollamadas y aficiones comunes. "
                "Reglas para tu respuesta:\n"
                "- Tono cálido, muy respetuoso, claro y comprensivo (trátales de usted o de forma muy cariñosa y cercana).\n"
                "- Respuestas breves (máximo 3 o 4 frases sencillas, sin tecnicismos).\n"
                "- Conecta2 tiene: Centro de Mando, Botón verde gigante 'Iniciar llamada', 'Mis Intereses' para aficiones, "
                "'Mis Contactos' para amigos guardados, videollamadas con botón 'Siguiente' y 'Colgar' con confirmación.\n\n"
                f"Pregunta del usuario mayor: {clean_q}"
            )
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            # Si falla la llamada externa, continuar con la base de conocimiento local
            pass

    # Base de conocimiento local adaptada
    clean_lower = clean_q.lower()
    clean_words = set(re.findall(r'\w+', clean_lower))

    best_match = None
    best_overlap = 0

    for item in KNOWLEDGE_BASE:
        overlap = len(clean_words.intersection(set(item['keywords'])))
        if overlap > best_overlap:
            best_overlap = overlap
            best_match = item

    if best_match and best_overlap > 0:
        return best_match['answer']

    return (
        f"He recibido tu pregunta: «{clean_q}». Recuerda que en Conecta2 puedes pulsar el botón verde gigante "
        f"para iniciar una llamada con alguien afín a ti, o pulsar 'Mis Intereses' para actualizar tus aficiones."
    )
