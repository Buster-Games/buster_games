import Phaser from 'phaser';
import { PALETTE } from '../../constants';

export interface BallConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  scale?: number;
}

export interface ShotTarget {
  x: number;
  y: number;
}

/**
 * Ball — Tennis ball with parabolic arc physics.
 *
 * The ball travels between players using a tween-based parabolic arc.
 * A shadow sprite moves along the ground to show the landing zone.
 * The arc height is proportional to the shot distance.
 */
export class Ball {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private baseScale: number;

  // Ball state
  private _isInFlight = false;
  private _landingTarget: ShotTarget | null = null;
  private currentTween: Phaser.Tweens.Tween | null = null;

  // Callbacks
  public onLand: ((x: number, y: number) => void) | null = null;

  constructor(config: BallConfig) {
    this.scene = config.scene;
    this.baseScale = config.scale ?? 0.1;

    // Create shadow (ellipse on ground)
    this.shadow = this.scene.add.ellipse(config.x, config.y + 10, 20, 8, PALETTE.nearBlack, 0.4);
    this.shadow.setDepth(5);

    // Create ball sprite
    this.sprite = this.scene.add.image(config.x, config.y, 'tennis-ball');
    this.sprite.setScale(this.baseScale);
    this.sprite.setDepth(100); // Ball always on top
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get isInFlight(): boolean {
    return this._isInFlight;
  }

  get landingTarget(): ShotTarget | null {
    return this._landingTarget;
  }

  /**
   * Set ball position (when held by player).
   */
  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.shadow.setPosition(x, y + 10);
  }

  /**
   * Set the ball's scale (for perspective adjustments).
   */
  setScale(scale: number): void {
    this.sprite.setScale(scale);
    this.baseScale = scale;
  }

  /**
   * Hit the ball toward a target position with a parabolic arc.
   *
   * @param targetX - Target X position
   * @param targetY - Target Y position
   * @param duration - Flight time in ms (default: auto-calculated from distance)
   */
  hit(targetX: number, targetY: number, duration?: number): void {
    if (this._isInFlight) {
      this.currentTween?.stop();
    }

    this._isInFlight = true;
    this._landingTarget = { x: targetX, y: targetY };

    const startX = this.sprite.x;
    const startY = this.sprite.y;

    // Calculate distance and auto-duration
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Duration scales with distance (roughly 500-1200ms)
    const flightDuration = duration ?? Math.min(1200, Math.max(500, distance * 1.5));

    // Arc height is proportional to distance (higher for longer shots)
    const arcHeight = Math.min(150, distance * 0.3);

    // Target object for tween
    const tweenTarget = { progress: 0 };

    // Create the arc tween
    this.currentTween = this.scene.tweens.add({
      targets: tweenTarget,
      progress: 1,
      duration: flightDuration,
      ease: 'Linear',
      onUpdate: () => {
        const progress = tweenTarget.progress;

        // Linear interpolation for X and Y ground position
        const groundX = startX + dx * progress;
        const groundY = startY + dy * progress;

        // Parabolic arc for height (peaks at progress = 0.5)
        const heightOffset = -arcHeight * 4 * progress * (1 - progress);

        // Update ball position (subtract height because Y increases downward)
        this.sprite.setPosition(groundX, groundY + heightOffset);

        // Shadow stays on ground, scales based on height
        this.shadow.setPosition(groundX, groundY + 10);
        const shadowScale = 1 - Math.abs(heightOffset) / arcHeight * 0.4;
        this.shadow.setScale(shadowScale, shadowScale * 0.4);
        this.shadow.setAlpha(0.3 + 0.2 * shadowScale);

        // Ball scale changes slightly during arc (smaller at peak)
        const ballScale = this.baseScale * (1 - Math.abs(heightOffset) / arcHeight * 0.15);
        this.sprite.setScale(ballScale);
      },
      onComplete: () => {
        this._isInFlight = false;
        this.sprite.setPosition(targetX, targetY);
        this.shadow.setPosition(targetX, targetY + 10);
        this.shadow.setScale(1, 0.4);
        this.sprite.setScale(this.baseScale);

        // Fire landing callback
        if (this.onLand) {
          this.onLand(targetX, targetY);
        }
      },
    });
  }

  /**
   * Stop the ball immediately (for catches or resets).
   */
  stop(): void {
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }
    this._isInFlight = false;
    this._landingTarget = null;
  }

  /**
   * Show/hide the ball.
   */
  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  /**
   * Get the sprite for depth sorting.
   */
  getSprite(): Phaser.GameObjects.Image {
    return this.sprite;
  }

  /**
   * Destroy the ball and shadow.
   */
  destroy(): void {
    this.stop();
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
