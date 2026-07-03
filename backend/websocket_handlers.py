"""
WebSocket event handlers for real-time communication
"""

import time
import logging
from flask_socketio import emit
from backend.extensions import socketio
from backend.services.executor import ProgramExecutor
from backend.services.robot_controller import RobotController

logger = logging.getLogger(__name__)

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info("Client connected")
    emit('connected', {'status': 'ok'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection — stop motors as a safety measure"""
    logger.info("Client disconnected")
    try:
        controller = RobotController()
        controller.motors_off()
    except Exception:
        pass

@socketio.on('run_program')
def handle_run_program(data):
    """
    Handle program execution request
    
    Args:
        data: dict with 'blocks' key containing block list
    """
    try:
        blocks = data.get('blocks', [])
        
        if not blocks:
            emit('error', {'message': 'No blocks provided'})
            return
        
        executor = ProgramExecutor()
        execution_id = f"exec_{int(time.time())}"
        
        # Start execution
        executor.execute(execution_id, blocks)
        
        emit('execution_started', {
            'execution_id': execution_id,
            'total_blocks': len(blocks)
        })
        
        # Start progress monitoring
        monitor_execution(execution_id)
        
    except Exception as e:
        logger.error(f"Error starting program: {e}")
        emit('error', {'message': str(e)})

@socketio.on('stop_program')
def handle_stop_program():
    """Handle program stop request"""
    try:
        executor = ProgramExecutor()
        executor.stop()
        
        emit('execution_stopped', {'status': 'stopped'})
        
    except Exception as e:
        logger.error(f"Error stopping program: {e}")
        emit('error', {'message': str(e)})

@socketio.on('get_status')
def handle_get_status():
    """Handle status request"""
    try:
        executor = ProgramExecutor()
        status = executor.get_status()
        
        controller = RobotController()
        robot_status = controller.get_status()
        
        emit('status_update', {
            'execution': status,
            'robot': robot_status
        })
        
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        emit('error', {'message': str(e)})

@socketio.on('manual_drive')
def handle_manual_drive(data):
    """
    Handle manual driving command.

    The client sends 'start' when a button is pressed and 'stop' when released.
    We set the motors on/off directly — no sleep — so the server thread is
    never blocked and events are processed immediately.

    Args:
        data: dict with keys:
            action:    'start' | 'stop'
            direction: 'forward' | 'backward' | 'left' | 'right'
            power:     motor power 0.0–1.0 (optional, defaults to 1.0)
    """
    try:
        action    = data.get('action', 'stop')
        direction = data.get('direction', 'forward')
        power     = float(data.get('power', 1.0))
        power     = max(0.0, min(1.0, power))

        controller = RobotController()

        if action == 'stop':
            controller.motors_off()
        else:
            if direction == 'forward':
                controller.set_motors(power, power)
            elif direction == 'backward':
                controller.set_motors(-power, -power)
            elif direction == 'left':
                controller.set_motors(-power, power)
            elif direction == 'right':
                controller.set_motors(power, -power)

        emit('manual_drive_ack', {'action': action, 'direction': direction})

    except Exception as e:
        logger.error(f"Error in manual drive: {e}")
        emit('error', {'message': str(e)})


@socketio.on('emergency_stop')
def handle_emergency_stop():
    """Handle emergency stop"""
    try:
        executor = ProgramExecutor()
        executor.stop()
        
        controller = RobotController()
        controller.emergency_stop()
        
        emit('emergency_stopped', {'status': 'stopped'})
        
    except Exception as e:
        logger.error(f"Error in emergency stop: {e}")
        emit('error', {'message': str(e)})

def monitor_execution(execution_id):
    """
    Monitor execution progress and send updates
    
    Args:
        execution_id: ID of the execution to monitor
    """
    import time
    import threading
    
    def monitor():
        executor = ProgramExecutor()
        
        while executor.is_running:
            status = executor.get_status()
            
            socketio.emit('execution_progress', {
                'execution_id': execution_id,
                'current_block': status['current_block'],
                'total_blocks': status['total_blocks'],
                'status': status['status']
            })
            
            time.sleep(0.5)
        
        # Send final status
        final_status = executor.get_status()
        socketio.emit('execution_finished', {
            'execution_id': execution_id,
            'status': final_status['status'],
            'error': final_status.get('error')
        })
    
    # Start monitoring in background thread
    thread = threading.Thread(target=monitor)
    thread.daemon = True
    thread.start()

# Made with Bob
