# MonsterBorg Blockly - Block-Based Coding Interface

A kid-friendly, block-based programming interface for the MonsterBorg robot car, built with Google Blockly and Flask.

## 🎯 Project Overview

This project provides a visual programming environment where children (age 7+) can create movement routines for their MonsterBorg robot using drag-and-drop blocks, similar to Scratch. The system runs entirely locally on a Raspberry Pi with no cloud services required.

## ✨ Features

### Current Implementation (Backend Complete)

- ✅ **Flask REST API** - Complete backend with program management, robot control, and camera endpoints
- ✅ **Robot Controller** - High-level interface for ThunderBorg motor control
- ✅ **Block Compiler** - Converts visual blocks to executable commands
- ✅ **Program Executor** - Safe execution with timeouts and emergency stop
- ✅ **WebSocket Support** - Real-time execution progress updates
- ✅ **Camera Service** - Streaming and photo capture (with mock mode)
- ✅ **Safety Features** - Emergency stop, timeouts, battery monitoring
- ✅ **Mock Mode** - Test without hardware

### Planned Features (Frontend - In Progress)

- 🔄 **Blockly Interface** - Visual block workspace
- 🔄 **Live Camera Feed** - Real-time video from robot
- 🔄 **Example Programs** - Pre-built routines to learn from
- 🔄 **Save/Load Programs** - Persistent storage of creations

## 📋 Block Categories

### 🟢 Movement Blocks
- Forward/Backward (with distance)
- Turn Left/Right (with angle)
- Spin in Circle
- Custom Move (advanced)

### 🟡 LED Blocks
- Set LED Color (RGB or presets)
- Battery Indicator
- Rainbow Effect

### 🟠 Timing Blocks
- Wait (delay)
- Repeat (loop)

### 🟣 Pattern Blocks
- Draw Square
- Draw Triangle
- Draw Circle
- Figure-8

### 🔴 Control Blocks
- Start (always present)
- Stop
- Emergency Stop

## 🏗️ Architecture

```
Frontend (HTML/JS/Blockly)
    ↓ HTTP/WebSocket
Backend (Flask/Python)
    ├── Routes (API endpoints)
    ├── Services
    │   ├── Robot Controller
    │   ├── Block Compiler
    │   ├── Program Executor
    │   └── Camera Service
    └── ThunderBorg Library
        ↓ I²C
MonsterBorg Robot Hardware
```

## 📁 Project Structure

```
monsterborg-blockly/
├── backend/
│   ├── app.py                    # Main Flask application
│   ├── websocket_handlers.py     # WebSocket events
│   ├── routes/
│   │   ├── program.py            # Program management API
│   │   ├── robot.py              # Robot control API
│   │   └── camera.py             # Camera API
│   └── services/
│       ├── robot_controller.py   # Robot control logic
│       ├── compiler.py           # Block to command compiler
│       ├── executor.py           # Program execution engine
│       └── camera_service.py     # Camera handling
├── frontend/                     # (To be implemented)
│   ├── index.html
│   ├── css/
│   └── js/
├── data/
│   ├── programs/                 # Saved user programs
│   ├── photos/                   # Captured photos
│   └── examples/                 # Example programs
├── config.yaml                   # Configuration
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

## 🚀 Installation

### Prerequisites

- Raspberry Pi 3B+ or 4 (2GB+ RAM recommended)
- Raspberry Pi OS (Bullseye or newer)
- Python 3.7+
- MonsterBorg robot with ThunderBorg controller
- Pi Camera (optional)

### Quick Start

#### On macOS/Linux (Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd monsterborg-blockly
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure for mock mode**
   ```bash
   cp .env.example .env
   # Edit .env and set:
   # MOCK_ROBOT=True
   # MOCK_CAMERA=True
   ```

5. **Run the application**
   ```bash
   python3 backend/app.py
   ```

6. **Access the interface**
   - Open browser to `http://localhost:8080`

**Note:** Always activate the virtual environment before running:
```bash
source venv/bin/activate
```

#### On Raspberry Pi (Production)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd monsterborg-blockly
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Install Raspberry Pi specific dependencies**
   ```bash
   source venv/bin/activate
   pip3 install -r requirements-pi.txt
   ```

