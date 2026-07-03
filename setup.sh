#!/bin/bash
# MonsterBorg Blockly - Enhanced Setup Script
# Installs all dependencies and configures the Raspberry Pi for deployment.
# Must be run as root (sudo ./setup.sh).
# Each step is idempotent: re-running this script on an already-configured system
# will skip satisfied steps and complete without error.

set -e

# --- Constants ---
INSTALL_DIR="/opt/monsterborg-blockly"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="monsterborg-blockly"
SERVICE_FILE="${SERVICE_NAME}.service"
USERNAME="monsterborg"
HOSTNAME_TARGET="monsterborg"
VENV_DIR="${INSTALL_DIR}/venv"

# Required packages (must succeed)
REQUIRED_PACKAGES="python3 python3-pip python3-venv i2c-tools avahi-daemon"
# Optional packages (may not be available on older distros like Buster)
OPTIONAL_PACKAGES="libcamera-apps python3-picamera2"

# --- Helper functions ---

print_step() {
    echo ""
    echo ">>> $1"
}

print_ok() {
    echo "    [OK] $1"
}

print_skip() {
    echo "    [SKIP] $1"
}

print_warn() {
    echo "    [WARN] $1" >&2
}

fail() {
    echo "    [FAIL] $1" >&2
    exit 1
}

# --- Step 0: Root check ---

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: This script must be run as root (sudo ./setup.sh)" >&2
    exit 1
fi

echo "=================================="
echo " MonsterBorg Blockly Setup"
echo "=================================="
echo " Install dir: ${INSTALL_DIR}"
echo " Script dir:  ${SCRIPT_DIR}"

# --- Step 1: Install system packages ---

print_step "Installing system packages"

# Update package list only if it hasn't been updated in the last hour
apt_list_age=0
if [ -f /var/lib/apt/lists/lock ]; then
    apt_list_age=$(( $(date +%s) - $(stat -c %Y /var/lib/apt/lists/lock 2>/dev/null || echo 0) ))
fi

if [ "$apt_list_age" -gt 3600 ] || [ "$apt_list_age" -eq 0 ]; then
    apt-get update --allow-releaseinfo-change -qq || fail "apt-get update failed"
    print_ok "Package list updated"
else
    print_skip "Package list recently updated"
fi

apt-get install -y -qq ${REQUIRED_PACKAGES} || fail "Failed to install required system packages"
print_ok "Required packages installed: ${REQUIRED_PACKAGES}"

# Install optional packages individually (skip if unavailable)
for pkg in ${OPTIONAL_PACKAGES}; do
    if apt-get install -y -qq "$pkg" 2>/dev/null; then
        print_ok "Optional package installed: ${pkg}"
    else
        print_warn "Optional package not available: ${pkg} (camera will use mock mode)"
    fi
done

# --- Step 2: Enable I2C interface ---

print_step "Enabling I2C interface"

if command -v raspi-config &>/dev/null; then
    i2c_status=$(raspi-config nonint get_i2c 2>/dev/null || echo "1")
    if [ "$i2c_status" = "0" ]; then
        print_skip "I2C already enabled"
    else
        raspi-config nonint do_i2c 0 || fail "Failed to enable I2C"
        print_ok "I2C enabled"
    fi
else
    print_skip "raspi-config not found (not a Raspberry Pi?), skipping I2C configuration"
fi

# --- Step 3: Enable camera interface ---

print_step "Enabling camera interface"

if command -v raspi-config &>/dev/null; then
    camera_status=$(raspi-config nonint get_camera 2>/dev/null || echo "1")
    if [ "$camera_status" = "0" ]; then
        print_skip "Camera already enabled"
    else
        raspi-config nonint do_camera 0 || fail "Failed to enable camera"
        print_ok "Camera enabled"
    fi
else
    print_skip "raspi-config not found (not a Raspberry Pi?), skipping camera configuration"
fi

# --- Step 4: Set hostname ---

print_step "Setting hostname to '${HOSTNAME_TARGET}'"

current_hostname=$(hostnamectl --static 2>/dev/null || hostname)
if [ "$current_hostname" = "$HOSTNAME_TARGET" ]; then
    print_skip "Hostname already set to '${HOSTNAME_TARGET}'"
else
    hostnamectl set-hostname "$HOSTNAME_TARGET" || fail "Failed to set hostname"
    # Update /etc/hosts if needed
    if ! grep -q "$HOSTNAME_TARGET" /etc/hosts; then
        sed -i "s/127\.0\.1\.1.*/127.0.1.1\t${HOSTNAME_TARGET}/" /etc/hosts 2>/dev/null || true
    fi
    print_ok "Hostname set to '${HOSTNAME_TARGET}'"
fi

# --- Step 5: Create monsterborg user ---

print_step "Creating user '${USERNAME}'"

if id "$USERNAME" &>/dev/null; then
    print_skip "User '${USERNAME}' already exists"
else
    useradd --system --create-home --shell /usr/sbin/nologin "$USERNAME" || fail "Failed to create user '${USERNAME}'"
    print_ok "User '${USERNAME}' created"
fi

# Ensure user is in i2c and video groups
for group in i2c video; do
    if id -nG "$USERNAME" | grep -qw "$group"; then
        print_skip "User '${USERNAME}' already in group '${group}'"
    else
        usermod -aG "$group" "$USERNAME" || fail "Failed to add '${USERNAME}' to group '${group}'"
        print_ok "User '${USERNAME}' added to group '${group}'"
    fi
