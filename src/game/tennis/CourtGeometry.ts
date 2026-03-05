/**
 * CourtGeometry — Perspective-correct trapezoid court model.
 *
 * Defines the tennis court as 8 key points that trace the actual court
 * lines visible in the background image. The court forms a trapezoid
 * (narrower at the far end, wider near the camera).
 *
 * Layout (screen space, Y increases downward):
 *
 *     farLeft ──────────── farRight          (far baseline)
 *        \                    /
 *         netFarLeft ── netFarRight          (top edge of net)
 *         netNearLeft ─ netNearRight         (bottom edge of net)
 *        /                    \
 *     nearLeft ──────────── nearRight        (near baseline)
 *
 * The net has visual depth (a band between netFar and netNear Y values).
 * Players cannot enter the net zone. The ball must land inside the court
 * trapezoid and on the correct side of the net.
 */

export interface Point {
  x: number;
  y: number;
}

export interface CourtPoints {
  /** Far baseline left corner (top-left on screen). */
  farLeft: Point;
  /** Far baseline right corner (top-right on screen). */
  farRight: Point;
  /** Where the far (top) edge of the net meets the left sideline. */
  netFarLeft: Point;
  /** Where the far (top) edge of the net meets the right sideline. */
  netFarRight: Point;
  /** Where the near (bottom) edge of the net meets the left sideline. */
  netNearLeft: Point;
  /** Where the near (bottom) edge of the net meets the right sideline. */
  netNearRight: Point;
  /** Near baseline left corner (bottom-left on screen). */
  nearLeft: Point;
  /** Near baseline right corner (bottom-right on screen). */
  nearRight: Point;
}

export class CourtGeometry {
  readonly points: CourtPoints;

  constructor(points: CourtPoints) {
    this.points = points;
  }

  // ── Y ranges ───────────────────────────────────────────────

  /** Y of the far baseline. */
  get farY(): number {
    return this.points.farLeft.y;
  }

  /** Y of the near baseline. */
  get nearY(): number {
    return this.points.nearLeft.y;
  }

  /** Y of the far edge of the net. */
  get netFarY(): number {
    return this.points.netFarLeft.y;
  }

  /** Y of the near edge of the net. */
  get netNearY(): number {
    return this.points.netNearLeft.y;
  }

  /** Y midpoint of the net (for simple side-of-net checks). */
  get netY(): number {
    return (this.netFarY + this.netNearY) / 2;
  }

  // ── Sideline interpolation ─────────────────────────────────

  /**
   * Get the left and right X bounds of the full court at a given Y.
   * Interpolates linearly along the sidelines (farBaseline → nearBaseline).
   */
  getXBoundsAtY(y: number): { left: number; right: number } {
    const t = this._fullCourtT(y);
    const leftX = lerp(this.points.farLeft.x, this.points.nearLeft.x, t);
    const rightX = lerp(this.points.farRight.x, this.points.nearRight.x, t);
    return { left: leftX, right: rightX };
  }

  // ── Hit-testing ────────────────────────────────────────────

  /** Is the point inside the full court trapezoid (excluding net zone)? */
  isInCourt(x: number, y: number): boolean {
    if (y < this.farY || y > this.nearY) return false;
    if (this.isInNetZone(y)) return false;
    const { left, right } = this.getXBoundsAtY(y);
    return x >= left && x <= right;
  }

  /** Is the point inside the full court trapezoid (including net zone)? */
  isInCourtBounds(x: number, y: number): boolean {
    if (y < this.farY || y > this.nearY) return false;
    const { left, right } = this.getXBoundsAtY(y);
    return x >= left && x <= right;
  }

  /** Is the Y value within the net dead zone? */
  isInNetZone(y: number): boolean {
    return y >= this.netFarY && y <= this.netNearY;
  }

  /** Is the point on the player's (near) half? */
  isOnPlayerSide(x: number, y: number): boolean {
    if (y <= this.netNearY || y > this.nearY) return false;
    const { left, right } = this.getXBoundsAtY(y);
    return x >= left && x <= right;
  }

  /** Is the point on the opponent's (far) half? */
  isOnOpponentSide(x: number, y: number): boolean {
    if (y < this.farY || y >= this.netFarY) return false;
    const { left, right } = this.getXBoundsAtY(y);
    return x >= left && x <= right;
  }

  // ── Clamping ───────────────────────────────────────────────

  /** Clamp a point to the player's half-court trapezoid. */
  clampToPlayerSide(x: number, y: number): Point {
    const clampedY = clamp(y, this.netNearY, this.nearY);
    const { left, right } = this.getXBoundsAtY(clampedY);
    return { x: clamp(x, left, right), y: clampedY };
  }

  /** Clamp a point to the opponent's half-court trapezoid. */
  clampToOpponentSide(x: number, y: number): Point {
    const clampedY = clamp(y, this.farY, this.netFarY);
    const { left, right } = this.getXBoundsAtY(clampedY);
    return { x: clamp(x, left, right), y: clampedY };
  }

  // ── Random point generation ────────────────────────────────

  /**
   * Generate a random point inside the specified half-court.
   * @param half  Which half to target.
   * @param padding  Inset from the edges (in pixels).
   */
  randomPointInHalf(half: 'player' | 'opponent', padding = 0): Point {
    const yTop =
      half === 'player'
        ? this.netNearY + padding
        : this.farY + padding;
    const yBottom =
      half === 'player'
        ? this.nearY - padding
        : this.netFarY - padding;

    const y = yTop + Math.random() * (yBottom - yTop);
    const { left, right } = this.getXBoundsAtY(y);
    const x = left + padding + Math.random() * (right - left - 2 * padding);
    return { x, y };
  }

  // ── Default positions ──────────────────────────────────────

  /** Centre of the player's baseline area (starting/reset position). */
  playerDefaultPosition(): Point {
    const y = this.nearY - (this.nearY - this.netNearY) * 0.15;
    const { left, right } = this.getXBoundsAtY(y);
    return { x: (left + right) / 2, y };
  }

  /** Centre of the opponent's baseline area (starting/reset position). */
  opponentDefaultPosition(): Point {
    const y = this.farY + (this.netFarY - this.farY) * 0.15;
    const { left, right } = this.getXBoundsAtY(y);
    return { x: (left + right) / 2, y };
  }

  /**
   * Starting position for the server or receiver on the given service court side.
   * Deuce = right of centre mark; Ad = left of centre mark (viewed from above).
   * Both the server and receiver stand on the same side of the court each point.
   */
  servePosition(half: 'player' | 'opponent', side: 'deuce' | 'ad'): Point {
    const base =
      half === 'player'
        ? this.playerDefaultPosition()
        : this.opponentDefaultPosition();
    const { left, right } = this.getXBoundsAtY(base.y);
    const centerX = (left + right) / 2;
    const x = side === 'deuce'
      ? (centerX + right) / 2  // midpoint between centre mark and right sideline
      : (centerX + left) / 2;  // midpoint between centre mark and left sideline
    return { x, y: base.y };
  }

  // ── Internal helpers ───────────────────────────────────────

  /** Normalized 0-1 position along the full court height. */
  private _fullCourtT(y: number): number {
    return clamp((y - this.farY) / (this.nearY - this.farY), 0, 1);
  }
}

// ── Utility functions ──────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
