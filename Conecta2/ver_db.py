"""
Script de utilidad para consultar y visualizar la base de datos de Conecta2.
Ejecución: python ver_db.py
"""

import sys

# Asegurar codificación utf-8 en terminales Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app import create_app
from models import db, User, Interest, Contact

app = create_app()

with app.app_context():
    print("=" * 60)
    print(" BASE DE DATOS DE CONECTA2")
    print(f" Conectado a: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print("=" * 60)

    # 1. USUARIOS E INTERESES
    users = User.query.all()
    print(f"\n[+] USUARIOS REGISTRADOS ({len(users)}):")
    print("-" * 60)
    if not users:
        print("  (No hay usuarios)")
    for u in users:
        intereses = [i.palabra_clave for i in u.interests]
        print(f"  ID {u.id:2d} | Nombre: {u.nombre:<15} | Intereses: {', '.join(intereses) if intereses else 'Sin intereses'}")

    # 2. CONTACTOS
    contacts = Contact.query.all()
    print(f"\n[+] RELACIONES DE CONTACTOS ({len(contacts)}):")
    print("-" * 60)
    if not contacts:
        print("  (No hay contactos guardados todavía)")
    for c in contacts:
        u_owner = db.session.get(User, c.user_id)
        u_contact = db.session.get(User, c.contact_id)
        owner_name = u_owner.nombre if u_owner else f"ID {c.user_id}"
        contact_name = u_contact.nombre if u_contact else f"ID {c.contact_id}"
        print(f"  Usuario '{owner_name}' (ID {c.user_id}) tiene guardado a '{contact_name}' (ID {c.contact_id})")

    print("\n" + "=" * 60)
