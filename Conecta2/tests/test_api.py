"""
Pruebas de la API REST para Conecta2
Valida los endpoints de extracción de voz, perfil, matching y guardado de contactos (T04, T06, T09).
"""

import pytest
from app import create_app
from models import db, User, Interest


@pytest.fixture
def client():
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'
    })
    with app.app_context():
        db.drop_all()
        db.create_all()
        with app.test_client() as test_client:
            yield test_client
            db.session.remove()
            db.drop_all()


def test_api_extract_tags(client):
    res = client.post('/api/extract_tags', json={
        'text': 'Me encanta la cocina y los paseos por el parque'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert 'tags' in data
    assert 'cocina' in data['tags'] or 'paseos' in data['tags']


def test_api_save_profile(client):
    res = client.post('/api/save_profile', json={
        'nombre': 'Teresa',
        'interests': ['tejer', 'lectura']
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['user']['nombre'] == 'Teresa'
    assert 'tejer' in data['user']['interests']


def test_api_get_match(client):
    # Guardar dos perfiles compatibles
    res1 = client.post('/api/save_profile', json={
        'nombre': 'Antonio',
        'interests': ['cocina', 'música']
    })
    u1_id = res1.get_json()['user']['id']

    res2 = client.post('/api/save_profile', json={
        'nombre': 'Elena',
        'interests': ['cocina', 'paseos']
    })

    # Buscar match para Antonio
    match_res = client.get(f'/api/users/{u1_id}/match')
    assert match_res.status_code == 200
    match_data = match_res.get_json()
    assert match_data['found'] is True
    assert match_data['candidate']['nombre'] == 'Elena'
    assert 'cocina' in match_data['common_interests']


def test_api_save_and_list_contacts(client):
    res1 = client.post('/api/save_profile', json={'nombre': 'Paco', 'interests': ['radio']})
    res2 = client.post('/api/save_profile', json={'nombre': 'Rosa', 'interests': ['radio']})

    u1_id = res1.get_json()['user']['id']
    u2_id = res2.get_json()['user']['id']

    # Guardar a Rosa en los contactos de Paco (RF5)
    save_res = client.post('/api/contacts', json={
        'user_id': u1_id,
        'contact_id': u2_id
    })
    assert save_res.status_code == 201
    save_data = save_res.get_json()
    assert save_data['status'] == 'success'

    # Consultar contactos de Paco
    list_res = client.get(f'/api/contacts/{u1_id}')
    assert list_res.status_code == 200
    contacts = list_res.get_json()['contacts']
    assert len(contacts) == 1
    assert contacts[0]['contact_nombre'] == 'Rosa'
