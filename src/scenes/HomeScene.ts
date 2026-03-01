import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';

/**
 * HomeScene — Main menu / game selection screen.
 *
 * Displays:
 *   - Van-on-beach background (Lara & Asier on Buster at the beach)
 *   - "BUSTER GAMES" title with retro flicker tween
 *   - Birthday message subtitle
 *   - Game selection buttons
 */
export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' });
  }

  preload(): void {
    this.load.image('home-beach', 'backgrounds/home-beach.png');
    this.load.image('icon-racquet', 'items/pink-tennis-racquet.png');
    this.load.image('icon-van', 'items/retro-van-transparrent.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // ── Background image ─────────────────────────────────────
    const bg = this.add.image(width / 2, height / 2, 'home-beach');
    // Scale to cover the full screen
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);

    // ── Title: BUSTER GAMES at top ───────────────────────────
    const title = this.add
      .text(width / 2, 50, 'BUSTER GAMES', {
        fontFamily: FONT,
        fontSize: '28px',
        color: PALETTE_HEX.cream,
        align: 'center',
        stroke: PALETTE_HEX.nearBlack,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Retro flicker tween — subtle brightness variation
    this._addRetroFlicker(title);

    // ── Subtitle: Birthday message ───────────────────────────
    this.add
      .text(width / 2, 85, 'Happy Birthday Lara', {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.gold,
        align: 'center',
        stroke: PALETTE_HEX.nearBlack,
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 105, 'love you lots xoxo', {
        fontFamily: FONT,
        fontSize: '9px',
        color: PALETTE_HEX.pink,
        align: 'center',
        stroke: PALETTE_HEX.nearBlack,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // ── Game selection buttons (just under middle) ───────────
    this._createGameButton(
      width / 2,
      height * 0.52,
      'LOVE AT\nFIRST SERVE',
      'icon-racquet',
      true,
      () => {
        this.scene.start('TennisScene');
      }
    );

    this._createGameButton(
      width / 2,
      height * 0.65,
      'BUSTER\nDRIVES',
      'icon-van',
      false,
      () => {
        // TODO: Navigate to ComingSoonScene
        console.log('Buster Drives selected');
      }
    );

    // ── Version watermark ────────────────────────────────────
    this.add
      .text(width / 2, height - 20, 'v0.1.0', {
        fontFamily: FONT,
        fontSize: '7px',
        color: PALETTE_HEX.cream,
        stroke: PALETTE_HEX.nearBlack,
        strokeThickness: 2,
      })
      .setOrigin(0.5);
  }

  // ── Helpers ────────────────────────────────────────────────────────

  /**
   * Adds a retro CRT-style flicker effect to text.
   * Subtle alpha and scale variations create an old-TV feel.
   */
  private _addRetroFlicker(target: Phaser.GameObjects.Text): void {
    // Primary flicker — subtle alpha pulse
    this.tweens.add({
      targets: target,
      alpha: { from: 1, to: 0.92 },
      duration: 80,
      ease: 'Stepped',
      easeParams: [2],
      yoyo: true,
      repeat: -1,
      repeatDelay: 2000 + Math.random() * 3000,
    });

    // Secondary flicker — occasional micro-jitter
    this.time.addEvent({
      delay: 3000 + Math.random() * 2000,
      callback: () => {
        // Quick horizontal jitter
        this.tweens.add({
          targets: target,
          x: target.x + (Math.random() > 0.5 ? 1 : -1),
          duration: 30,
          yoyo: true,
          repeat: 1,
        });
      },
      loop: true,
    });
  }

  /**
   * Creates a styled game selection button with depth and animations.
   */
  private _createGameButton(
    x: number,
    y: number,
    label: string,
    iconKey: string,
    enabled: boolean,
    onTap: () => void
  ): void {
    const buttonWidth = 280;
    const buttonHeight = 90;

    // Container for all button elements (for floating animation)
    const container = this.add.container(x, y);

    // Drop shadow (offset below and darker)
    const shadow = this.add.graphics();
    shadow.fillStyle(PALETTE.nearBlack, 0.5);
    shadow.fillRoundedRect(-buttonWidth / 2 + 4, -buttonHeight / 2 + 4, buttonWidth, buttonHeight, 10);
    container.add(shadow);

    // Main button background with gradient-like shading
    const bg = this.add.graphics();
    this._drawStyledButton(bg, buttonWidth, buttonHeight, enabled, false);
    container.add(bg);

    // Inner highlight (top edge glow)
    const highlight = this.add.graphics();
    highlight.lineStyle(2, enabled ? PALETTE.skyBlue : PALETTE.lightGrey, 0.4);
    highlight.beginPath();
    highlight.arc(-buttonWidth / 2 + 10, -buttonHeight / 2 + 10, 10, Math.PI, Math.PI * 1.5);
    highlight.lineTo(buttonWidth / 2 - 10, -buttonHeight / 2);
    highlight.arc(buttonWidth / 2 - 10, -buttonHeight / 2 + 10, 10, Math.PI * 1.5, 0);
    highlight.strokePath();
    container.add(highlight);

    // Button label
    const textColor = enabled ? PALETTE_HEX.cream : PALETTE_HEX.midGrey;
    const labelText = this.add
      .text(15, 0, label, {
        fontFamily: FONT,
        fontSize: '14px',
        color: textColor,
        align: 'center',
        lineSpacing: 6,
        stroke: enabled ? PALETTE_HEX.darkBlue : undefined,
        strokeThickness: enabled ? 2 : 0,
      })
      .setOrigin(0.5);
    container.add(labelText);

    // Icon image
    const icon = this.add.image(-buttonWidth / 2 + 45, 0, iconKey);
    const iconScale = Math.min(60 / icon.width, 60 / icon.height);
    icon.setScale(iconScale);
    if (!enabled) {
      icon.setAlpha(0.5);
    }
    container.add(icon);

    // "Coming Soon" badge for disabled buttons
    if (!enabled) {
      const badge = this.add
        .text(buttonWidth / 2 - 10, -buttonHeight / 2 + 10, 'SOON', {
          fontFamily: FONT,
          fontSize: '8px',
          color: PALETTE_HEX.nearBlack,
          backgroundColor: PALETTE_HEX.gold,
          padding: { x: 4, y: 2 },
        })
        .setOrigin(1, 0);
      container.add(badge);
    }

    // Floating animation for all buttons
    this.tweens.add({
      targets: container,
      y: y - 3,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Subtle shadow pulse synced with float
    this.tweens.add({
      targets: shadow,
      alpha: 0.3,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Hit area for interaction
    const hitArea = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: enabled });
    container.add(hitArea);

    if (enabled) {
      hitArea.on('pointerover', () => {
        this._drawStyledButton(bg, buttonWidth, buttonHeight, enabled, true);
        this.tweens.add({
          targets: container,
          scaleX: 1.02,
          scaleY: 1.02,
          duration: 100,
          ease: 'Back.easeOut',
        });
      });

      hitArea.on('pointerout', () => {
        this._drawStyledButton(bg, buttonWidth, buttonHeight, enabled, false);
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: 'Back.easeOut',
        });
      });

      hitArea.on('pointerdown', () => {
        this.tweens.add({
          targets: container,
          scaleX: 0.97,
          scaleY: 0.97,
          duration: 50,
          yoyo: true,
          onComplete: onTap,
        });
      });
    }
  }

  /**
   * Draws a styled button with layered appearance.
   */
  private _drawStyledButton(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    enabled: boolean,
    hovered: boolean
  ): void {
    graphics.clear();

    const bgColor = enabled
      ? hovered
        ? PALETTE.lightBlue
        : PALETTE.blue
      : PALETTE.darkGrey;
    const borderColor = enabled ? PALETTE.cream : PALETTE.midGrey;
    const innerBorderColor = enabled
      ? hovered
        ? PALETTE.aqua
        : PALETTE.darkBlue
      : PALETTE.brownGrey;

    // Main fill with transparency
    graphics.fillStyle(bgColor, enabled ? 0.85 : 0.6);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 10);

    // Bottom/right edge (darker, for depth)
    graphics.lineStyle(3, innerBorderColor, 0.8);
    graphics.beginPath();
    graphics.moveTo(width / 2 - 10, height / 2);
    graphics.lineTo(-width / 2 + 10, height / 2);
    graphics.arc(-width / 2 + 10, height / 2 - 10, 10, Math.PI / 2, Math.PI);
    graphics.lineTo(-width / 2, -height / 2 + 10);
    graphics.strokePath();

    // Outer border
    graphics.lineStyle(3, borderColor, 1);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    // Inner glow line (subtle)
    if (enabled) {
      graphics.lineStyle(1, PALETTE.white, 0.15);
      graphics.strokeRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 8);
    }
  }
}
