# MonsterBorg Block-Based Coding Interface - Project Specification

## Executive Summary

This project will create a kid-friendly, block-based programming interface for the MonsterBorg robot car, enabling a 7-year-old to create and execute movement routines using visual programming blocks similar to Scratch. The system will run on a local Raspberry Pi or web server without requiring cloud services or authentication.

## Current System Analysis

### Existing Capabilities

Based on the provided example code, the MonsterBorg currently supports:

**Hardware Control (via ThunderBorg):**
- Dual motor control (Motor 1 & Motor 2) with power range -1.0 to +1.0
- RGB LED control (2 LEDs: main board LED and lid LED)
- Battery voltage monitoring
- Communications failsafe
- I²C communication at address 0x15

**Current Implementations:**
1. **monsterSequence.py** - Programmatic sequence execution
   - Movement primitives: `PerformDrive(meters)`, `PerformSpin(degrees)`
   - Timed motor control
   - LED status indicators
   - Calibration values: `timeForward1m = 0.85s`, `timeSpin360 = 1.10s`

2. **monsterWeb.py** - Web-based manual control
   - Live camera streaming (240x192 @ 30fps)
   - Real-time motor control via HTTP endpoints
   - Speed slider (0-100%)
   - Photo capture capability
   - Watchdog timeout protection

3. **monsterJoy.py** - Gamepad control
   - Joystick-based driving
   - Speed modulation
   - LED battery indicator

## Project Goals

### Primary Objectives
1. Create an intuitive block-based programming interface using Google Blockly
2. Enable children to build movement sequences visually
3. Execute sequences on the MonsterBorg robot
4. Provide immediate visual feedback
5. Save and load routines

### Target User
- Age: 7 years old
- Experience: Beginner programmer (may have used Scratch)
- Environment: Home use, supervised by parent

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Device                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Web Browser Interface                     │    │
│  │  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Blockly    │  │  Live Camera │               │    │
│  │  │   Workspace  │  │    Feed      │               │    │
│  │  └──────────────┘  └──────────────┘               │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  Control Panel: Run | Stop | Save | Load │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Raspberry Pi Web Server                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Flask/FastAPI Backend                       │    │
│  │  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Blockly    │  │   Sequence   │               │    │
│  │  │   Compiler   │  │   Executor   │               │    │
│  │  └──────────────┘  └──────────────┘               │    │
│  │  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Camera     │  │   Storage    │               │    │
│  │  │   Streamer   │  │   Manager    │               │    │
│  │  └──────────────┘  └──────────────┘               │    │
│  └────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │         ThunderBorg Python Library                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ I²C
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MonsterBorg Robot                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │              ThunderBorg Board                      │    │
│  │         (Motor Controller + LEDs)                   │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Pi Camera Module                       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- HTML5 + CSS3 + JavaScript
- Google Blockly library (latest version)
- WebSocket for real-time communication
- Responsive design for tablets/laptops

**Backend:**
- Python 3.7+
- Flask or FastAPI web framework
- WebSocket support (Flask-SocketIO or FastAPI WebSockets)
- Existing ThunderBorg.py library
- picamera2 for camera streaming

**Storage:**
- JSON files for saved routines
- Local filesystem (no database needed)

**Deployment:**
- Raspberry Pi 3/4 (same or separate from MonsterBorg)
- Nginx (optional, for production)
- systemd service for auto-start

## Block Design

### Block Categories

#### 1. Movement Blocks (Green)
These blocks control the robot's motion:

**Forward Block**
- Icon: ↑
- Parameters: Distance (dropdown: 10cm, 25cm, 50cm, 1m, 2m)
- Code: `PerformDrive(+distance)`

**Backward Block**
- Icon: ↓
- Parameters: Distance (dropdown: 10cm, 25cm, 50cm, 1m, 2m)
- Code: `PerformDrive(-distance)`

**Turn Left Block**
- Icon: ↶
- Parameters: Angle (dropdown: 45°, 90°, 180°, 360°)
- Code: `PerformSpin(-angle)`

**Turn Right Block**
- Icon: ↷
- Parameters: Angle (dropdown: 45°, 90°, 180°, 360°)
- Code: `PerformSpin(+angle)`

