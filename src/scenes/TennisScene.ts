import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';
import {
  Ball,
  Player,
  Scoreboard,
  preloadLaraSprites,
  createLaraAnimations,
  type Direction,
} from '../game/tennis';

/**
 * Game state for the tennis match.
 */
type GameState = 'serving' | 'rally' | 'point-over' | 'game-over';

/**
 * TennisScene — Core tennis gameplay.
 *
 * This is where the tennis match happens. The scene handles:
 *   - Court background rendering
 *   - Player (Lara) movement and swing
 *   - Ball physics and trajectory
 *   - Opponent AI
 *   - Scoring and match state
 *   - Tap-to-hit timing mechanic
 */
export class TennisScene extends Phaser.Scene {
  // Game objects
  private player!: Player;
  private opponent!: Player;
  private ball!: Ball;
  private scoreboard!: Scoreboard;

  // Game state
  private gameState: GameState = 'serving';
  private servingPlayer: 'player' | 'opponent' = 'player';
  private rallyCount = 0;

  // Timing mechanic
  private hitWindow = false;
  private hitWindowTimer: Phaser.Time.TimerEvent | null = null;
  private hitIndicator!: Phaser.GameObjects.Arc;

  // Court configuration
  private courtBounds = {
    left: 60,
    right: 330,
    top: 280,
    bottom: 720,
    netY: 450,
  };

  // Perspective scaling
  private perspectiveScale!: (y: number) => number;

  constructor() {
    super({ key: 'TennisScene' });
  }

  preload(): void {
    // Court background
    this.load.image('court-clay', 'backgrounds/courts/clay-fingal.png');

    // Tennis ball
    this.load.image('tennis-ball', 'items/tenis-ball.png');

    // Load all Lara sprites and animations
    preloadLaraSprites(this);
  }

