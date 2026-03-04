import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';
import {
  Ball,
  Player,
  Scoreboard,
  CourtGeometry,
  COURTS,
  DEFAULT_COURT_ID,
  resolveCourtPoints,
  preloadLaraSprites,
  createLaraAnimations,
  type Direction,
} from '../game/tennis';

/** Set to true to draw the court geometry overlay for coordinate calibration. */
const DEBUG_COURT = true;

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

  // Court geometry (perspective-correct trapezoid model)
  private courtGeometry!: CourtGeometry;

  // Which court to use (can be set via scene data)
  private courtId: string = DEFAULT_COURT_ID;

  // Track who hit the ball last (for correct out-of-bounds attribution)
  private lastHitter: 'player' | 'opponent' = 'player';

  // Perspective scaling
  private perspectiveScale!: (y: number) => number;

  constructor() {
    super({ key: 'TennisScene' });
  }

  preload(): void {
    // Accept court ID from scene data (e.g. this.scene.start('TennisScene', { courtId: 'grass-somerset' }))
    const data = this.scene.settings.data as Record<string, unknown> | undefined;
    if (data?.courtId && typeof data.courtId === 'string' && COURTS[data.courtId]) {
      this.courtId = data.courtId;
    }

    const courtDef = COURTS[this.courtId];

    // Court background
    this.load.image(courtDef.textureKey, courtDef.asset);

    // Tennis ball
    this.load.image('tennis-ball', 'items/tenis-ball.png');

    // Load all Lara sprites and animations
    preloadLaraSprites(this);
  }

  create(): void {
    const { width, height } = this.scale;

    // ── Court geometry (perspective-correct trapezoid) ────────
    // Points are defined per-court in src/game/tennis/courts.ts
    // Toggle DEBUG_COURT at the top of this file to see the overlay.
    const courtDef = COURTS[this.courtId];
    this.courtGeometry = new CourtGeometry(
      resolveCourtPoints(this.courtId, width, height),
    );

    // ── Perspective scaling setup ────────────────────────────
    const perspMinFactor = 0.55;

    this.perspectiveScale = (y: number): number => {
      const t = (y - this.courtGeometry.farY) / (this.courtGeometry.nearY - this.courtGeometry.farY);
      const clamped = Math.min(Math.max(t, 0), 1);
      return 0.65 * (perspMinFactor + (1 - perspMinFactor) * clamped);
    };

    // ── Court background ─────────────────────────────────────
    const court = this.add.image(width / 2, height / 2, courtDef.textureKey);
    const scaleX = width / court.width;
    const scaleY = height / court.height;
    const scale = Math.max(scaleX, scaleY);
    court.setScale(scale);
    court.setDepth(0);

    // ── Create animations ────────────────────────────────────
    createLaraAnimations(this);

    // ── Player (Lara) ────────────────────────────────────────
    const playerStart = this.courtGeometry.playerDefaultPosition();

    this.player = new Player({
      scene: this,
      x: playerStart.x,
      y: playerStart.y,
      spriteKey: 'lara',
    });
    this.player.perspectiveScale = this.perspectiveScale;
    this.player.clampPosition = (x, y) => this.courtGeometry.clampToPlayerSide(x, y);
    this.player.setScale(this.perspectiveScale(playerStart.y));

    // ── Opponent ─────────────────────────────────────────────
    const opponentStart = this.courtGeometry.opponentDefaultPosition();

    this.opponent = new Player({
      scene: this,
      x: opponentStart.x,
      y: opponentStart.y,
      spriteKey: 'lara',
      isOpponent: true,
      tint: 0xff8888,
    });
    this.opponent.perspectiveScale = this.perspectiveScale;
    this.opponent.clampPosition = (x, y) => this.courtGeometry.clampToOpponentSide(x, y);
    this.opponent.setScale(this.perspectiveScale(opponentStart.y));

    // ── Ball ─────────────────────────────────────────────────
    this.ball = new Ball({
      scene: this,
      x: playerStart.x + 30,
      y: playerStart.y - 20,
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
    this.scoreboard.onGameWon = (_winner) => {
      // Alternate server between games (traditional tennis rules)
      this.servingPlayer = this.servingPlayer === 'player' ? 'opponent' : 'player';
    };

    // Server also alternates when a set ends (the game that closed the set
    // doesn't fire onGameWon, so we handle it here too)
    this.scoreboard.onSetWon = (_winner) => {
      this.servingPlayer = this.servingPlayer === 'player' ? 'opponent' : 'player';
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

    // ── Debug overlay ────────────────────────────────────────
    if (DEBUG_COURT) {
      this._drawDebugOverlay();
    }
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
        // Restart match — player serves first
        this.servingPlayer = 'player';
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
    this.lastHitter = this.servingPlayer;

    // Clear any in-flight movement and reset to idle
    this.player.stop();
    this.opponent.stop();

    // Reset positions to default spots
    const playerPos = this.courtGeometry.playerDefaultPosition();
    const opponentPos = this.courtGeometry.opponentDefaultPosition();
    this.player.setPosition(playerPos.x, playerPos.y);
    this.opponent.setPosition(opponentPos.x, opponentPos.y);

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
      // Player serves to opponent's half
      const target = this.courtGeometry.randomPointInHalf('opponent', 15);
      this.lastHitter = 'player';

      this.ball.hit(target.x, target.y);
      this.player.swing(target.x >= this.player.x ? 'north-east' : 'north-west');
    } else {
      // Opponent serves to player's half
      const target = this.courtGeometry.randomPointInHalf('player', 15);
      this.lastHitter = 'opponent';

      this.ball.hit(target.x, target.y);
      this.opponent.swing(target.x >= this.opponent.x ? 'east' : 'west');
    }

    this.gameState = 'rally';
    this.rallyCount++;
  }

  /**
   * Handle ball landing.
   */
  private _onBallLand(x: number, y: number): void {
    if (this.gameState !== 'rally') return;

    // Check if ball landed out of bounds or in the net zone
    if (!this.courtGeometry.isInCourt(x, y)) {
      // Last hitter sent the ball out → point to the other player
      const winner = this.lastHitter === 'player' ? 'opponent' : 'player';
      this._scorePoint(winner);
      return;
    }

    // Determine who needs to return based on which side the ball landed
    const isOnPlayerSide = this.courtGeometry.isOnPlayerSide(x, y);

    if (isOnPlayerSide) {
      // Player needs to hit — move toward ball and show hit window
      this.player.moveTo(x, y + 30);
      this._startHitWindow(x, y);
    } else {
      // Opponent needs to hit — move toward ball (slightly behind, away from net)
      this.opponent.moveTo(x, y - 10);
      this._opponentHit(x, y);
    }
  }

  /**
   * Check if ball is out of bounds (outside the court trapezoid or in the net zone).
   */
  private _isBallOut(x: number, y: number): boolean {
    return !this.courtGeometry.isInCourt(x, y);
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

    // Calculate return shot into the opponent's half
    const target = this.courtGeometry.randomPointInHalf('opponent', 15);
    this.lastHitter = 'player';

    // Play swing animation based on which side the ball is going
    this.player.swing(target.x >= this.player.x ? 'north-east' : 'north-west');

    // Small delay before ball leaves
    this.time.delayedCall(150, () => {
      this.ball.hit(target.x, target.y);
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

      // Opponent returns into the player's half
      const target = this.courtGeometry.randomPointInHalf('player', 15);
      this.lastHitter = 'opponent';

      this.opponent.swing(target.x >= this.opponent.x ? 'east' : 'west');

      this.time.delayedCall(150, () => {
        this.ball.hit(target.x, target.y);
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
    // Server stays the same for the whole game; rotation happens in onGameWon / onSetWon.

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
   * Draw a semi-transparent overlay showing the court geometry for calibration.
   * Enable by setting DEBUG_COURT = true at the top of this file.
   */
  private _drawDebugOverlay(): void {
    const g = this.add.graphics();
    g.setDepth(999);
    const p = this.courtGeometry.points;
    const courtDef = COURTS[this.courtId];

    // Court name label (top-left below back button)
    this.add
      .text(20, 108, `COURT: ${courtDef.name}`, {
        fontFamily: FONT,
        fontSize: '8px',
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
      })
      .setDepth(999);

    // Draw outer court trapezoid (white)
    g.lineStyle(2, 0xffffff, 0.8);
    g.beginPath();
    g.moveTo(p.farLeft.x, p.farLeft.y);
    g.lineTo(p.farRight.x, p.farRight.y);
    g.lineTo(p.nearRight.x, p.nearRight.y);
    g.lineTo(p.nearLeft.x, p.nearLeft.y);
    g.closePath();
    g.strokePath();

    // Draw net zone (red band)
    g.lineStyle(2, 0xff0000, 0.8);
    g.beginPath();
    g.moveTo(p.netFarLeft.x, p.netFarLeft.y);
    g.lineTo(p.netFarRight.x, p.netFarRight.y);
    g.strokePath();
    g.beginPath();
    g.moveTo(p.netNearLeft.x, p.netNearLeft.y);
    g.lineTo(p.netNearRight.x, p.netNearRight.y);
    g.strokePath();

    // Fill net zone semi-transparent red
    g.fillStyle(0xff0000, 0.15);
    g.beginPath();
    g.moveTo(p.netFarLeft.x, p.netFarLeft.y);
    g.lineTo(p.netFarRight.x, p.netFarRight.y);
    g.lineTo(p.netNearRight.x, p.netNearRight.y);
    g.lineTo(p.netNearLeft.x, p.netNearLeft.y);
    g.closePath();
    g.fillPath();

    // Draw sidelines (yellow)
    g.lineStyle(1, 0xffff00, 0.5);
    g.beginPath();
    g.moveTo(p.farLeft.x, p.farLeft.y);
    g.lineTo(p.nearLeft.x, p.nearLeft.y);
    g.strokePath();
    g.beginPath();
    g.moveTo(p.farRight.x, p.farRight.y);
    g.lineTo(p.nearRight.x, p.nearRight.y);
    g.strokePath();

    // Draw dots at each key point with labels
    const pointEntries: [string, { x: number; y: number }][] = [
      ['farL', p.farLeft],
      ['farR', p.farRight],
      ['netFL', p.netFarLeft],
      ['netFR', p.netFarRight],
      ['netNL', p.netNearLeft],
      ['netNR', p.netNearRight],
      ['nearL', p.nearLeft],
      ['nearR', p.nearRight],
    ];

    for (const [label, pt] of pointEntries) {
      g.fillStyle(0x00ff00, 1);
      g.fillCircle(pt.x, pt.y, 4);
      this.add
        .text(pt.x + 6, pt.y - 8, `${label}\n${Math.round(pt.x)},${Math.round(pt.y)}`, {
          fontFamily: FONT,
          fontSize: '7px',
          color: '#00ff00',
        })
        .setDepth(999);
    }

    // Log tap coordinates to console for calibration
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log(`[DEBUG_COURT] tap at (${Math.round(pointer.x)}, ${Math.round(pointer.y)})`);
    });
  }

  /**
   * Random number in range.
   */
  private _randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
