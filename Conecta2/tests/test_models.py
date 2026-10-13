"""
Pruebas de Modelos de Base de Datos para Conecta2
Valida User, Interest y Contact con SQLAlchemy (T02).
"""

import pytest
from app import create_app
from models import db, User, Interest, Contact


@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'
    })
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def test_user_creation(app):
    user = User(nombre='Carmen')
    db.session.add(user)
    db.session.commit()

    assert user.id is not None
    assert user.nombre == 'Carmen'
    assert user.to_dict()['nombre'] == 'Carmen'


def test_interests_relationship(app):
    user = User(nombre='Antonio')
    db.session.add(user)
    db.session.commit()

    i1 = Interest(user_id=user.id, palabra_clave='cocina')
    i2 = Interest(user_id=user.id, palabra_clave='paseos')
    db.session.add_all([i1, i2])
    db.session.commit()

    user_dict = user.to_dict()
    assert 'cocina' in user_dict['interests']
    assert 'paseos' in user_dict['interests']
    assert len(user_dict['interests']) == 2


def test_contact_relationship(app):
    u1 = User(nombre='Manuel')
    u2 = User(nombre='Teresa')
    db.session.add_all([u1, u2])
    db.session.commit()

    contact = Contact(user_id=u1.id, contact_id=u2.id)
    db.session.add(contact)
    db.session.commit()

    contact_dict = contact.to_dict()
    assert contact_dict['user_id'] == u1.id
    assert contact_dict['contact_id'] == u2.id
    assert contact_dict['contact_nombre'] == 'Teresa'
