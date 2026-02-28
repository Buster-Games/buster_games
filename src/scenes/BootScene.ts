import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';

/**
 * BootScene — the first scene that launches.
 *
 * Currently acts as a splash screen. In later tickets this will:
 *   1. Preload all game assets
 *   2. Show a loading bar
 *   3. Transition to HomeScene once loading is complete
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // ── Background ───────────────────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, PALETTE.nearBlack);

    // ── Decorative pixel border ──────────────────────────────
    const border = this.add.graphics();
    border.lineStyle(3, PALETTE.accentBlue, 1);
    border.strokeRect(12, 12, width - 24, height - 24);
    border.lineStyle(1, PALETTE.periwinkle, 0.5);
    border.strokeRect(18, 18, width - 36, height - 36);

    // ── Corner accents ───────────────────────────────────────
    this._drawCornerAccents(width, height);

    // ── Title ────────────────────────────────────────────────
    this.add
      .text(width / 2, height * 0.30, 'BUSTER\nGAMES', {
        fontFamily: FONT,
        fontSize: '36px',
        color: PALETTE_HEX.cream,
        align: 'center',
        lineSpacing: 20,
        stroke: PALETTE_HEX.accentBlue,
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // ── Subtitle ─────────────────────────────────────────────
    this.add
      .text(width / 2, height * 0.50, '♥  for lara  ♥', {
        fontFamily: FONT,
        fontSize: '11px',
        color: PALETTE_HEX.tan,
        align: 'center',
      })
      .setOrigin(0.5);

    // ── Divider ──────────────────────────────────────────────
    const divider = this.add.graphics();
    divider.lineStyle(1, PALETTE.tan, 0.6);
    divider.lineBetween(width * 0.2, height * 0.56, width * 0.8, height * 0.56);

    // ── Tap to start (blinking) ──────────────────────────────
    const tapText = this.add
      .text(width / 2, height * 0.72, 'TAP TO START', {
        fontFamily: FONT,
        fontSize: '13px',
        color: PALETTE_HEX.accentBlue,
        align: 'center',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: tapText,
      alpha: 0,
      duration: 550,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
    });

    // ── Version watermark ────────────────────────────────────
    this.add
      .text(width / 2, height - 28, 'v0.1.0', {
        fontFamily: FONT,
        fontSize: '7px',
        color: PALETTE_HEX.darkGrey,
      })
      .setOrigin(0.5);

    // ── Input — tap anywhere to proceed (wired up in later tickets) ──
    this.input.once('pointerdown', () => {
      // TODO (HomeScene ticket): this.scene.start('HomeScene');
      tapText.setText('COMING SOON!');
      tapText.setAlpha(1);
      this.tweens.killTweensOf(tapText);
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private _drawCornerAccents(width: number, height: number): void {
    const g = this.add.graphics();
    g.lineStyle(3, PALETTE.tan, 1);
    const size = 16;
    const pad = 12;

    // Top-left
    g.beginPath();
    g.moveTo(pad, pad + size);
    g.lineTo(pad, pad);
    g.lineTo(pad + size, pad);
    g.strokePath();

    // Top-right
    g.beginPath();
    g.moveTo(width - pad - size, pad);
    g.lineTo(width - pad, pad);
    g.lineTo(width - pad, pad + size);
    g.strokePath();

    // Bottom-left
    g.beginPath();
    g.moveTo(pad, height - pad - size);
    g.lineTo(pad, height - pad);
    g.lineTo(pad + size, height - pad);
    g.strokePath();

    // Bottom-right
    g.beginPath();
    g.moveTo(width - pad - size, height - pad);
    g.lineTo(width - pad, height - pad);
    g.lineTo(width - pad, height - pad - size);
    g.strokePath();
  }
}
