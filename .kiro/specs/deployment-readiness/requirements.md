# Requirements Document

## Introduction

This feature covers everything needed to make the MonsterBorg Block-Based Coding Interface deployment-ready on a Raspberry Pi running a PiBorg robot car. The scope includes: building the complete frontend (Blockly workspace, camera feed, control panel, program management UI), implementing the camera service, fixing backend bugs (config path resolution, ThunderBorg import, executor config key mismatch), and creating deployment infrastructure (systemd service, setup scripts, network configuration).

## Glossary

- **Frontend**: The HTML/CSS/JavaScript web interface served to the user's browser, including the Blockly workspace, camera feed, and control panel
- **Blockly_Workspace**: The Google Blockly visual programming area where users drag and drop blocks to create programs
- **Block_Generator**: A JavaScript module that converts Blockly block definitions into the JSON command format expected by the backend API
- **Camera_Service**: The Python backend service responsible for MJPEG video streaming and photo capture using picamera2 or a mock fallback
- **Backend**: The Flask + Flask-SocketIO Python server running on the Raspberry Pi
- **Config_Loader**: The mechanism by which backend modules resolve and load the config.yaml file
- **ThunderBorg_Library**: The PiBorg Python library for controlling the MonsterBorg's motors and LEDs via I2C
- **Deployment_Service**: A systemd unit that manages automatic start, restart, and logging of the application on the Raspberry Pi
- **Setup_Script**: A shell script that installs all OS-level and Python dependencies required to run the application on a fresh Raspberry Pi
- **MJPEG_Stream**: A Motion JPEG video stream delivered over HTTP as a multipart response
- **Control_Panel**: The set of UI buttons (Run, Stop, Save, Load, Clear) that allow the user to manage program execution
- **Program_Manager_UI**: The frontend interface for saving, loading, listing, and deleting user programs and browsing example programs
- **WebSocket_Client**: The frontend JavaScript module that connects to the Flask-SocketIO server for real-time execution feedback

## Requirements

### Requirement 1: Blockly Workspace and Block Definitions

**User Story:** As a 7-year-old user, I want a colorful drag-and-drop block workspace, so that I can create robot programs visually without typing code.

#### Acceptance Criteria

1. WHEN the user loads the application in a browser, THE Frontend SHALL render a Google Blockly workspace with a toolbox containing five categories: Movement (green), LEDs (yellow), Timing (orange), Patterns (purple), and Control (red).
2. THE Frontend SHALL define custom Blockly blocks for: move_forward, move_backward, turn_left, turn_right, spin_circle, custom_move, set_led_color, led_preset, led_battery, wait, repeat, pattern_square, pattern_triangle, pattern_circle, stop, and emergency_stop.
3. WHEN a user drags a block into the workspace, THE Frontend SHALL allow the block to snap to other blocks that share matching Blockly connection types (top/bottom statement connections for sequencing, input/output value connections for parameters) and display parameter fields with dropdown selections using labels of no more than 3 common words (reading level age 6–7, no technical jargon).
4. WHEN the user hovers over a block for more than 0.5 seconds, THE Frontend SHALL display a tooltip of no more than 15 words describing the block's function using vocabulary at or below a second-grade reading level, with no abbreviations or technical terms.
5. THE Frontend SHALL provide undo, redo, and zoom controls accessible from the workspace toolbar, with zoom supporting a range from 50% to 200% of the default workspace scale in increments no larger than 25%.
6. IF a block is dragged to a position where no valid connection exists within 20 pixels, THEN THE Frontend SHALL leave the block unconnected in the workspace without discarding it.
7. WHEN the user loads the application, THE Frontend SHALL display at least one pre-placed Start block in the workspace that cannot be deleted by the user.

### Requirement 2: Block Generators (Blockly to JSON)

**User Story:** As a developer, I want Blockly blocks to generate the correct JSON command format, so that the backend can execute user-created programs.

#### Acceptance Criteria

