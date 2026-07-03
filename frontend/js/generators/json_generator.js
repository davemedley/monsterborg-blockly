/**
 * JSON Generator for MonsterBorg Blockly Interface
 * Walks the block tree top-to-bottom and produces a JSON array
 * of command objects compatible with the backend compiler.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

'use strict';

var JsonGenerator = (function() {

  // --- Value clamping ranges ---
  var RANGES = {
    distance:    { min: 0.1, max: 2.0 },
    angle:       { min: 1,   max: 360 },
    duration:    { min: 0.1, max: 10.0 },
    power:       { min: -1.0, max: 1.0 },
    count:       { min: 1,   max: 10 },
    color:       { min: 0.0, max: 1.0 },
    side_length: { min: 0.1, max: 2.0 },
    diameter:    { min: 0.1, max: 2.0 },
    rotations:   { min: 1,   max: 10 }
  };

  /**
   * Clamp a value to [min, max].
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Clamp a value using a named range from RANGES.
   * @param {number} value
   * @param {string} rangeName
   * @returns {number}
   */
  function clampRange(value, rangeName) {
    var range = RANGES[rangeName];
    if (!range) return value;
    return clamp(value, range.min, range.max);
  }

  // --- Generator functions for each block type ---

  var blockGenerators = {

    move_forward: function(block) {
      var distance = block.getFieldValue('distance');
      return {
        type: 'move_forward',
        distance: clampRange(Number(distance), 'distance')
      };
    },

    move_backward: function(block) {
      var distance = block.getFieldValue('distance');
      return {
        type: 'move_backward',
        distance: clampRange(Number(distance), 'distance')
      };
    },

    turn_left: function(block) {
      var angle = block.getFieldValue('angle');
      return {
        type: 'turn_left',
        angle: clampRange(Number(angle), 'angle')
      };
    },

    turn_right: function(block) {
      var angle = block.getFieldValue('angle');
      return {
        type: 'turn_right',
        angle: clampRange(Number(angle), 'angle')
      };
    },

    spin_circle: function(block) {
      var direction = block.getFieldValue('direction');
      var rotations = block.getFieldValue('rotations');
      return {
        type: 'spin_circle',
        direction: direction,
        rotations: clampRange(Number(rotations), 'rotations')
      };
    },

    custom_move: function(block) {
      var leftPower = block.getFieldValue('left_power');
      var rightPower = block.getFieldValue('right_power');
      var duration = block.getFieldValue('duration');
      return {
        type: 'custom_move',
        left_power: clampRange(Number(leftPower), 'power'),
        right_power: clampRange(Number(rightPower), 'power'),
        duration: clampRange(Number(duration), 'duration')
      };
    },

    set_led_color: function(block) {
      var r = block.getFieldValue('r');
      var g = block.getFieldValue('g');
      var b = block.getFieldValue('b');
      return {
        type: 'set_led_color',
        r: clampRange(Number(r), 'color'),
        g: clampRange(Number(g), 'color'),
        b: clampRange(Number(b), 'color')
      };
    },

    led_preset: function(block) {
      var color = block.getFieldValue('color');
      return {
        type: 'led_preset',
        color: color
      };
    },

    led_battery: function(block) {
      return {
        type: 'led_battery'
      };
    },

    wait: function(block) {
      var duration = block.getFieldValue('duration');
      return {
        type: 'wait',
        duration: clampRange(Number(duration), 'duration')
      };
    },

    repeat: function(block) {
      var count = block.getFieldValue('count');
      var nestedBlocks = generateBlockList(block, 'blocks');
      return {
        type: 'repeat',
        count: clampRange(Number(count), 'count'),
        blocks: nestedBlocks
      };
    },

    pattern_square: function(block) {
      var sideLength = block.getFieldValue('side_length');
      return {
        type: 'pattern_square',
        side_length: clampRange(Number(sideLength), 'side_length')
      };
    },

    pattern_triangle: function(block) {
      var sideLength = block.getFieldValue('side_length');
      return {
        type: 'pattern_triangle',
        side_length: clampRange(Number(sideLength), 'side_length')
      };
    },

    pattern_circle: function(block) {
      var diameter = block.getFieldValue('diameter');
      return {
        type: 'pattern_circle',
        diameter: clampRange(Number(diameter), 'diameter')
      };
    },

    stop: function(block) {
      return {
        type: 'stop'
      };
    },

    emergency_stop: function(block) {
      return {
        type: 'emergency_stop'
      };
    }
  };

  /**
   * Generate commands for a statement input (nested block list).
   * Walks connected blocks from the first block in the statement.
   * @param {Blockly.Block} parentBlock - The parent block containing the statement input.
   * @param {string} statementName - The name of the statement input (e.g., 'blocks').
   * @returns {Array} Array of command objects.
   */
  function generateBlockList(parentBlock, statementName) {
    var commands = [];
    var block = parentBlock.getInputTargetBlock(statementName);

    while (block) {
      var command = generateBlock(block);
      if (command) {
        commands.push(command);
      }
      block = block.getNextBlock();
    }

    return commands;
  }

  /**
   * Generate a command object from a single block.
   * @param {Blockly.Block} block
   * @returns {Object|null} Command object or null if unknown type.
   */
  function generateBlock(block) {
    var blockType = block.type;
    var generator = blockGenerators[blockType];

    if (!generator) {
      console.warn('[JsonGenerator] Unknown block type: ' + blockType);
      return null;
    }

    return generator(block);
  }

  /**
   * Find the 'start' block in the workspace.
   * @param {Blockly.Workspace} workspace
   * @returns {Blockly.Block|null}
   */
  function findStartBlock(workspace) {
    var blocks = workspace.getTopBlocks(true);
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].type === 'start') {
        return blocks[i];
      }
    }
    return null;
  }

  /**
   * Generate a JSON command array from the workspace.
   * Finds the start block, then walks all connected blocks top-to-bottom.
   * @param {Blockly.Workspace} workspace
   * @returns {Array} Array of command objects. Empty array if no start block or empty workspace.
   */
  function generateCode(workspace) {
    if (!workspace) {
      return [];
    }

    var startBlock = findStartBlock(workspace);
    if (!startBlock) {
      return [];
    }

    // Walk blocks connected after the start block
    var commands = [];
    var block = startBlock.getNextBlock();

    while (block) {
      var command = generateBlock(block);
      if (command) {
        commands.push(command);
      }
      block = block.getNextBlock();
    }

    return commands;
  }

  // --- Public API ---
  return {
    generateCode: generateCode,
    // Exposed for testing
    clamp: clamp,
    clampRange: clampRange,
    RANGES: RANGES
  };

})();