4. **Copy ThunderBorg library**
   ```bash
   cp /path/to/ThunderBorg.py backend/
   ```

5. **Configure settings**
   ```bash
   nano .env  # Set MOCK_ROBOT=False, MOCK_CAMERA=False
   nano config.yaml  # Adjust robot calibration
   ```

6. **Run the application**
   ```bash
   python3 backend/app.py
   ```

7. **Access the interface**
   - From Pi: `http://localhost:8080`
   - From another device: `http://[raspberry-pi-ip]:8080`

## ⚙️ Configuration

### Environment Variables (.env)

```bash
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key

# Set to True for testing without hardware
MOCK_ROBOT=False
MOCK_CAMERA=False
```

### Robot Calibration (config.yaml)

```yaml
robot:
  time_forward_1m: 0.85  # Seconds to move 1 meter
  time_spin_360: 1.10    # Seconds to spin 360 degrees
  voltage_in: 12.0
  voltage_out: 11.4
```

**To calibrate:**
1. Use the test endpoints to measure actual movement
2. Adjust values in config.yaml
3. Restart the application

## 🧪 Testing Without Hardware

The system supports mock mode for development without the robot:

```bash
# In .env file
MOCK_ROBOT=True
MOCK_CAMERA=True
```

This allows you to:
- Test the API and UI
- Develop block logic
- Verify program compilation
- See execution flow in logs

## 📡 API Endpoints

### Program Management

```
POST   /api/program/run          # Execute a program
POST   /api/program/stop         # Stop execution
GET    /api/program/status       # Get execution status
POST   /api/program/save         # Save a program
GET    /api/program/list         # List saved programs
GET    /api/program/load/:id     # Load a program
DELETE /api/program/:id          # Delete a program
GET    /api/program/examples     # List examples
```

### Robot Control

```
GET    /api/robot/status         # Get robot status
POST   /api/robot/emergency_stop # Emergency stop
GET    /api/robot/calibration    # Get calibration values
POST   /api/robot/calibration    # Update calibration
POST   /api/robot/test_move      # Test movement
POST   /api/robot/led            # Set LED color
```

### Camera

```
GET    /api/camera/stream        # MJPEG stream
POST   /api/camera/photo         # Capture photo
GET    /api/camera/photos        # List photos
GET    /api/camera/photos/:name  # Get photo
DELETE /api/camera/photos/:name  # Delete photo
```

### WebSocket Events

**Client → Server:**
- `run_program` - Start execution
- `stop_program` - Stop execution
- `get_status` - Request status
- `emergency_stop` - Emergency stop

**Server → Client:**
- `execution_started` - Program started
- `execution_progress` - Progress update
- `execution_finished` - Program completed
- `error` - Error occurred

## 🔒 Safety Features

1. **Emergency Stop** - Large red button always accessible
2. **Execution Timeout** - Maximum 5 minutes per program
3. **Battery Monitoring** - Warns when battery is low
4. **Communications Failsafe** - Stops motors if connection lost
5. **Mock Mode** - Test safely without hardware

## 🐛 Troubleshooting

### Robot not connecting

```bash
# Check I²C is enabled
sudo raspi-config
# Interface Options → I²C → Enable

# Test I²C devices
sudo i2cdetect -y 1

# Check ThunderBorg address (should be 0x15)
```

### Camera not working

```bash
# Enable camera
sudo raspi-config
# Interface Options → Camera → Enable

# Test camera
libcamera-hello

# Check permissions
sudo usermod -a -G video $USER
```

### Port already in use

```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill process
sudo kill -9 <PID>
```

## 📚 Development

### Running in Development Mode

```bash
export FLASK_ENV=development
export FLASK_DEBUG=True
python3 backend/app.py
```

### Running Tests

```bash
pytest tests/
```

### Code Style

```bash
# Format code
black backend/

# Check style
flake8 backend/
```

## 🗺️ Roadmap

### Phase 1: Core Backend ✅ (Complete)
- [x] Flask application structure
- [x] Robot controller service
- [x] Block compiler
- [x] Program executor
- [x] REST API endpoints
- [x] WebSocket support
- [x] Camera service

### Phase 2: Frontend (In Progress)
- [ ] Blockly integration
- [ ] Block definitions
- [ ] UI layout
- [ ] Camera feed display
- [ ] Control panel