**Spin in Circle Block**
- Icon: ⟲
- Parameters: Direction (Left/Right), Rotations (1, 2, 3)
- Code: `PerformSpin(±360 * rotations)`

**Custom Move Block** (Advanced)
- Parameters: Left Motor Power (-100% to +100%), Right Motor Power (-100% to +100%), Duration (seconds)
- Code: `PerformMove(left, right, duration)`

#### 2. LED Blocks (Yellow)
Control the robot's lights:

**Set LED Color Block**
- Icon: 💡
- Parameters: Color picker or presets (Red, Green, Blue, Yellow, Purple, White, Off)
- Code: `TB.SetLeds(r, g, b)`

**Rainbow LED Block**
- Icon: 🌈
- Cycles through colors
- Code: Custom animation loop

**Battery Indicator Block**
- Icon: 🔋
- Shows battery level via LED colors
- Code: `TB.SetLedShowBattery(True)`

#### 3. Timing Blocks (Orange)
Control execution timing:

**Wait Block**
- Icon: ⏱️
- Parameters: Duration (dropdown: 0.5s, 1s, 2s, 3s, 5s)
- Code: `time.sleep(duration)`

**Repeat Block**
- Icon: 🔁
- Parameters: Number of times (1-10)
- Wraps other blocks
- Code: `for i in range(count):`

#### 4. Pattern Blocks (Purple)
Pre-defined movement patterns:

**Draw Square Block**
- Parameters: Side length (25cm, 50cm, 1m)
- Code: 4x (Forward + Turn Right 90°)

**Draw Triangle Block**
- Parameters: Side length
- Code: 3x (Forward + Turn Right 120°)

**Draw Circle Block**
- Parameters: Diameter
- Code: Multiple small forward + turn movements

**Figure-8 Block**
- Creates a figure-8 pattern
- Code: Two circles in opposite directions

**Dance Block**
- Fun random movements
- Code: Random sequence of spins and moves

#### 5. Control Blocks (Red)
Program flow control:

**Start Block**
- Always present, cannot be deleted
- Entry point for the program

**Stop Block**
- Immediately stops all motors
- Code: `TB.MotorsOff()`

**Emergency Stop Block**
- Stops and sets red LED
- Code: `TB.MotorsOff(); TB.SetLeds(1,0,0)`

#### 6. Camera Blocks (Blue) - Optional/Future
**Take Photo Block**
- Captures and saves a photo
- Code: Save current camera frame

## User Interface Design

### Main Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│  MonsterBorg Block Coder                    [?] [Settings]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌────────────────────────────────────┐  │
│  │              │  │                                      │  │
│  │   BLOCK      │  │                                      │  │
│  │   TOOLBOX    │  │        WORKSPACE                    │  │
│  │              │  │                                      │  │
│  │  🟢 Move     │  │    [Drag blocks here]               │  │
│  │  🟡 LEDs     │  │                                      │  │
│  │  🟠 Time     │  │                                      │  │
│  │  🟣 Patterns │  │                                      │  │
│  │  🔴 Control  │  │                                      │  │
│  │              │  │                                      │  │
│  │              │  │                                      │  │
│  └──────────────┘  └────────────────────────────────────┘  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐    │
│  │         📹 Live Camera Feed (240x192)              │    │
│  │                                                      │    │
│  └────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  [▶️ RUN]  [⏹️ STOP]  [💾 SAVE]  [📂 LOAD]  [🗑️ CLEAR]    │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

**Visual Feedback:**
- Blocks snap together with satisfying animation
- Current executing block highlights in yellow
- Completed blocks briefly flash green
- Errors show in red with simple messages

**Safety Features:**
- Prominent STOP button (always visible, large, red)
- Automatic timeout after 5 minutes of execution
- Battery level warning
- Connection status indicator

**Kid-Friendly Elements:**
- Large, colorful blocks with icons
- Simple language (no technical jargon)
- Tooltips with pictures
- Example programs to load
- Undo/Redo buttons
- Zoom controls for workspace

## API Specification

### REST Endpoints