1. WHEN a user clicks Run, THE Block_Generator SHALL convert the Blockly workspace into a JSON array of block objects ordered top-to-bottom matching their visual sequence, and send this array as the "blocks" field in the POST /api/program/run request body.
2. THE Block_Generator SHALL produce block objects with a "type" field matching the block type names used by the backend compiler (move_forward, move_backward, turn_left, turn_right, spin_circle, custom_move, set_led_color, led_preset, led_battery, wait, repeat, pattern_square, pattern_triangle, pattern_circle, stop, emergency_stop).
3. THE Block_Generator SHALL include parameter fields with values extracted from the Blockly block field inputs using the following data types: distance as a number in meters (0.1 to 2.0), angle as a number in degrees (1 to 360), direction as a string ("left" or "right"), rotations as an integer (1 to 3), left_power and right_power as numbers (-1.0 to 1.0), duration as a number in seconds (0.1 to 10.0), r, g, and b as numbers (0.0 to 1.0), color as a string matching a preset name, count as an integer (1 to 10), side_length as a number in meters (0.1 to 2.0), and diameter as a number in meters (0.1 to 2.0).
4. WHEN a repeat block contains nested blocks, THE Block_Generator SHALL produce a "blocks" array property containing the nested block objects in their visual top-to-bottom order.
5. IF the Blockly workspace contains no connected blocks, THEN THE Block_Generator SHALL produce an empty JSON array and not send a run request to the backend.
6. WHEN converting a workspace to JSON and loading that JSON back into the workspace, THE Block_Generator SHALL produce a block arrangement with the same block types in the same order, the same nesting structure, and the same parameter values as the original workspace.
7. IF a block field input contains a value outside its valid range, THEN THE Block_Generator SHALL clamp the value to the nearest valid bound before including it in the generated JSON.

### Requirement 3: Camera Feed Display

**User Story:** As a user, I want to see a live camera feed from the robot, so that I can watch what the robot sees while programming and running programs.

#### Acceptance Criteria

1. WHEN the camera is enabled in config.yaml (`camera.enabled: true`), THE Frontend SHALL display an MJPEG stream from the /api/camera/stream endpoint in a panel below the workspace, rendered at the configured resolution (default 240×192 pixels).
2. IF the camera is disabled in config.yaml (`camera.enabled: false`), THEN THE Frontend SHALL hide the camera panel entirely and not attempt to connect to the stream endpoint.
3. IF the camera stream fails to load or does not produce a frame within 5 seconds of the page loading, THEN THE Frontend SHALL display a static placeholder image with a text message indicating the camera is unavailable.
4. WHEN the user clicks the "Take Photo" button, THE Frontend SHALL send a POST request to /api/camera/photo and, upon a successful response, display a confirmation containing the captured photo thumbnail (maximum 120×96 pixels) for 5 seconds before automatically dismissing.
5. IF the /api/camera/photo request fails or returns an error response, THEN THE Frontend SHALL display an error message indicating the photo could not be captured, and the "Take Photo" button SHALL remain enabled for retry.
6. WHILE a photo capture request is in progress, THE Frontend SHALL disable the "Take Photo" button to prevent duplicate requests.

### Requirement 4: Control Panel

**User Story:** As a user, I want large, clearly labeled buttons to run, stop, save, load, and clear my program, so that I can control the robot without confusion.

#### Acceptance Criteria

1. THE Frontend SHALL display a control panel with five buttons: Run (green, play icon), Stop (red, square icon), Save (blue, floppy icon), Load (blue, folder icon), and Clear (grey, trash icon).
2. WHEN the user clicks Run and the workspace contains at least one block, THE Frontend SHALL send the current workspace blocks as JSON to POST /api/program/run and establish WebSocket monitoring for execution progress.
3. IF the user clicks Run and the workspace contains no blocks, THEN THE Frontend SHALL display a message indicating that the workspace is empty and take no further action.
4. WHEN the user clicks Stop, THE Frontend SHALL send a stop_program event via WebSocket, re-enable the Run button, and restore the Stop button to its default (non-highlighted) state within 1 second of receiving a confirmation event from the server.
5. WHEN the user clicks Save, THE Frontend SHALL prompt the user to enter a program name (maximum 50 characters) and send the workspace blocks and name to the save endpoint.
6. WHEN the user clicks Load, THE Frontend SHALL retrieve the list of saved programs and display them for the user to select one, then replace the current workspace blocks with the loaded program's blocks.
7. WHEN the user clicks Clear, THE Frontend SHALL prompt for confirmation before removing all blocks from the workspace.
8. WHILE a program is running, THE Frontend SHALL disable the Run button (greyed out, non-clickable) and apply a visible border or pulsing animation to the Stop button to distinguish it from its idle state.

