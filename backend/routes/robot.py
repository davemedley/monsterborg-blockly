"""
Robot control routes
Handles robot status, calibration, and emergency stop
"""

from flask import Blueprint, request, jsonify
from backend.config_loader import load_config, save_config

# Load config
config = load_config()

bp = Blueprint('robot', __name__)

@bp.route('/status', methods=['GET'])
def get_robot_status():
    """
    Get robot status including battery level and connection
    GET /api/robot/status
    """
    try:
        from backend.services.robot_controller import RobotController
        
        controller = RobotController()
        status = controller.get_status()
        
        return jsonify(status)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'connected': False,
            'battery': 0.0,
            'motors_on': False
        }), 500

@bp.route('/emergency_stop', methods=['POST'])
def emergency_stop():
    """
    Emergency stop - immediately stop all motors
    POST /api/robot/emergency_stop
    """
    try:
        from backend.services.robot_controller import RobotController
        
        controller = RobotController()
        controller.emergency_stop()
        
        return jsonify({'stopped': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/calibration', methods=['GET'])
def get_calibration():
    """
    Get current calibration values
    GET /api/robot/calibration
    """
    try:
        return jsonify({
            'timeForward1m': config['robot']['time_forward_1m'],
            'timeSpin360': config['robot']['time_spin_360'],
            'voltageIn': config['robot']['voltage_in'],
            'voltageOut': config['robot']['voltage_out']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/calibration', methods=['POST'])
def update_calibration():
    """
    Update calibration values
    POST /api/robot/calibration
    Body: { "timeForward1m": 0.85, "timeSpin360": 1.10 }
    """
    try:
        data = request.get_json()
        
        # Validate values
        time_forward = data.get('timeForward1m')
        time_spin = data.get('timeSpin360')
        
        if time_forward is not None:
            if not (0.1 <= time_forward <= 5.0):
                return jsonify({'error': 'timeForward1m must be between 0.1 and 5.0'}), 400
            config['robot']['time_forward_1m'] = time_forward
        
        if time_spin is not None:
            if not (0.1 <= time_spin <= 5.0):
                return jsonify({'error': 'timeSpin360 must be between 0.1 and 5.0'}), 400
            config['robot']['time_spin_360'] = time_spin
        
        # Save updated config
        save_config(config)
        
        return jsonify({
            'updated': True,
            'timeForward1m': config['robot']['time_forward_1m'],
            'timeSpin360': config['robot']['time_spin_360']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/test_move', methods=['POST'])
def test_move():
    """
    Test a simple movement for calibration
    POST /api/robot/test_move
    Body: { "type": "forward|spin", "value": 0.5 }
    """
    try:
        from backend.services.robot_controller import RobotController
        
        data = request.get_json()
        move_type = data.get('type')
        value = data.get('value', 0.5)
        
        controller = RobotController()
        
        if move_type == 'forward':
            controller.perform_drive(value)
        elif move_type == 'spin':
            controller.perform_spin(value)
        else:
            return jsonify({'error': 'Invalid move type'}), 400
        
        return jsonify({'executed': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/led', methods=['POST'])
def set_led():
    """
    Set LED color
    POST /api/robot/led
    Body: { "r": 1.0, "g": 0.0, "b": 0.0 }
    """
    try:
        from backend.services.robot_controller import RobotController
        
        data = request.get_json()
        r = data.get('r', 0.0)
        g = data.get('g', 0.0)
        b = data.get('b', 0.0)
        
        controller = RobotController()
        controller.set_leds(r, g, b)
        
        return jsonify({'set': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Made with Bob
