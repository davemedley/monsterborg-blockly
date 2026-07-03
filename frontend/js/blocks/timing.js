/**
 * Timing block definitions for MonsterBorg Block-Based Coding Interface.
 * Category color: Orange (hue 30)
 * Blocks: wait, repeat
 */

'use strict';

// Wait block - pauses execution for a specified duration
Blockly.Blocks['wait'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Wait')
        .appendField(new Blockly.FieldNumber(1.0, 0.1, 10.0, 0.1), 'duration')
        .appendField('seconds');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setTooltip('Pause for a number of seconds');
    this.setHelpUrl('');
  }
};

// Repeat block - executes nested blocks a specified number of times
Blockly.Blocks['repeat'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Repeat')
        .appendField(new Blockly.FieldNumber(3, 1, 10, 1), 'count')
        .appendField('times');
    this.appendStatementInput('blocks')
        .setCheck(null);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(30);
    this.setTooltip('Repeat the enclosed blocks multiple times');
    this.setHelpUrl('');
  }
};