### Requirement 5: WebSocket Integration for Real-Time Feedback

**User Story:** As a user, I want to see which block is currently executing and get progress updates, so that I can understand what my program is doing in real-time.

#### Acceptance Criteria

1. WHEN the application loads, THE WebSocket_Client SHALL establish a Socket.IO connection to the backend server.
2. WHEN an execution_progress event is received, THE Frontend SHALL highlight the currently executing block in yellow in the workspace and update a progress indicator showing current_block of total_blocks.
3. WHEN an execution_finished event is received with status "completed", THE Frontend SHALL flash all blocks green for no longer than 2 seconds, clear the block highlighting, reset the progress indicator, and re-enable the Run button.
4. WHEN an error event is received that includes a block_id, THE Frontend SHALL display the error message in an alert dialog using simple language without technical jargon and highlight the offending block in red.
5. IF an error event is received without a block_id, THEN THE Frontend SHALL display the error message in an alert dialog using simple language without technical jargon without highlighting any specific block.
6. IF the WebSocket connection is lost, THEN THE Frontend SHALL display a visible connection status indicator stating the connection is lost and attempt to reconnect automatically every 3 seconds for a maximum of 10 attempts, after which it SHALL display a message instructing the user to reload the page.
7. WHEN an execution_finished event is received with status "stopped", THE Frontend SHALL clear the block highlighting, reset the progress indicator, and re-enable the Run button without displaying a success animation.

### Requirement 6: Program Save, Load, and Delete UI

**User Story:** As a user, I want to save my programs with a name, load them later, and delete ones I no longer need, so that I can build a collection of robot routines.

#### Acceptance Criteria

1. WHEN the user clicks Save, THE Program_Manager_UI SHALL display a dialog prompting for a program name (1 to 50 characters), validate that the name is not empty or whitespace-only, and send the workspace blocks to POST /api/program/save.
2. WHEN the user clicks Load, THE Program_Manager_UI SHALL fetch the program list from GET /api/program/list and display program names with creation dates in a selection dialog, sorted by most recently modified first.
3. WHEN the user selects a program from the load dialog and the Blockly workspace contains unsaved blocks, THE Program_Manager_UI SHALL display a confirmation dialog warning that unsaved work will be lost before fetching the program from GET /api/program/load/:id and restoring the blocks into the Blockly workspace.
4. WHEN the user clicks the delete button on a saved program entry, THE Program_Manager_UI SHALL display a confirmation dialog stating the program name to be deleted, and IF the user confirms, THEN THE Program_Manager_UI SHALL send DELETE /api/program/:id and remove the entry from the displayed list.
5. THE Program_Manager_UI SHALL include a section for example programs fetched from GET /api/program/examples, displayed with name, description, and difficulty level, where selecting an example loads it into the workspace using the same load behavior as saved programs.
6. IF a save, load, or delete API request fails, THEN THE Program_Manager_UI SHALL display an error message indicating the failed operation and preserve the current workspace state without modification.
7. WHEN the save API responds successfully, THE Program_Manager_UI SHALL display a success indication and close the save dialog within 1 second of receiving the response.

### Requirement 7: Kid-Friendly UI Design

**User Story:** As a parent, I want the interface to be visually appealing, simple, and age-appropriate for my 7-year-old child, so that they can use it independently.

#### Acceptance Criteria

1. THE Frontend SHALL use a minimum touch target size of 44x44 pixels for all interactive elements, including buttons, block toolbox categories, and drag handles.
2. THE Frontend SHALL use a sans-serif font with a minimum body text size of 16px and button text size of 18px.
3. THE Frontend SHALL use color combinations meeting WCAG 2.1 AA contrast ratio (minimum 4.5:1 for normal text, 3:1 for text 18px and above) for all text elements.
4. THE Frontend SHALL render a responsive layout that adapts to screen widths from 768px to 1920px such that no horizontal scrolling is required, no interactive elements overlap, and all control panel buttons remain visible without scrolling.
5. THE Frontend SHALL display a persistent emergency stop button in a fixed position visible at all viewport sizes, rendered as a red circle with a minimum diameter of 56px.
6. WHEN a user taps or clicks any interactive element, THE Frontend SHALL provide a visible state change within 100 milliseconds indicating the element has been activated.
7. THE Frontend SHALL limit navigation to a maximum depth of 2 levels from the main screen so that any feature is reachable within 2 taps or clicks.

