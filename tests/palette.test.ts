/**
 * Smoke tests for the Aragon16 palette constants exported from BootScene.
 * These are pure data checks — no DOM or Phaser instance required.
 */
import { PALETTE, PALETTE_HEX, FONT } from '../src/constants';

// ── PALETTE (numeric) ────────────────────────────────────────────────────────

test('PALETTE has exactly 16 colours', () => {
  expect(Object.keys(PALETTE).length).toBe(16);
});

test('PALETTE.nearBlack matches Aragon16 #272120', () => {
  expect(PALETTE.nearBlack).toBe(0x272120);
});

test('PALETTE.accentBlue matches Aragon16 #6b72d4', () => {
  expect(PALETTE.accentBlue).toBe(0x6b72d4);
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

test('PALETTE_HEX has exactly 16 colours', () => {
  expect(Object.keys(PALETTE_HEX).length).toBe(16);
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
