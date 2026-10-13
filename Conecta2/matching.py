"""
Motor de Emparejamiento (Matching Engine) para Conecta2
Evalúa afinidad de intereses entre usuarios en la base de datos (tiempo de respuesta < 3s).
"""

import re
import time
from models import db, User, Interest


STOP_WORDS = {
    'y', 'e', 'ni', 'o', 'u', 'a', 'de', 'en', 'por', 'con', 'para', 'el', 'la',
    'los', 'las', 'un', 'una', 'unos', 'unas', 'mi', 'mis', 'tu', 'tus', 'su',
    'sus', 'me', 'gusta', 'gustan', 'mucho', 'bastante', 'hacer', 'tambien',
    'también', 'soy', 'es', 'son', 'bueno', 'buena', 'hola', 'sobre', 'todo',
    'al', 'del', 'que', 'como', 'pero', 'mas', 'más', 'si', 'no'
}

DEFAULT_INTEREST_TAGS = [
    'jardineria', 'jardinería', 'cocina', 'paseos', 'musica', 'música',
    'tejer', 'naturaleza', 'lectura', 'cine', 'animales', 'viajes',
    'manualidades', 'poesia', 'poesía', 'bailar', 'radio', 'pintura'
]


def extract_keywords_from_speech(text: str) -> list[str]:
    """
    Extrae palabras clave de aficiones a partir del texto transcrito por voz.
    Limpia signos de puntuación, artículos, conjunciones y verbos auxiliares.
    """
    if not text:
        return []

    text_clean = re.sub(r'[^\w\s]', ' ', text.lower())
    words = [w.strip() for w in text_clean.split() if w.strip()]

    # Filtrar palabras vacías y palabras cortas
    keywords = []
    for word in words:
        if len(word) >= 4 and word not in STOP_WORDS:
            # Normalizar tildes si es necesario o conservar palabra limpia
            keywords.append(word)

    # Eliminar duplicados manteniendo orden
    seen = set()
    result = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            result.append(kw)

    # Si no se extrajo ninguna palabra clave significativa pero se mencionan términos comunes
    if not result:
        for tag in DEFAULT_INTEREST_TAGS:
            if tag in text_clean and tag not in result:
                result.append(tag)

    return result


def normalize_keyword(keyword: str) -> str:
    """Normaliza una palabra clave para comparación insensible a tildes y mayúsculas."""
    kw = keyword.lower().strip()
    replacements = (('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ú', 'u'), ('ñ', 'n'))
    for orig, repl in replacements:
        kw = kw.replace(orig, repl)
    return kw


def calculate_affinity_score(user_interests: list[str], candidate_interests: list[str]) -> tuple[float, list[str]]:
    """
    Calcula la afinidad entre dos listas de intereses y devuelve (puntuación, intereses_comunes).
    Puntuación basada en similitud de Jaccard y coincidencias directas.
    """
    if not user_interests or not candidate_interests:
        return 0.0, []

    user_normalized = {normalize_keyword(k): k for k in user_interests}
    candidate_normalized = {normalize_keyword(k): k for k in candidate_interests}

    common_keys = set(user_normalized.keys()).intersection(set(candidate_normalized.keys()))

    if not common_keys:
        return 0.0, []

    # Intereses comunes en su formato legible original
    common_interests = [user_normalized[k] for k in common_keys]

    # Similitud de Jaccard: intersección / unión
    union_len = len(set(user_normalized.keys()).union(set(candidate_normalized.keys())))
    score = (len(common_keys) / union_len) * 100.0 if union_len > 0 else 0.0

    return round(score, 1), common_interests


def find_best_match(user_id: int) -> dict | None:
    """
    Busca al usuario más compatible en la base de datos para el usuario dado.
    Garantiza una respuesta rápida (< 3 segundos).
    """
    start_time = time.time()

    current_user = db.session.get(User, user_id)
    if not current_user:
        return None

    current_interests = [i.palabra_clave for i in current_user.interests]

    # Obtener candidatos distintos al usuario actual
    candidates = User.query.filter(User.id != user_id).all()
    if not candidates:
        return {
            'found': False,
            'message': 'Hemos guardado tus gustos. Te avisaremos cuando llegue alguien compatible.',
            'candidate': None,
            'common_interests': [],
            'score': 0.0,
            'response_time_ms': round((time.time() - start_time) * 1000, 2)
        }

    scored_candidates = []
    for candidate in candidates:
        candidate_interests = [i.palabra_clave for i in candidate.interests]
        score, common = calculate_affinity_score(current_interests, candidate_interests)
        scored_candidates.append({
            'candidate': candidate,
            'score': score,
            'common_interests': common,
            'interests': candidate_interests
        })

    # Ordenar por mayor afinidad; si empatan en 0, preferir el más reciente
    scored_candidates.sort(key=lambda x: (x['score'], x['candidate'].id), reverse=True)

    best = scored_candidates[0]
    elapsed = round((time.time() - start_time) * 1000, 2)

    return {
        'found': True,
        'candidate': best['candidate'].to_dict(),
        'score': best['score'],
        'common_interests': best['common_interests'],
        'has_common_interests': len(best['common_interests']) > 0,
        'message': f"¡Hemos encontrado a {best['candidate'].nombre}!" if best['score'] > 0 else f"{best['candidate'].nombre} está disponible para conversar.",
        'response_time_ms': elapsed
    }