### Requirement 8: Camera Service Implementation

**User Story:** As a developer, I want the camera service to stream video and capture photos, so that the camera routes have a working backend implementation.

#### Acceptance Criteria

1. WHEN running on a Raspberry Pi with picamera2 available, THE Camera_Service SHALL initialize the camera with the resolution (width and height), framerate, jpeg_quality, and flip settings from the camera section of config.yaml.
2. WHEN running on a system without picamera2, THE Camera_Service SHALL fall back to a mock mode that generates JPEG-encoded placeholder frames at the configured resolution (width x height from config.yaml) containing a visible "No Camera" text message, at the configured display_rate.
3. WHEN the generate_frames method is called, THE Camera_Service SHALL yield JPEG-encoded frames formatted as multipart boundaries (each prefixed with "--frame\r\nContent-Type: image/jpeg\r\n\r\n") suitable for MJPEG streaming, at a rate not exceeding the configured display_rate (frames per second) from config.yaml.
4. WHEN capture_photo is called with a filepath, THE Camera_Service SHALL save the current frame as a JPEG file to the specified path and return True on success.
5. IF capture_photo fails due to an unavailable camera frame or a file I/O error, THEN THE Camera_Service SHALL return False without raising an exception.
6. THE Camera_Service SHALL provide a start method that opens the camera hardware (or initializes mock mode) and a stop method that halts any active streaming and releases the camera hardware, ensuring no resource handles remain open after stop returns.
7. IF the camera hardware encounters an error during streaming, THEN THE Camera_Service SHALL log the error, release hardware resources, and switch to mock mode to continue serving frames without crashing the application.
8. THE Camera_Service SHALL operate as a singleton so that multiple route handlers share a single camera hardware instance.

### Requirement 9: Config Path Resolution Bug Fix

**User Story:** As a developer, I want all backend modules to load config.yaml using an absolute path relative to the project root, so that the application works regardless of the working directory from which it is launched.

#### Acceptance Criteria

1. THE Config_Loader SHALL resolve the path to config.yaml by computing an absolute path from the project root directory, defined as the ancestor directory of the backend package that directly contains the config.yaml file.
2. WHEN any backend module (app.py, compiler.py, executor.py, robot_controller.py, camera_service.py, camera.py, robot.py, program.py) loads config.yaml, THE Config_Loader SHALL resolve the file path using a single shared path-resolution utility so that all modules reference the same absolute path.
3. WHEN the application is launched from a directory other than the project root (such as from a systemd service or a parent directory), THE Backend SHALL load config.yaml without raising a FileNotFoundError.
4. WHEN any backend module writes to config.yaml (e.g., saving updated calibration values), THE Config_Loader SHALL use the same absolute resolved path as used for reading, so that the file is written to the project root regardless of the current working directory.
5. IF config.yaml does not exist at the resolved project root path, THEN THE Backend SHALL fail at startup with an error message indicating the expected absolute path that was not found.

### Requirement 10: Executor Config Key Bug Fix

**User Story:** As a developer, I want the executor to read max_execution_time from the correct config path, so that the safety timeout works as configured.

#### Acceptance Criteria

1. THE Backend SHALL read the max_execution_time value from config['robot']['max_execution_time'] instead of config['safety']['max_execution_time'].
2. WHEN the ProgramExecutor initializes, THE Backend SHALL set self.max_execution_time to the integer value found at the config.yaml path robot.max_execution_time (default: 300 seconds).
3. IF the robot.max_execution_time key is missing from config.yaml, THEN THE Backend SHALL fall back to a default maximum execution time of 300 seconds and log a warning indicating the missing configuration key.
4. WHEN a program's elapsed execution time exceeds self.max_execution_time seconds, THE Backend SHALL stop execution, set the status to 'error', set the error_message to a timeout indication, and call emergency_stop on the robot controller.

### Requirement 11: ThunderBorg Library Import Fix

**User Story:** As a developer, I want the ThunderBorg library to be imported via a reliable mechanism, so that the robot controller works regardless of filesystem layout.

#### Acceptance Criteria

