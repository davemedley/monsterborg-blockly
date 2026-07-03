# ThunderBorg Python 3 Fix

## Background

The MonsterBorg uses PiBorg's ThunderBorg motor controller, which communicates over I2C. The official `ThunderBorg.py` library from PiBorg is written for **Python 2** and won't work with Python 3 without modifications.

The key issues are:
1. `print` statements instead of `print()` functions (handled by `2to3`)
2. `RawWrite()` builds a string with `chr()` and writes it — Python 3 needs `bytes`
3. `RawRead()` uses `ord()` on bytes from `i2cRead.read()` — Python 3 already returns ints when iterating over bytes

## The Fix

### Step 1: Copy the real ThunderBorg.py

The real library lives on the Pi (from PiBorg's original install):

```bash
sudo cp /home/pi/monsterborg/ThunderBorg.py /opt/monsterborg-blockly/backend/ThunderBorg.py
```

### Step 2: Convert Python 2 → 3 syntax

```bash
sudo 2to3 -w -n /opt/monsterborg-blockly/backend/ThunderBorg.py
```

This fixes `print` statements, `except` syntax, etc. But it breaks the I2C byte handling.

### Step 3: Patch the byte handling

The `2to3` tool doesn't handle raw I2C byte operations correctly. Apply this patch:

```bash
sudo /opt/monsterborg-blockly/venv/bin/python3 << 'EOF'
with open('/opt/monsterborg-blockly/backend/ThunderBorg.py', 'rb') as f:
    content = f.read()

# Fix RawRead: Python 3 bytes iteration gives ints directly, no ord() needed
old_rawread = b"""            for singleByte in rawReply:
                reply.append(ord(singleByte))"""
new_rawread = b"""            reply = list(rawReply)"""
content = content.replace(old_rawread, new_rawread)

# Fix RawWrite: need to send bytes, not str
old_rawwrite = b"""        rawOutput = chr(command)
        for singleByte in data:
            rawOutput += chr(singleByte)
        self.i2cWrite.write(rawOutput)"""
new_rawwrite = b"""        rawOutput = bytes([command] + list(data))
        self.i2cWrite.write(rawOutput)"""
content = content.replace(old_rawwrite, new_rawwrite)

with open('/opt/monsterborg-blockly/backend/ThunderBorg.py', 'wb') as f:
    f.write(content)
print('Patched OK')
EOF
```

### Step 4: Ensure smbus is available in the venv

The ThunderBorg library uses `smbus` to talk to I2C. It's a system package that needs to be symlinked into the virtual environment:

```bash
sudo ln -sf /usr/lib/python3/dist-packages/smbus* /opt/monsterborg-blockly/venv/lib/python3.7/site-packages/
```

### Step 5: Restart the service

```bash
sudo chown monsterborg:monsterborg /opt/monsterborg-blockly/backend/ThunderBorg.py
sudo systemctl restart monsterborg-blockly
```

### Verify

```bash
sudo journalctl -u monsterborg-blockly --no-pager -n 10 | grep -i "thunder\|Found\|mock"
```

You should see:
```
Found ThunderBorg at 15
Robot controller initialized successfully
```

If you see "Running in MOCK mode", the patch didn't apply or smbus isn't linked.

## Important: Surviving rsync/deploy

The `backend/ThunderBorg.py` on the Pi is the **patched real library**. The version in your development workspace on your Mac is a **stub** (placeholder for development without hardware).

When deploying from your Mac to the Pi, **exclude** ThunderBorg.py:

```bash
rsync -avz --exclude='.git' --exclude='__pycache__' --exclude='venv' \
  --exclude='backend/ThunderBorg.py' \
  /path/to/project/ pi@192.168.0.126:/tmp/monsterborg-blockly/

ssh pi@192.168.0.126 "sudo rsync -a /tmp/monsterborg-blockly/ /opt/monsterborg-blockly/ && sudo chown -R monsterborg:monsterborg /opt/monsterborg-blockly && sudo systemctl restart monsterborg-blockly"
```

If you accidentally overwrite it, re-run Steps 1–5 above.

## Creating a New Workspace from the Pi's Code

To pull the working code off the Pi and create a new local workspace:

```bash
# On your Mac — pull everything from the Pi
mkdir -p ~/GitHub/monsterborg-blockly
rsync -avz --exclude='venv' --exclude='__pycache__' --exclude='.pytest_cache' \
  pi@192.168.0.126:/opt/monsterborg-blockly/ \
  ~/GitHub/monsterborg-blockly/

# Initialize git
cd ~/GitHub/monsterborg-blockly
git init
git add -A
git commit -m "Initial commit from Pi deployment"
```

This gives you the **working production code** including the patched ThunderBorg.py. If you want to keep a stub for local development (so the app runs in mock mode on your Mac), you can:

1. Keep the real ThunderBorg.py in the repo (it'll just fail to find hardware and fall back to mock mode on non-Pi systems)
2. Or add `backend/ThunderBorg.py` to `.gitignore` and maintain separate versions

Option 1 is simpler — the real library works fine on any system, it just won't find the ThunderBorg hardware and the robot controller will activate mock mode automatically.

## Quick Reference

| What | Where |
|------|-------|
| Real ThunderBorg.py (Python 2) | `/home/pi/monsterborg/ThunderBorg.py` |
| Patched ThunderBorg.py (Python 3) | `/opt/monsterborg-blockly/backend/ThunderBorg.py` |
| ThunderBorg I2C address | `0x15` |
| I2C bus | `/dev/i2c-1` |
| Test I2C detection | `sudo i2cdetect -y 1` (look for `15`) |
| Test ThunderBorg init | See verify step above |
| System smbus library | `/usr/lib/python3/dist-packages/smbus*` |
