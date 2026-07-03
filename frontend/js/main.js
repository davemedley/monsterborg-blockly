/**
 * Main Application Entry Point
 * Initializes the Blockly workspace, registers blocks/generators,
 * connects WebSocket, initializes UI, and sets up workspace controls.
 *
 * Requirements: 1.1, 1.5, 1.6, 1.7
 */

'use strict';

(function() {

    // --- Constants ---
    var MIN_ZOOM = 0.5;   // 50%
    var MAX_ZOOM = 2.0;   // 200%
    var ZOOM_STEP = 0.25; // 25% increments
    var DEFAULT_ZOOM = 1.0;

    // --- State ---
    var workspace = null;
    var currentZoom = DEFAULT_ZOOM;

    // --- DOM References ---
    var undoBtn = null;
    var redoBtn = null;
    var zoomInBtn = null;
    var zoomOutBtn = null;
    var zoomLevelDisplay = null;

    /**
     * Initialize the application when the DOM is ready.
     */
    function init() {
        cacheElements();
        initWorkspace();
        loadStartBlocks();
        connectWebSocket();
        initUI();
        bindControls();
        bindResize();
    }

    /**
     * Cache toolbar DOM element references.
     */
    function cacheElements() {
        undoBtn = document.getElementById('undoBtn');
        redoBtn = document.getElementById('redoBtn');
        zoomInBtn = document.getElementById('zoomInBtn');
        zoomOutBtn = document.getElementById('zoomOutBtn');
        zoomLevelDisplay = document.getElementById('zoomLevel');
    }

    /**
     * Inject the Blockly workspace into #blocklyDiv with the toolbox.
     */
    function initWorkspace() {
        var blocklyDiv = document.getElementById('blocklyDiv');
        var toolbox = document.getElementById('toolbox');

        workspace = Blockly.inject(blocklyDiv, {
            toolbox: toolbox,
            grid: {
                spacing: 20,
                length: 3,
                colour: '#ccc',
                snap: true
            },
            trashcan: true,
            zoom: {
                controls: false, // We use our own zoom buttons
                startScale: DEFAULT_ZOOM,
                maxScale: MAX_ZOOM,
                minScale: MIN_ZOOM,
                scaleSpeed: 1.0
            },
            move: {
                scrollbars: true,
                drag: true,
                wheel: false
            }
        });
    }

    /**
     * Load the initial blocks (pre-placed undeletable Start block) from #startBlocks.
     */
    function loadStartBlocks() {
        var startBlocksXml = document.getElementById('startBlocks');
        if (startBlocksXml && workspace) {
            Blockly.Xml.domToWorkspace(startBlocksXml, workspace);
        }
    }

    /**
     * Connect the WebSocket client.
     */
    function connectWebSocket() {
        if (typeof WebSocketClient !== 'undefined' && WebSocketClient.connect) {
            WebSocketClient.connect();
        }
    }

    /**
     * Initialize the UI module and pass it the workspace reference.
     */
    function initUI() {
        if (typeof UI !== 'undefined') {
            UI.init();
            if (UI.setWorkspace) {
                UI.setWorkspace(workspace);
            }
        }
    }

    /**
     * Bind undo/redo and zoom button click handlers.
     */
    function bindControls() {
        // Undo
        if (undoBtn) {
            undoBtn.addEventListener('click', function() {
                if (workspace) {
                    workspace.undo(false);
                }
            });
        }

        // Redo
        if (redoBtn) {
            redoBtn.addEventListener('click', function() {
                if (workspace) {
                    workspace.undo(true);
                }
            });
        }

        // Zoom In
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', function() {
                zoomWorkspace(ZOOM_STEP);
            });
        }

        // Zoom Out
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', function() {
                zoomWorkspace(-ZOOM_STEP);
            });
        }
    }

    /**
     * Zoom the workspace by a delta amount, clamping to [MIN_ZOOM, MAX_ZOOM].
     * @param {number} delta - The zoom change (positive = zoom in, negative = zoom out)
     */
    function zoomWorkspace(delta) {
        if (!workspace) return;

        var newZoom = currentZoom + delta;

        // Clamp to valid range
        if (newZoom < MIN_ZOOM) {
            newZoom = MIN_ZOOM;
        }
        if (newZoom > MAX_ZOOM) {
            newZoom = MAX_ZOOM;
        }

        // Only update if the zoom level actually changed
        if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            workspace.setScale(currentZoom);
            updateZoomDisplay();
        }
    }

    /**
     * Update the zoom level display element.
     */
    function updateZoomDisplay() {
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = Math.round(currentZoom * 100) + '%';
        }
    }

    /**
     * Handle window resize by triggering a Blockly resize.
     */
    function bindResize() {
        window.addEventListener('resize', function() {
            if (workspace) {
                Blockly.svgResize(workspace);
            }
        });
    }

    // --- Start the application on DOMContentLoaded ---
    document.addEventListener('DOMContentLoaded', init);

})();
