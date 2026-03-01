import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';

/**
 * TennisScene — Core tennis gameplay.
 *
 * This is where the tennis match happens. The scene handles:
 *   - Court background rendering
 *   - Player (Lara) movement and swing
 *   - Ball physics and trajectory
 *   - Opponent AI
 *   - Scoring and match state
 */
export class TennisScene extends Phaser.Scene {
  // Court bounds (will be configured based on background)
  private courtBounds = {
    left: 50,
    right: 340,
    top: 200,
    bottom: 700,
    netY: 400,
  };

  constructor() {
    super({ key: 'TennisScene' });
  }

  preload(): void {
    // Court background
    this.load.image('court-clay', 'backgrounds/courts/clay-fingal.png');

    // Tennis ball
    this.load.image('tennis-ball', 'items/tenis-ball.png');

    // Lara static sprites (we'll load animations separately)
    this.load.image('lara-north', 'sprites/lara/rotations/north.png');
    this.load.image('lara-south', 'sprites/lara/rotations/south.png');
    this.load.image('lara-east', 'sprites/lara/rotations/east.png');
    this.load.image('lara-west', 'sprites/lara/rotations/west.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // ── Court background ─────────────────────────────────────
    const court = this.add.image(width / 2, height / 2, 'court-clay');
    // Scale to cover the screen
    const scaleX = width / court.width;
    const scaleY = height / court.height;
    const scale = Math.max(scaleX, scaleY);
    court.setScale(scale);

    // Characters scale proportionally to the court so they stay correctly
    // sized regardless of the court image's pixel dimensions.
    // Adjust this ratio to make characters larger or smaller relative to the court.
    const charScale = scale * 0.65;

    // Perspective scaling: characters closer to the camera (lower Y) appear larger.
    // courtTopY / courtBottomY define the play area in screen-space.
    // At the bottom baseline a character renders at full charScale;
    // at the top baseline it renders at perspMinFactor * charScale.
    const courtTopY = height * 0.3;
    const courtBottomY = height * 0.85;
    const perspMinFactor = 0.75; // opponent is ~55% the size of the player
    const perspectiveCharScale = (y: number): number => {
      const t = (y - courtTopY) / (courtBottomY - courtTopY); // 0 at top, 1 at bottom
      const clamped = Math.min(Math.max(t, 0), 1);
      return charScale * (perspMinFactor + (1 - perspMinFactor) * clamped);
    };

    // ── Player (Lara) — placeholder position ─────────────────
    // Lara starts at bottom center of court, facing north (toward opponent)
    const playerStartX = width / 2;
    const playerStartY = height * 0.8;

    const player = this.add.image(playerStartX, playerStartY, 'lara-north');
    player.setScale(perspectiveCharScale(playerStartY));

    // ── Opponent — placeholder ───────────────────────────────
    // Opponent at top of court, facing south (toward Lara)
    const opponentStartX = width / 2;
    const opponentStartY = height * 0.41;

    // Using Lara sprite flipped as placeholder opponent
    const opponent = this.add.image(opponentStartX, opponentStartY, 'lara-south');
    opponent.setScale(perspectiveCharScale(opponentStartY));
    opponent.setTint(0xff8888); // Red tint to distinguish from player

    // ── Tennis ball — starts with server ─────────────────────
    const ball = this.add.image(playerStartX + 30, playerStartY - 20, 'tennis-ball');
    ball.setScale(0.1);

    // ── Scoreboard UI ────────────────────────────────────────
    this._createScoreboard(width);

    // ── Tap to hit (temporary test) ──────────────────────────
    this.input.on('pointerdown', () => {
      console.log('Tap to hit!');
      // TODO: Implement timing-based hit mechanic
    });

    // ── Back button (temporary for testing) ──────────────────
    const backBtn = this.add
      .text(20, 20, '← BACK', {
        fontFamily: FONT,
        fontSize: '12px',
        color: PALETTE_HEX.cream,
        backgroundColor: PALETTE_HEX.nearBlack,
        padding: { x: 8, y: 4 },
      })
      .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.scene.start('HomeScene');
    });
  }

  /**
   * Creates the scoreboard overlay at the top of the screen.
   */
  private _createScoreboard(width: number): void {
    // Semi-transparent background bar
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(PALETTE.nearBlack, 0.8);
    scoreBg.fillRect(0, 50, width, 50);

    // Player names
    this.add
      .text(20, 60, 'LARA', {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.cream,
      });

    this.add
      .text(width - 20, 60, 'OPPONENT', {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.pink,
      })
      .setOrigin(1, 0);

    // Score display (placeholder: 0-0)
    this.add
      .text(width / 2, 60, '0 - 0', {
        fontFamily: FONT,
        fontSize: '14px',
        color: PALETTE_HEX.gold,
      })
      .setOrigin(0.5, 0);

    // Set/Game indicator
    this.add
      .text(width / 2, 80, 'SET 1  |  GAME 1', {
        fontFamily: FONT,
        fontSize: '8px',
        color: PALETTE_HEX.lightGrey,
      })
      .setOrigin(0.5, 0);
  }
}