**Program Management:**
```
POST   /api/program/run
  Body: { "blocks": [...] }
  Response: { "execution_id": "uuid", "status": "running" }

POST   /api/program/stop
  Response: { "status": "stopped" }

GET    /api/program/status
  Response: { "status": "idle|running|error", "current_block": 3, "total_blocks": 10 }

POST   /api/program/save
  Body: { "name": "My Routine", "blocks": [...] }
  Response: { "id": "uuid", "saved": true }

GET    /api/program/list
  Response: { "programs": [{ "id": "uuid", "name": "My Routine", "created": "..." }] }

GET    /api/program/load/:id
  Response: { "id": "uuid", "name": "My Routine", "blocks": [...] }

DELETE /api/program/:id
  Response: { "deleted": true }
```

**Robot Control:**
```
GET    /api/robot/status
  Response: { "battery": 11.8, "connected": true, "motors_on": false }

POST   /api/robot/emergency_stop
  Response: { "stopped": true }

GET    /api/robot/calibration
  Response: { "timeForward1m": 0.85, "timeSpin360": 1.10 }

POST   /api/robot/calibration
  Body: { "timeForward1m": 0.85, "timeSpin360": 1.10 }
```

**Camera:**
```
GET    /api/camera/stream
  Response: MJPEG stream

POST   /api/camera/photo
  Response: { "filename": "photo_123.jpg", "url": "/photos/photo_123.jpg" }
```

### WebSocket Events

**Client → Server:**
```javascript
// Start program execution
{ "type": "run_program", "blocks": [...] }

// Stop execution
{ "type": "stop_program" }

// Request status update
{ "type": "get_status" }
```

**Server → Client:**
```javascript
// Execution progress
{ "type": "execution_progress", "current_block": 3, "total_blocks": 10 }

// Block started
{ "type": "block_started", "block_id": "block_5" }

// Block completed
{ "type": "block_completed", "block_id": "block_5" }

// Execution finished
{ "type": "execution_finished", "status": "success" }

// Error occurred
{ "type": "error", "message": "Robot disconnected", "block_id": "block_7" }

// Battery warning
{ "type": "battery_warning", "voltage": 7.2 }
```

## Block-to-Code Translation

### Example Translation

**Blockly Blocks:**
```
[Start]
  ↓
[Forward 50cm]
  ↓
[Turn Right 90°]
  ↓
[Set LED Green]
  ↓
[Wait 1s]
  ↓
[Repeat 3 times]
    [Spin Left 360°]
```

**Generated Python Code:**
```python
import ThunderBorg
import time

TB = ThunderBorg.ThunderBorg()
TB.Init()

# Configuration
timeForward1m = 0.85
timeSpin360 = 1.10
maxPower = 0.95

def PerformMove(driveLeft, driveRight, numSeconds):
    TB.SetMotor1(driveRight * maxPower)
    TB.SetMotor2(driveLeft * maxPower)
    time.sleep(numSeconds)
    TB.MotorsOff()

def PerformDrive(meters):
    direction = 1.0 if meters > 0 else -1.0
    numSeconds = abs(meters) * timeForward1m
    PerformMove(direction, direction, numSeconds)

def PerformSpin(angle):
    direction = -1.0 if angle < 0 else 1.0
    numSeconds = (abs(angle) / 360.0) * timeSpin360
    PerformMove(-direction, direction, numSeconds)

# User program
try:
    # Block 1: Forward 50cm
    PerformDrive(0.5)
    
    # Block 2: Turn Right 90°
    PerformSpin(90)
    
    # Block 3: Set LED Green
    TB.SetLeds(0, 1, 0)
    
    # Block 4: Wait 1s
    time.sleep(1)
    
    # Block 5: Repeat 3 times
    for i in range(3):
        # Block 6: Spin Left 360°
        PerformSpin(-360)
        
finally:
    TB.MotorsOff()
    TB.SetLeds(0, 0, 0)
```

## File Structure

