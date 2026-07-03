"""
Program management routes
Handles saving, loading, and executing block programs
"""

import os
import json
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from backend.config_loader import load_config, get_project_root

# Load config
config = load_config()

# Make storage paths absolute relative to project root
_project_root = get_project_root()

def _abs_path(relative_path):
    """Convert a relative config path to absolute."""
    if os.path.isabs(relative_path):
        return relative_path
    return os.path.join(_project_root, relative_path)

bp = Blueprint('program', __name__)

# Ensure directories exist
os.makedirs(_abs_path(config['storage']['programs_dir']), exist_ok=True)
os.makedirs(_abs_path(config['storage']['examples_dir']), exist_ok=True)

@bp.route('/run', methods=['POST'])
def run_program():
    """
    Execute a block program
    POST /api/program/run
    Body: { "blocks": [...] }
    """
    try:
        data = request.get_json()
        blocks = data.get('blocks', [])
        
        if not blocks:
            return jsonify({'error': 'No blocks provided'}), 400
        
        # Import executor here to avoid circular imports
        from backend.services.executor import ProgramExecutor
        
        executor = ProgramExecutor()
        execution_id = str(uuid.uuid4())
        
        # Start execution in background
        executor.execute(execution_id, blocks)
        
        return jsonify({
            'execution_id': execution_id,
            'status': 'running',
            'total_blocks': len(blocks)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stop', methods=['POST'])
def stop_program():
    """
    Stop the currently running program
    POST /api/program/stop
    """
    try:
        from backend.services.executor import ProgramExecutor
        
        executor = ProgramExecutor()
        executor.stop()
        
        return jsonify({'status': 'stopped'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/status', methods=['GET'])
def get_status():
    """
    Get current execution status
    GET /api/program/status
    """
    try:
        from backend.services.executor import ProgramExecutor
        
        executor = ProgramExecutor()
        status = executor.get_status()
        
        return jsonify(status)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/save', methods=['POST'])
def save_program():
    """
    Save a program
    POST /api/program/save
    Body: { "name": "My Program", "blocks": [...] }
    """
    try:
        data = request.get_json()
        name = data.get('name', 'Untitled')
        blocks = data.get('blocks', [])
        
        if not blocks:
            return jsonify({'error': 'No blocks provided'}), 400
        
        # Generate unique ID
        program_id = str(uuid.uuid4())
        
        # Create program data
        workspace_state = data.get('workspace_state', None)
        program_data = {
            'id': program_id,
            'name': name,
            'blocks': blocks,
            'created': datetime.utcnow().isoformat(),
            'modified': datetime.utcnow().isoformat()
        }
        if workspace_state:
            program_data['workspace_state'] = workspace_state
        
        # Save to file
        filename = f"{program_id}.json"
        filepath = os.path.join(_abs_path(config['storage']['programs_dir']), filename)
        
        with open(filepath, 'w') as f:
            json.dump(program_data, f, indent=2)
        
        return jsonify({
            'id': program_id,
            'saved': True,
            'name': name
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/list', methods=['GET'])
def list_programs():
    """
    List all saved programs
    GET /api/program/list
    """
    try:
        programs = []
        programs_dir = _abs_path(config['storage']['programs_dir'])
        
        # List all JSON files in programs directory
        if os.path.exists(programs_dir):
            for filename in os.listdir(programs_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(programs_dir, filename)
                    with open(filepath, 'r') as f:
                        program_data = json.load(f)
                        programs.append({
                            'id': program_data['id'],
                            'name': program_data['name'],
                            'created': program_data['created'],
                            'modified': program_data.get('modified', program_data['created'])
                        })
        
        # Sort by modified date (newest first)
        programs.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify({'programs': programs})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/load/<program_id>', methods=['GET'])
def load_program(program_id):
    """
    Load a specific program (checks saved programs first, then examples)
    GET /api/program/load/<id>
    """
    try:
        filename = f"{program_id}.json"
        
        # Check saved programs first
        filepath = os.path.join(_abs_path(config['storage']['programs_dir']), filename)
        
        if not os.path.exists(filepath):
            # Fall back to examples directory
            filepath = os.path.join(_abs_path(config['storage']['examples_dir']), filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'Program not found'}), 404
        
        with open(filepath, 'r') as f:
            program_data = json.load(f)
        
        return jsonify(program_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<program_id>', methods=['DELETE'])
def delete_program(program_id):
    """
    Delete a program
    DELETE /api/program/<id>
    """
    try:
        filename = f"{program_id}.json"
        filepath = os.path.join(_abs_path(config['storage']['programs_dir']), filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'Program not found'}), 404
        
        os.remove(filepath)
        
        return jsonify({'deleted': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/examples', methods=['GET'])
def list_examples():
    """
    List example programs
    GET /api/program/examples
    """
    try:
        examples = []
        examples_dir = _abs_path(config['storage']['examples_dir'])
        
        if os.path.exists(examples_dir):
            for filename in os.listdir(examples_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(examples_dir, filename)
                    with open(filepath, 'r') as f:
                        example_data = json.load(f)
                        examples.append({
                            'id': example_data['id'],
                            'name': example_data['name'],
                            'description': example_data.get('description', ''),
                            'difficulty': example_data.get('difficulty', 'beginner')
                        })
        
        return jsonify({'examples': examples})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Made with Bob
