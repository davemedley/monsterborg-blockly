"""
Checkpoint 2: Verify all backend module imports work correctly.
"""
import sys
import os

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_config_loader_import():
    """config_loader imports and functions exist."""
    from backend.config_loader import load_config, get_config_path, get_project_root, save_config
    assert callable(load_config)
    assert callable(get_config_path)
    assert callable(get_project_root)
    assert callable(save_config)


def test_config_loader_resolves_config():
    """config_loader correctly resolves config.yaml from project root."""
    from backend.config_loader import load_config, get_config_path, get_project_root
    
    config_path = get_config_path()
    assert os.path.exists(config_path), f"config.yaml not found at {config_path}"
    
    project_root = get_project_root()
    assert os.path.isdir(project_root)
    assert os.path.exists(os.path.join(project_root, 'config.yaml'))
    
    config = load_config()
    assert isinstance(config, dict)
    assert 'server' in config
    assert 'robot' in config
    assert 'camera' in config


def test_thunderborg_import():
    """ThunderBorg stub imports from backend package."""
    from backend import ThunderBorg
    assert ThunderBorg is not None
    assert hasattr(ThunderBorg, 'ThunderBorg')


def test_compiler_import():
    """BlockCompiler imports correctly."""
    from backend.services.compiler import BlockCompiler
    compiler = BlockCompiler()
    assert hasattr(compiler, 'compile_blocks')


def test_robot_controller_import():
    """RobotController imports correctly."""
    from backend.services.robot_controller import RobotController
    assert hasattr(RobotController, '__new__')


def test_executor_import():
    """ProgramExecutor imports correctly."""
    from backend.services.executor import ProgramExecutor
    assert hasattr(ProgramExecutor, 'execute')


def test_camera_service_import():
    """CameraService imports correctly."""
    from backend.services.camera_service import CameraService
    assert hasattr(CameraService, 'generate_frames')


def test_routes_camera_import():
    """Camera routes blueprint imports correctly."""
    from backend.routes.camera import bp
    assert bp.name == 'camera'


def test_routes_robot_import():
    """Robot routes blueprint imports correctly."""
    from backend.routes.robot import bp
    assert bp.name == 'robot'


def test_routes_program_import():
    """Program routes blueprint imports correctly."""
    from backend.routes.program import bp
    assert bp.name == 'program'


def test_app_import():
    """Flask app and socketio import correctly."""
    from backend.app import app, socketio
    assert app is not None
    assert socketio is not None
