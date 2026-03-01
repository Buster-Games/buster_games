import Phaser from 'phaser';

/**
 * Direction keys matching Pixel Lab export structure.
 */
const DIRECTIONS = [
  'north',
  'south',
  'east',
  'west',
  'north-east',
  'north-west',
  'south-east',
  'south-west',
] as const;

/**
 * Preload all Lara sprites and animation frames.
 *
 * Call this in TennisScene.preload().
 */
export function preloadLaraSprites(scene: Phaser.Scene): void {
  const basePath = 'sprites/lara';

  // ── Static rotations ───────────────────────────────────────
  for (const dir of DIRECTIONS) {
    scene.load.image(`lara-${dir}`, `${basePath}/rotations/${dir}.png`);
  }

  // ── Running animation (6 frames per direction) ─────────────
  for (const dir of DIRECTIONS) {
    for (let i = 0; i < 6; i++) {
      const frameKey = `lara-run-${dir}-${i}`;
      const framePath = `${basePath}/animations/running-6-frames/${dir}/frame_00${i}.png`;
      scene.load.image(frameKey, framePath);
    }
  }

  // ── Breathing idle animation (4 frames, north/south only) ──
  for (const dir of ['north', 'south'] as const) {
    for (let i = 0; i < 4; i++) {
      const frameKey = `lara-idle-${dir}-${i}`;
      const framePath = `${basePath}/animations/breathing-idle/${dir}/frame_00${i}.png`;
      scene.load.image(frameKey, framePath);
    }
  }

  // ── Tennis swing animation (4 frames, 4 directions) ────────
  const swingDirections = ['north-east', 'north-west', 'east', 'west'] as const;
  for (const dir of swingDirections) {
    for (let i = 0; i < 4; i++) {
      const frameKey = `lara-swing-${dir}-${i}`;
      const framePath = `${basePath}/animations/tennis-swing/${dir}/frame_00${i}.png`;
      scene.load.image(frameKey, framePath);
    }
  }

  // ── Celebration animation (4 frames, north/south) ──────────
  for (const dir of ['north', 'south'] as const) {
    for (let i = 0; i < 4; i++) {
      const frameKey = `lara-celebrate-${dir}-${i}`;
      const framePath = `${basePath}/animations/celebration-hands-in-air/${dir}/frame_00${i}.png`;
      scene.load.image(frameKey, framePath);
    }
  }
}

/**
 * Create all Lara animations after sprites are loaded.
 *
 * Call this in TennisScene.create().
 */
export function createLaraAnimations(scene: Phaser.Scene): void {
  // ── Running animations ─────────────────────────────────────
  for (const dir of DIRECTIONS) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 6; i++) {
      frames.push({ key: `lara-run-${dir}-${i}` });
    }

    scene.anims.create({
      key: `lara-run-${dir}`,
      frames,
      frameRate: 12,
      repeat: -1, // Loop
    });
  }

  // ── Idle breathing animations ──────────────────────────────
  for (const dir of ['north', 'south'] as const) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 4; i++) {
      frames.push({ key: `lara-idle-${dir}-${i}` });
    }

    scene.anims.create({
      key: `lara-idle-${dir}`,
      frames,
      frameRate: 4, // Slow breathing
      repeat: -1,
      yoyo: true, // Ping-pong for smooth breathing
    });
  }

  // ── Tennis swing animations ────────────────────────────────
  const swingDirections = ['north-east', 'north-west', 'east', 'west'] as const;
  for (const dir of swingDirections) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 4; i++) {
      frames.push({ key: `lara-swing-${dir}-${i}` });
    }

    scene.anims.create({
      key: `lara-swing-${dir}`,
      frames,
      frameRate: 16, // Fast swing
      repeat: 0, // Play once
    });
  }

  // ── Celebration animations ─────────────────────────────────
  for (const dir of ['north', 'south'] as const) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 4; i++) {
      frames.push({ key: `lara-celebrate-${dir}-${i}` });
    }

    scene.anims.create({
      key: `lara-celebrate-${dir}`,
      frames,
      frameRate: 6, // Energetic but readable
      repeat: -1, // Loop until next action
      yoyo: true,
    });
  }
}