```
monsterborg-blockly/
├── README.md
├── requirements.txt
├── setup.sh
├── config.yaml
│
├── backend/
│   ├── __init__.py
│   ├── app.py                 # Main Flask/FastAPI application
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── program.py         # Program management endpoints
│   │   ├── robot.py           # Robot control endpoints
│   │   └── camera.py          # Camera streaming endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── compiler.py        # Blockly to Python compiler
│   │   ├── executor.py        # Program execution engine
│   │   ├── robot_controller.py # ThunderBorg wrapper
│   │   └── camera_service.py  # Camera streaming service
│   ├── models/
│   │   ├── __init__.py
│   │   └── program.py         # Program data models
│   ├── utils/
│   │   ├── __init__.py
│   │   └── safety.py          # Safety checks and timeouts
│   └── ThunderBorg.py         # Existing library
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   └── blocks.css
│   ├── js/
│   │   ├── main.js
│   │   ├── blockly-config.js  # Blockly initialization
│   │   ├── blocks/
│   │   │   ├── movement.js    # Movement block definitions
│   │   │   ├── leds.js        # LED block definitions
│   │   │   ├── timing.js      # Timing block definitions
│   │   │   ├── patterns.js    # Pattern block definitions
│   │   │   └── control.js     # Control block definitions
│   │   ├── generators/
│   │   │   └── python.js      # Python code generators
│   │   ├── ui.js              # UI interactions
│   │   └── websocket.js       # WebSocket communication
│   └── assets/
│       ├── icons/
│       └── sounds/            # Optional: sound effects
│
├── data/
│   ├── programs/              # Saved user programs (JSON)
│   ├── photos/                # Captured photos
│   └── examples/              # Example programs
│       ├── square.json
│       ├── dance.json
│       └── explore.json
│
├── tests/
│   ├── test_compiler.py
│   ├── test_executor.py
│   └── test_api.py
│
└── docs/
    ├── USER_GUIDE.md
    ├── PARENT_GUIDE.md
    └── API_DOCUMENTATION.md
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Set up Flask/FastAPI backend
- [ ] Integrate ThunderBorg library
- [ ] Create basic REST API endpoints
- [ ] Implement WebSocket communication
- [ ] Set up camera streaming
- [ ] Create basic HTML/CSS interface

### Phase 2: Blockly Integration (Week 2-3)
- [ ] Integrate Blockly library
- [ ] Define custom block types
- [ ] Implement block-to-Python compiler
- [ ] Create code generators for each block
- [ ] Add block validation
- [ ] Test block combinations

### Phase 3: Execution Engine (Week 3-4)
- [ ] Build program executor
- [ ] Implement safety features (timeouts, emergency stop)
- [ ] Add execution progress tracking
- [ ] Create error handling
- [ ] Test with real robot
- [ ] Calibrate movement parameters

### Phase 4: User Interface (Week 4-5)
- [ ] Design kid-friendly UI
- [ ] Implement drag-and-drop workspace
- [ ] Add visual feedback (highlighting, animations)
- [ ] Create control panel (Run, Stop, Save, Load)
- [ ] Integrate camera feed
- [ ] Add tooltips and help system

### Phase 5: Storage & Examples (Week 5-6)
- [ ] Implement program save/load
- [ ] Create example programs
- [ ] Add program library browser
- [ ] Implement export/import functionality
- [ ] Add program sharing (optional)

### Phase 6: Testing & Polish (Week 6-7)
- [ ] User testing with target age group
- [ ] Fix bugs and usability issues
- [ ] Optimize performance
- [ ] Add sound effects (optional)
- [ ] Create user documentation
- [ ] Write parent guide

### Phase 7: Deployment (Week 7-8)
- [ ] Create installation script
- [ ] Set up systemd service
- [ ] Configure auto-start on boot
- [ ] Test on fresh Raspberry Pi
- [ ] Create backup/restore functionality
- [ ] Write deployment documentation

## Deployment Requirements

### Hardware Requirements

**Option A: Separate Raspberry Pi (Recommended)**
- Raspberry Pi 3B+ or 4 (2GB+ RAM)
- 16GB+ microSD card
- Power supply
- Network connection (WiFi or Ethernet)

**Option B: Same Raspberry Pi as MonsterBorg**
- Must have sufficient resources
- May impact robot performance

### Software Requirements
- Raspberry Pi OS (Bullseye or newer)
- Python 3.7+
- pip packages (see requirements.txt)
- Nginx (optional, for production)

### Network Setup
- Static IP address recommended
- mDNS for easy access (monsterborg.local)
- Port 80 or 8080 for web interface
- Firewall configuration

### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/yourusername/monsterborg-blockly.git
cd monsterborg-blockly

# 2. Run setup script
chmod +x setup.sh
sudo ./setup.sh

# 3. Configure settings
nano config.yaml

# 4. Start service
sudo systemctl start monsterborg-blockly
sudo systemctl enable monsterborg-blockly

# 5. Access interface
# Open browser to http://monsterborg.local or http://[IP-ADDRESS]
```

