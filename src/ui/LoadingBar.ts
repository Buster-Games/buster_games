import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';

/**
 * Attaches a pixel-art loading bar to any scene's loader.
 * Call in preload() AFTER queueing assets, or at the start of preload().
 * The bar auto-destroys when loading completes.
 */
export function attachLoadingBar(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;

  // Bar dimensions
  const barW = Math.round(width * 0.6);
  const barH = 16;
  const x = Math.round((width - barW) / 2);
  const y = Math.round(height / 2);

  // "LOADING..." label
  const label = scene.add.text(width / 2, y - 24, 'LOADING...', {
    fontFamily: FONT,
    fontSize: '12px',
    color: PALETTE_HEX.cream,
  }).setOrigin(0.5, 0.5).setDepth(1000);

  // Border
  const border = scene.add.graphics().setDepth(1000);
  border.lineStyle(2, PALETTE.cream, 1);
  border.strokeRect(x, y - barH / 2, barW, barH);

  // Fill
  const fill = scene.add.graphics().setDepth(1000);

  scene.load.on('progress', (value: number) => {
    fill.clear();
    fill.fillStyle(PALETTE.gold, 1);
    fill.fillRect(x + 2, y - barH / 2 + 2, (barW - 4) * value, barH - 4);
  });

  scene.load.once('complete', () => {
    label.destroy();
    border.destroy();
    fill.destroy();
  });
}
