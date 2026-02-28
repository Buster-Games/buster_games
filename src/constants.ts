/**
 * Brazilian Afternoon palette constants — used across every scene and UI component.
 * All game art must use only these colours.
 *
 * Reference file: assets/palettes/brazilian-afternoon.hex
 */

/** Numeric hex values — pass to Phaser graphics, rectangles, and geometry */
export const PALETTE = {
  // Whites & Creams
  white:       0xffffff,
  cream:       0xe8d5ae,
  lightSkin:   0xe1c4a4,
  
  // Tans & Browns
  gold:        0xe1c074,
  tan:         0xd49d56,
  brown:       0xb58057,
  darkBrown:   0x925a3e,
  
  // Oranges & Corals
  orange:      0xff8a27,
  coral:       0xd06a49,
  terracotta:  0xac634a,
  rust:        0x9c483b,
  
  // Pinks & Roses
  pink:        0xc66e6e,
  greyPink:    0xb9a3a0,
  darkRust:    0x844d45,
  
  // Greens
  limeGreen:   0xbdbc69,
  oliveGreen:  0x999c50,
  green:       0x699254,
  forestGreen: 0x467f53,
  darkOlive:   0x5a5f51,
  greyGreen:   0x868c65,
  
  // Blues
  skyBlue:     0xcee6e8,
  lightBlue:   0x7faec6,
  blue:        0x3d94c0,
  darkBlue:    0x49617d,
  aqua:        0x93cad0,
  greyBlue:    0x8eb3ba,
  
  // Greys & Darks
  lightGrey:   0xb6bab9,
  midGrey:     0x929a9c,
  darkGrey:    0x6f7d85,
  nearBlack:   0x596674,
  brownGrey:   0x5c4e4e,
} as const;

/** CSS hex strings — pass to Phaser text `color` and `stroke` style properties */
export const PALETTE_HEX = {
  // Whites & Creams
  white:       '#ffffff',
  cream:       '#e8d5ae',
  lightSkin:   '#e1c4a4',
  
  // Tans & Browns
  gold:        '#e1c074',
  tan:         '#d49d56',
  brown:       '#b58057',
  darkBrown:   '#925a3e',
  
  // Oranges & Corals
  orange:      '#ff8a27',
  coral:       '#d06a49',
  terracotta:  '#ac634a',
  rust:        '#9c483b',
  
  // Pinks & Roses
  pink:        '#c66e6e',
  greyPink:    '#b9a3a0',
  darkRust:    '#844d45',
  
  // Greens
  limeGreen:   '#bdbc69',
  oliveGreen:  '#999c50',
  green:       '#699254',
  forestGreen: '#467f53',
  darkOlive:   '#5a5f51',
  greyGreen:   '#868c65',
  
  // Blues
  skyBlue:     '#cee6e8',
  lightBlue:   '#7faec6',
  blue:        '#3d94c0',
  darkBlue:    '#49617d',
  aqua:        '#93cad0',
  greyBlue:    '#8eb3ba',
  
  // Greys & Darks
  lightGrey:   '#b6bab9',
  midGrey:     '#929a9c',
  darkGrey:    '#6f7d85',
  nearBlack:   '#596674',
  brownGrey:   '#5c4e4e',
} as const;

/** 8-bit font used for all UI text throughout the game */
export const FONT = '"Press Start 2P", monospace';
