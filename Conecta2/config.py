"""
Configuración de la aplicación Conecta2.
Soporta PostgreSQL (especificado en SDD) y SQLite (por defecto para despliegue local inmediato).
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'conecta2-super-secret-key-2026')

    # Si se define DATABASE_URL (ej. postgresql://user:pass@localhost:5432/conecta2), se usa PostgreSQL;
    # en caso contrario, se utiliza SQLite local garantizando ejecución inmediata sin requerir configuración externa.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{BASE_DIR / 'conecta2.db'}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
