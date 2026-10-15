"""
Pruebas de la API REST para Conecta2
Valida los endpoints de extracción de voz, perfil, matching, guardado de contactos y chatbot asistente.
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


def test_api_save_and_update_profile(client):
    # 1. Crear nuevo usuario
    res = client.post('/api/save_profile', json={
        'nombre': 'Teresa',
        'interests': ['tejer', 'lectura']
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['status'] == 'success'
    user_id = data['user']['id']
    assert data['user']['nombre'] == 'Teresa'
    assert 'tejer' in data['user']['interests']

    # 2. Actualizar el perfil existente sin duplicar usuario
    res_update = client.post('/api/save_profile', json={
        'user_id': user_id,
        'nombre': 'Teresa M.',
        'interests': ['tejer', 'jardinería', 'cine']
    })
    assert res_update.status_code == 200
    updated_data = res_update.get_json()
    assert updated_data['user']['id'] == user_id
    assert updated_data['user']['nombre'] == 'Teresa M.'
    assert 'jardinería' in updated_data['user']['interests']
    assert 'cine' in updated_data['user']['interests']
    assert 'lectura' not in updated_data['user']['interests']


def test_api_update_user_interests(client):
    res = client.post('/api/save_profile', json={
        'nombre': 'Paco',
        'interests': ['radio']
    })
    user_id = res.get_json()['user']['id']

    # Actualizar intereses con endpoint dedicado
    res_interests = client.post(f'/api/users/{user_id}/interests', json={
        'interests': ['radio', 'dominó', 'paseos']
    })
    assert res_interests.status_code == 200
    data = res_interests.get_json()
    assert 'dominó' in data['interests']
    assert 'paseos' in data['interests']
    assert len(data['interests']) == 3


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


def test_api_assistant_chat(client):
    res = client.post('/api/assistant/chat', json={
        'message': '¿Cómo puedo hacer una llamada?'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'answer' in data
    assert 'INICIAR LLAMADA' in data['answer'] or 'botón verde' in data['answer'].lower()


def test_auth_register(client):
    res = client.post('/api/auth/register', json={
        'nombre': 'Manolo',
        'pin': '4321',
        'interests': ['paseos', 'huerto']
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'device_token' in data
    assert data['user']['nombre'] == 'Manolo'
    assert 'huerto' in data['user']['interests']


def test_auth_register_invalid(client):
    # Sin nombre
    res1 = client.post('/api/auth/register', json={'pin': '1234'})
    assert res1.status_code == 400

    # PIN inválido (menos de 4 dígitos o letras)
    res2 = client.post('/api/auth/register', json={'nombre': 'Pepe', 'pin': '12'})
    assert res2.status_code == 400

    res3 = client.post('/api/auth/register', json={'nombre': 'Pepe', 'pin': 'abcd'})
    assert res3.status_code == 400


def test_auth_register_default_pin(client):
    # Registrar sin especificar PIN debe asignar 1234 y funcionar correctamente
    res = client.post('/api/auth/register', json={
        'nombre': 'Rosa',
        'interests': ['tejer']
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['status'] == 'success'
    u_id = data['user']['id']

    # Probar que el PIN asignado por defecto es 1234
    res_login = client.post('/api/auth/login_pin', json={'user_id': u_id, 'pin': '1234'})
    assert res_login.status_code == 200



def test_auth_login_pin(client):
    reg = client.post('/api/auth/register', json={'nombre': 'Lucia', 'pin': '5678'})
    u_id = reg.get_json()['user']['id']

    # Login correcto
    res_ok = client.post('/api/auth/login_pin', json={'user_id': u_id, 'pin': '5678'})
    assert res_ok.status_code == 200
    data_ok = res_ok.get_json()
    assert data_ok['status'] == 'success'
    assert 'device_token' in data_ok

    # Login con PIN erróneo
    res_err = client.post('/api/auth/login_pin', json={'user_id': u_id, 'pin': '0000'})
    assert res_err.status_code == 401
    assert 'PIN no es correcto' in res_err.get_json()['message']


def test_auth_validate_token_and_logout(client):
    reg = client.post('/api/auth/register', json={'nombre': 'Andrés', 'pin': '9876'})
    token = reg.get_json()['device_token']

    # Validar token válido
    res_valid = client.post('/api/auth/validate_token', json={'device_token': token})
    assert res_valid.status_code == 200
    assert res_valid.get_json()['user']['nombre'] == 'Andrés'

    # Validar token inexistente
    res_invalid = client.post('/api/auth/validate_token', json={'device_token': 'inventado_123'})
    assert res_invalid.status_code == 401

    # Logout
    res_logout = client.post('/api/auth/logout', json={'device_token': token})
    assert res_logout.status_code == 200

    # El token ya no debe ser válido
    res_after = client.post('/api/auth/validate_token', json={'device_token': token})
    assert res_after.status_code == 401


def test_auth_users_list(client):
    client.post('/api/auth/register', json={'nombre': 'Beatriz', 'pin': '1111'})
    res = client.get('/api/auth/users_list')
    assert res.status_code == 200
    users = res.get_json()['users']
    assert any(u['nombre'] == 'Beatriz' and u['has_pin'] is True for u in users)

