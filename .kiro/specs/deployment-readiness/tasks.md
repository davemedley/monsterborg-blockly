# Implementation Plan: Deployment Readiness

## Overview

This plan implements the full deployment-readiness scope for the MonsterBorg Block-Based Coding Interface. Work is ordered to fix backend bugs first (unblocking everything else), then build the camera service, frontend components, and finally deployment automation. Each task builds incrementally so there's no orphaned code.

## Tasks

- [x] 1. Backend bug fixes and shared utilities
  - [x] 1.1 Create backend/config_loader.py utility module
    - Create `backend/config_loader.py` with `get_config_path()`, `get_project_root()`, `load_config()`, and `save_config()` functions
    - Compute `_PROJECT_ROOT` as `os.path.dirname(os.path.dirname(os.path.abspath(__file__)))` and `_CONFIG_PATH` as the config.yaml path within it
    - Raise `FileNotFoundError` with clear message if config.yaml doesn't exist
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 1.2 Migrate all backend modules to use config_loader
    - Update `backend/app.py`, `backend/services/compiler.py`, `backend/services/executor.py`, `backend/services/robot_controller.py`, `backend/routes/camera.py`, `backend/routes/robot.py`, `backend/routes/program.py` to replace `with open('config.yaml', 'r')` with `from backend.config_loader import load_config`
    - Update `backend/routes/robot.py` `update_calibration` to use `from backend.config_loader import save_config`
    - Remove all module-level `yaml` + file open calls for config
    - _Requirements: 9.2, 9.4_

  - [x] 1.3 Fix executor config key (safety → robot)
    - In `backend/services/executor.py`, change `config['safety']['max_execution_time']` to `config.get('robot', {}).get('max_execution_time', 300)`
    - Log a warning if the key is missing and defaults to 300
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 1.4 Fix ThunderBorg import in robot_controller
    - Place ThunderBorg.py into `backend/` (create a stub/placeholder if the real file isn't available)
    - Update `backend/services/robot_controller.py` to use `from backend import ThunderBorg` wrapped in try/except ImportError, removing `sys.path.append` usage
    - Set `ThunderBorg = None` and activate mock mode on ImportError
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x]* 1.5 Write property tests for config_loader and executor
    - **Property 7: Config Path Resolution Consistency** — verify config resolves to same absolute path from any working directory
    - **Property 8: Execution Timeout Enforcement** — verify executor stops when elapsed time exceeds max_execution_time
    - **Property 9: Graceful Hardware Degradation** — verify mock mode handles all robot commands without exceptions
    - **Validates: Requirements 9.1, 9.3, 9.4, 10.4, 11.3, 11.4**

- [x] 2. Checkpoint - Backend bug fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Camera service implementation
  - [x] 3.1 Implement backend/services/camera_service.py
    - Create CameraService class as a singleton (`__new__` pattern)
    - Load camera config from config_loader
    - Try to import and initialize picamera2; on failure, fall back to mock mode
    - Implement `generate_frames()` yielding MJPEG multipart boundaries with frame rate limiting (`time.sleep(1.0 / display_rate)`)
    - Implement `capture_photo(filepath)` returning True/False
    - Implement `start()` and `stop()` lifecycle methods
    - Mock mode: generate frames using OpenCV (`cv2.putText` on blank image) at configured resolution
    - Handle hardware errors during streaming by switching to mock mode
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x]* 3.2 Write property tests for camera service
    - **Property 4: Camera Mock Frame Generation** — verify mock produces valid JPEG frames at configured resolution
    - **Property 5: Camera Frame Rate Limiting** — verify frame yield rate does not exceed configured display_rate
    - **Property 6: Camera Singleton** — verify CameraService() always returns same instance
    - **Validates: Requirements 8.2, 8.3, 8.8**

- [x] 4. Frontend structure and HTML
  - [x] 4.1 Create frontend/index.html
    - Single-page layout with sections: Blockly workspace, control panel, camera feed, program manager
    - Load Blockly from CDN (blockly_compressed.js, blocks_compressed.js, msg/en.js)
    - Load Socket.IO client from CDN
    - Link local CSS and JS files
    - Include persistent emergency stop button (fixed position, red circle, min 56px diameter)
    - Structure for responsive layout (768px–1920px)
    - Include pre-placed Start block configuration
    - _Requirements: 1.1, 1.5, 1.7, 4.1, 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

  - [x] 4.2 Create frontend/css/main.css
    - Kid-friendly color scheme with category colors (green/yellow/orange/purple/red)
    - Minimum 44x44px touch targets for all interactive elements
    - Sans-serif font, 16px body text, 18px button text
    - WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text)
    - Responsive grid layout (768px–1920px, no horizontal scroll)
    - Emergency stop button styling (fixed position, red circle, 56px+)
    - Button state animations (100ms response), pulsing Stop during execution
    - Zoom controls styling (50%–200% range)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 5. Frontend block definitions and generators
  - [x] 5.1 Create frontend/js/blocks/movement.js
    - Define blocks: move_forward, move_backward, turn_left, turn_right, spin_circle, custom_move
    - Each block: init() with inputs, fields, colors (green category), connection types, tooltips (≤15 words), labels (≤3 words)
    - Parameter fields: distance dropdown/input, angle dropdown/input, direction dropdown, power sliders
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3_

  - [x] 5.2 Create frontend/js/blocks/leds.js
    - Define blocks: set_led_color, led_preset, led_battery
    - Yellow category color, color picker or preset dropdown, tooltips
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3_

  - [x] 5.3 Create frontend/js/blocks/timing.js
    - Define blocks: wait, repeat
    - Orange category color, duration input, count input, statement input for nested blocks
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 2.4_

  - [x] 5.4 Create frontend/js/blocks/patterns.js
    - Define blocks: pattern_square, pattern_triangle, pattern_circle
    - Purple category color, side_length/diameter inputs
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3_

  - [x] 5.5 Create frontend/js/blocks/control.js
    - Define blocks: stop, emergency_stop
    - Red category color, no parameters needed
    - _Requirements: 1.2, 1.3, 1.4, 2.2_

  - [x] 5.6 Create frontend/js/generators/json_generator.js
    - Custom Blockly generator that walks the block tree top-to-bottom
    - Generator function for each block type extracting field values
    - Value clamping: enforce valid ranges before serialization (distance 0.1–2.0, angle 1–360, etc.)
    - Handle repeat block nested "blocks" array
    - Return empty array for empty workspace
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x]* 5.7 Write property tests for block definitions and generators
    - **Property 1: Block Metadata Constraints** — all field labels ≤ 3 words AND tooltips ≤ 15 words
    - **Property 2: Block Generator Round-Trip** — workspace → JSON → workspace preserves types, order, nesting, parameters
    - **Property 3: Block Generator Value Clamping** — out-of-range values clamped to nearest valid bound
    - **Validates: Requirements 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.6, 2.7**

