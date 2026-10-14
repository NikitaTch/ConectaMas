"""
Rutas de la API REST para Conecta2
Cumple con los requisitos RF1, RF2, RF4 y RF5 de spec.md y tareas T04, T06 y T09 de tasks.md.
"""

from flask import Blueprint, jsonify, request
from models import db, User, Interest, Contact
from matching import extract_keywords_from_speech, find_best_match
from assistant import ask_assistant

api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.route('/extract_tags', methods=['POST'])
def extract_tags():
    """
    RF1: Extrae palabras clave de aficiones a partir del texto transcrito por voz.
    """
    data = request.get_json(silent=True) or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'tags': []}), 200

    tags = extract_keywords_from_speech(text)
    return jsonify({
        'text': text,
        'tags': tags
    }), 200


@api_bp.route('/save_profile', methods=['POST'])
@api_bp.route('/users', methods=['POST'])
def save_profile():
    """
    T04: Guardar o actualizar perfil e intereses en la base de datos.
    Si se proporciona user_id o id, actualiza el usuario existente en vez de duplicarlo.
    """
    data = request.get_json(silent=True) or {}
    user_id = data.get('user_id') or data.get('id')
    nombre = data.get('nombre', '').strip()
    intereses_input = data.get('interests', [])
    speech_text = data.get('speech_text', '').strip()

    tags_set = set()
    if speech_text:
        extracted = extract_keywords_from_speech(speech_text)
        tags_set.update(extracted)

    if isinstance(intereses_input, list):
        for item in intereses_input:
            if isinstance(item, str) and item.strip():
                tags_set.add(item.strip().lower())

    if not tags_set:
        tags_set = {'paseos', 'música'}

    # Si se pasa un user_id existente, actualizar
    if user_id:
        try:
            uid = int(user_id)
            existing_user = db.session.get(User, uid)
            if existing_user:
                if nombre:
                    existing_user.nombre = nombre
                # Reemplazar intereses
                Interest.query.filter_by(user_id=existing_user.id).delete()
                for tag in tags_set:
                    db.session.add(Interest(user_id=existing_user.id, palabra_clave=tag))
                db.session.commit()
                return jsonify({
                    'status': 'success',
                    'message': f'Perfil de {existing_user.nombre} actualizado correctamente.',
                    'user': existing_user.to_dict()
                }), 200
        except (ValueError, TypeError):
            pass

    # Crear nuevo usuario
    if not nombre:
        nombre = "Amigo/a Conecta2"

    user = User(nombre=nombre)
    db.session.add(user)
    db.session.flush()

    for tag in tags_set:
        interest = Interest(user_id=user.id, palabra_clave=tag)
        db.session.add(interest)

    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': f'Perfil de {user.nombre} guardado correctamente.',
        'user': user.to_dict()
    }), 201


@api_bp.route('/users/<int:user_id>/interests', methods=['POST', 'PUT'])
def update_user_interests(user_id):
    """
    Actualiza la lista de intereses de un usuario específico.
    Permite añadir, eliminar y modificar aficiones guardadas.
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    data = request.get_json(silent=True) or {}
    intereses_input = data.get('interests', [])

    new_tags = []
    if isinstance(intereses_input, list):
        for item in intereses_input:
            if isinstance(item, str) and item.strip():
                tag = item.strip().lower()
                if tag not in new_tags:
                    new_tags.append(tag)

    if not new_tags:
        new_tags = ['paseos', 'música']

    # Actualizar intereses en BD
    Interest.query.filter_by(user_id=user.id).delete()
    for tag in new_tags:
        db.session.add(Interest(user_id=user.id, palabra_clave=tag))
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': 'Intereses actualizados correctamente.',
        'interests': [i.palabra_clave for i in user.interests],
        'user': user.to_dict()
    }), 200


@api_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Obtiene el perfil y los intereses de un usuario."""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify(user.to_dict()), 200


@api_bp.route('/users/<int:user_id>/match', methods=['GET'])
def get_match(user_id):
    """
    RF2 & T06: Motor de matching. Devuelve el usuario más compatible basado en afinidad.
    """
    match_result = find_best_match(user_id)
    if match_result is None:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    return jsonify(match_result), 200


@api_bp.route('/contacts', methods=['POST'])
def save_contact():
    """
    RF5 & T09: Guardar contacto tras finalizar la llamada.
    """
    data = request.get_json(silent=True) or {}
    user_id = data.get('user_id')
    contact_id = data.get('contact_id')

    if not user_id or not contact_id:
        return jsonify({'error': 'Se requieren user_id y contact_id'}), 400

    try:
        user_id = int(user_id)
        contact_id = int(contact_id)
    except (TypeError, ValueError):
        return jsonify({'error': 'IDs inválidos'}), 400

    if user_id == contact_id:
        return jsonify({'error': 'No puedes agregarte a ti mismo como contacto'}), 400

    # Comprobar si ya existe la relación
    existing = Contact.query.filter_by(user_id=user_id, contact_id=contact_id).first()
    if existing:
        return jsonify({
            'status': 'exists',
            'message': 'Este contacto ya estaba guardado en tu lista.',
            'contact': existing.to_dict()
        }), 200

    contact = Contact(user_id=user_id, contact_id=contact_id)
    db.session.add(contact)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': 'Contacto guardado con éxito.',
        'contact': contact.to_dict()
    }), 201


@api_bp.route('/contacts/<int:user_id>', methods=['GET'])
def list_contacts(user_id):
    """Lista todos los contactos guardados por un usuario."""
    contacts = Contact.query.filter_by(user_id=user_id).order_by(Contact.created_at.desc()).all()
    return jsonify({
        'user_id': user_id,
        'contacts': [c.to_dict() for c in contacts]
    }), 200


@api_bp.route('/assistant/chat', methods=['POST'])
def assistant_chat():
    """
    Chatbot de ayuda accesible para el Centro de Mando.
    Responde dudas sobre el funcionamiento de Conecta2 por voz o texto.
    """
    data = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    answer = ask_assistant(message)
    return jsonify({
        'status': 'success',
        'question': message,
        'answer': answer
    }), 200


@api_bp.route('/seed_demo_users', methods=['POST'])
def seed_demo_users():
    """
    Puebla la base de datos con usuarios y perfiles iniciales para poder probar
    emparejamientos de aficiones de inmediato.
    """
    demo_profiles = [
        {"nombre": "Carmen", "interests": ["jardinería", "plantas", "paseos", "música"]},
        {"nombre": "Antonio", "interests": ["cocina", "recetas", "paseos", "radio"]},
        {"nombre": "Teresa", "interests": ["tejer", "manualidades", "lectura", "gatos"]},
        {"nombre": "Manuel", "interests": ["jardinería", "naturaleza", "música", "viajes"]}
    ]

    created = 0
    for profile in demo_profiles:
        existing = User.query.filter_by(nombre=profile["nombre"]).first()
        if not existing:
            u = User(nombre=profile["nombre"])
            db.session.add(u)
            db.session.flush()
            for kw in profile["interests"]:
                db.session.add(Interest(user_id=u.id, palabra_clave=kw))
            created += 1

    db.session.commit()
    return jsonify({
        'status': 'success',
        'message': f'Se han añadido {created} perfiles de demostración.'
    }), 200