  create(): void {
    const { width, height } = this.scale;

    // Update court bounds based on actual screen size
    this.courtBounds = {
      left: width * 0.15,
      right: width * 0.85,
      top: height * 0.32,
      bottom: height * 0.85,
      netY: height * 0.5,
    };

    // ── Perspective scaling setup ────────────────────────────
    const courtTopY = height * 0.3;
    const courtBottomY = height * 0.85;
    const perspMinFactor = 0.55;

    this.perspectiveScale = (y: number): number => {
      const t = (y - courtTopY) / (courtBottomY - courtTopY);
      const clamped = Math.min(Math.max(t, 0), 1);
      return 0.65 * (perspMinFactor + (1 - perspMinFactor) * clamped);
    };

    // ── Court background ─────────────────────────────────────
    const court = this.add.image(width / 2, height / 2, 'court-clay');
    const scaleX = width / court.width;
    const scaleY = height / court.height;
    const scale = Math.max(scaleX, scaleY);
    court.setScale(scale);
    court.setDepth(0);

    // ── Create animations ────────────────────────────────────
    createLaraAnimations(this);

    // ── Player (Lara) ────────────────────────────────────────
    const playerStartX = width / 2;
    const playerStartY = height * 0.8;

    this.player = new Player({
      scene: this,
      x: playerStartX,
      y: playerStartY,
      spriteKey: 'lara',
    });
    this.player.perspectiveScale = this.perspectiveScale;
    this.player.courtBounds = {
      left: this.courtBounds.left,
      right: this.courtBounds.right,
      top: this.courtBounds.netY + 20, // Player can't go past net
      bottom: this.courtBounds.bottom,
    };
    this.player.setScale(this.perspectiveScale(playerStartY));

    // ── Opponent ─────────────────────────────────────────────
    const opponentStartX = width / 2;
    const opponentStartY = height * 0.38;

    this.opponent = new Player({
      scene: this,
      x: opponentStartX,
      y: opponentStartY,
      spriteKey: 'lara',
      isOpponent: true,
      tint: 0xff8888,
    });
    this.opponent.perspectiveScale = this.perspectiveScale;
    this.opponent.courtBounds = {
      left: this.courtBounds.left,
      right: this.courtBounds.right,
      top: this.courtBounds.top,
      bottom: this.courtBounds.netY - 20, // Opponent can't go past net
    };
    this.opponent.setScale(this.perspectiveScale(opponentStartY));

    // ── Ball ─────────────────────────────────────────────────
    this.ball = new Ball({
      scene: this,
      x: playerStartX + 30,
      y: playerStartY - 20,
      scale: 0.1,
    });

    // Ball landing callback
    this.ball.onLand = (x: number, y: number) => {
      this._onBallLand(x, y);
    };

    // ── Hit indicator (shows timing window) ──────────────────
    this.hitIndicator = this.add.circle(0, 0, 40, PALETTE.gold, 0.3);
    this.hitIndicator.setVisible(false);
    this.hitIndicator.setDepth(10);

    // ── Scoreboard ───────────────────────────────────────────
    this.scoreboard = new Scoreboard({
      scene: this,
      width,
      playerName: 'LARA',
      opponentName: 'OPPONENT',
      gamesPerSet: 3,
    });

    // Score callbacks
    this.scoreboard.onGameWon = (winner) => {
      console.log(`Game won by ${winner}!`);
    };

    this.scoreboard.onMatchWon = (winner) => {
      console.log(`Match won by ${winner}!`);
      this.gameState = 'game-over';
      this._showMatchEnd(winner);
    };

    // ── Input handling ───────────────────────────────────────
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this._handleTap(pointer);
    });

    // ── Back button ──────────────────────────────────────────
    const backBtn = this.add
      .text(20, 20, '← BACK', {
        fontFamily: FONT,
        fontSize: '12px',
        color: PALETTE_HEX.cream,
        backgroundColor: PALETTE_HEX.nearBlack,
        padding: { x: 8, y: 4 },
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(300);

    backBtn.on('pointerdown', () => {
      this.scene.start('HomeScene');
    });

    // ── Start serving ────────────────────────────────────────
    this._startServe();
  }

  update(_time: number, delta: number): void {
    // Update player movements
    this.player.update(delta);
    this.opponent.update(delta);
  }

  /**
   * Handle tap input for serving and hitting.
   */
  private _handleTap(pointer: Phaser.Input.Pointer): void {
    // Ignore taps on UI area
    if (pointer.y < 110) return;

    switch (this.gameState) {
      case 'serving':
        this._serve();
        break;

      case 'rally':
        if (this.hitWindow) {
          this._playerHit();
        }
        break;

      case 'point-over':
        this._startServe();
        break;

      case 'game-over':
        // Restart match
        this.scoreboard.resetMatch();
        this._startServe();
        break;
    }
  }

  /**
   * Start serving sequence.
   */
  private _startServe(): void {
    this.gameState = 'serving';
    this.rallyCount = 0;

    const { width, height } = this.scale;

    // Clear any in-flight movement and reset to idle
    this.player.stop();
    this.opponent.stop();

    // Reset positions
    this.player.setPosition(width / 2, height * 0.8);
    this.opponent.setPosition(width / 2, height * 0.38);

    // Ball with server
    if (this.servingPlayer === 'player') {
      this.ball.setPosition(this.player.x + 30, this.player.y - 20);
    } else {
      this.ball.setPosition(this.opponent.x, this.opponent.y + 20);
    }

    this.ball.setVisible(true);
    this.hitIndicator.setVisible(false);
  }

  /**
   * Execute serve.
   */
  private _serve(): void {
    if (this.servingPlayer === 'player') {
      // Player serves to opponent's side
      const targetX = this._randomInRange(this.courtBounds.left + 50, this.courtBounds.right - 50);
      const targetY = this._randomInRange(this.courtBounds.top + 30, this.courtBounds.netY - 50);

      this.ball.hit(targetX, targetY);
      this.player.swing(targetX >= this.player.x ? 'north-east' : 'north-west');
    } else {
      // Opponent serves to player's side
      const targetX = this._randomInRange(this.courtBounds.left + 50, this.courtBounds.right - 50);
      const targetY = this._randomInRange(this.courtBounds.netY + 50, this.courtBounds.bottom - 30);

      this.ball.hit(targetX, targetY);
      this.opponent.swing(targetX >= this.opponent.x ? 'east' : 'west');
    }

    this.gameState = 'rally';
    this.rallyCount++;
  }

  /**
   * Handle ball landing.
   */
  private _onBallLand(x: number, y: number): void {
    if (this.gameState !== 'rally') return;

    // Check if ball is out
    if (this._isBallOut(x, y)) {
      // Point to the player who didn't hit it out
      const lastHitter = this.rallyCount % 2 === 1 ? 'player' : 'opponent';
      const winner = lastHitter === 'player' ? 'opponent' : 'player';
      this._scorePoint(winner);
      return;
    }

    // Determine who needs to hit
    const isOnPlayerSide = y > this.courtBounds.netY;

    if (isOnPlayerSide) {
      // Player needs to hit - move player and show hit window
      this.player.moveTo(x, y + 30);
      this._startHitWindow(x, y);
    } else {
      // Opponent needs to hit - AI takes over
      this.opponent.moveTo(x, y + 30);
      this._opponentHit(x, y);
    }
  }

  /**
   * Check if ball is out of bounds.
   */
  private _isBallOut(x: number, y: number): boolean {
    return (
      x < this.courtBounds.left ||
      x > this.courtBounds.right ||
      y < this.courtBounds.top ||
      y > this.courtBounds.bottom
    );
  }

  /**
   * Start the hit timing window for player.
   */
  private _startHitWindow(ballX: number, ballY: number): void {
    // Show hit indicator at ball location
    this.hitIndicator.setPosition(ballX, ballY);
    this.hitIndicator.setVisible(true);
    this.hitIndicator.setScale(1.5);
    this.hitIndicator.setAlpha(0.2);

    // Animate indicator contracting
    this.tweens.add({
      targets: this.hitIndicator,
      scale: 0.5,
      alpha: 0.6,
      duration: 600,
      ease: 'Sine.easeIn',
    });

    // Open hit window after delay (gives player time to see it coming)
    this.time.delayedCall(200, () => {
      this.hitWindow = true;
      this.hitIndicator.setFillStyle(PALETTE.green, 0.5);
    });

    // Close hit window after timing period
    this.hitWindowTimer = this.time.delayedCall(800, () => {
      this._missHit();
    });
  }

  /**
   * Player successfully hits the ball.
   */
  private _playerHit(): void {
    if (!this.hitWindow) return;

    this.hitWindow = false;
    this.hitIndicator.setVisible(false);

    if (this.hitWindowTimer) {
      this.hitWindowTimer.destroy();
      this.hitWindowTimer = null;
    }

    // Calculate return shot first so swing direction matches ball direction
    const targetX = this._randomInRange(this.courtBounds.left + 50, this.courtBounds.right - 50);
    const targetY = this._randomInRange(this.courtBounds.top + 30, this.courtBounds.netY - 50);

    // Play swing animation based on which side the ball is going
    this.player.swing(targetX >= this.player.x ? 'north-east' : 'north-west');

    // Small delay before ball leaves
    this.time.delayedCall(150, () => {
      this.ball.hit(targetX, targetY);
      this.rallyCount++;
    });
  }

  /**
   * Player missed the hit window.
   */
  private _missHit(): void {
    this.hitWindow = false;
    this.hitIndicator.setVisible(false);
    this.hitWindowTimer = null;

    // Point to opponent
    this._scorePoint('opponent');
  }

  /**
   * Opponent AI hits the ball back.
   */
  private _opponentHit(ballX: number, ballY: number): void {
    // Delay for opponent to "reach" the ball
    const reachDelay = 400 + Math.random() * 200;

    this.time.delayedCall(reachDelay, () => {
      if (this.gameState !== 'rally') return;

      // Check if opponent can reach (simple probability based on distance)
      const distToOpponent = Math.abs(ballX - this.opponent.x) + Math.abs(ballY - this.opponent.y);
      const reachChance = Math.max(0.3, 1 - distToOpponent / 400);

      if (Math.random() > reachChance) {
        // Opponent missed
        this._scorePoint('player');
        return;
      }

      // Opponent returns
      const targetX = this._randomInRange(this.courtBounds.left + 50, this.courtBounds.right - 50);
      const targetY = this._randomInRange(this.courtBounds.netY + 50, this.courtBounds.bottom - 30);

      this.opponent.swing(targetX >= this.opponent.x ? 'east' : 'west');

      this.time.delayedCall(150, () => {
        this.ball.hit(targetX, targetY);
        this.rallyCount++;
      });
    });
  }

  /**
   * Score a point.
   */
  private _scorePoint(winner: 'player' | 'opponent'): void {
    this.gameState = 'point-over';
    this.scoreboard.scorePoint(winner);

    // Alternate server
    this.servingPlayer = this.servingPlayer === 'player' ? 'opponent' : 'player';

    // Play celebration for the winner
    if (winner === 'player') {
      this.player.celebrate();
    } else {
      this.opponent.celebrate();
    }

    // Show point result briefly
    const { width, height } = this.scale;
    const resultText = this.add
      .text(width / 2, height / 2, winner === 'player' ? 'POINT!' : 'FAULT', {
        fontFamily: FONT,
        fontSize: '24px',
        color: winner === 'player' ? PALETTE_HEX.green : PALETTE_HEX.pink,
      })
      .setOrigin(0.5)
      .setDepth(500);

    this.tweens.add({
      targets: resultText,
      alpha: 0,
      y: height / 2 - 50,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => resultText.destroy(),
    });
  }

  /**
   * Show match end screen.
   */
  private _showMatchEnd(winner: 'player' | 'opponent'): void {
    const { width, height } = this.scale;

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(PALETTE.nearBlack, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(400);

    // Result text
    const resultText =
      winner === 'player' ? 'YOU WIN!' : 'GAME OVER';
    const resultColor =
      winner === 'player' ? PALETTE_HEX.gold : PALETTE_HEX.pink;

    this.add
      .text(width / 2, height / 2 - 40, resultText, {
        fontFamily: FONT,
        fontSize: '28px',
        color: resultColor,
      })
      .setOrigin(0.5)
      .setDepth(500);

    this.add
      .text(width / 2, height / 2 + 20, 'TAP TO PLAY AGAIN', {
        fontFamily: FONT,
        fontSize: '12px',
        color: PALETTE_HEX.cream,
      })
      .setOrigin(0.5)
      .setDepth(500);
  }

  /**
   * Random number in range.
   */
  private _randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
