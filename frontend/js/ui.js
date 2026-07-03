/**
 * UI Module for MonsterBorg Blockly Interface
 * Handles control panel, program management, camera panel,
 * dialog helpers, and emergency stop.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8,
 *              6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

'use strict';

var UI = (function() {

    // --- State ---
    var workspace = null;
    var unsavedChanges = false;
    var cameraTimeout = null;

    // --- DOM element references (cached on init) ---
    var runBtn = null;
    var stopBtn = null;
    var saveBtn = null;
    var loadBtn = null;
    var clearBtn = null;
    var emergencyStopBtn = null;
    var cameraFeed = null;
    var cameraPlaceholder = null;
    var takePhotoBtn = null;
    var photoConfirmation = null;
    var photoThumb = null;
    var programList = null;
    var exampleList = null;
    var dialogOverlay = null;
    var dialogBox = null;
    var dialogTitle = null;
    var dialogContent = null;
    var dialogConfirm = null;
    var dialogCancel = null;

    // --- Initialization ---

    /**
     * Initialize the UI module: cache elements, bind event listeners.
     */
    function init() {
        cacheElements();
        bindEventListeners();
        initCamera();
        loadProgramList();
        loadExamples();
    }

    /**
     * Cache all DOM element references.
     */
    function cacheElements() {
        runBtn = document.getElementById('runBtn');
        stopBtn = document.getElementById('stopBtn');
        saveBtn = document.getElementById('saveBtn');
        loadBtn = document.getElementById('loadBtn');
        clearBtn = document.getElementById('clearBtn');
        emergencyStopBtn = document.getElementById('emergencyStopBtn');
        cameraFeed = document.getElementById('cameraFeed');
        cameraPlaceholder = document.getElementById('cameraPlaceholder');
        takePhotoBtn = document.getElementById('takePhotoBtn');
        photoConfirmation = document.getElementById('photoConfirmation');
        photoThumb = document.getElementById('photoThumb');
        programList = document.getElementById('programList');
        exampleList = document.getElementById('exampleList');
        dialogOverlay = document.getElementById('dialogOverlay');
        dialogBox = document.getElementById('dialogBox');
        dialogTitle = document.getElementById('dialogTitle');
        dialogContent = document.getElementById('dialogContent');
        dialogConfirm = document.getElementById('dialogConfirm');
        dialogCancel = document.getElementById('dialogCancel');
    }

    /**
     * Bind click handlers for all control buttons.
     */
    function bindEventListeners() {
        if (runBtn) runBtn.addEventListener('click', handleRun);
        if (stopBtn) stopBtn.addEventListener('click', handleStop);
        if (saveBtn) saveBtn.addEventListener('click', handleSave);
        if (loadBtn) loadBtn.addEventListener('click', handleLoad);
        if (clearBtn) clearBtn.addEventListener('click', handleClear);
        if (emergencyStopBtn) emergencyStopBtn.addEventListener('click', handleEmergencyStop);
        if (takePhotoBtn) takePhotoBtn.addEventListener('click', handleTakePhoto);
    }

    /**
     * Set the Blockly workspace reference and attach change listener.
     * @param {Blockly.Workspace} ws
     */
    function setWorkspace(ws) {
        workspace = ws;
        if (workspace) {
            workspace.addChangeListener(function(event) {
                // Track changes that affect blocks (not just UI events like scroll/zoom)
                if (event.type === Blockly.Events.BLOCK_CREATE ||
                    event.type === Blockly.Events.BLOCK_DELETE ||
                    event.type === Blockly.Events.BLOCK_CHANGE ||
                    event.type === Blockly.Events.BLOCK_MOVE) {
                    unsavedChanges = true;
                }
            });
        }
    }

    // --- Control Panel Handlers ---

    /**
     * Run button handler.
     * Validates workspace is non-empty, sends blocks via WebSocket.
     */
    function handleRun() {
        if (!workspace) {
            showErrorMessage('Workspace not initialized.');
            return;
        }

        var blocks = JsonGenerator.generateCode(workspace);

        if (!blocks || blocks.length === 0) {
            showErrorMessage('Add some blocks first!');
            return;
        }

        if (!WebSocketClient.isConnected()) {
            showErrorMessage('Not connected to the robot. Please check the connection.');
            return;
        }

        // Send program and update button states
        WebSocketClient.emit('run_program', { blocks: blocks });
        runBtn.disabled = true;
        stopBtn.classList.add('active');
    }

    /**
     * Stop button handler.
     * Emits stop_program and re-enables Run after 1 second.
     */
    function handleStop() {
        if (!WebSocketClient.isConnected()) {
            return;
        }

        WebSocketClient.emit('stop_program', {});
        stopBtn.classList.remove('active');

        // Re-enable Run after 1s to allow confirmation
        setTimeout(function() {
            if (runBtn) {
                runBtn.disabled = false;
            }
        }, 1000);
    }

    /**
     * Save button handler.
     * Prompts for program name and saves via API.
     */
    function handleSave() {
        if (!workspace) {
            showErrorMessage('Workspace not initialized.');
            return;
        }

        showInputDialog('Save Program', 'Enter program name (max 50 characters)', function(name) {
            if (!name || name.trim().length === 0) {
                showErrorMessage('Please enter a valid program name.');
                return;
            }

            var trimmedName = name.trim();
            if (trimmedName.length > 50) {
                trimmedName = trimmedName.substring(0, 50);
            }

            var blocks = JsonGenerator.generateCode(workspace);
            var workspaceState = Blockly.serialization.workspaces.save(workspace);

            fetch('/api/program/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName, blocks: blocks, workspace_state: workspaceState })
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to save program');
                }
                return response.json();
            })
            .then(function(data) {
                unsavedChanges = false;
                showSuccessMessage('Program "' + trimmedName + '" saved!');
                loadProgramList();
            })
            .catch(function(err) {
                showErrorMessage('Could not save program: ' + err.message);
            });
        });
    }

    /**
     * Load button handler.
     * Fetches program list and displays for selection.
     */
    function handleLoad() {
        if (unsavedChanges) {
            showDialog(
                'Unsaved Changes',
                'You have unsaved changes. Loading a program will replace your current work. Continue?',
                function() { fetchAndShowProgramList(); },
                null
            );
        } else {
            fetchAndShowProgramList();
        }
    }

    /**
     * Fetch program list and display in the load dialog.
     */
    function fetchAndShowProgramList() {
        fetch('/api/program/list')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to load program list');
                }
                return response.json();
            })
            .then(function(data) {
                var programs = data.programs || [];
                // Sort by modified date descending (most recent first)
                programs.sort(function(a, b) {
                    return new Date(b.modified) - new Date(a.modified);
                });
                displayProgramLoadDialog(programs);
            })
            .catch(function(err) {
                showErrorMessage('Could not load programs: ' + err.message);
            });
    }

    /**
     * Display program list in a dialog for loading.
     * @param {Array} programs
     */
    function displayProgramLoadDialog(programs) {
        if (programs.length === 0) {
            showErrorMessage('No saved programs found.');
            return;
        }

        var listHtml = '<ul class="dialog-program-list" role="list">';
        for (var i = 0; i < programs.length; i++) {
            var prog = programs[i];
            var dateStr = new Date(prog.modified).toLocaleDateString();
            listHtml += '<li class="dialog-program-item" data-id="' + prog.id + '" role="listitem" tabindex="0">';
            listHtml += '<span class="program-name">' + escapeHtml(prog.name) + '</span>';
            listHtml += '<span class="program-date">' + dateStr + '</span>';
            listHtml += '</li>';
        }
        listHtml += '</ul>';

        showRawDialog('Load Program', listHtml, null, null);

        // Attach click handlers to list items
        var items = dialogContent.querySelectorAll('.dialog-program-item');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function() {
                var programId = this.getAttribute('data-id');
                closeDialog();
                loadProgram(programId);
            });
            items[j].addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var programId = this.getAttribute('data-id');
                    closeDialog();
                    loadProgram(programId);
                }
            });
        }
    }

    /**
     * Load a specific program by ID and restore blocks.
     * @param {string} programId
     */
    function loadProgram(programId) {
        fetch('/api/program/load/' + programId)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to load program');
                }
                return response.json();
            })
            .then(function(data) {
                if (workspace) {
                    // Clear workspace
                    workspace.clear();

                    if (data.workspace_state) {
                        // Restore full workspace from saved state
                        Blockly.serialization.workspaces.load(data.workspace_state, workspace);
                    } else {
                        // Fallback: just restore start block for old-format programs
                        var startBlockXml = document.getElementById('startBlocks');
                        if (startBlockXml) {
                            Blockly.Xml.domToWorkspace(startBlockXml, workspace);
                        }
                        showErrorMessage('This program was saved in an older format and cannot fully restore blocks. Please recreate it.');
                    }

                    unsavedChanges = false;
                    showSuccessMessage('Program loaded!');
                }
            })
            .catch(function(err) {
                showErrorMessage('Could not load program: ' + err.message);
            });
    }

    /**
     * Clear button handler.
     * Confirms before removing all blocks.
     */
    function handleClear() {
        showDialog(
            'Clear Workspace',
            'Are you sure you want to remove all blocks? This cannot be undone.',
            function() {
                if (workspace) {
                    workspace.clear();
                    // Restore the Start block
                    var startBlockXml = document.getElementById('startBlocks');
                    if (startBlockXml) {
                        Blockly.Xml.domToWorkspace(startBlockXml, workspace);
                    }
                    unsavedChanges = false;
                }
            },
            null
        );
    }

    /**
     * Emergency stop button handler.
     * Always sends emergency_stop regardless of program state.
     */
    function handleEmergencyStop() {
        WebSocketClient.emit('emergency_stop', {});

        // Visual feedback
        if (emergencyStopBtn) {
            emergencyStopBtn.classList.add('triggered');
            setTimeout(function() {
                emergencyStopBtn.classList.remove('triggered');
            }, 500);
        }

        // Reset Run/Stop button states
        if (runBtn) runBtn.disabled = false;
        if (stopBtn) stopBtn.classList.remove('active');
    }

    // --- Camera Panel ---

    /**
     * Initialize camera feed with timeout and error handling.
     */
    function initCamera() {
        if (!cameraFeed) return;

        // Set up error handler for camera feed image
        cameraFeed.addEventListener('error', showCameraPlaceholder);

        // Set up 5-second timeout for camera stream
        cameraTimeout = setTimeout(function() {
            // If the image hasn't loaded yet, show placeholder
            if (cameraFeed.naturalWidth === 0) {
                showCameraPlaceholder();
            }
        }, 5000);

        // On successful load, clear timeout and hide placeholder
        cameraFeed.addEventListener('load', function() {
            if (cameraTimeout) {
                clearTimeout(cameraTimeout);
                cameraTimeout = null;
            }
            hideCameraPlaceholder();
        });
    }

    /**
     * Show camera placeholder, hide camera feed.
     */
    function showCameraPlaceholder() {
        if (cameraFeed) cameraFeed.style.display = 'none';
        if (cameraPlaceholder) {
            cameraPlaceholder.removeAttribute('hidden');
        }
    }

    /**
     * Hide camera placeholder, show camera feed.
     */
    function hideCameraPlaceholder() {
        if (cameraFeed) cameraFeed.style.display = '';
        if (cameraPlaceholder) {
            cameraPlaceholder.setAttribute('hidden', '');
        }
    }

    /**
     * Take Photo button handler.
     * Captures a photo and displays thumbnail confirmation.
     */
    function handleTakePhoto() {
        if (!takePhotoBtn) return;

        // Disable button during capture
        takePhotoBtn.disabled = true;

        fetch('/api/camera/photo', {
            method: 'POST'
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to capture photo');
            }
            return response.json();
        })
        .then(function(data) {
            if (data.saved && data.url) {
                // Show confirmation thumbnail
                if (photoThumb) {
                    photoThumb.src = data.url;
                }
                if (photoConfirmation) {
                    photoConfirmation.removeAttribute('hidden');
                    // Hide confirmation after 3 seconds
                    setTimeout(function() {
                        photoConfirmation.setAttribute('hidden', '');
                    }, 3000);
                }
            }
            takePhotoBtn.disabled = false;
        })
        .catch(function(err) {
            showErrorMessage('Could not take photo: ' + err.message);
            takePhotoBtn.disabled = false;
        });
    }

    // --- Program List ---

    /**
     * Load and display saved programs in the side panel.
     */
    function loadProgramList() {
        if (!programList) return;

        fetch('/api/program/list')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to load programs');
                }
                return response.json();
            })
            .then(function(data) {
                var programs = data.programs || [];
                // Sort by modified date descending
                programs.sort(function(a, b) {
                    return new Date(b.modified) - new Date(a.modified);
                });
                renderProgramList(programs);
            })
            .catch(function(err) {
                programList.innerHTML = '<p class="error-text">Could not load programs.</p>';
            });
    }

    /**
     * Render the saved programs list.
     * @param {Array} programs
     */
    function renderProgramList(programs) {
        if (!programList) return;

        if (programs.length === 0) {
            programList.innerHTML = '<p class="empty-text">No saved programs yet.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < programs.length; i++) {
            var prog = programs[i];
            var dateStr = new Date(prog.modified).toLocaleDateString();
            html += '<div class="program-item" role="listitem" data-id="' + prog.id + '">';
            html += '<div class="program-item-info">';
            html += '<span class="program-item-name">' + escapeHtml(prog.name) + '</span>';
            html += '<span class="program-item-date">' + dateStr + '</span>';
            html += '</div>';
            html += '<button class="program-delete-btn" data-id="' + prog.id + '" data-name="' + escapeHtml(prog.name) + '" aria-label="Delete ' + escapeHtml(prog.name) + '" title="Delete program">&times;</button>';
            html += '</div>';
        }

        programList.innerHTML = html;

        // Bind click handlers for loading programs
        var items = programList.querySelectorAll('.program-item-info');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function() {
                var programId = this.parentElement.getAttribute('data-id');
                if (unsavedChanges) {
                    showDialog(
                        'Unsaved Changes',
                        'You have unsaved changes. Loading a program will replace your current work. Continue?',
                        function() { loadProgram(programId); },
                        null
                    );
                } else {
                    loadProgram(programId);
                }
            });
        }

        // Bind click handlers for delete buttons
        var deleteBtns = programList.querySelectorAll('.program-delete-btn');
        for (var k = 0; k < deleteBtns.length; k++) {
            deleteBtns[k].addEventListener('click', function(e) {
                e.stopPropagation();
                var id = this.getAttribute('data-id');
                var name = this.getAttribute('data-name');
                handleDeleteProgram(id, name);
            });
        }
    }

    /**
     * Delete a program after confirmation.
     * @param {string} programId
     * @param {string} programName
     */
    function handleDeleteProgram(programId, programName) {
        showDialog(
            'Delete Program',
            'Are you sure you want to delete "' + programName + '"? This cannot be undone.',
            function() {
                fetch('/api/program/' + programId, {
                    method: 'DELETE'
                })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Failed to delete program');
                    }
                    // Remove from the list immediately
                    var item = programList.querySelector('[data-id="' + programId + '"]');
                    if (item) {
                        item.remove();
                    }
                    // Reload the full list to keep it in sync
                    loadProgramList();
                })
                .catch(function(err) {
                    showErrorMessage('Could not delete program: ' + err.message);
                });
            },
            null
        );
    }

    // --- Example Programs ---

    /**
     * Load and display example programs.
     */
    function loadExamples() {
        if (!exampleList) return;

        fetch('/api/program/examples')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to load examples');
                }
                return response.json();
            })
            .then(function(data) {
                var examples = data.examples || [];
                renderExamples(examples);
            })
            .catch(function(err) {
                exampleList.innerHTML = '<p class="error-text">Could not load examples.</p>';
            });
    }

    /**
     * Render example programs list.
     * @param {Array} examples
     */
    function renderExamples(examples) {
        if (!exampleList) return;

        if (examples.length === 0) {
            exampleList.innerHTML = '<p class="empty-text">No examples available.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < examples.length; i++) {
            var ex = examples[i];
            html += '<div class="example-item" role="listitem" data-id="' + ex.id + '">';
            html += '<div class="example-item-info">';
            html += '<span class="example-item-name">' + escapeHtml(ex.name) + '</span>';
            if (ex.description) {
                html += '<span class="example-item-desc">' + escapeHtml(ex.description) + '</span>';
            }
            if (ex.difficulty) {
                html += '<span class="example-item-difficulty difficulty-' + escapeHtml(ex.difficulty) + '">' + escapeHtml(ex.difficulty) + '</span>';
            }
            html += '</div>';
            html += '</div>';
        }

        exampleList.innerHTML = html;

        // Bind click handlers for loading examples
        var items = exampleList.querySelectorAll('.example-item');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function() {
                var exampleId = this.getAttribute('data-id');
                if (unsavedChanges) {
                    showDialog(
                        'Unsaved Changes',
                        'You have unsaved changes. Loading an example will replace your current work. Continue?',
                        function() { loadProgram(exampleId); },
                        null
                    );
                } else {
                    loadProgram(exampleId);
                }
            });
        }
    }

    // --- Dialog Helpers ---

    /**
     * Show a confirmation dialog.
     * @param {string} title - Dialog title
     * @param {string} content - Dialog message text
     * @param {Function|null} onConfirm - Called when confirm button clicked
     * @param {Function|null} onCancel - Called when cancel button clicked
     */
    function showDialog(title, content, onConfirm, onCancel) {
        if (!dialogOverlay || !dialogTitle || !dialogContent || !dialogConfirm || !dialogCancel) {
            // Fallback to browser confirm
            if (confirm(content)) {
                if (onConfirm) onConfirm();
            } else {
                if (onCancel) onCancel();
            }
            return;
        }

        dialogTitle.textContent = title;
        dialogContent.textContent = content;
        dialogConfirm.textContent = 'OK';
        dialogCancel.style.display = '';
        dialogOverlay.removeAttribute('hidden');
        dialogOverlay.setAttribute('aria-hidden', 'false');

        // Clean up any existing handlers
        var newConfirm = dialogConfirm.cloneNode(true);
        dialogConfirm.parentNode.replaceChild(newConfirm, dialogConfirm);
        dialogConfirm = newConfirm;

        var newCancel = dialogCancel.cloneNode(true);
        dialogCancel.parentNode.replaceChild(newCancel, dialogCancel);
        dialogCancel = newCancel;

        dialogConfirm.addEventListener('click', function() {
            closeDialog();
            if (onConfirm) onConfirm();
        });

        dialogCancel.addEventListener('click', function() {
            closeDialog();
            if (onCancel) onCancel();
        });

        // Focus the confirm button for keyboard users
        dialogConfirm.focus();
    }

    /**
     * Show a dialog with raw HTML content (no text escaping on content).
     * Used for program list display.
     * @param {string} title
     * @param {string} htmlContent
     * @param {Function|null} onConfirm
     * @param {Function|null} onCancel
     */
    function showRawDialog(title, htmlContent, onConfirm, onCancel) {
        if (!dialogOverlay || !dialogTitle || !dialogContent) return;

        dialogTitle.textContent = title;
        dialogContent.innerHTML = htmlContent;
        dialogOverlay.removeAttribute('hidden');
        dialogOverlay.setAttribute('aria-hidden', 'false');

        // Hide confirm/cancel for list dialogs; selection handles close
        if (dialogConfirm) dialogConfirm.style.display = 'none';
        if (dialogCancel) {
            dialogCancel.style.display = '';
            dialogCancel.textContent = 'Cancel';

            var newCancel = dialogCancel.cloneNode(true);
            dialogCancel.parentNode.replaceChild(newCancel, dialogCancel);
            dialogCancel = newCancel;

            dialogCancel.addEventListener('click', function() {
                closeDialog();
                if (onCancel) onCancel();
            });
            dialogCancel.focus();
        }
    }

    /**
     * Show an input dialog for text entry.
     * @param {string} title
     * @param {string} placeholder
     * @param {Function} onConfirm - Called with input value
     */
    function showInputDialog(title, placeholder, onConfirm) {
        if (!dialogOverlay || !dialogTitle || !dialogContent || !dialogConfirm || !dialogCancel) {
            // Fallback to prompt
            var value = prompt(placeholder);
            if (value !== null && onConfirm) {
                onConfirm(value);
            }
            return;
        }

        dialogTitle.textContent = title;
        dialogContent.innerHTML = '<input type="text" id="dialogInput" class="dialog-input" placeholder="' + escapeHtml(placeholder) + '" maxlength="50" autocomplete="off">';
        dialogConfirm.textContent = 'Save';
        dialogConfirm.style.display = '';
        dialogCancel.style.display = '';
        dialogOverlay.removeAttribute('hidden');
        dialogOverlay.setAttribute('aria-hidden', 'false');

        var input = document.getElementById('dialogInput');

        // Clean up handlers
        var newConfirm = dialogConfirm.cloneNode(true);
        dialogConfirm.parentNode.replaceChild(newConfirm, dialogConfirm);
        dialogConfirm = newConfirm;

        var newCancel = dialogCancel.cloneNode(true);
        dialogCancel.parentNode.replaceChild(newCancel, dialogCancel);
        dialogCancel = newCancel;

        dialogConfirm.addEventListener('click', function() {
            var value = input ? input.value : '';
            closeDialog();
            if (onConfirm) onConfirm(value);
        });

        dialogCancel.addEventListener('click', function() {
            closeDialog();
        });

        // Allow Enter to confirm
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    dialogConfirm.click();
                }
            });
            input.focus();
        }
    }

    /**
     * Close the dialog overlay.
     */
    function closeDialog() {
        if (dialogOverlay) {
            dialogOverlay.setAttribute('hidden', '');
            dialogOverlay.setAttribute('aria-hidden', 'true');
        }
        // Reset button visibility
        if (dialogConfirm) dialogConfirm.style.display = '';
        if (dialogCancel) dialogCancel.style.display = '';
    }

    // --- Message Helpers ---

    /**
     * Show an error message using the dialog.
     * @param {string} message
     */
    function showErrorMessage(message) {
        if (!dialogOverlay || !dialogTitle || !dialogContent || !dialogConfirm) {
            alert(message);
            return;
        }

        dialogTitle.textContent = 'Error';
        dialogContent.textContent = message;
        dialogConfirm.textContent = 'OK';
        dialogConfirm.style.display = '';
        if (dialogCancel) dialogCancel.style.display = 'none';
        dialogOverlay.removeAttribute('hidden');
        dialogOverlay.setAttribute('aria-hidden', 'false');

        var newConfirm = dialogConfirm.cloneNode(true);
        dialogConfirm.parentNode.replaceChild(newConfirm, dialogConfirm);
        dialogConfirm = newConfirm;

        dialogConfirm.addEventListener('click', function() {
            closeDialog();
        });

        dialogConfirm.focus();
    }

    /**
     * Show a success message using the dialog.
     * @param {string} message
     */
    function showSuccessMessage(message) {
        if (!dialogOverlay || !dialogTitle || !dialogContent || !dialogConfirm) {
            alert(message);
            return;
        }

        dialogTitle.textContent = 'Success';
        dialogContent.textContent = message;
        dialogConfirm.textContent = 'OK';
        dialogConfirm.style.display = '';
        if (dialogCancel) dialogCancel.style.display = 'none';
        dialogOverlay.removeAttribute('hidden');
        dialogOverlay.setAttribute('aria-hidden', 'false');

        var newConfirm = dialogConfirm.cloneNode(true);
        dialogConfirm.parentNode.replaceChild(newConfirm, dialogConfirm);
        dialogConfirm = newConfirm;

        dialogConfirm.addEventListener('click', function() {
            closeDialog();
        });

        dialogConfirm.focus();
    }

    // --- Utility ---

    /**
     * Escape HTML special characters.
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // --- Public API ---
    return {
        init: init,
        setWorkspace: setWorkspace,
        loadProgramList: loadProgramList,
        loadExamples: loadExamples
    };

})();

/* ==========================================================================
   Manual Controls Module
   D-pad buttons + arrow key / WASD support for live robot driving.
   Sends manual_drive {action:'start', direction} on press and
   {action:'stop'} on release — no client-side repeat loop needed.
   The server sets motors on/off directly without sleeping.
   ========================================================================== */
