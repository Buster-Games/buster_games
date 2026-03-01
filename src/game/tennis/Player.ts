import Phaser from 'phaser';

export type Direction =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'north-east'
  | 'north-west'
  | 'south-east'
  | 'south-west';

export interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  spriteKey: string; // Base key for sprites (e.g., 'lara')
  isOpponent?: boolean;
  tint?: number;
}

export interface CourtBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Player — Tennis player with movement, animation, and swing mechanics.
 *
 * Supports 8-direction movement with running animations, idle breathing,
 * and tennis swing animations. Position is clamped to court bounds.
 */
export class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private spriteKey: string;
  private isOpponent: boolean;

  // Position and movement
  private _x: number;
  private _y: number;
  private targetX: number | null = null;
  private targetY: number | null = null;
  private moveSpeed = 200; // pixels per second

  // Animation state
  private currentDirection: Direction = 'north';
  private isRunning = false;
  private isSwinging = false;
  private isCelebrating = false;

  // Callbacks
  public onReachTarget: (() => void) | null = null;

  // Perspective scaling function (set by TennisScene)
  public perspectiveScale: ((y: number) => number) | null = null;

  // Court bounds (set by TennisScene)
  public courtBounds: CourtBounds | null = null;

  constructor(config: PlayerConfig) {
    this.scene = config.scene;
    this.spriteKey = config.spriteKey;
    this.isOpponent = config.isOpponent ?? false;
    this._x = config.x;
    this._y = config.y;

    // Create sprite with initial frame
    const initialKey = this.isOpponent
      ? `${this.spriteKey}-south`
      : `${this.spriteKey}-north`;

    this.sprite = this.scene.add.sprite(config.x, config.y, initialKey);
    this.sprite.setDepth(50);

    if (config.tint) {
      this.sprite.setTint(config.tint);
    }

    // Set initial direction
    this.currentDirection = this.isOpponent ? 'south' : 'north';
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  /**
   * Set player position directly.
   */
  setPosition(x: number, y: number): void {
    this._x = x;
    this._y = y;
    this.sprite.setPosition(x, y);
    this._updateScale();
  }

  /**
   * Set the player's scale.
   */
  setScale(scale: number): void {
    this.sprite.setScale(scale);
  }

  /**
   * Move toward a target position (auto-run).
   */
  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.isRunning = true;
  }

  /**
   * Stop movement immediately.
   */
  stop(): void {
    this.targetX = null;
    this.targetY = null;
    this.isRunning = false;
    this.isCelebrating = false;
    this._playIdleAnimation();
    this._updateScale();
  }

  /**
   * Play celebration animation (loops until next action).
   */
  celebrate(): void {
    this.targetX = null;
    this.targetY = null;
    this.isRunning = false;
    this.isSwinging = false;
    this.isCelebrating = true;

    const celebDir = this.isOpponent ? 'south' : 'north';
    const animKey = `${this.spriteKey}-celebrate-${celebDir}`;

    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
    } else {
      this._setRotationSprite(celebDir);
    }

    this.currentDirection = celebDir;
    this._updateScale();
  }

  /**
   * Play swing animation in the given direction.
   * Automatically maps to the nearest available swing direction
   * (east, west, north-east, north-west).
   */
  swing(direction: Direction): void {
    // Clear movement so we don't keep chasing a stale target after swing
    this.targetX = null;
    this.targetY = null;
    this.isRunning = false;
    this.isCelebrating = false;

    this.isSwinging = true;
    this.currentDirection = direction;

    // Snap to the 4 available swing directions
    const swingDir = this._mapToSwingDirection(direction);
    const swingKey = `${this.spriteKey}-swing-${swingDir}`;

    // Play swing animation if it exists, otherwise fall back to rotation sprite
    if (this.scene.anims.exists(swingKey)) {
      this.sprite.play(swingKey);
    } else {
      this._setRotationSprite(direction);
    }

    // Apply scale immediately after texture/animation change
    this._updateScale();

    // Reset to idle after swing completes
    this.scene.time.delayedCall(300, () => {
      this.isSwinging = false;
      this._playIdleAnimation(); // also calls _updateScale()
    });
  }

  /**
   * Map any 8-direction to the nearest available swing direction.
   * Available: east, west, north-east, north-west.
   */
  private _mapToSwingDirection(dir: Direction): Direction {
    switch (dir) {
      case 'north-east': return 'north-east';
      case 'north-west': return 'north-west';
      case 'east':       return 'east';
      case 'west':       return 'west';
      // Map south-facing directions to east/west based on lateral component
      case 'south-east': return 'east';
      case 'south-west': return 'west';
      // Pure north/south — default to whichever side feels natural
      case 'north':      return 'north-east';
      case 'south':      return 'east';
    }
  }

  /**
   * Update player each frame (call from scene update).
   */
  update(delta: number): void {
    if (this.isSwinging || this.isCelebrating) {
      // Re-enforce scale every frame while locked in an animation (defensive)
      this._updateScale();
      return;
    }

    if (this.targetX !== null && this.targetY !== null) {
      this._moveTowardTarget(delta);
    } else {
      // Idle — keep scale correct in case anything touched it
      this._updateScale();
    }
  }

  /**
   * Calculate direction from current position to target.
   */
  private _calculateDirection(dx: number, dy: number): Direction {
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Convert angle to 8-direction
    // Right = 0°, Down = 90°, Left = 180°, Up = -90°
    if (angle >= -22.5 && angle < 22.5) return 'east';
    if (angle >= 22.5 && angle < 67.5) return 'south-east';
    if (angle >= 67.5 && angle < 112.5) return 'south';
    if (angle >= 112.5 && angle < 157.5) return 'south-west';
    if (angle >= 157.5 || angle < -157.5) return 'west';
    if (angle >= -157.5 && angle < -112.5) return 'north-west';
    if (angle >= -112.5 && angle < -67.5) return 'north';
    if (angle >= -67.5 && angle < -22.5) return 'north-east';

    return 'north';
  }

  /**
   * Move toward the target position.
   */
  private _moveTowardTarget(delta: number): void {
    if (this.targetX === null || this.targetY === null) return;

    const dx = this.targetX - this._x;
    const dy = this.targetY - this._y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Reached target?
    if (distance < 5) {
      this._x = this.targetX;
      this._y = this.targetY;
      this.targetX = null;
      this.targetY = null;
      this.isRunning = false;
      this.isCelebrating = false;
      this._playIdleAnimation(); // also calls _updateScale()

      if (this.onReachTarget) {
        this.onReachTarget();
      }
      return;
    }

    // Calculate movement
    const moveAmount = (this.moveSpeed * delta) / 1000;
    const ratio = Math.min(1, moveAmount / distance);

    let newX = this._x + dx * ratio;
    let newY = this._y + dy * ratio;

    // Clamp to court bounds
    if (this.courtBounds) {
      newX = Math.max(this.courtBounds.left, Math.min(this.courtBounds.right, newX));
      newY = Math.max(this.courtBounds.top, Math.min(this.courtBounds.bottom, newY));
    }

    this._x = newX;
    this._y = newY;
    this.sprite.setPosition(newX, newY);

    // Update direction and animation
    const newDirection = this._calculateDirection(dx, dy);
    if (newDirection !== this.currentDirection || !this.isRunning) {
      this.currentDirection = newDirection;
      this._playRunAnimation(newDirection);
    }

    this._updateScale();
  }

  /**
   * Update scale based on Y position (perspective).
   */
  private _updateScale(): void {
    if (this.perspectiveScale) {
      this.sprite.setScale(this.perspectiveScale(this._y));
    }
  }

  /**
   * Set the rotation sprite for a direction.
   */
  private _setRotationSprite(direction: Direction): void {
    const key = `${this.spriteKey}-${direction}`;
    if (this.scene.textures.exists(key)) {
      this.sprite.setTexture(key);
    }
  }

  /**
   * Play running animation for direction.
   */
  private _playRunAnimation(direction: Direction): void {
    const animKey = `${this.spriteKey}-run-${direction}`;

    // Check if animation exists
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
    } else {
      // Fallback to rotation sprite
      this._setRotationSprite(direction);
    }
  }

  /**
   * Play idle/breathing animation.
   */
  private _playIdleAnimation(): void {
    const idleDir = this.isOpponent ? 'south' : 'north';
    const animKey = `${this.spriteKey}-idle-${idleDir}`;

    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
    } else {
      // Fallback to rotation sprite
      this._setRotationSprite(idleDir);
    }
    this.currentDirection = idleDir;
    this._updateScale();
  }

  /**
   * Get the sprite for external manipulation.
   */
  getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  /**
   * Destroy the player sprite.
   */
  destroy(): void {
    this.sprite.destroy();
  }
}
