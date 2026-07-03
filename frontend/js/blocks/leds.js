/**
 * LED Block Definitions for MonsterBorg Blockly Interface
 * Category: LEDs (Yellow, hue 60)
 *
 * Blocks:
 *   - set_led_color: Set LED to a custom RGB color
 *   - led_preset: Set LED to a preset color
 *   - led_battery: Show battery level on LEDs
 */

'use strict';

// --- set_led_color ---
Blockly.Blocks['set_led_color'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Set LED')
        .appendField('R')
        .appendField(new Blockly.FieldNumber(0, 0, 1, 0.1), 'r')
        .appendField('G')
        .appendField(new Blockly.FieldNumber(0, 0, 1, 0.1), 'g')
        .appendField('B')
        .appendField(new Blockly.FieldNumber(0, 0, 1, 0.1), 'b');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(60);
    this.setTooltip('Set LED to a custom color');
  }
};

// --- led_preset ---
Blockly.Blocks['led_preset'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('LED Color')
        .appendField(new Blockly.FieldDropdown([
          ['Red', 'red'],
          ['Green', 'green'],
          ['Blue', 'blue'],
          ['Yellow', 'yellow'],
          ['Purple', 'purple'],
          ['Cyan', 'cyan'],
          ['White', 'white'],
          ['Off', 'off']
        ]), 'color');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(60);
    this.setTooltip('Set LED to a preset color');
  }
};

// --- led_battery ---
Blockly.Blocks['led_battery'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('Show Battery');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(60);
    this.setTooltip('Show battery level using LED colors');
  }
};