### Phase 3: Features
- [ ] Example programs
- [ ] Save/load functionality
- [ ] Photo gallery
- [ ] Calibration wizard

### Phase 4: Polish
- [ ] User documentation
- [ ] Parent guide
- [ ] Setup automation
- [ ] systemd service

## 🤝 Contributing

This is a personal project for educational purposes. Feel free to fork and adapt for your own MonsterBorg!

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- PiBorg for the MonsterBorg robot and ThunderBorg controller
- Google for the Blockly library
- The Raspberry Pi Foundation

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the logs in `logs/monsterborg.log`
3. Test in mock mode to isolate hardware issues

## 🎓 Educational Use

This project is designed to teach:
- **Programming Concepts**: Sequences, loops, conditionals
- **Robotics**: Motor control, sensors, movement
- **Problem Solving**: Debugging, calibration, optimization
- **Creativity**: Designing custom routines and patterns

Perfect for kids aged 7+ learning to code!

---

**Status**: Backend Complete ✅ | Frontend In Progress 🔄

**Version**: 0.1.0

**Last Updated**: 2026-05-20


## 🌐 Static IP Configuration

> **Note:** The `setup.sh` script does NOT modify network settings automatically. Static IP configuration is a manual step to ensure you have full control over your network setup.

A static IP address ensures the robot is always reachable at the same address on your local network, making it easier to connect from a tablet or laptop.

### Step 1: Identify Your Active Network Interface

```bash
ip link show
```

Look for an interface that is `UP` — typically:
- `eth0` for wired Ethernet
- `wlan0` for Wi-Fi

You can also use `ip addr` to see which interface has an assigned IP address.

### Step 2: Choose Your Static IP Settings

You'll need these values (adjust for your network):

| Setting | Example | Description |
|---------|---------|-------------|
| IP Address | `192.168.1.100` | The fixed address for your Pi |
| Subnet Mask | `/24` | Defines the local network range |
| Gateway | `192.168.1.1` | Your router's IP address |
| DNS | `192.168.1.1` | Usually the same as your gateway |

**CIDR Notation:** `/24` is equivalent to a subnet mask of `255.255.255.0`. This means all devices with addresses `192.168.1.x` are on the same local network.

**Gateway:** This is the IP address of your router. All traffic destined for the internet goes through the gateway. You can find it by running `ip route | grep default` on a device already connected to your network.

### Step 3a: Configure on dhcpcd-based Systems (Raspberry Pi OS Bullseye and older)

Edit the dhcpcd configuration file:

```bash
sudo nano /etc/dhcpcd.conf
```

Add the following at the end of the file (replace values with your own):

```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

For Wi-Fi, replace `eth0` with `wlan0`.

### Step 3b: Configure on NetworkManager-based Systems (Raspberry Pi OS Bookworm and newer)

Raspberry Pi OS Bookworm uses NetworkManager instead of dhcpcd. Use `nmcli` to configure a static IP:

```bash
# List connections to find your active connection name
nmcli connection show

# Set static IP for a wired connection (replace "Wired connection 1" with your connection name)
sudo nmcli connection modify "Wired connection 1" \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "192.168.1.1 8.8.8.8" \
  ipv4.method manual

# For Wi-Fi, use your Wi-Fi connection name instead
sudo nmcli connection modify "your-wifi-ssid" \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "192.168.1.1 8.8.8.8" \
  ipv4.method manual
```

### Step 4: Apply the Changes

Reboot the Raspberry Pi to apply the new network settings:

```bash
sudo reboot
```

Alternatively, restart just the networking service:

```bash
# For dhcpcd-based systems
sudo systemctl restart dhcpcd

# For NetworkManager-based systems
sudo nmcli connection down "Wired connection 1" && sudo nmcli connection up "Wired connection 1"
```

### Verifying Your Configuration

After restarting, confirm the static IP is active:

```bash
ip addr show eth0
```

Then test connectivity:

```bash
ping -c 3 192.168.1.1   # Test gateway
ping -c 3 8.8.8.8       # Test internet
```

Once configured, you can access the MonsterBorg interface from any device on your network at `http://192.168.1.100:8080` (or `http://monsterborg.local:8080` if mDNS is working).
