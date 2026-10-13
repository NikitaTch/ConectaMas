"""
Modelos de Base de Datos para Conecta2
Definidos con SQLAlchemy siguiendo las especificaciones del SDD_Conecta2.
Tablas:
- users: id, nombre, created_at
- interests: id, user_id (FK), palabra_clave
- contacts: id, user_id (FK), contact_id (FK), created_at
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    # Relación con intereses
    interests = db.relationship(
        'Interest',
        backref='user',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
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