1. THE Backend SHALL include the ThunderBorg.py library file within the backend/ package directory and SHALL NOT use sys.path manipulation referencing directories outside the project tree.
2. WHEN the robot controller imports ThunderBorg, THE Backend SHALL import it using a direct Python module import relative to the backend package (e.g., from the same package or a sub-package) without appending external filesystem paths to sys.path.
3. IF ThunderBorg cannot be imported (e.g., missing hardware dependencies in a non-Pi development environment), THEN THE Backend SHALL catch the ImportError, activate mock mode (where motor and LED commands are logged but not sent to hardware, and time-based delays are still observed), and log a message at WARNING level indicating that mock mode is active.
4. WHILE the Backend is running in mock mode, THE Backend SHALL respond to all robot control requests (drive, spin, set LEDs, get status) without raising unhandled exceptions, returning simulated responses that preserve the same data structure as hardware-connected responses.

### Requirement 12: Systemd Service for Auto-Start

**User Story:** As a parent, I want the application to start automatically when the Raspberry Pi boots, so that my child can use the robot without command-line interaction.

#### Acceptance Criteria

1. THE Deployment_Service SHALL provide a systemd unit file that starts the application after the network target is reached and is enabled for the multi-user boot target so that the service launches automatically on every boot.
2. THE Deployment_Service SHALL configure automatic restart on failure with a 5-second delay between restart attempts and a maximum of 3 restart attempts within a 30-second interval before ceasing restarts.
3. THE Deployment_Service SHALL run the application as a dedicated non-root user that is a member of the i2c and video groups, granting access to the I2C bus and camera device without root privileges.
4. THE Deployment_Service SHALL set the working directory to the project root so that relative paths in the application resolve correctly.
5. THE Deployment_Service SHALL configure the service environment to include the project virtual environment bin directory in the PATH so that the correct Python interpreter and dependencies are used.
6. THE Deployment_Service SHALL direct application stdout and stderr to the systemd journal for logging.

### Requirement 13: Setup and Install Script

**User Story:** As a developer deploying to a new Raspberry Pi, I want a single setup script that installs all dependencies, so that the deployment process is repeatable and documented.

#### Acceptance Criteria

1. WHEN the Setup_Script is executed on a Raspberry Pi running Raspberry Pi OS (Bookworm or Bullseye), THE Setup_Script SHALL install system-level dependencies (python3, python3-pip, python3-venv, i2c-tools, libcamera-apps, python3-picamera2).
2. THE Setup_Script SHALL create a Python virtual environment and install all packages from requirements.txt and requirements-pi.txt.
3. IF the I2C interface or camera interface is not already enabled, THEN THE Setup_Script SHALL enable the disabled interface without affecting already-enabled interfaces.
4. THE Setup_Script SHALL create the systemd service file, reload the daemon, and enable the service for auto-start.
5. THE Setup_Script SHALL create the required data directories (data/programs, data/photos) owned by the user who executed the script, with read and write permissions for that user.
6. IF any installation step fails, THEN THE Setup_Script SHALL print the name of the failed step and the error output to stderr, and exit with a non-zero status code.
7. IF the Setup_Script is executed without root or sudo privileges, THEN THE Setup_Script SHALL print an error message indicating that root privileges are required, and exit with a non-zero status code without performing any installation steps.
8. WHEN the Setup_Script is executed on a system where dependencies are already installed and interfaces are already enabled, THE Setup_Script SHALL complete without error, skipping steps that are already satisfied.

### Requirement 14: Network Configuration Guidance

**User Story:** As a developer, I want documentation on network configuration, so that the robot is accessible on the local network via a memorable hostname.

#### Acceptance Criteria

1. THE Setup_Script SHALL install and enable avahi-daemon for mDNS and configure it to start on boot, so that the device is resolvable via monsterborg.local from other devices on the same local network.
2. THE Setup_Script SHALL configure the hostname to "monsterborg" using hostnamectl, ensuring the change persists across reboots without requiring additional manual steps.
3. THE Setup_Script SHALL include a section in the README or a deployment guide that documents how to configure a static IP address, covering at minimum: identifying the active network interface, specifying IP address, subnet mask, and gateway values, and identifying which configuration file to edit. THE Setup_Script SHALL NOT automatically modify network interface settings.
4. IF avahi-daemon installation or enablement fails, THEN THE Setup_Script SHALL display an error message indicating the failure reason and continue executing remaining setup steps.
