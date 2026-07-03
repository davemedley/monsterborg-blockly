/**
 * Movement Block Definitions
 * Defines Blockly blocks for robot movement commands.
 * Green category (hue 120).
 */

'use strict';

// move_forward: Drive the robot forward a specified distance
Blockly.Blocks['move_forward'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Move Forward')
        .appendField(new Blockly.FieldNumber(0.5, 0.1, 2.0, 0.1), 'distance')
        .appendField('meters');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Drive the robot forward by a distance in meters');
    this.setHelpUrl('');
  }
};

// move_backward: Drive the robot backward a specified distance
Blockly.Blocks['move_backward'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Move Backward')
        .appendField(new Blockly.FieldNumber(0.5, 0.1, 2.0, 0.1), 'distance')
        .appendField('meters');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Drive the robot backward by a distance in meters');
    this.setHelpUrl('');
  }
};

// turn_left: Rotate the robot left by a specified angle
Blockly.Blocks['turn_left'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Turn Left')
        .appendField(new Blockly.FieldNumber(90, 1, 360, 1), 'angle')
        .appendField('degrees');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Rotate the robot left by an angle in degrees');
    this.setHelpUrl('');
  }
};

// turn_right: Rotate the robot right by a specified angle
Blockly.Blocks['turn_right'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Turn Right')
        .appendField(new Blockly.FieldNumber(90, 1, 360, 1), 'angle')
        .appendField('degrees');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Rotate the robot right by an angle in degrees');
    this.setHelpUrl('');
  }
};

// spin_circle: Spin the robot in a full circle
Blockly.Blocks['spin_circle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Spin')
        .appendField(new Blockly.FieldDropdown([
          ['left', 'left'],
          ['right', 'right']
        ]), 'direction')
        .appendField(new Blockly.FieldNumber(1, 1, 10, 1), 'rotations')
        .appendField('times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Spin the robot in a circle a number of times');
    this.setHelpUrl('');
  }
};

// custom_move: Set individual motor powers for a duration
Blockly.Blocks['custom_move'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Custom Move');
    this.appendDummyInput()
        .appendField('Left Power')
        .appendField(new Blockly.FieldNumber(0.0, -1.0, 1.0, 0.1), 'left_power');
    this.appendDummyInput()
        .appendField('Right Power')
        .appendField(new Blockly.FieldNumber(0.0, -1.0, 1.0, 0.1), 'right_power');
    this.appendDummyInput()
        .appendField('Duration')
        .appendField(new Blockly.FieldNumber(1.0, 0.1, 10.0, 0.1), 'duration')
        .appendField('seconds');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Set left and right motor power for a duration');
    this.setHelpUrl('');
  }
};
