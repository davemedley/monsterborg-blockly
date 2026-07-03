"""
Robot Controller Service
Wraps ThunderBorg library and provides high-level robot control
"""

import os
import time
import logging

from backend.config_loader import load_config

logger = logging.getLogger(__name__)

# Import ThunderBorg at module level with graceful fallback
_thunderborg_is_stub = False
try:
    from backend import ThunderBorg
    if getattr(ThunderBorg, 'IS_STUB', False):
        _thunderborg_is_stub = True
        logger.warning("ThunderBorg.py is the development STUB — replace with the real library from PiBorg for actual motor control")
except ImportError:
    ThunderBorg = None
    logger.warning("ThunderBorg library not available - mock mode will be used")

# Load config
config = load_config()

class RobotController:
    """
    High-level interface for controlling the MonsterBorg robot
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one controller instance"""
        if cls._instance is None:
            cls._instance = super(RobotController, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the robot controller"""
        if self._initialized:
            return
        
        self.mock_mode = os.getenv('MOCK_ROBOT', 'False') == 'True'
        self.TB = None
        self.max_power = 1.0
        
        # Calibration values
        self.time_forward_1m = config['robot']['time_forward_1m']
        self.time_spin_360 = config['robot']['time_spin_360']
        
        # If ThunderBorg module is not available or is the dev stub, force mock mode
        if ThunderBorg is None or _thunderborg_is_stub:
            self.mock_mode = True
            if _thunderborg_is_stub:
                logger.error("STUB ThunderBorg detected — motors will NOT move. Replace backend/ThunderBorg.py with the real PiBorg library.")
        
        if not self.mock_mode:
            try:
                # Initialize ThunderBorg
                self.TB = ThunderBorg.ThunderBorg()
                self.TB.i2cAddress = config['robot']['i2c_address']
                self.TB.Init()
                
                if not self.TB.foundChip:
                    logger.error("ThunderBorg not found!")
                    self.mock_mode = True
                else:
                    # Configure power limits
                    voltage_in = config['robot']['voltage_in']
                    voltage_out = config['robot']['voltage_out']
                    self.max_power = min(1.0, voltage_out / voltage_in)
                    
                    # Enable failsafe if configured
                    if config['robot']['enable_failsafe']:
                        self.TB.SetCommsFailsafe(True)
                    
                    # Set initial LED color (blue = ready)
                    self.TB.SetLeds(0, 0, 1)
                    
                    logger.info("Robot controller initialized successfully")
                    
            except Exception as e:
                logger.error(f"Failed to initialize ThunderBorg: {e}")
                self.mock_mode = True
        
        if self.mock_mode:
            logger.warning("Running in MOCK mode - no actual robot control")
        
        self._initialized = True
    
    def set_motors(self, drive_left, drive_right):
        """
        Set motor power immediately without any sleep.
        Used for manual/live control — caller is responsible for calling
        motors_off() when movement should stop.

        Args:
            drive_left:  Left motor power (-1.0 to 1.0)
            drive_right: Right motor power (-1.0 to 1.0)
        """
        if self.mock_mode:
            logger.info(f"MOCK: Set motors L={drive_left:.2f} R={drive_right:.2f}")
            return

        try:
            self.TB.SetMotor1(drive_right * self.max_power)
            self.TB.SetMotor2(drive_left * self.max_power)
        except Exception as e:
            logger.error(f"Error setting motors: {e}")
            self.emergency_stop()

    def motors_off(self):
        """Stop both motors immediately (no sleep)."""
        if self.mock_mode:
            logger.info("MOCK: Motors off")
            return

        try:
            self.TB.MotorsOff()
        except Exception as e:
            logger.error(f"Error stopping motors: {e}")

    def perform_move(self, drive_left, drive_right, num_seconds):
        """
        Perform a basic motor movement
        
        Args:
            drive_left: Left motor power (-1.0 to 1.0)
            drive_right: Right motor power (-1.0 to 1.0)
            num_seconds: Duration in seconds
        """
        if self.mock_mode:
            logger.info(f"MOCK: Move L={drive_left:.2f} R={drive_right:.2f} for {num_seconds:.2f}s")
            time.sleep(num_seconds)
            return
        
        try:
            # Set motors
            self.TB.SetMotor1(drive_right * self.max_power)
            self.TB.SetMotor2(drive_left * self.max_power)
            
            # Wait
            time.sleep(num_seconds)
            
            # Stop motors
            self.TB.MotorsOff()
            
        except Exception as e:
            logger.error(f"Error in perform_move: {e}")
            self.emergency_stop()
    
    def perform_drive(self, meters):
        """
        Drive forward or backward a specific distance
        
        Args:
            meters: Distance in meters (positive = forward, negative = backward)
        """
        if meters < 0:
            drive_left = -1.0
            drive_right = -1.0
            meters = abs(meters)
        else:
            drive_left = 1.0
            drive_right = 1.0
        
        num_seconds = meters * self.time_forward_1m
        self.perform_move(drive_left, drive_right, num_seconds)
    
    def perform_spin(self, angle):
        """
        Spin left or right by a specific angle
        
        Args:
            angle: Angle in degrees (positive = right, negative = left)
        """
        if angle < 0:
            drive_left = -1.0
            drive_right = 1.0
            angle = abs(angle)
        else:
            drive_left = 1.0
            drive_right = -1.0
        
        num_seconds = (angle / 360.0) * self.time_spin_360
        self.perform_move(drive_left, drive_right, num_seconds)
    
    def set_leds(self, r, g, b):
        """
        Set LED colors
        
        Args:
            r, g, b: Color values (0.0 to 1.0)
        """
        if self.mock_mode:
            logger.info(f"MOCK: Set LED R={r:.2f} G={g:.2f} B={b:.2f}")
            return
        
        try:
            self.TB.SetLeds(r, g, b)
        except Exception as e:
            logger.error(f"Error setting LEDs: {e}")
    
    def emergency_stop(self):
        """Emergency stop - immediately stop all motors and set red LED"""
        logger.warning("EMERGENCY STOP")
        
        if self.mock_mode:
            return
        
        try:
            self.TB.MotorsOff()
            self.TB.SetLeds(1, 0, 0)  # Red LED
        except Exception as e:
            logger.error(f"Error in emergency_stop: {e}")
    
    def get_status(self):
        """
        Get current robot status
        
        Returns:
            dict: Status information including battery, connection, etc.
        """
        if self.mock_mode:
            return {
                'connected': False,
                'mock_mode': True,
                'battery': 12.0,
                'motors_on': False,
                'battery_warning': False
            }
        
        try:
            battery = self.TB.GetBatteryReading()
            battery_min = config['robot']['battery_min']
            battery_warning_threshold = config['safety']['battery_warning_threshold']
            
            return {
                'connected': True,
                'mock_mode': False,
                'battery': round(battery, 2),
                'motors_on': False,  # We don't track this currently
                'battery_warning': battery < battery_warning_threshold,
                'battery_min': battery_min,
                'battery_max': config['robot']['battery_max']
            }
            
        except Exception as e:
            logger.error(f"Error getting status: {e}")
            return {
                'connected': False,
                'error': str(e),
                'battery': 0.0,
                'motors_on': False
            }
    
    def cleanup(self):
        """Clean up resources"""
        if not self.mock_mode and self.TB:
            try:
                self.TB.MotorsOff()
                self.TB.SetLeds(0, 0, 0)
            except:
                pass

# Made with Bob