- [ ] 6. Frontend application logic
  - [x] 6.1 Create frontend/js/websocket.js
    - Socket.IO connection on page load
    - Handle `execution_progress` → highlight current block yellow, update progress indicator
    - Handle `execution_finished` (completed) → green flash ≤2s, reset, re-enable Run
    - Handle `execution_finished` (stopped) → reset without animation
    - Handle `error` → red highlight on block_id (if provided), simple error dialog
    - Disconnect detection → status indicator, reconnect every 3s (max 10 attempts), then "reload page" message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [-] 6.2 Create frontend/js/ui.js
    - Control panel button handlers: Run, Stop, Save, Load, Clear
    - Run: validate workspace non-empty, send blocks via JSON generator, disable Run, highlight Stop
    - Stop: emit stop_program, re-enable Run within 1s of confirmation
    - Save: prompt for name (max 50 chars, validate non-empty), POST /api/program/save, show success
    - Load: GET /api/program/list, display sorted by modified date, confirmation if unsaved work, fetch and restore blocks
    - Delete: confirmation dialog, DELETE /api/program/:id, remove from list
    - Clear: confirmation before removing all blocks
    - Example programs: GET /api/program/examples, display with name/description/difficulty
    - Camera panel: MJPEG img element, 5s timeout placeholder, Take Photo button with disable-during-capture
    - Emergency stop button: always visible, sends emergency_stop via WebSocket
    - Error handling: preserve workspace state on API failures
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 6.3 Create frontend/js/main.js
    - Initialize Blockly workspace with toolbox configuration (5 categories with correct colors)
    - Register all custom blocks and generators
    - Initialize WebSocket client
    - Initialize UI module
    - Set up undo/redo/zoom controls (50%–200%, increments ≤25%)
    - Place default Start block (undeletable)
    - _Requirements: 1.1, 1.5, 1.6, 1.7_

  - [ ]* 6.4 Write property test for program list sort order
    - **Property 11: Program List Sort Order** — program list sorted by most recently modified first
    - **Validates: Requirements 6.2**

- [x] 7. Checkpoint - Frontend and camera complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Deployment automation
  - [x] 8.1 Create monsterborg-blockly.service systemd unit file
    - Place at project root (to be copied to /etc/systemd/system/ by setup.sh)
    - After=network.target, Type=simple, User=monsterborg, Group=monsterborg
    - WorkingDirectory=/opt/monsterborg-blockly
    - PATH includes venv/bin
    - ExecStart using `venv/bin/python3 -m backend.app`
    - Restart=on-failure, RestartSec=5, StartLimitBurst=3, StartLimitIntervalSec=30
    - stdout/stderr → journal
    - WantedBy=multi-user.target
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 8.2 Create enhanced setup.sh
    - Check root/sudo privileges at start (exit non-zero if not root)
    - Install system packages: python3 python3-pip python3-venv i2c-tools libcamera-apps python3-picamera2 avahi-daemon
    - Enable I2C and camera via raspi-config nonint (skip if already enabled)
    - Set hostname to "monsterborg" via hostnamectl
    - Create monsterborg user in i2c and video groups (if not exists)
    - Create venv, install requirements.txt + requirements-pi.txt
    - Create data directories with correct ownership
    - Copy systemd service file, daemon-reload, enable service
    - Enable and start avahi-daemon (warn and continue on failure)
    - Each step idempotent: skip if already satisfied
    - Print failed step + error to stderr and exit non-zero on failure (except avahi)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 14.1, 14.2, 14.4_

  - [x] 8.3 Add static IP documentation to README
    - Document how to identify active network interface
    - Document IP address, subnet mask, gateway configuration
    - Document which configuration file to edit (dhcpcd.conf or NetworkManager)
    - Note that setup.sh does NOT modify network settings automatically
    - _Requirements: 14.3_

  - [ ]* 8.4 Write property test for setup script idempotency
    - **Property 10: Setup Script Idempotency** — executing setup.sh on an already-configured system completes without error
    - **Validates: Requirements 13.8**

- [x] 9. Final checkpoint - All components integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses Python for backend and vanilla JavaScript for frontend — no build system needed
- ThunderBorg.py stub should be created if the actual library file is not available in the repo

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "3.1", "4.1", "4.2"] },
    { "id": 3, "tasks": ["3.2", "5.1", "5.2", "5.3", "5.4", "5.5"] },
    { "id": 4, "tasks": ["5.6", "6.1"] },
    { "id": 5, "tasks": ["5.7", "6.2"] },
    { "id": 6, "tasks": ["6.3", "6.4"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4"] }
  ]
}
```
