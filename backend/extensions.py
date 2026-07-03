"""
Shared Flask extensions to avoid circular imports.
"""
from flask_socketio import SocketIO

# Initialize SocketIO instance (configured in app.py)
socketio = SocketIO()