## Safety Features

### Hardware Safety
- Emergency stop button (always visible)
- Automatic motor shutoff on disconnect
- Battery level monitoring
- Timeout protection (5 minutes max execution)
- Communications failsafe enabled

### Software Safety
- Input validation on all blocks
- Maximum execution time limits
- Bounds checking on parameters
- Graceful error handling
- Automatic recovery from errors

### User Safety
- Clear visual indicators of robot state
- Audible warnings (optional)
- Parent supervision recommended
- Safe default values
- Undo functionality

## Future Enhancements

### Phase 2 Features (Future)
- [ ] Sensor integration (ultrasonic, line following)
- [ ] Conditional blocks (if/then/else)
- [ ] Variables and math operations
- [ ] Sound effects and music
- [ ] Multi-robot coordination
- [ ] Challenges and achievements
- [ ] Video recording of routines
- [ ] 3D visualization of path
- [ ] Mobile app version
- [ ] Voice control integration

### Advanced Features
- [ ] Python code view/edit mode
- [ ] Simulation mode (test without robot)
- [ ] Obstacle detection and avoidance
- [ ] Autonomous navigation
- [ ] Computer vision integration
- [ ] Machine learning blocks
- [ ] Multiplayer challenges
- [ ] Online community sharing

## Success Criteria

### Must Have (MVP)
- ✅ Kid can create simple movement sequences
- ✅ Blocks execute correctly on robot
- ✅ Save and load programs
- ✅ Emergency stop works reliably
- ✅ Interface is intuitive for 7-year-old
- ✅ Camera feed displays correctly
- ✅ System runs on Raspberry Pi

### Should Have
- ✅ Example programs included
- ✅ Visual execution feedback
- ✅ Battery monitoring
- ✅ Pattern blocks (square, circle, etc.)
- ✅ LED control
- ✅ Responsive design

### Nice to Have
- Sound effects
- Achievements/badges
- Multiple save slots
- Program export/import
- Simulation mode
- Tutorial mode

## Risk Assessment

### Technical Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Blockly integration complexity | High | Medium | Use official examples, start simple |
| Robot communication issues | High | Low | Implement robust error handling |
| Performance on Raspberry Pi | Medium | Medium | Optimize code, use lightweight framework |
| Camera streaming lag | Medium | Medium | Reduce resolution, optimize encoding |
| Block execution timing | Medium | Low | Calibrate carefully, allow user adjustment |

### User Experience Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Too complex for 7-year-old | High | Medium | User testing, simplify interface |
| Frustration with robot behavior | Medium | Medium | Clear feedback, good examples |
| Difficulty saving/loading | Low | Low | Simple UI, auto-save feature |
| Connection issues | Medium | Low | Clear status indicators, reconnect logic |

## Budget Estimate

### Hardware (if separate Pi needed)
- Raspberry Pi 4 (2GB): $45
- MicroSD Card (32GB): $10
- Power Supply: $10
- Case: $10
- **Total Hardware: ~$75**

### Development Time
- 7-8 weeks part-time development
- Or 3-4 weeks full-time development

### No Ongoing Costs
- No cloud services
- No subscriptions
- No authentication services
- Local-only operation

## Conclusion

This specification outlines a complete, kid-friendly block-based coding interface for the MonsterBorg robot. The system leverages Google Blockly for visual programming, runs entirely locally on a Raspberry Pi, and requires no cloud services or authentication.

The phased implementation approach allows for iterative development and testing, with the MVP focusing on core movement and LED control blocks. Future enhancements can add more advanced features as the child's skills develop.

The architecture is designed to be simple, maintainable, and safe, with multiple layers of protection to ensure the robot operates reliably and the user experience is positive and educational.