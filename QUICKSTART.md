# Quick Start Guide - MonsterBorg Blockly

## For macOS Development (Testing Without Hardware)

Follow these steps to run the backend on your Mac:

### 1. Create Virtual Environment

```bash
cd monsterborg-bob
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
```
MOCK_ROBOT=True
MOCK_CAMERA=True
```

### 4. Run the Application

```bash
python3 backend/app.py
```

You should see:
```
MonsterBorg Blockly starting...
Server: 0.0.0.0:8080
Robot enabled: True
Camera enabled: True
Running in MOCK mode - no actual robot control
Running in MOCK camera mode
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:8080
```

### 5. Test the API

Open your browser and visit:
- http://localhost:8080/health - Should return `{"status":"ok","version":"0.1.0"}`
- http://localhost:8080/api/robot/status - Should return robot status (mock mode)
- http://localhost:8080/api/program/examples - Should list example programs

### 6. Stop the Server

Press `Ctrl+C` in the terminal

### Common Issues

**Issue: `externally-managed-environment` error**
- Solution: You forgot to activate the virtual environment
- Run: `source venv/bin/activate`

**Issue: `ModuleNotFoundError: No module named 'flask'`**
- Solution: Install dependencies in the virtual environment
- Run: `pip install -r requirements.txt`

**Issue: Port 8080 already in use**
- Solution: Change the port in `config.yaml` or kill the process using port 8080
- Run: `lsof -ti:8080 | xargs kill -9`

## For Raspberry Pi Deployment (With Real Robot)

### 1. Transfer Files to Raspberry Pi

```bash
# On your Mac
scp -r monsterborg-bob pi@raspberrypi.local:~/
```

### 2. SSH into Raspberry Pi

```bash
ssh pi@raspberrypi.local
cd monsterborg-bob
```

### 3. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

### 4. Install Pi-Specific Dependencies

```bash
source venv/bin/activate
pip install -r requirements-pi.txt
```

### 5. Copy ThunderBorg Library

```bash
# Find your ThunderBorg.py file (usually in examples)
cp /path/to/ThunderBorg.py backend/
```

### 6. Configure for Real Hardware

Edit `.env`:
```
MOCK_ROBOT=False
MOCK_CAMERA=False
```

Edit `config.yaml` to calibrate your robot:
```yaml
robot:
  time_forward_1m: 0.85  # Adjust based on your robot
  time_spin_360: 1.10    # Adjust based on your robot
```

### 7. Run the Application

```bash
python3 backend/app.py
```

### 8. Access from Browser

- From Pi: http://localhost:8080
- From another device: http://[raspberry-pi-ip]:8080

## Next Steps

Once the backend is running, you can:

1. **Test the API** using curl or Postman
2. **Build the frontend** with Blockly
3. **Create custom programs** using the block format
4. **Calibrate the robot** using the test endpoints

## Need Help?

- Check the main README.md for detailed documentation
- Review PROJECT_SPECIFICATION.md for technical details
- Look at example programs in `data/examples/`
- Check logs for error messages

## Development Workflow

```bash
# Always activate virtual environment first
source venv/bin/activate

# Make changes to code
# ...

# Run the application
python3 backend/app.py

# Test your changes
# ...

# Deactivate when done
deactivate
```

Happy coding! 🤖