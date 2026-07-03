"""
Camera routes
Handles camera streaming and photo capture
"""

import os
from datetime import datetime
from flask import Blueprint, Response, jsonify, send_file
from backend.config_loader import load_config

# Load config
config = load_config()

bp = Blueprint('camera', __name__)

# Ensure photos directory exists
os.makedirs(config['storage']['photos_dir'], exist_ok=True)

@bp.route('/stream', methods=['GET'])
def stream():
    """
    Stream camera feed as MJPEG
    GET /api/camera/stream
    """
    try:
        from backend.services.camera_service import CameraService
        
        camera = CameraService()
        
        return Response(
            camera.generate_frames(),
            mimetype='multipart/x-mixed-replace; boundary=frame'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/photo', methods=['POST'])
def capture_photo():
    """
    Capture and save a photo
    POST /api/camera/photo
    """
    try:
        from backend.services.camera_service import CameraService
        
        camera = CameraService()
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"photo_{timestamp}.jpg"
        filepath = os.path.join(config['storage']['photos_dir'], filename)
        
        # Capture and save photo
        success = camera.capture_photo(filepath)
        
        if success:
            return jsonify({
                'filename': filename,
                'url': f'/api/camera/photos/{filename}',
                'saved': True
            })
        else:
            return jsonify({'error': 'Failed to capture photo'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/photos/<filename>', methods=['GET'])
def get_photo(filename):
    """
    Retrieve a saved photo
    GET /api/camera/photos/<filename>
    """
    try:
        filepath = os.path.join(config['storage']['photos_dir'], filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'Photo not found'}), 404
        
        return send_file(filepath, mimetype='image/jpeg')
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/photos', methods=['GET'])
def list_photos():
    """
    List all saved photos
    GET /api/camera/photos
    """
    try:
        photos = []
        photos_dir = config['storage']['photos_dir']
        
        if os.path.exists(photos_dir):
            for filename in os.listdir(photos_dir):
                if filename.endswith('.jpg') or filename.endswith('.png'):
                    filepath = os.path.join(photos_dir, filename)
                    stat = os.stat(filepath)
                    photos.append({
                        'filename': filename,
                        'url': f'/api/camera/photos/{filename}',
                        'size': stat.st_size,
                        'created': datetime.fromtimestamp(stat.st_ctime).isoformat()
                    })
        
        # Sort by creation time (newest first)
        photos.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify({'photos': photos})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/photos/<filename>', methods=['DELETE'])
def delete_photo(filename):
    """
    Delete a photo
    DELETE /api/camera/photos/<filename>
    """
    try:
        filepath = os.path.join(config['storage']['photos_dir'], filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'Photo not found'}), 404
        
        os.remove(filepath)
        
        return jsonify({'deleted': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Made with Bob
