"""
Main Flask application for MonsterBorg Blockly
"""

import os
import logging
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from backend.config_loader import load_config
from backend.extensions import socketio

# Load environment variables — use path relative to this file so .env is
# found regardless of the working directory (e.g. when run via systemd)
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
load_dotenv(os.path.join(_PROJECT_ROOT, '.env'))

# Log the env state so it's visible in journalctl on the Pi
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info(f"MOCK_ROBOT={os.getenv('MOCK_ROBOT')} MOCK_CAMERA={os.getenv('MOCK_CAMERA')}")

# Load configuration
config = load_config()

# Absolute paths relative to this file's location
_FRONTEND_DIR = os.path.join(_PROJECT_ROOT, 'frontend')

# Initialize Flask app
app = Flask(__name__, 
            static_folder=_FRONTEND_DIR,
            static_url_path='',
            template_folder=_FRONTEND_DIR)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', config['server']['secret_key'])
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', config['server']['debug']) == 'True'

# Enable CORS
CORS(app)

# Initialize SocketIO (using threading mode for better compatibility)
socketio.init_app(app, cors_allowed_origins="*", async_mode='threading')

# Import routes
from backend.routes import program, robot, camera

# Register blueprints
app.register_blueprint(program.bp, url_prefix='/api/program')
app.register_blueprint(robot.bp, url_prefix='/api/robot')
app.register_blueprint(camera.bp, url_prefix='/api/camera')

# Import WebSocket handlers
from backend import websocket_handlers

@app.route('/')
def index():
    """Serve the main application page"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'ok', 'version': '0.1.0'}

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return {'error': 'Not found'}, 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal error: {error}")
    return {'error': 'Internal server error'}, 500

def create_app():
    """Application factory"""
    logger.info("MonsterBorg Blockly starting...")
    logger.info(f"Server: {config['server']['host']}:{config['server']['port']}")
    logger.info(f"MOCK_ROBOT={os.getenv('MOCK_ROBOT', 'not set')}  MOCK_CAMERA={os.getenv('MOCK_CAMERA', 'not set')}")
    logger.info(f".env loaded from: {os.path.join(_PROJECT_ROOT, '.env')}")
    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(
        app,
        host=config['server']['host'],
        port=config['server']['port'],
        debug=config['server']['debug'],
        allow_unsafe_werkzeug=True
    )

# Made with Bob