var ManualControls = (function() {
    'use strict';

    var activeDirection = null;  // direction currently being driven
    var keysHeld = {};           // tracks which keyboard keys are pressed

    // Map arrow/WASD keys to direction strings
    var KEY_MAP = {
        'ArrowUp':    'forward',
        'ArrowDown':  'backward',
        'ArrowLeft':  'left',
        'ArrowRight': 'right',
        'w': 'forward',
        's': 'backward',
        'a': 'left',
        'd': 'right'
    };

    // Button-id to direction mapping
    var BTN_MAP = {
        'dpadUp':    'forward',
        'dpadDown':  'backward',
        'dpadLeft':  'left',
        'dpadRight': 'right',
        'dpadStop':  'stop'
    };

    // -----------------------------------------------------------------------
    // Init
    // -----------------------------------------------------------------------

    function init() {
        bindButtons();
        bindKeyboard();
    }

    // -----------------------------------------------------------------------
    // Button bindings (mouse + touch)
    // -----------------------------------------------------------------------

    function bindButtons() {
        Object.keys(BTN_MAP).forEach(function(id) {
            var btn = document.getElementById(id);
            if (!btn) return;

            var dir = BTN_MAP[id];

            // Mouse
            btn.addEventListener('mousedown',  function(e) { e.preventDefault(); startDriving(dir); });
            btn.addEventListener('mouseup',    function()  { stopDriving(); });
            btn.addEventListener('mouseleave', function()  { if (activeDirection) stopDriving(); });

            // Touch (mobile / tablet)
            btn.addEventListener('touchstart', function(e) { e.preventDefault(); startDriving(dir); }, { passive: false });
            btn.addEventListener('touchend',   function(e) { e.preventDefault(); stopDriving(); },     { passive: false });
            btn.addEventListener('touchcancel',function(e) { e.preventDefault(); stopDriving(); },     { passive: false });
        });
    }

    // -----------------------------------------------------------------------
    // Keyboard bindings
    // -----------------------------------------------------------------------

    function bindKeyboard() {
        document.addEventListener('keydown', function(e) {
            // Ignore if focus is inside an input/textarea
            var tag = document.activeElement && document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            var dir = KEY_MAP[e.key];
            if (!dir) return;

            e.preventDefault();

            if (!keysHeld[e.key]) {
                keysHeld[e.key] = true;
                startDriving(dir);
            }
        });

        document.addEventListener('keyup', function(e) {
            var dir = KEY_MAP[e.key];
            if (!dir) return;

            keysHeld[e.key] = false;

            // Check if another direction key is still held
            var stillHeld = Object.keys(keysHeld).filter(function(k) { return keysHeld[k]; })[0];
            if (stillHeld) {
                startDriving(KEY_MAP[stillHeld]);
            } else {
                stopDriving();
            }
        });
    }

    // -----------------------------------------------------------------------
    // Drive commands
    // -----------------------------------------------------------------------

    function startDriving(direction) {
        if (direction === 'stop') {
            stopDriving();
            return;
        }

        if (activeDirection === direction) return; // already driving this way

        // If switching direction, send stop first then immediately start new direction
        if (activeDirection) {
            setButtonActive(activeDirection, false);
        }

        activeDirection = direction;
        setButtonActive(direction, true);

        WebSocketClient.emit('manual_drive', { action: 'start', direction: direction, power: 1.0 });
    }

    function stopDriving() {
        if (activeDirection) {
            setButtonActive(activeDirection, false);
            activeDirection = null;
        }
        WebSocketClient.emit('manual_drive', { action: 'stop', direction: 'none', power: 0.0 });
    }

    // -----------------------------------------------------------------------
    // Visual active state on D-pad buttons
    // -----------------------------------------------------------------------

    function setButtonActive(direction, active) {
        Object.keys(BTN_MAP).forEach(function(id) {
            if (BTN_MAP[id] === direction) {
                var btn = document.getElementById(id);
                if (btn) {
                    if (active) {
                        btn.classList.add('dpad-active');
                    } else {
                        btn.classList.remove('dpad-active');
                    }
                }
            }
        });
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    return { init: init };

})();
