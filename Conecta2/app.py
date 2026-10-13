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
# waiting_clients: lista de dicts { 'sid': str, 'user_id': int, 'nombre': str, 'interests': list[str] }
# active_peers: dict mapeando sid -> { 'room': str, 'peer_sid': str, 'user_id': int, 'nombre': str }
waiting_clients = []
active_peers = {}


@socketio.on('connect')
def handle_connect():
    pass


@socketio.on('disconnect')
def handle_disconnect():
    from flask import request
    sid = request.sid

    # Si estaba en lista de espera, retirarlo
    global waiting_clients
    waiting_clients = [c for c in waiting_clients if c['sid'] != sid]

    # Si estaba en una llamada activa, avisar al interlocutor
    if sid in active_peers:
        peer_info = active_peers.pop(sid, None)
        if peer_info:
            room = peer_info.get('room')
            peer_sid = peer_info.get('peer_sid')
            if peer_sid and peer_sid in active_peers:
                active_peers.pop(peer_sid, None)
                emit('peer_left', {'message': 'Tu interlocutor ha abandonado la llamada.'}, room=peer_sid)


@socketio.on('join_call')
def handle_join_call(data):
    """
    Un usuario entra en la sala de llamadas.
    El servidor busca entre los clientes que están esperando al más compatible según intereses,
    o al siguiente en cola si no hay coincidencias exactas.
    """
    from flask import request
    sid = request.sid
    user_id = data.get('user_id')
    user_nombre = data.get('nombre', 'Usuario')
    user_interests = data.get('interests', [])

    # Limpiar cualquier estado previo del cliente
    global waiting_clients
    waiting_clients = [c for c in waiting_clients if c['sid'] != sid]
    if sid in active_peers:
        active_peers.pop(sid, None)

    # Buscar entre los clientes esperando (excluyendo conexiones duplicadas del mismo usuario si las hubiera)
    best_candidate = None
    best_score = -1.0

    for candidate in waiting_clients:
        if candidate['user_id'] != user_id:
            score, _ = calculate_affinity_score(user_interests, candidate.get('interests', []))
            if score > best_score:
                best_score = score
                best_candidate = candidate

    if best_candidate is None:
        # Nadie disponible en este instante; ponerse en cola de espera
        waiting_clients.append({
            'sid': sid,
            'user_id': user_id,
            'nombre': user_nombre,
            'interests': user_interests
        })
        emit('waiting', {
            'message': 'Buscando a otra persona compatible para conectar…'
        })
    else:
        # Emparejar al usuario con el mejor candidato disponible
        waiting_clients.remove(best_candidate)
        room_id = f"room_{uuid.uuid4().hex[:10]}"

        peer_sid = best_candidate['sid']
        peer_nombre = best_candidate['nombre']
        peer_id = best_candidate['user_id']

        join_room(room_id, sid=sid)
        join_room(room_id, sid=peer_sid)

        active_peers[sid] = {'room': room_id, 'peer_sid': peer_sid, 'user_id': peer_id, 'nombre': peer_nombre}
        active_peers[peer_sid] = {'room': room_id, 'peer_sid': sid, 'user_id': user_id, 'nombre': user_nombre}

        # Notificar a ambos clientes que están conectados
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


@socketio.on('signal')
def handle_signal(data):
    """
    Reenvía paquetes de señalización WebRTC (Offer, Answer, ICE Candidates)
    al otro participante en el room.
    """
    from flask import request
    sid = request.sid
    peer_info = active_peers.get(sid)
    if peer_info:
        room = peer_info.get('room')
        signal_data = data.get('signal')
        emit('signal', signal_data, room=room, include_self=False)


@socketio.on('next_peer')
def handle_next_peer(data):
    """
    RF4: El usuario pulsa 'Siguiente' para buscar otro match sin salir de la vista de vídeo.
    """
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

    # Volver a entrar en la cola
    handle_join_call(data)


@socketio.on('hangup')
def handle_hangup(data):
    """
    RF3 & T08: Al colgar tras la confirmación, cierra la videollamada y libera los recursos.
    """
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
    # Ejecución local en el puerto 5000 o configurable
    print("Iniciando Conecta2 en http://localhost:5000...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
