/**
 * Court Definitions — Registry of all tennis court backgrounds.
 *
 * Each entry maps a court ID to:
 *   - `asset`    — the image path loaded in preload() (relative to public/)
 *   - `name`     — display name shown on court-select screens
 *   - `imageSize`— original pixel dimensions of the source PNG
 *   - `points`   — the 8 key coordinates as pixel positions on the
 *                   **source image**. `resolveCourtPoints()` converts
 *                   them to screen space at runtime, accounting for the
 *                   cover-scale + centering that Phaser applies.
 *
 * To calibrate a new court:
 *   1. Set DEBUG_COURT = true in TennisScene.ts
 *   2. Open the source PNG in any image editor and note the pixel coords
 *      of each court corner / net endpoint
 *   3. Enter those raw pixel values in the `points` object below
 *   4. Run the game — the debug overlay will show whether the points
 *      line up with the rendered court. Tap to log screen coords.
 */

import type { CourtPoints } from './CourtGeometry';

/**
 * Court point data stored as pixel positions on the source image.
 * Converted to screen space by resolveCourtPoints().
 */
export interface CourtPointsImage {
  farLeft:      { x: number; y: number };
  farRight:     { x: number; y: number };
  netFarLeft:   { x: number; y: number };
  netFarRight:  { x: number; y: number };
  netNearLeft:  { x: number; y: number };
  netNearRight: { x: number; y: number };
  nearLeft:     { x: number; y: number };
  nearRight:    { x: number; y: number };
}

export interface CourtDef {
  /** Unique key used in code and scene data. */
  id: string;
  /** Human-readable name for UI / court selection. */
  name: string;
  /** Asset path relative to public/ directory. */
  asset: string;
  /** Phaser texture key used in load.image / add.image. */
  textureKey: string;
  /** Original source image dimensions (width × height in pixels). */
  imageSize: { w: number; h: number };
  /** Court line positions as pixel coords on the source image. */
  points: CourtPointsImage;
}

// ── Court registry ───────────────────────────────────────────────

export const COURTS: Record<string, CourtDef> = {
  'clay-fingal': {
    id: 'clay-fingal',
    name: 'Fingal Clay',
    asset: 'backgrounds/courts/clay-fingal.png',
    textureKey: 'court-clay-fingal',
    imageSize: { w: 3410, h: 5120 },
    points: {
      farLeft:      { x: 780, y: 2352 },
      farRight:     { x: 2634, y: 2346 },
      netFarLeft:   { x: 678, y: 2952 },
      netFarRight:  { x: 2736, y: 2946 },
      netNearLeft:  { x: 648, y: 3150 },
      netNearRight: { x: 2778, y: 3150 },
      nearLeft:     { x: 468, y: 4206 },
      nearRight:    { x: 2958, y: 4206 },
    },
  },

  'grass-somerset': {
    id: 'grass-somerset',
    name: 'Somerset Grass',
    asset: 'backgrounds/courts/grass-somerset.png',
    textureKey: 'court-grass-somerset',
    imageSize: { w: 3410, h: 5120 },
    points: {
      // TODO: calibrate — enter source image pixel coords
      farLeft:      { x: 906, y: 2565 },
      farRight:     { x: 2512, y: 2558 },
      netFarLeft:   { x: 765, y: 2945 },
      netFarRight:  { x: 2648, y: 2934 },
      netNearLeft:  { x: 703, y: 3115 },
      netNearRight: { x: 2720, y: 3110 },
      nearLeft:     { x: 303, y: 4115 },
      nearRight:    { x: 3125, y: 4118 },
    },
  },

  'acrylic-pavo': {
    id: 'acrylic-pavo',
    name: 'Pavo Acrylic',
    asset: 'backgrounds/courts/acrylic-pavo.png',
    textureKey: 'court-acrylic-pavo',
    imageSize: { w: 3410, h: 5120 },
    points: {
      // TODO: calibrate — enter source image pixel coords
      farLeft:      { x: 780, y: 2252 },
      farRight:     { x: 2634, y: 2346 },
      netFarLeft:   { x: 678, y: 2952 },
      netFarRight:  { x: 2736, y: 2946 },
      netNearLeft:  { x: 648, y: 3150 },
      netNearRight: { x: 2778, y: 3150 },
      nearLeft:     { x: 468, y: 4206 },
      nearRight:    { x: 2958, y: 4206 },
    },
  },
} as const;

/** Default court used when none is specified. */
export const DEFAULT_COURT_ID = 'clay-fingal';

// ── Helper: convert image-space points → screen-space CourtPoints ──

/**
 * Resolve a court's source-image pixel coordinates to screen-space positions.
 *
 * The court background image is rendered with cover-scaling (Math.max of
 * scaleX, scaleY) and centered in the screen — the same logic used by
 * TennisScene when placing the background. This function replicates that
 * transform so the geometry overlay lines up with the rendered image.
 */
export function resolveCourtPoints(
  courtId: string,
  screenWidth: number,
  screenHeight: number,
): CourtPoints {
  const def = COURTS[courtId];
  if (!def) {
    throw new Error(`Unknown court ID: "${courtId}". Available: ${Object.keys(COURTS).join(', ')}`);
  }

  const { w: imgW, h: imgH } = def.imageSize;

  // Cover-scale: same logic as TennisScene — Math.max(scaleX, scaleY)
  const scale = Math.max(screenWidth / imgW, screenHeight / imgH);

  // Offset to centre the scaled image on screen
  const offsetX = (screenWidth - imgW * scale) / 2;
  const offsetY = (screenHeight - imgH * scale) / 2;

  const resolve = (pt: { x: number; y: number }) => ({
    x: pt.x * scale + offsetX,
    y: pt.y * scale + offsetY,
  });

  return {
    farLeft:      resolve(def.points.farLeft),
    farRight:     resolve(def.points.farRight),
    netFarLeft:   resolve(def.points.netFarLeft),
    netFarRight:  resolve(def.points.netFarRight),
    netNearLeft:  resolve(def.points.netNearLeft),
    netNearRight: resolve(def.points.netNearRight),
    nearLeft:     resolve(def.points.nearLeft),
    nearRight:    resolve(def.points.nearRight),
  };
}
