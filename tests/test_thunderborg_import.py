"""Quick verification that ThunderBorg import fix works correctly."""
import os
import sys

# Ensure we're testing from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_thunderborg_stub_import():
    """Test that ThunderBorg can be imported from backend package."""
    from backend import ThunderBorg
    assert ThunderBorg is not None
    tb = ThunderBorg.ThunderBorg()
    tb.Init()
    assert tb.foundChip is True


def test_thunderborg_stub_methods():
    """Test all required interface methods exist and work."""
    from backend import ThunderBorg
    tb = ThunderBorg.ThunderBorg()
    tb.Init()
    
    # Motor control
    tb.SetMotor1(0.5)
    tb.SetMotor2(-0.5)
    tb.MotorsOff()
    
    # LED control
    tb.SetLeds(1.0, 0.0, 0.5)
    tb.SetLedShowBattery(True)
    
    # Battery
    voltage = tb.GetBatteryReading()
    assert isinstance(voltage, float)
    assert voltage > 0
    
    # Failsafe
    tb.SetCommsFailsafe(True)


def test_robot_controller_with_stub():
    """Test that RobotController initializes with the stub."""
    from backend.services.robot_controller import RobotController
    
    # Reset singleton for testing
    RobotController._instance = None
    
    rc = RobotController()
    # With the stub (foundChip=True), it should NOT be in mock mode
    # unless MOCK_ROBOT env is set
    if os.getenv('MOCK_ROBOT', 'False') != 'True':
        assert rc.mock_mode is False
        assert rc.TB is not None
    
    status = rc.get_status()
    assert 'battery' in status
    assert 'connected' in status


def test_robot_controller_mock_mode():
    """Test that RobotController enters mock mode when ThunderBorg is None."""
    from backend.services import robot_controller
    
    # Reset singleton
    from backend.services.robot_controller import RobotController
    RobotController._instance = None
    
    # Temporarily set the module-level ThunderBorg to None
    original = robot_controller.ThunderBorg
    robot_controller.ThunderBorg = None
    
    try:
        rc = RobotController()
        assert rc.mock_mode is True
        
        # All commands should work in mock mode
        status = rc.get_status()
        assert status['mock_mode'] is True
        assert 'battery' in status
        
        rc.set_leds(0.5, 0.5, 0.5)
        rc.emergency_stop()
    finally:
        # Restore
        robot_controller.ThunderBorg = original
        RobotController._instance = None


if __name__ == '__main__':
    test_thunderborg_stub_import()
    print("PASS: test_thunderborg_stub_import")
    
    test_thunderborg_stub_methods()
    print("PASS: test_thunderborg_stub_methods")
    
    test_robot_controller_with_stub()
    print("PASS: test_robot_controller_with_stub")
    
    test_robot_controller_mock_mode()
    print("PASS: test_robot_controller_mock_mode")
    
    print("\nAll tests passed!")
