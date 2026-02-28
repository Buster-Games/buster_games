import Phaser from 'phaser';
import { HomeScene } from './scenes/HomeScene';

/**
 * Phaser game configuration.
 *
 * Design resolution: 390 × 844 (iPhone 14 logical pixels — a safe portrait baseline).
 * Phaser's Scale.FIT will letterbox / pillarbox on other devices while keeping
 * the game content centred and pixel-perfect.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,          // WebGL with Canvas fallback
  backgroundColor: '#596674', // Brazilian Afternoon near-black — no flash on load
  pixelArt: true,             // disables texture anti-aliasing for crisp pixels

  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },

  // Scenes are started in order; only the first is launched automatically
  scene: [HomeScene],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game(config);
