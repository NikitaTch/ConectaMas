"""
Pruebas del Motor de Emparejamiento (Matching Engine) para Conecta2
Valida el algoritmo de afinidad, la extracción de intereses por voz y los tiempos de respuesta (T06).
"""

import pytest
from app import create_app
from models import db, User, Interest
from matching import extract_keywords_from_speech, calculate_affinity_score, find_best_match


@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'
    })
    with app.app_context():
        # Limpiar datos de demo para pruebas controladas
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def test_extract_keywords_from_speech():
    text = "Hola, me gusta mucho la jardinería y salir a dar paseos con mis amigos"
    keywords = extract_keywords_from_speech(text)

    assert 'jardinería' in keywords or 'jardineria' in keywords
    assert 'paseos' in keywords
    assert 'hola' not in keywords
    assert 'mucho' not in keywords


def test_calculate_affinity_score():
    interests_a = ['jardinería', 'música', 'paseos']
    interests_b = ['jardineria', 'cocina', 'música']

    score, common = calculate_affinity_score(interests_a, interests_b)

    assert score > 0
    assert len(common) >= 2  # jardinería y música coinciden
    assert any('música' in c or 'musica' in c for c in common)


def test_calculate_affinity_zero_when_no_common():
    interests_a = ['tejer', 'lectura']
    interests_b = ['boxeo', 'motociclismo']

    score, common = calculate_affinity_score(interests_a, interests_b)

    assert score == 0.0
    assert len(common) == 0


def test_find_best_match_under_3_seconds(app):
    # Crear usuario 1 (principal)
    u1 = User(nombre='Carmen')
    db.session.add(u1)
    db.session.flush()
    db.session.add_all([
        Interest(user_id=u1.id, palabra_clave='jardinería'),
        Interest(user_id=u1.id, palabra_clave='paseos')
    ])

    # Crear candidato afín (coincide en jardinería)
    u2 = User(nombre='Manuel')
    db.session.add(u2)
    db.session.flush()
    db.session.add_all([
        Interest(user_id=u2.id, palabra_clave='jardinería'),
        Interest(user_id=u2.id, palabra_clave='tejer')
    ])

    # Crear candidato no afín
    u3 = User(nombre='David')
    db.session.add(u3)
    db.session.flush()
    db.session.add(Interest(user_id=u3.id, palabra_clave='astronomía'))

    db.session.commit()

    match_result = find_best_match(u1.id)

    assert match_result is not None
    assert match_result['found'] is True
    assert match_result['candidate']['id'] == u2.id
    assert match_result['candidate']['nombre'] == 'Manuel'
    assert match_result['has_common_interests'] is True
    # Criterio de aceptación: tiempo de respuesta inferior a 3 segundos
    assert match_result['response_time_ms'] < 3000
