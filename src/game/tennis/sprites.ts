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
 * Character sprite configuration.
 *
 * Different characters may use different folder names for celebration
 * and have swing animations in different directions.
 */
interface CharacterSpriteConfig {
  /** Base path under public/ (e.g. 'sprites/nic') */
  basePath: string;
  /** Key prefix for frame/anim keys (e.g. 'nic') */
  key: string;
  /** Celebration folder name (all characters use 'celebration') */
  celebrationFolder: string;
  /** Directions available for tennis-swing (Lara has 4, opponents have all 8) */
  swingDirections: readonly string[];
}

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
      const framePath = `${basePath}/animations/celebration/${dir}/frame_00${i}.png`;
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

// ── Generic character sprite loading ─────────────────────────

/** Lara-specific config (celebration folder differs, fewer swing directions). */
const LARA_CONFIG: CharacterSpriteConfig = {
  basePath: 'sprites/lara',
  key: 'lara',
  celebrationFolder: 'celebration',
  swingDirections: ['north-east', 'north-west', 'east', 'west'],
};

/**
 * Build a CharacterSpriteConfig for a standard opponent character.
 * Standard opponents have all 8 swing directions and use the 'celebration' folder.
 */
function opponentConfig(key: string): CharacterSpriteConfig {
  return {
    basePath: `sprites/${key}`,
    key,
    celebrationFolder: 'celebration',
    swingDirections: DIRECTIONS,
  };
}

/**
 * Preload all sprites for a character (rotations, running, idle, swing, celebration).
 * Works for any opponent that follows the standard folder layout.
 */
export function preloadCharacterSprites(scene: Phaser.Scene, charKey: string): void {
  const cfg = charKey === 'lara' ? LARA_CONFIG : opponentConfig(charKey);
  const { basePath, key } = cfg;

  // Static rotations (all 8 directions)
  for (const dir of DIRECTIONS) {
    scene.load.image(`${key}-${dir}`, `${basePath}/rotations/${dir}.png`);
  }

  // Running (6 frames × 8 directions)
  for (const dir of DIRECTIONS) {
    for (let i = 0; i < 6; i++) {
      scene.load.image(`${key}-run-${dir}-${i}`, `${basePath}/animations/running-6-frames/${dir}/frame_00${i}.png`);
    }
  }

  // Breathing idle (4 frames × north/south)
  for (const dir of ['north', 'south'] as const) {
    for (let i = 0; i < 4; i++) {
      scene.load.image(`${key}-idle-${dir}-${i}`, `${basePath}/animations/breathing-idle/${dir}/frame_00${i}.png`);
    }
  }

  // Tennis swing (4 frames per direction, direction set varies)
  for (const dir of cfg.swingDirections) {
    for (let i = 0; i < 4; i++) {
      scene.load.image(`${key}-swing-${dir}-${i}`, `${basePath}/animations/tennis-swing/${dir}/frame_00${i}.png`);
    }
  }

  // Celebration (4 frames × north/south)
  for (const dir of ['north', 'south'] as const) {
    for (let i = 0; i < 4; i++) {
      scene.load.image(`${key}-celebrate-${dir}-${i}`, `${basePath}/animations/${cfg.celebrationFolder}/${dir}/frame_00${i}.png`);
    }
  }
}

/**
 * Create all animations for a character after sprites are loaded.
 * Works for any character that follows the standard naming.
 */
export function createCharacterAnimations(scene: Phaser.Scene, charKey: string): void {
  const cfg = charKey === 'lara' ? LARA_CONFIG : opponentConfig(charKey);
  const { key } = cfg;

  // Running (8 directions)
  for (const dir of DIRECTIONS) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 6; i++) {
      frames.push({ key: `${key}-run-${dir}-${i}` });
    }
    scene.anims.create({ key: `${key}-run-${dir}`, frames, frameRate: 12, repeat: -1 });
  }

  // Idle breathing (north/south)
  for (const dir of ['north', 'south'] as const) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 4; i++) {
      frames.push({ key: `${key}-idle-${dir}-${i}` });
    }
    scene.anims.create({ key: `${key}-idle-${dir}`, frames, frameRate: 4, repeat: -1, yoyo: true });
  }

  // Tennis swing (per direction)
  for (const dir of cfg.swingDirections) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 4; i++) {
      frames.push({ key: `${key}-swing-${dir}-${i}` });
    }
    scene.anims.create({ key: `${key}-swing-${dir}`, frames, frameRate: 16, repeat: 0 });
  }

  // Celebration (north/south)
  for (const dir of ['north', 'south'] as const) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 4; i++) {
      frames.push({ key: `${key}-celebrate-${dir}-${i}` });
    }
    scene.anims.create({ key: `${key}-celebrate-${dir}`, frames, frameRate: 6, repeat: -1, yoyo: true });
  }
}