done

# --- Step 6: Copy project to install directory ---

print_step "Setting up project in ${INSTALL_DIR}"

if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR"
    # Copy project files (excluding venv and __pycache__)
    rsync -a --exclude='venv' --exclude='__pycache__' --exclude='.pytest_cache' \
        --exclude='.git' --exclude='*.pyc' \
        "${SCRIPT_DIR}/" "${INSTALL_DIR}/" || fail "Failed to copy project to ${INSTALL_DIR}"
    print_ok "Project files copied to ${INSTALL_DIR}"
else
    print_skip "Already running from ${INSTALL_DIR}"
fi

# --- Step 7: Create virtual environment and install dependencies ---

print_step "Setting up Python virtual environment"

if [ -d "${VENV_DIR}" ] && [ -f "${VENV_DIR}/bin/python3" ]; then
    print_skip "Virtual environment already exists at ${VENV_DIR}"
else
    python3 -m venv "$VENV_DIR" || fail "Failed to create virtual environment"
    print_ok "Virtual environment created at ${VENV_DIR}"
fi

print_step "Installing Python dependencies"

"${VENV_DIR}/bin/pip" install --upgrade pip --quiet || fail "Failed to upgrade pip"

if [ -f "${INSTALL_DIR}/requirements.txt" ]; then
    "${VENV_DIR}/bin/pip" install -r "${INSTALL_DIR}/requirements.txt" --quiet || fail "Failed to install requirements.txt"
    print_ok "requirements.txt installed"
else
    print_warn "requirements.txt not found at ${INSTALL_DIR}/requirements.txt"
fi

if [ -f "${INSTALL_DIR}/requirements-pi.txt" ]; then
    "${VENV_DIR}/bin/pip" install -r "${INSTALL_DIR}/requirements-pi.txt" --quiet || fail "Failed to install requirements-pi.txt"
    print_ok "requirements-pi.txt installed"
else
    print_warn "requirements-pi.txt not found at ${INSTALL_DIR}/requirements-pi.txt"
fi

# --- Step 8: Create data directories ---

print_step "Creating data directories"

for dir in "${INSTALL_DIR}/data/programs" "${INSTALL_DIR}/data/photos" "${INSTALL_DIR}/data/examples"; do
    if [ -d "$dir" ]; then
        print_skip "Directory already exists: ${dir}"
    else
        mkdir -p "$dir" || fail "Failed to create directory: ${dir}"
        print_ok "Created: ${dir}"
    fi
done

# Set ownership of the entire install directory to the monsterborg user
chown -R "${USERNAME}:${USERNAME}" "$INSTALL_DIR" || fail "Failed to set ownership on ${INSTALL_DIR}"
print_ok "Ownership set to ${USERNAME}:${USERNAME}"

# --- Step 9: Install and enable systemd service ---

print_step "Installing systemd service"

SERVICE_SRC="${INSTALL_DIR}/${SERVICE_FILE}"
SERVICE_DST="/etc/systemd/system/${SERVICE_FILE}"

if [ ! -f "$SERVICE_SRC" ]; then
    fail "Service file not found: ${SERVICE_SRC}"
fi

if cmp -s "$SERVICE_SRC" "$SERVICE_DST" 2>/dev/null; then
    print_skip "Service file already up to date"
else
    cp "$SERVICE_SRC" "$SERVICE_DST" || fail "Failed to copy service file to ${SERVICE_DST}"
    print_ok "Service file installed to ${SERVICE_DST}"
fi

systemctl daemon-reload || fail "Failed to reload systemd daemon"
print_ok "Systemd daemon reloaded"

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    print_skip "Service '${SERVICE_NAME}' already enabled"
else
    systemctl enable "$SERVICE_NAME" || fail "Failed to enable service '${SERVICE_NAME}'"
    print_ok "Service '${SERVICE_NAME}' enabled"
fi

# --- Step 10: Enable and start avahi-daemon ---

print_step "Configuring avahi-daemon (mDNS)"

# Avahi failures are non-fatal: warn and continue
set +e

if systemctl is-enabled --quiet avahi-daemon 2>/dev/null; then
    print_skip "avahi-daemon already enabled"
else
    if systemctl enable avahi-daemon 2>/dev/null; then
        print_ok "avahi-daemon enabled"
    else
        print_warn "Failed to enable avahi-daemon (mDNS may not work)"
    fi
fi

if systemctl is-active --quiet avahi-daemon 2>/dev/null; then
    print_skip "avahi-daemon already running"
else
    if systemctl start avahi-daemon 2>/dev/null; then
        print_ok "avahi-daemon started"
    else
        print_warn "Failed to start avahi-daemon (mDNS may not work)"
    fi
fi

set -e

# --- Done ---

echo ""
echo "=================================="
echo " Setup Complete!"
echo "=================================="
echo ""
echo " The MonsterBorg Blockly service is installed and enabled."
echo " It will start automatically on next boot."
echo ""
echo " To start the service now:"
echo "   sudo systemctl start ${SERVICE_NAME}"
echo ""
echo " To check service status:"
echo "   sudo systemctl status ${SERVICE_NAME}"
echo ""
echo " To view logs:"
echo "   sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
echo " The device should be reachable at:"
echo "   http://${HOSTNAME_TARGET}.local:8080"
echo ""
echo " Note: A reboot may be required for I2C/camera changes to take effect."
echo ""
