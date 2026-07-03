/**
 * Pattern Block Definitions
 * Defines Blockly blocks for geometric movement patterns.
 * Purple category (hue 270).
 */

'use strict';

// pattern_square: Drive the robot in a square path
Blockly.Blocks['pattern_square'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Drive Square')
        .appendField(new Blockly.FieldNumber(0.5, 0.1, 2.0, 0.1), 'side_length')
        .appendField('meters');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(270);
    this.setTooltip('Drive the robot in a square pattern');
    this.setHelpUrl('');
  }
};

// pattern_triangle: Drive the robot in a triangle path
Blockly.Blocks['pattern_triangle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Drive Triangle')
        .appendField(new Blockly.FieldNumber(0.5, 0.1, 2.0, 0.1), 'side_length')
        .appendField('meters');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(270);
    this.setTooltip('Drive the robot in a triangle pattern');
    this.setHelpUrl('');
  }
};

// pattern_circle: Drive the robot in a circle path
Blockly.Blocks['pattern_circle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Drive Circle')
        .appendField(new Blockly.FieldNumber(1.0, 0.1, 2.0, 0.1), 'diameter')
        .appendField('meters');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(270);
    this.setTooltip('Drive the robot in a circle pattern');
    this.setHelpUrl('');
  }
};
