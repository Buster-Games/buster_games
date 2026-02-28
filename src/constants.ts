/**
 * Aragon16 palette constants — used across every scene and UI component.
 * All game art must use only these 16 colours.
 *
 * Reference file: assets/palettes/aragon16.hex
 */

/** Numeric hex values — pass to Phaser graphics, rectangles, and geometry */
export const PALETTE = {
  nearBlack:   0x272120,
  darkGrey:    0x54555c,
  midGrey:     0x8b8893,
  cream:       0xf9f8dd,
  lightGreen:  0xd2e291,
  limeGreen:   0xa8d455,
  oliveGreen:  0x9cab6c,
  forestGreen: 0x5c8d58,
  darkGreen:   0x3b473c,
  tan:         0xe0bf7a,
  medSkin:     0xba9572,
  dustyRose:   0x876661,
  steelBlue:   0xb7c4d0,
  cornflower:  0x8daad6,
  periwinkle:  0x9197b6,
  accentBlue:  0x6b72d4,
} as const;

/** CSS hex strings — pass to Phaser text `color` and `stroke` style properties */
export const PALETTE_HEX = {
  nearBlack:   '#272120',
  darkGrey:    '#54555c',
  midGrey:     '#8b8893',
  cream:       '#f9f8dd',
  lightGreen:  '#d2e291',
  limeGreen:   '#a8d455',
  oliveGreen:  '#9cab6c',
  forestGreen: '#5c8d58',
  darkGreen:   '#3b473c',
  tan:         '#e0bf7a',
  medSkin:     '#ba9572',
  dustyRose:   '#876661',
  steelBlue:   '#b7c4d0',
  cornflower:  '#8daad6',
  periwinkle:  '#9197b6',
  accentBlue:  '#6b72d4',
} as const;

/** 8-bit font used for all UI text throughout the game */
export const FONT = '"Press Start 2P", monospace';
