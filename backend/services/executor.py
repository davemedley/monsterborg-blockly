"""
Program Executor Service
Executes compiled block programs on the robot
"""

import time
import logging
import threading
from backend.config_loader import load_config
from backend.services.compiler import BlockCompiler
from backend.services.robot_controller import RobotController

logger = logging.getLogger(__name__)

# Load config
config = load_config()

class ProgramExecutor:
    """
    Executes block programs with safety features and progress tracking
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super(ProgramExecutor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the executor"""
        if self._initialized:
            return
        
        self.compiler = BlockCompiler()
        self.controller = RobotController()
        
        self.execution_thread = None
        self.is_running = False
        self.should_stop = False
        
        self.current_execution_id = None
        self.current_block = 0
        self.total_blocks = 0
        self.status = 'idle'
        self.error_message = None
        
        max_time = config.get('robot', {}).get('max_execution_time', 300)
        if 'robot' not in config or 'max_execution_time' not in config.get('robot', {}):
            logger.warning("max_execution_time not found in config, defaulting to 300 seconds")
        self.max_execution_time = max_time
        
        self._initialized = True
    
    def execute(self, execution_id, blocks):
        """
        Execute a program in a background thread
        
        Args:
            execution_id: Unique ID for this execution
            blocks: List of block dictionaries
        """
        if self.is_running:
            raise Exception("Program already running")
        
        self.current_execution_id = execution_id
        self.should_stop = False
        self.status = 'running'
        self.error_message = None
        
        # Start execution thread
        self.execution_thread = threading.Thread(
            target=self._execute_program,
            args=(blocks,)
        )
        self.execution_thread.daemon = True
        self.execution_thread.start()
    
    def _execute_program(self, blocks):
        """
        Internal method to execute program (runs in thread)
        
        Args:
            blocks: List of block dictionaries
        """
        self.is_running = True
        start_time = time.time()
        
        try:
            # Compile blocks to commands
            commands = self.compiler.compile_blocks(blocks)
            self.total_blocks = len(commands)
            self.current_block = 0
            
            logger.info(f"Executing program with {self.total_blocks} commands")
            
            # Set LED to green (running)
            self.controller.set_leds(0, 1, 0)
            
            # Execute each command
            for i, command in enumerate(commands):
                # Check for stop signal
                if self.should_stop:
                    logger.info("Execution stopped by user")
                    break
                
                # Check for timeout
                elapsed = time.time() - start_time
                if elapsed > self.max_execution_time:
                    logger.warning("Execution timeout reached")
                    self.error_message = "Execution timeout"
                    break
                
                self.current_block = i + 1
                
                # Execute command
                try:
                    self._execute_command(command)
                except Exception as e:
                    logger.error(f"Error executing command {i}: {e}")
                    self.error_message = str(e)
                    break
            
            # Execution complete
            if not self.should_stop and not self.error_message:
                self.status = 'completed'
                logger.info("Program execution completed successfully")
                # Set LED to blue (complete)
                self.controller.set_leds(0, 0, 1)
            else:
                self.status = 'stopped' if self.should_stop else 'error'
                # Set LED to red (stopped/error)
                self.controller.set_leds(1, 0, 0)
            
        except Exception as e:
            logger.error(f"Fatal error during execution: {e}")
            self.status = 'error'
            self.error_message = str(e)
            self.controller.emergency_stop()
        
        finally:
            self.is_running = False
            # Ensure motors are off
            self.controller.emergency_stop()
    
    def _execute_command(self, command):
        """
        Execute a single command
        
        Args:
            command: Command dictionary
        """
        cmd_type = command.get('type')
        
        logger.info(f"Executing: {command.get('description', cmd_type)}")
        
        if cmd_type == 'drive':
            value = command.get('value', 0.0)
            self.controller.perform_drive(value)
        
        elif cmd_type == 'spin':
            value = command.get('value', 0.0)
            self.controller.perform_spin(value)
        
        elif cmd_type == 'custom_move':
            left = command.get('left', 0.0)
            right = command.get('right', 0.0)
            duration = command.get('duration', 1.0)
            self.controller.perform_move(left, right, duration)
        
        elif cmd_type == 'led':
            r = command.get('r', 0.0)
            g = command.get('g', 0.0)
            b = command.get('b', 0.0)
            self.controller.set_leds(r, g, b)
        
        elif cmd_type == 'led_battery':
            # This would need ThunderBorg's SetLedShowBattery
            pass
        
        elif cmd_type == 'wait':
            duration = command.get('duration', 1.0)
            time.sleep(duration)
        
        elif cmd_type == 'repeat':
            count = command.get('count', 1)
            nested_commands = command.get('commands', [])
            for _ in range(count):
                if self.should_stop:
                    break
                for nested_cmd in nested_commands:
                    if self.should_stop:
                        break
                    self._execute_command(nested_cmd)
        
        elif cmd_type == 'pattern':
            nested_commands = command.get('commands', [])
            for nested_cmd in nested_commands:
                if self.should_stop:
                    break
                self._execute_command(nested_cmd)
        
        elif cmd_type == 'stop':
            self.controller.emergency_stop()
        
        elif cmd_type == 'emergency_stop':
            self.controller.emergency_stop()
            self.should_stop = True
        
        else:
            logger.warning(f"Unknown command type: {cmd_type}")
    
    def stop(self):
        """Stop the currently running program"""
        if self.is_running:
            logger.info("Stopping program execution")
            self.should_stop = True
            self.controller.emergency_stop()
            
            # Wait for thread to finish (with timeout)
            if self.execution_thread:
                self.execution_thread.join(timeout=2.0)
            
            self.status = 'stopped'
    
    def get_status(self):
        """
        Get current execution status
        
        Returns:
            dict: Status information
        """
        return {
            'status': self.status,
            'is_running': self.is_running,
            'execution_id': self.current_execution_id,
            'current_block': self.current_block,
            'total_blocks': self.total_blocks,
            'error': self.error_message
        }

# Made with Bob
