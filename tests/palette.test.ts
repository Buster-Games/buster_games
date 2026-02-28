/**
 * Smoke tests for the Brazilian Afternoon palette constants exported from constants.ts.
 * These are pure data checks — no DOM or Phaser instance required.
 */
import { PALETTE, PALETTE_HEX, FONT } from '../src/constants';

// ── PALETTE (numeric) ────────────────────────────────────────────────────────

test('PALETTE has expected number of colours', () => {
  // Brazilian Afternoon has ~30 colours
  expect(Object.keys(PALETTE).length).toBeGreaterThanOrEqual(25);
});

test('PALETTE.nearBlack matches Brazilian Afternoon #596674', () => {
  expect(PALETTE.nearBlack).toBe(0x596674);
});

test('PALETTE.blue matches Brazilian Afternoon #3d94c0', () => {
  expect(PALETTE.blue).toBe(0x3d94c0);
});

test('All PALETTE values are valid 24-bit integers', () => {
  for (const [key, value] of Object.entries(PALETTE)) {
    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffffff);
    // No floating point
    expect(Number.isInteger(value)).toBe(true);
  }
});

// ── PALETTE_HEX (string) ─────────────────────────────────────────────────────

test('PALETTE_HEX has expected number of colours', () => {
  expect(Object.keys(PALETTE_HEX).length).toBeGreaterThanOrEqual(25);
});

test('All PALETTE_HEX values are valid CSS hex strings', () => {
  const hexPattern = /^#[0-9a-f]{6}$/i;
  for (const [key, value] of Object.entries(PALETTE_HEX)) {
    expect(value).toMatch(hexPattern);
  }
});

test('PALETTE and PALETTE_HEX keys match exactly', () => {
  const numericKeys = Object.keys(PALETTE).sort();
  const hexKeys = Object.keys(PALETTE_HEX).sort();
  expect(numericKeys).toEqual(hexKeys);
});

test('PALETTE and PALETTE_HEX values are consistent for each colour', () => {
  for (const key of Object.keys(PALETTE) as Array<keyof typeof PALETTE>) {
    const numericValue = PALETTE[key];
    const hexValue = PALETTE_HEX[key];
    // Convert hex string to number and compare
    const hexAsNumber = parseInt(hexValue.slice(1), 16);
    expect(hexAsNumber).toBe(numericValue);
  }
});

// ── FONT ─────────────────────────────────────────────────────────────────────

test('FONT includes Press Start 2P', () => {
  expect(FONT).toContain('Press Start 2P');
});
