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
  preloadCharacterSprites,
  createCharacterAnimations,
  type Direction,
} from '../game/tennis';
import { sampleMaxHits, shouldOpponentMiss, type DifficultyLevel } from '../game/tennis/Difficulty';

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

  // Doubles mode
  private isDoubles = false;
  private opponent2!: Player;
  private opponent2Key = '';
  private opponent2Name = '';
  /** Which side each opponent covers. Swapped after every set. */
  private opp1Side: 'left' | 'right' = 'left';
  private opp2Side: 'left' | 'right' = 'right';
  private pendingOpponent2Hit: Phaser.Time.TimerEvent | null = null;

  // Game state
  private gameState: GameState = 'serving';
  private servingPlayer: 'player' | 'opponent' = 'player';
  private rallyCount = 0;
  // Points played in the current game — drives deuce/ad court selection (even → deuce, odd → ad).
  private pointsPlayedInGame = 0;

  // Difficulty — controls how many shots the opponent can return per point
  private difficulty: DifficultyLevel = 'medium';
  private opponentHitCount = 0;
  private maxHitsThisPoint = 8;

  // Timing mechanic
  private hitWindow = false;
  private hitWindowTimer: Phaser.Time.TimerEvent | null = null;
  private hitWindowEnableTimer: Phaser.Time.TimerEvent | null = null;
  private hitIndicator!: Phaser.GameObjects.Arc;

  // Delayed-call guards — prevent stale ball.hit() / opponent callbacks
  private pendingBallHit: Phaser.Time.TimerEvent | null = null;
  private pendingOpponentHit: Phaser.Time.TimerEvent | null = null;

  // Match-end overlay (tracked so it can be torn down on restart)
  private matchEndObjects: Phaser.GameObjects.GameObject[] = [];
  private _matchWinner: 'player' | 'opponent' = 'player';

  // Court geometry (perspective-correct trapezoid model)
  private courtGeometry!: CourtGeometry;

  // Which court to use (can be set via scene data)
  private courtId: string = DEFAULT_COURT_ID;

  // Opponent configuration (set via scene data from QuickMatchScene)
  private opponentKey = 'nic';
  private opponentName = 'OPPONENT';
  private setsToWin = 2;

  // Return-to-scene config (campaign / quick match integration)
  private returnScene = 'GameModeScene';
  private returnData: Record<string, unknown> = {};

  // Track who hit the ball last (for correct out-of-bounds attribution)
  private lastHitter: 'player' | 'opponent' = 'player';

  // Perspective scaling
  private perspectiveScale!: (y: number) => number;

  constructor() {
    super({ key: 'TennisScene' });
  }

  preload(): void {
    // Accept config from scene data (e.g. this.scene.start('TennisScene', { courtId, opponentKey, ... }))
    const data = this.scene.settings.data as Record<string, unknown> | undefined;
    if (data?.courtId && typeof data.courtId === 'string' && COURTS[data.courtId]) {
      this.courtId = data.courtId;
    }
    if (data?.opponentKey && typeof data.opponentKey === 'string') {
      this.opponentKey = data.opponentKey;
    }
    if (data?.opponentName && typeof data.opponentName === 'string') {
      this.opponentName = data.opponentName;
    }
    if (data?.setsToWin && typeof data.setsToWin === 'number') {
      this.setsToWin = data.setsToWin;
    }
    if (data?.difficulty && typeof data.difficulty === 'string') {
      this.difficulty = data.difficulty as DifficultyLevel;
    }
    if (data?.returnScene && typeof data.returnScene === 'string') {
      this.returnScene = data.returnScene;
    }
    if (data?.returnData && typeof data.returnData === 'object') {
      this.returnData = data.returnData as Record<string, unknown>;
    }
    this.isDoubles = data?.isDoubles === true;
    if (this.isDoubles) {
      if (data?.opponent2Key && typeof data.opponent2Key === 'string') {
        this.opponent2Key = data.opponent2Key;
      }
      if (data?.opponent2Name && typeof data.opponent2Name === 'string') {
        this.opponent2Name = data.opponent2Name;
      }
      // Reset side assignments
      this.opp1Side = 'left';
      this.opp2Side = 'right';
    }

    const courtDef = COURTS[this.courtId];

    // Court background
    this.load.image(courtDef.textureKey, courtDef.asset);

    // Tennis ball
    this.load.image('tennis-ball', 'items/tenis-ball.png');

    // Load all Lara sprites and animations
    preloadLaraSprites(this);

    // Load opponent sprites
    preloadCharacterSprites(this, this.opponentKey);

    // Load opponent 2 sprites (doubles)
    if (this.isDoubles && this.opponent2Key) {
      preloadCharacterSprites(this, this.opponent2Key);
    }
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
    createCharacterAnimations(this, this.opponentKey);
    if (this.isDoubles && this.opponent2Key) {
      createCharacterAnimations(this, this.opponent2Key);
    }

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
    this.player.sizeMultiplier = 1.5;
    this.player.setScale(this.perspectiveScale(playerStart.y));

    // ── Opponent(s) ──────────────────────────────────────────
    if (this.isDoubles) {
      // In doubles: each opponent is clamped to their half
      const opp1Pos = this.courtGeometry.opponentHalfBaselinePosition(this.opp1Side);
      this.opponent = new Player({
        scene: this,
        x: opp1Pos.x,
        y: opp1Pos.y,
        spriteKey: this.opponentKey,
        isOpponent: true,
      });
      this.opponent.perspectiveScale = this.perspectiveScale;
      this.opponent.clampPosition = (x, y) => this.courtGeometry.clampToOpponentHalf(x, y, this.opp1Side);
      this.opponent.sizeMultiplier = 2.5;
      this.opponent.setScale(this.perspectiveScale(opp1Pos.y));

      const opp2Pos = this.courtGeometry.opponentHalfBaselinePosition(this.opp2Side);
      this.opponent2 = new Player({
        scene: this,
        x: opp2Pos.x,
        y: opp2Pos.y,
        spriteKey: this.opponent2Key,
        isOpponent: true,
      });
      this.opponent2.perspectiveScale = this.perspectiveScale;
      this.opponent2.clampPosition = (x, y) => this.courtGeometry.clampToOpponentHalf(x, y, this.opp2Side);
      this.opponent2.sizeMultiplier = 2.5;
      this.opponent2.setScale(this.perspectiveScale(opp2Pos.y));
    } else {
      const opponentStart = this.courtGeometry.opponentDefaultPosition();
      this.opponent = new Player({
        scene: this,
        x: opponentStart.x,
        y: opponentStart.y,
        spriteKey: this.opponentKey,
        isOpponent: true,
      });
      this.opponent.perspectiveScale = this.perspectiveScale;
      this.opponent.clampPosition = (x, y) => this.courtGeometry.clampToOpponentSide(x, y);
      this.opponent.sizeMultiplier = 2.5;
      this.opponent.setScale(this.perspectiveScale(opponentStart.y));
    }

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
    const oppDisplayName = this.isDoubles
      ? `${this.opponentName} & ${this.opponent2Name}`
      : this.opponentName;
    this.scoreboard = new Scoreboard({
      scene: this,
      width,
      playerName: 'LARA',
      opponentName: oppDisplayName,
      gamesPerSet: 3,
      setsToWin: this.setsToWin,
    });

    // Score callbacks
    this.scoreboard.onGameWon = (_winner) => {
      // Alternate server between games (traditional tennis rules)
      this.servingPlayer = this.servingPlayer === 'player' ? 'opponent' : 'player';
      // Each new game restarts from the deuce court (right side)
      this.pointsPlayedInGame = 0;
    };

    // Server also alternates when a set ends (the game that closed the set
    // doesn't fire onGameWon, so we handle it here too)
    this.scoreboard.onSetWon = (_winner) => {
      this.servingPlayer = this.servingPlayer === 'player' ? 'opponent' : 'player';
      this.pointsPlayedInGame = 0;

      // Doubles: swap which half each opponent covers after every set
      if (this.isDoubles) {
        const tmp = this.opp1Side;
        this.opp1Side = this.opp2Side;
        this.opp2Side = tmp;
        // Update clamp functions so movement stays in the new half
        this.opponent.clampPosition = (x, y) => this.courtGeometry.clampToOpponentHalf(x, y, this.opp1Side);
        this.opponent2.clampPosition = (x, y) => this.courtGeometry.clampToOpponentHalf(x, y, this.opp2Side);
      }
    };

    this.scoreboard.onMatchWon = (winner) => {
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
      this.scene.start('GameModeScene');
    });

    // ── Debug SKIP button (campaign only) ────────────────────
    const isCampaign = this.returnScene !== 'GameModeScene';
    if (isCampaign) {
      const skipBtn = this.add
        .text(width - 20, 20, 'SKIP ▶', {
          fontFamily: FONT,
          fontSize: '12px',
          color: PALETTE_HEX.gold,
          backgroundColor: PALETTE_HEX.nearBlack,
          padding: { x: 8, y: 4 },
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(300);

      skipBtn.on('pointerdown', () => {
        if (this.gameState === 'game-over') return;
        this._cancelHitWindow();
        this._cancelPendingTimers();
        this.ball.stop();
        this.gameState = 'game-over';
        this._matchWinner = 'player';
        this._showMatchEnd('player');
      });
    }

    // ── Start serving ────────────────────────────────────────
    this._startServe();

  }

  update(_time: number, delta: number): void {
    // Update player movements
    this.player.update(delta);
    this.opponent.update(delta);
    if (this.isDoubles) {
      this.opponent2.update(delta);
    }
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
        if (this.returnScene !== 'GameModeScene') {
          // Campaign mode — return result to caller
          this.scene.start(this.returnScene, {
            ...this.returnData,
            matchResult: this._matchWinner,
          });
        } else {
          // Quick match — restart
          this._destroyMatchEndOverlay();
          this.servingPlayer = 'player';
          this.pointsPlayedInGame = 0;
          if (this.isDoubles) {
            this.opp1Side = 'left';
            this.opp2Side = 'right';
            this.opponent.clampPosition = (x, y) => this.courtGeometry.clampToOpponentHalf(x, y, this.opp1Side);
            this.opponent2.clampPosition = (x, y) => this.courtGeometry.clampToOpponentHalf(x, y, this.opp2Side);
          }
          this.scoreboard.resetMatch();
          this._startServe();
        }
        break;
    }
  }

  /**
   * Start serving sequence.
   */
  private _startServe(): void {
    this.gameState = 'serving';
    this.rallyCount = 0;
    this.opponentHitCount = 0;
    this.maxHitsThisPoint = sampleMaxHits(this.difficulty);
    this.lastHitter = this.servingPlayer;

    // ── Clean up ALL rally state ─────────────────────────────
    this._cancelHitWindow();
    this._cancelPendingTimers();
    this.ball.stop(); // cancel any in-flight ball tween

    // Clear any in-flight movement and reset to idle
    this.player.stop();
    this.opponent.stop();
    if (this.isDoubles) {
      this.opponent2.stop();
    }

    // Position players on the correct service court side (deuce = right, ad = left)
    const serveSide = this._getServeSide();
    const playerPos = this.courtGeometry.servePosition('player', serveSide);
    this.player.setPosition(playerPos.x, playerPos.y);

    if (this.isDoubles) {
      // Determine which player side Lara is on:
      // deuce → Lara is on screen-right → diagonal opponent side is screen-left
      // ad → Lara is on screen-left → diagonal opponent side is screen-right
      const laraScreenSide: 'left' | 'right' = serveSide === 'deuce' ? 'right' : 'left';
      const diagonalSide: 'left' | 'right' = laraScreenSide === 'right' ? 'left' : 'right';
      const sameSide: 'left' | 'right' = laraScreenSide;

      // Place the diagonal opponent at baseline, the other at mid-court
      const opp1IsDiagonal = this.opp1Side === diagonalSide;
      const opp1Pos = opp1IsDiagonal
        ? this.courtGeometry.opponentHalfBaselinePosition(this.opp1Side)
        : this.courtGeometry.opponentHalfMidPosition(this.opp1Side);
      const opp2Pos = opp1IsDiagonal
        ? this.courtGeometry.opponentHalfMidPosition(this.opp2Side)
        : this.courtGeometry.opponentHalfBaselinePosition(this.opp2Side);

      this.opponent.setPosition(opp1Pos.x, opp1Pos.y);
      this.opponent2.setPosition(opp2Pos.x, opp2Pos.y);
    } else {
      const opponentPos = this.courtGeometry.servePosition('opponent', serveSide);
      this.opponent.setPosition(opponentPos.x, opponentPos.y);
    }

    // Ball with server
    if (this.servingPlayer === 'player') {
      this.ball.setPosition(this.player.x + 30, this.player.y - 20);
    } else {
      // In doubles, the diagonal-side opponent serves
      if (this.isDoubles) {
        const serveSide2 = this._getServeSide();
        const laraScreenSide: 'left' | 'right' = serveSide2 === 'deuce' ? 'right' : 'left';
        const diagonalSide: 'left' | 'right' = laraScreenSide === 'right' ? 'left' : 'right';
        const server = this.opp1Side === diagonalSide ? this.opponent : this.opponent2;
        this.ball.setPosition(server.x, server.y + 20);
      } else {
        this.ball.setPosition(this.opponent.x, this.opponent.y + 20);
      }
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

      if (this.isDoubles) {
        // The diagonal opponent serves
        const serveSide = this._getServeSide();
        const laraScreenSide: 'left' | 'right' = serveSide === 'deuce' ? 'right' : 'left';
        const diagonalSide: 'left' | 'right' = laraScreenSide === 'right' ? 'left' : 'right';
        const server = this.opp1Side === diagonalSide ? this.opponent : this.opponent2;
        this.ball.hit(target.x, target.y);
        server.swing(target.x >= server.x ? 'south-east' : 'south-west');
      } else {
        this.ball.hit(target.x, target.y);
        this.opponent.swing(target.x >= this.opponent.x ? 'east' : 'west');
      }
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
    } else if (this.isDoubles) {
      // Doubles: determine which half the ball landed on and route to the right opponent
      const responsibleOpp = this._getResponsibleOpponent(x, y);
      responsibleOpp.moveTo(x, y - 10);
      this._opponentHit(x, y, responsibleOpp);
    } else {
      // Opponent needs to hit — move toward ball (slightly behind, away from net)
      this.opponent.moveTo(x, y - 10);
      this._opponentHit(x, y, this.opponent);
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
    // Cancel any leftover hit window from a previous rally tick
    this._cancelHitWindow();

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
    this.hitWindowEnableTimer = this.time.delayedCall(200, () => {
      this.hitWindowEnableTimer = null;
      if (this.gameState !== 'rally') return; // guard stale fire
      this.hitWindow = true;
      this.hitIndicator.setFillStyle(PALETTE.green, 0.5);
    });

    // Close hit window after timing period
    this.hitWindowTimer = this.time.delayedCall(800, () => {
      this.hitWindowTimer = null;
      if (this.gameState !== 'rally') return; // guard stale fire
      this._missHit();
    });
  }

  /**
   * Player successfully hits the ball.
   */
  private _playerHit(): void {
    if (!this.hitWindow) return;

    this._cancelHitWindow();

    // Calculate return shot into the opponent's half
    const target = this.courtGeometry.randomPointInHalf('opponent', 15);
    this.lastHitter = 'player';

    // Play swing animation based on which side the ball is going
    this.player.swing(target.x >= this.player.x ? 'north-east' : 'north-west');

    // Small delay before ball leaves (guarded)
    this._cancelPendingTimers();
    this.pendingBallHit = this.time.delayedCall(150, () => {
      this.pendingBallHit = null;
      if (this.gameState !== 'rally') return;
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
   * In doubles, determine which opponent is responsible for a ball that
   * landed on the opponent's side, based on left/right half.
   */
  private _getResponsibleOpponent(x: number, y: number): Player {
    const centerX = this.courtGeometry.getCenterXAtY(y);
    const landedSide: 'left' | 'right' = x < centerX ? 'left' : 'right';
    return this.opp1Side === landedSide ? this.opponent : this.opponent2;
  }

  /**
   * Opponent AI hits the ball back.
   */
  private _opponentHit(ballX: number, ballY: number, hitter: Player): void {
    // Delay for opponent to "reach" the ball
    const reachDelay = 400 + Math.random() * 200;

    // Cancel any previous pending opponent timer (defensive)
    if (this.pendingOpponentHit) {
      this.pendingOpponentHit.destroy();
      this.pendingOpponentHit = null;
    }
    if (this.pendingOpponent2Hit) {
      this.pendingOpponent2Hit.destroy();
      this.pendingOpponent2Hit = null;
    }

    // Decide which timer slot to use so both opponents can act independently
    const isOpp2 = this.isDoubles && hitter === this.opponent2;
    const timerCallback = () => {
      if (isOpp2) { this.pendingOpponent2Hit = null; } else { this.pendingOpponentHit = null; }
      if (this.gameState !== 'rally') return;

      // Difficulty-based miss: opponent can only return maxHitsThisPoint shots
      this.opponentHitCount++;
      if (shouldOpponentMiss(this.opponentHitCount, this.maxHitsThisPoint)) {
        this._scorePoint('player');
        return;
      }

      // Opponent returns into the player's half
      const target = this.courtGeometry.randomPointInHalf('player', 15);
      this.lastHitter = 'opponent';

      hitter.swing(target.x >= hitter.x ? 'south-east' : 'south-west');

      // Guarded delayed ball hit
      if (this.pendingBallHit) {
        this.pendingBallHit.destroy();
      }
      this.pendingBallHit = this.time.delayedCall(150, () => {
        this.pendingBallHit = null;
        if (this.gameState !== 'rally') return;
        this.ball.hit(target.x, target.y);
        this.rallyCount++;
      });
    };

    const timer = this.time.delayedCall(reachDelay, timerCallback);
    if (isOpp2) {
      this.pendingOpponent2Hit = timer;
    } else {
      this.pendingOpponentHit = timer;
    }
  }

  /**
   * Score a point.
   */
  private _scorePoint(winner: 'player' | 'opponent'): void {
    // Prevent double-scoring if _scorePoint is called while already over
    if (this.gameState === 'point-over' || this.gameState === 'game-over') return;

    this.gameState = 'point-over';

    // ── Clean up all in-flight rally state ────────────────────
    this._cancelHitWindow();
    this._cancelPendingTimers();
    this.ball.stop();

    // Track points within the current game to drive deuce/ad court alternation
    this.pointsPlayedInGame++;

    this.scoreboard.scorePoint(winner);
    // Server stays the same for the whole game; rotation happens in onGameWon / onSetWon.

    // Play celebration for the winner
    if (winner === 'player') {
      this.player.celebrate();
    } else {
      this.opponent.celebrate();
      if (this.isDoubles) {
        this.opponent2.celebrate();
      }
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
    this._matchWinner = winner;
    const { width, height } = this.scale;

    // Destroy any previous match-end overlay (defensive)
    this._destroyMatchEndOverlay();

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(PALETTE.nearBlack, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(400);
    this.matchEndObjects.push(overlay);

    // Result text
    const resultText =
      winner === 'player' ? 'YOU WIN!' : 'GAME OVER';
    const resultColor =
      winner === 'player' ? PALETTE_HEX.gold : PALETTE_HEX.pink;

    const resultLabel = this.add
      .text(width / 2, height / 2 - 40, resultText, {
        fontFamily: FONT,
        fontSize: '28px',
        color: resultColor,
      })
      .setOrigin(0.5)
      .setDepth(500);
    this.matchEndObjects.push(resultLabel);

    const isCampaign = this.returnScene !== 'GameModeScene';
    const tapLabel = this.add
      .text(width / 2, height / 2 + 20, isCampaign ? 'TAP TO CONTINUE' : 'TAP TO PLAY AGAIN', {
        fontFamily: FONT,
        fontSize: '12px',
        color: PALETTE_HEX.cream,
      })
      .setOrigin(0.5)
      .setDepth(500);
    this.matchEndObjects.push(tapLabel);
  }

  /**
   * Returns the service court side for the current point.
   * Even points within a game → deuce court (right); odd → ad court (left).
   * This resets to 'deuce' at the start of every new game.
   */
  private _getServeSide(): 'deuce' | 'ad' {
    return this.pointsPlayedInGame % 2 === 0 ? 'deuce' : 'ad';
  }

  /**
   * Random number in range.
   */
  private _randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  // ── State cleanup helpers ──────────────────────────────────

  /**
   * Cancel all hit-window state: timers, flag, indicator.
   */
  private _cancelHitWindow(): void {
    this.hitWindow = false;
    this.hitIndicator?.setVisible(false);

    // Kill any in-progress contract tween on the indicator so they don't
    // accumulate across rallies and fight each other on the same target.
    if (this.hitIndicator) {
      this.tweens.killTweensOf(this.hitIndicator);
    }

    if (this.hitWindowTimer) {
      this.hitWindowTimer.destroy();
      this.hitWindowTimer = null;
    }
    if (this.hitWindowEnableTimer) {
      this.hitWindowEnableTimer.destroy();
      this.hitWindowEnableTimer = null;
    }
  }

  /**
   * Cancel any pending delayed calls for ball hits or opponent actions.
   */
  private _cancelPendingTimers(): void {
    if (this.pendingBallHit) {
      this.pendingBallHit.destroy();
      this.pendingBallHit = null;
    }
    if (this.pendingOpponentHit) {
      this.pendingOpponentHit.destroy();
      this.pendingOpponentHit = null;
    }
    if (this.pendingOpponent2Hit) {
      this.pendingOpponent2Hit.destroy();
      this.pendingOpponent2Hit = null;
    }
  }

  /**
   * Destroy the match-end overlay graphics and labels.
   */
  private _destroyMatchEndOverlay(): void {
    for (const obj of this.matchEndObjects) {
      obj.destroy();
    }
    this.matchEndObjects = [];
  }
}
