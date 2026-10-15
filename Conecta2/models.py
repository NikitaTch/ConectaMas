"""
Modelos de Base de Datos para Conecta2
Definidos con SQLAlchemy siguiendo las especificaciones del SDD_Conecta2.
Tablas:
- users: id, nombre, pin_hash, device_token, created_at
- interests: id, user_id (FK), palabra_clave
- contacts: id, user_id (FK), contact_id (FK), created_at
"""

import secrets
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    pin_hash = db.Column(db.String(256), nullable=True)
    device_token = db.Column(db.String(64), nullable=True, unique=True, index=True)
    created_at = db.Column(db.DateTime, default=utc_now)

    # Relación con intereses
    interests = db.relationship(
        'Interest',
        backref='user',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def set_pin(self, pin_code: str):
        """Almacena el PIN de 4 dígitos de forma segura (hasheado)."""
        clean_pin = str(pin_code).strip()
        self.pin_hash = generate_password_hash(clean_pin)

    def check_pin(self, pin_code: str) -> bool:
        """Verifica si el PIN introducido coincide con el almacenado."""
        if not self.pin_hash:
            return True  # Usuarios iniciales/demo sin PIN requerido
        clean_pin = str(pin_code).strip()
        return check_password_hash(self.pin_hash, clean_pin)

    def issue_device_token(self) -> str:
        """Genera un token seguro para recordar este dispositivo (Opción 3)."""
        self.device_token = secrets.token_urlsafe(32)
        return self.device_token

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'has_pin': bool(self.pin_hash),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'interests': [interest.palabra_clave for interest in self.interests]
        }


class Interest(db.Model):
    __tablename__ = 'interests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    palabra_clave = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'palabra_clave': self.palabra_clave
        }


class Contact(db.Model):
    __tablename__ = 'contacts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    # Relaciones hacia User
    owner = db.relationship('User', foreign_keys=[user_id], backref='my_contacts')
    contact_user = db.relationship('User', foreign_keys=[contact_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'contact_id': self.contact_id,
            'contact_nombre': self.contact_user.nombre if self.contact_user else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
