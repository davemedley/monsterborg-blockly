/**
 * Control Block Definitions
 * Defines Blockly blocks for program control: start, stop, emergency stop.
 * Red category (hue 0) for stop/emergency_stop, green (hue 120) for start.
 */

'use strict';

// start: Program entry point block (pre-placed, undeletable)
Blockly.Blocks['start'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('When Run');
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Program starts here');
    this.setHelpUrl('');
    this.setDeletable(false);
  }
};

// stop: Stop all motors
Blockly.Blocks['stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Stop');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(0);
    this.setTooltip('Stop all motors');
    this.setHelpUrl('');
  }
};

// emergency_stop: Immediately stop everything and halt program
Blockly.Blocks['emergency_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Emergency Stop');
    this.setPreviousStatement(true, null);
    this.setColour(0);
    this.setTooltip('Stop everything and end the program immediately');
    this.setHelpUrl('');
  }
};
