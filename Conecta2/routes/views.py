"""
Vistas web para la interfaz de Conecta2.
"""

from flask import Blueprint, render_template

views_bp = Blueprint('views', __name__)


@views_bp.route('/')
def index():
    """Sirve la aplicación web de Conecta2."""
    return render_template('index.html')
