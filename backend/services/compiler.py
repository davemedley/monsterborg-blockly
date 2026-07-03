"""
Block Compiler Service
Converts Blockly blocks to executable Python code
"""

import logging
from backend.config_loader import load_config

logger = logging.getLogger(__name__)

# Load config
config = load_config()

class BlockCompiler:
    """
    Compiles Blockly blocks into executable commands
    """
    
    def __init__(self):
        self.time_forward_1m = config['robot']['time_forward_1m']
        self.time_spin_360 = config['robot']['time_spin_360']
    
    def compile_blocks(self, blocks):
        """
        Compile a list of blocks into executable commands
        
        Args:
            blocks: List of block dictionaries from Blockly
            
        Returns:
            List of command dictionaries
        """
        commands = []
        
        for block in blocks:
            try:
                command = self.compile_block(block)
                if command:
                    commands.append(command)
            except Exception as e:
                logger.error(f"Error compiling block {block.get('type')}: {e}")
                raise
        
        return commands
    
    def compile_block(self, block):
        """
        Compile a single block into a command
        
        Args:
            block: Block dictionary with type and parameters
            
        Returns:
            Command dictionary or None
        """
        block_type = block.get('type')
        
        if not block_type:
            return None
        
        # Movement blocks
        if block_type == 'move_forward':
            distance = block.get('distance', 0.5)  # meters
            return {
                'type': 'drive',
                'value': distance,
                'description': f'Move forward {distance}m'
            }
        
        elif block_type == 'move_backward':
            distance = block.get('distance', 0.5)
            return {
                'type': 'drive',
                'value': -distance,
                'description': f'Move backward {distance}m'
            }
        
        elif block_type == 'turn_left':
            angle = block.get('angle', 90)  # degrees
            return {
                'type': 'spin',
                'value': -angle,
                'description': f'Turn left {angle}°'
            }
        
        elif block_type == 'turn_right':
            angle = block.get('angle', 90)
            return {
                'type': 'spin',
                'value': angle,
                'description': f'Turn right {angle}°'
            }
        
        elif block_type == 'spin_circle':
            direction = block.get('direction', 'right')
            rotations = block.get('rotations', 1)
            angle = 360 * rotations
            if direction == 'left':
                angle = -angle
            return {
                'type': 'spin',
                'value': angle,
                'description': f'Spin {direction} {rotations} time(s)'
            }
        
        elif block_type == 'custom_move':
            left_power = block.get('left_power', 0.0)
            right_power = block.get('right_power', 0.0)
            duration = block.get('duration', 1.0)
            return {
                'type': 'custom_move',
                'left': left_power,
                'right': right_power,
                'duration': duration,
                'description': f'Custom move L={left_power} R={right_power} for {duration}s'
            }
        
        # LED blocks
        elif block_type == 'set_led_color':
            r = block.get('r', 0.0)
            g = block.get('g', 0.0)
            b = block.get('b', 0.0)
            return {
                'type': 'led',
                'r': r,
                'g': g,
                'b': b,
                'description': f'Set LED to RGB({r},{g},{b})'
            }
        
        elif block_type == 'led_preset':
            color = block.get('color', 'white')
            color_map = {
                'red': (1.0, 0.0, 0.0),
                'green': (0.0, 1.0, 0.0),
                'blue': (0.0, 0.0, 1.0),
                'yellow': (1.0, 1.0, 0.0),
                'purple': (1.0, 0.0, 1.0),
                'cyan': (0.0, 1.0, 1.0),
                'white': (1.0, 1.0, 1.0),
                'off': (0.0, 0.0, 0.0)
            }
            r, g, b = color_map.get(color, (1.0, 1.0, 1.0))
            return {
                'type': 'led',
                'r': r,
                'g': g,
                'b': b,
                'description': f'Set LED to {color}'
            }
        
        elif block_type == 'led_battery':
            return {
                'type': 'led_battery',
                'description': 'Show battery level on LED'
            }
        
        # Timing blocks
        elif block_type == 'wait':
            duration = block.get('duration', 1.0)
            return {
                'type': 'wait',
                'duration': duration,
                'description': f'Wait {duration}s'
            }
        
        elif block_type == 'repeat':
            count = block.get('count', 1)
            nested_blocks = block.get('blocks', [])
            nested_commands = self.compile_blocks(nested_blocks)
            return {
                'type': 'repeat',
                'count': count,
                'commands': nested_commands,
                'description': f'Repeat {count} times'
            }
        
        # Pattern blocks
        elif block_type == 'pattern_square':
            side_length = block.get('side_length', 0.5)
            commands = []
            for _ in range(4):
                commands.append({
                    'type': 'drive',
                    'value': side_length,
                    'description': f'Forward {side_length}m'
                })
                commands.append({
                    'type': 'spin',
                    'value': 90,
                    'description': 'Turn right 90°'
                })
            return {
                'type': 'pattern',
                'commands': commands,
                'description': f'Draw square ({side_length}m sides)'
            }
        
        elif block_type == 'pattern_triangle':
            side_length = block.get('side_length', 0.5)
            commands = []
            for _ in range(3):
                commands.append({
                    'type': 'drive',
                    'value': side_length,
                    'description': f'Forward {side_length}m'
                })
                commands.append({
                    'type': 'spin',
                    'value': 120,
                    'description': 'Turn right 120°'
                })
            return {
                'type': 'pattern',
                'commands': commands,
                'description': f'Draw triangle ({side_length}m sides)'
            }
        
        elif block_type == 'pattern_circle':
            diameter = block.get('diameter', 1.0)
            # Approximate circle with many small movements
            segments = 36  # 10 degree segments
            segment_distance = (3.14159 * diameter) / segments
            commands = []
            for _ in range(segments):
                commands.append({
                    'type': 'drive',
                    'value': segment_distance,
                    'description': 'Circle segment'
                })
                commands.append({
                    'type': 'spin',
                    'value': 10,
                    'description': 'Turn 10°'
                })
            return {
                'type': 'pattern',
                'commands': commands,
                'description': f'Draw circle ({diameter}m diameter)'
            }
        
        # Control blocks
        elif block_type == 'stop':
            return {
                'type': 'stop',
                'description': 'Stop all motors'
            }
        
        elif block_type == 'emergency_stop':
            return {
                'type': 'emergency_stop',
                'description': 'EMERGENCY STOP'
            }
        
        else:
            logger.warning(f"Unknown block type: {block_type}")
            return None

# Made with Bob
