/**
 * WebSocket Client Module
 * Handles Socket.IO connection, execution events, block highlighting,
 * disconnect detection, and reconnection logic.
 */
const WebSocketClient = (function() {
    'use strict';

    let socket = null;
    let reconnectAttempts = 0;
    let reconnectInterval = null;
    const MAX_RECONNECT = 10;
    const RECONNECT_DELAY = 3000; // 3 seconds

    // DOM element references (cached on init)
    let connectionStatus = null;
    let runBtn = null;
    let stopBtn = null;
    let progressIndicator = null;
    let progressFill = null;
    let progressText = null;

    // Track highlighted block for cleanup
    let currentHighlightedBlock = null;
    let greenFlashTimeout = null;

    /**
     * Initialize DOM references
     */
    function cacheElements() {
        connectionStatus = document.getElementById('connectionStatus');
        runBtn = document.getElementById('runBtn');
        stopBtn = document.getElementById('stopBtn');
        progressIndicator = document.getElementById('progressIndicator');
        progressFill = document.getElementById('progressFill');
        progressText = document.getElementById('progressText');
    }

    /**
     * Connect to the Socket.IO server
     */
    function connect() {
        cacheElements();

        // Connect to same host (no explicit URL needed)
        socket = io({
            reconnection: false // We handle reconnection manually
        });

        // Connection events
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        // Application events
        socket.on('execution_progress', handleExecutionProgress);
        socket.on('execution_finished', handleExecutionFinished);
        socket.on('error', handleError);
    }

    /**
     * Disconnect from the server
     */
    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        clearReconnectInterval();
    }

    /**
     * Emit an event to the server
     * @param {string} event - Event name
     * @param {object} data - Event payload
     */
    function emit(event, data) {
        if (socket && socket.connected) {
            socket.emit(event, data || {});
        }
    }

    /**
     * Check if the socket is currently connected
     * @returns {boolean}
     */
    function isConnected() {
        return socket && socket.connected;
    }

    // --- Connection Handlers ---

    function handleConnect() {
        reconnectAttempts = 0;
        clearReconnectInterval();
        setConnectionStatus(true);
    }

    function handleDisconnect() {
        setConnectionStatus(false);
        startReconnect();
    }

    function handleConnectError() {
        setConnectionStatus(false);
        startReconnect();
    }

    // --- Reconnection Logic ---

    function startReconnect() {
        if (reconnectInterval) return; // Already trying

        reconnectInterval = setInterval(function() {
            reconnectAttempts++;

            if (reconnectAttempts > MAX_RECONNECT) {
                clearReconnectInterval();
                showReloadMessage();
                return;
            }

            if (socket) {
                socket.connect();
            }
        }, RECONNECT_DELAY);
    }

    function clearReconnectInterval() {
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    }

    function showReloadMessage() {
        if (connectionStatus) {
            var statusText = connectionStatus.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = 'Connection lost. Please reload the page.';
            }
        }
    }

    // --- Status Indicator ---

    function setConnectionStatus(connected) {
        if (!connectionStatus) return;

        var statusText = connectionStatus.querySelector('.status-text');

        if (connected) {
            connectionStatus.classList.remove('disconnected');
            connectionStatus.classList.add('connected');
            if (statusText) statusText.textContent = 'Connected';
        } else {
            connectionStatus.classList.remove('connected');
            connectionStatus.classList.add('disconnected');
            if (statusText) statusText.textContent = 'Disconnected';
        }
    }

    // --- Execution Event Handlers ---

    /**
     * Handle execution_progress event
     * Highlights the current block yellow and updates the progress indicator.
     * @param {object} data - {block_id, current_block, total_blocks}
     */
    function handleExecutionProgress(data) {
        var blockId = data.block_id;
        var currentBlock = data.current_block || 0;
        var totalBlocks = data.total_blocks || 0;

        // Highlight current block yellow
        if (blockId) {
            highlightBlock(blockId, 'yellow');
        }

        // Update progress indicator
        showProgress(currentBlock, totalBlocks);
    }

    /**
     * Handle execution_finished event
     * @param {object} data - {status: 'completed'|'stopped'|'error', error?: string}
     */
    function handleExecutionFinished(data) {
        var status = data.status;

        if (status === 'completed') {
            // Green flash on last block for up to 2 seconds, then reset
            flashGreen();
        } else {
            // 'stopped' or 'error' — reset without animation
            clearHighlights();
        }

        // Hide progress and re-enable Run
        hideProgress();
        enableRun();

        // Deactivate stop button pulsing
        if (stopBtn) {
            stopBtn.classList.remove('active');
        }
    }

    /**
     * Handle error event
     * @param {object} data - {message, block_id?}
     */
    function handleError(data) {
        var message = data.message || 'An error occurred';
        var blockId = data.block_id;

        // Highlight the errored block red if block_id is provided
        if (blockId) {
            highlightBlock(blockId, 'red');
        }

        // Show simple error dialog
        showErrorDialog(message);
    }

    // --- Block Highlighting ---

    /**
     * Highlight a block in the Blockly workspace
     * @param {string} blockId - The block ID to highlight
     * @param {string} color - 'yellow', 'green', or 'red'
     */
    function highlightBlock(blockId, color) {
        // Clear previous highlight
        clearHighlights();

        // Use Blockly workspace API if available
        if (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace) {
            var workspace = Blockly.getMainWorkspace();
            if (workspace) {
                // Use highlightBlock for yellow (execution progress)
                if (color === 'yellow') {
                    workspace.highlightBlock(blockId);
                    currentHighlightedBlock = blockId;
                } else {
                    // For red/green, add a CSS class to the block SVG
                    var block = workspace.getBlockById(blockId);
                    if (block) {
                        var svgRoot = block.getSvgRoot();
                        if (svgRoot) {
                            svgRoot.classList.add('highlight-' + color);
                            currentHighlightedBlock = blockId;
                        }
                    }
                }
            }
        }
    }

    /**
     * Clear all block highlights
     */
    function clearHighlights() {
        if (typeof Blockly !== 'undefined' && Blockly.getMainWorkspace) {
            var workspace = Blockly.getMainWorkspace();
            if (workspace) {
                // Clear Blockly's built-in highlight
                workspace.highlightBlock(null);

                // Remove custom CSS highlight classes
                if (currentHighlightedBlock) {
                    var block = workspace.getBlockById(currentHighlightedBlock);
                    if (block) {
                        var svgRoot = block.getSvgRoot();
                        if (svgRoot) {
                            svgRoot.classList.remove('highlight-yellow', 'highlight-green', 'highlight-red');
                        }
                    }
                }
            }
        }
        currentHighlightedBlock = null;
    }

    /**
     * Flash the last highlighted block green for ≤2 seconds, then reset
     */
    function flashGreen() {
        if (currentHighlightedBlock) {
            highlightBlock(currentHighlightedBlock, 'green');
        }

        // Clear green flash after 2 seconds max
        if (greenFlashTimeout) {
            clearTimeout(greenFlashTimeout);
        }
        greenFlashTimeout = setTimeout(function() {
            clearHighlights();
            greenFlashTimeout = null;
        }, 2000);
    }

    // --- Progress Indicator ---

    function showProgress(current, total) {
        if (!progressIndicator) return;

        progressIndicator.removeAttribute('hidden');

        var percent = total > 0 ? Math.round((current / total) * 100) : 0;

        if (progressFill) {
            progressFill.style.width = percent + '%';
        }
        if (progressText) {
            progressText.textContent = 'Block ' + current + ' of ' + total;
        }

        // Update ARIA value
        progressIndicator.setAttribute('aria-valuenow', percent);
    }

    function hideProgress() {
        if (!progressIndicator) return;

        progressIndicator.setAttribute('hidden', '');

        if (progressFill) {
            progressFill.style.width = '0%';
        }
        if (progressText) {
            progressText.textContent = 'Block 0 of 0';
        }
        progressIndicator.setAttribute('aria-valuenow', '0');
    }

    // --- UI Helpers ---

    function enableRun() {
        if (runBtn) {
            runBtn.disabled = false;
        }
    }

    /**
     * Show a simple error dialog
     * @param {string} message - Error message to display
     */
    function showErrorDialog(message) {
        // Use the dialog overlay if available
        var overlay = document.getElementById('dialogOverlay');
        var title = document.getElementById('dialogTitle');
        var content = document.getElementById('dialogContent');
        var confirmBtn = document.getElementById('dialogConfirm');
        var cancelBtn = document.getElementById('dialogCancel');

        if (overlay && title && content) {
            title.textContent = 'Error';
            content.textContent = message;
            overlay.removeAttribute('hidden');
            overlay.setAttribute('aria-hidden', 'false');

            // Hide cancel button for error dialogs (just need OK)
            if (cancelBtn) {
                cancelBtn.style.display = 'none';
            }

            // Set up confirm to close
            if (confirmBtn) {
                var closeHandler = function() {
                    overlay.setAttribute('hidden', '');
                    overlay.setAttribute('aria-hidden', 'true');
                    if (cancelBtn) {
                        cancelBtn.style.display = '';
                    }
                    confirmBtn.removeEventListener('click', closeHandler);
                };
                confirmBtn.addEventListener('click', closeHandler);
            }
        } else {
            // Fallback to alert if dialog elements not found
            alert('Error: ' + message);
        }
    }

    // Public API
    return {
        connect: connect,
        disconnect: disconnect,
        emit: emit,
        isConnected: isConnected,
        highlightBlock: highlightBlock,
        clearHighlights: clearHighlights
    };
})();
