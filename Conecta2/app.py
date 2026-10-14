"""
Aplicación Principal: Conecta2
Servidor Flask con Flask-SocketIO para señalización WebRTC y API REST de matching/contactos.
Cumple con las directrices de AGENTS.md, contitution.md, palan.md, spec.md y tasks.md.
"""

import uuid
from flask import Flask
from flask_socketio import SocketIO, emit, join_room, leave_room
from config import Config
from models import db, User, Interest
from routes.api import api_bp
from routes.views import views_bp
from matching import calculate_affinity_score


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Inicializar Base de Datos con SQLAlchemy
    db.init_app(app)

    # Registrar Blueprints
    app.register_blueprint(api_bp)
    app.register_blueprint(views_bp)

    with app.app_context():
        db.create_all()

        # Poblar con usuarios iniciales si la tabla está vacía
        if User.query.count() == 0:
            demo_users = [
                ("Carmen", ["jardinería", "plantas", "paseos", "música"]),
                ("Antonio", ["cocina", "recetas", "paseos", "radio"]),
                ("Teresa", ["tejer", "manualidades", "lectura", "animales"]),
                ("Manuel", ["jardinería", "naturaleza", "música", "viajes"])
            ]
            for nombre, intereses in demo_users:
                u = User(nombre=nombre)
                db.session.add(u)
                db.session.flush()
                for tag in intereses:
                    db.session.add(Interest(user_id=u.id, palabra_clave=tag))
            db.session.commit()

    return app


app = create_app()

# Configuración de SocketIO para señalización WebRTC en tiempo real
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    ping_timeout=30,
    ping_interval=10
)

# Estructura en memoria para la señalización de llamadas:
waiting_clients = []
active_peers = {}


@socketio.on('connect')
def handle_connect():
    pass


@socketio.on('disconnect')
def handle_disconnect():
    from flask import request
    sid = request.sid

    global waiting_clients
    waiting_clients = [c for c in waiting_clients if c['sid'] != sid]

    if sid in active_peers:
        peer_info = active_peers.pop(sid, None)
        if peer_info:
            room = peer_info.get('room')
            peer_sid = peer_info.get('peer_sid')
            if peer_sid and peer_sid in active_peers:
                active_peers.pop(peer_sid, None)
                emit('peer_left', {'message': 'Tu interlocutor ha abandonado la llamada.'}, room=peer_sid)


def process_join(sid, data):
    """
    Gestiona la entrada de un cliente a la cola y el emparejamiento por afinidad.
    Permite tanto emparejar distintos usuarios como conectar pestañas locales en pruebas.
    """
    user_id = data.get('user_id')
    user_nombre = data.get('nombre', 'Usuario')
    user_interests = data.get('interests', [])

    global waiting_clients
    waiting_clients = [c for c in waiting_clients if c['sid'] != sid]
    if sid in active_peers:
        active_peers.pop(sid, None)

    best_candidate = None
    best_score = -1.0

    # Prioridad 1: Candidato con socket distinto y preferiblemente usuario distinto
    for candidate in waiting_clients:
        if candidate['sid'] != sid:
            if user_id is None or candidate.get('user_id') != user_id:
                score, _ = calculate_affinity_score(user_interests, candidate.get('interests', []))
                if score > best_score:
                    best_score = score
                    best_candidate = candidate

    # Prioridad 2: Si no hay usuario distinto, permitir emparejar cualquier pestaña abierta en espera
    if best_candidate is None:
        for candidate in waiting_clients:
            if candidate['sid'] != sid:
                best_candidate = candidate
                best_score = 0.0
                break

    if best_candidate is None:
        waiting_clients.append({
            'sid': sid,
            'user_id': user_id,
            'nombre': user_nombre,
            'interests': user_interests
        })
        emit('waiting', {
            'message': 'Buscando a otra persona compatible para conectar…'
        }, room=sid)
    else:
        waiting_clients.remove(best_candidate)
        room_id = f"room_{uuid.uuid4().hex[:10]}"

        peer_sid = best_candidate['sid']
        peer_nombre = best_candidate['nombre']
        peer_id = best_candidate['user_id']

        join_room(room_id, sid=sid)
        join_room(room_id, sid=peer_sid)

        active_peers[sid] = {'room': room_id, 'peer_sid': peer_sid, 'user_id': peer_id, 'nombre': peer_nombre}
        active_peers[peer_sid] = {'room': room_id, 'peer_sid': sid, 'user_id': user_id, 'nombre': user_nombre}

        emit('matched', {
            'room': room_id,
            'initiator': True,
            'peer_id': peer_id,
            'peer_nombre': peer_nombre,
            'affinity_score': max(0.0, best_score)
        }, room=sid)

        emit('matched', {
            'room': room_id,
            'initiator': False,
            'peer_id': user_id,
            'peer_nombre': user_nombre,
            'affinity_score': max(0.0, best_score)
        }, room=peer_sid)


@socketio.on('join_call')
def handle_join_call(data):
    from flask import request
    process_join(request.sid, data)


@socketio.on('signal')
def handle_signal(data):
    from flask import request
    sid = request.sid
    peer_info = active_peers.get(sid)
    if peer_info:
        room = peer_info.get('room')
        signal_data = data.get('signal')
        emit('signal', signal_data, room=room, include_self=False)


@socketio.on('next_peer')
def handle_next_peer(data):
    from flask import request
    sid = request.sid

    if sid in active_peers:
        peer_info = active_peers.pop(sid, None)
        if peer_info:
            room = peer_info.get('room')
            peer_sid = peer_info.get('peer_sid')
            leave_room(room, sid=sid)
            if peer_sid and peer_sid in active_peers:
                active_peers.pop(peer_sid, None)
                leave_room(room, sid=peer_sid)
                emit('peer_left', {'message': 'Tu interlocutor ha pasado al siguiente participante.'}, room=peer_sid)

    process_join(sid, data)


@socketio.on('hangup')
def handle_hangup(data):
    from flask import request
    sid = request.sid

    if sid in active_peers:
        peer_info = active_peers.pop(sid, None)
        if peer_info:
            room = peer_info.get('room')
            peer_sid = peer_info.get('peer_sid')
            leave_room(room, sid=sid)
            if peer_sid and peer_sid in active_peers:
                active_peers.pop(peer_sid, None)
                leave_room(room, sid=peer_sid)
                emit('peer_left', {'message': 'La llamada ha finalizado.'}, room=peer_sid)


if __name__ == '__main__':
    print("Iniciando Conecta2 en http://localhost:5000...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
