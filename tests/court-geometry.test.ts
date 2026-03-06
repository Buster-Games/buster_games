import { CourtGeometry, type CourtPoints } from '../src/game/tennis/CourtGeometry';

/**
 * Test court configuration matching a 390×844 screen.
 * The court is a perspective trapezoid — narrower at the far baseline,
 * wider at the near baseline.
 */
const testPoints: CourtPoints = {
  farLeft:      { x: 129, y: 236 },   // 390*0.33, 844*0.28
  farRight:     { x: 261, y: 236 },   // 390*0.67, 844*0.28
  netFarLeft:   { x: 86,  y: 397 },   // 390*0.22, 844*0.47
  netFarRight:  { x: 304, y: 397 },   // 390*0.78, 844*0.47
  netNearLeft:  { x: 78,  y: 439 },   // 390*0.20, 844*0.52
  netNearRight: { x: 312, y: 439 },   // 390*0.80, 844*0.52
  nearLeft:     { x: 20,  y: 700 },   // 390*0.05, 844*0.83
  nearRight:    { x: 371, y: 700 },   // 390*0.95, 844*0.83
};

describe('CourtGeometry', () => {
  const court = new CourtGeometry(testPoints);

  // ── Y ranges ──────────────────────────────────────────────

  test('farY and nearY match the baseline Y values', () => {
    expect(court.farY).toBe(236);
    expect(court.nearY).toBe(700);
  });

  test('net Y values are between baselines', () => {
    expect(court.netFarY).toBe(397);
    expect(court.netNearY).toBe(439);
    expect(court.netY).toBeCloseTo((397 + 439) / 2);
  });

  // ── getXBoundsAtY ─────────────────────────────────────────

  test('X bounds at far baseline match far corners', () => {
    const bounds = court.getXBoundsAtY(236);
    expect(bounds.left).toBeCloseTo(129);
    expect(bounds.right).toBeCloseTo(261);
  });

  test('X bounds at near baseline match near corners', () => {
    const bounds = court.getXBoundsAtY(700);
    expect(bounds.left).toBeCloseTo(20);
    expect(bounds.right).toBeCloseTo(371);
  });

  test('X bounds at midpoint are between far and near', () => {
    const midY = (236 + 700) / 2; // 468
    const bounds = court.getXBoundsAtY(midY);
    // t = (468 - 236) / (700 - 236) = 232 / 464 = 0.5
    expect(bounds.left).toBeCloseTo((129 + 20) / 2); // 74.5
    expect(bounds.right).toBeCloseTo((261 + 371) / 2); // 316
  });

  test('X bounds are clamped for Y values outside court', () => {
    const above = court.getXBoundsAtY(0);
    expect(above.left).toBeCloseTo(129); // clamped to t=0
    expect(above.right).toBeCloseTo(261);

    const below = court.getXBoundsAtY(1000);
    expect(below.left).toBeCloseTo(20); // clamped to t=1
    expect(below.right).toBeCloseTo(371);
  });

  // ── isInCourt ─────────────────────────────────────────────

  test('centre of player half is in court', () => {
    expect(court.isInCourt(195, 600)).toBe(true);
  });

  test('centre of opponent half is in court', () => {
    expect(court.isInCourt(195, 300)).toBe(true);
  });

  test('point outside left sideline is out', () => {
    // At y=600, left bound ≈ lerp(129,20, (600-236)/(700-236)) ≈ lerp(129,20,0.784) ≈ 43.5
    expect(court.isInCourt(30, 600)).toBe(false);
  });

  test('point above far baseline is out', () => {
    expect(court.isInCourt(195, 100)).toBe(false);
  });

  test('point below near baseline is out', () => {
    expect(court.isInCourt(195, 800)).toBe(false);
  });

  test('point in net zone is not in court', () => {
    expect(court.isInCourt(195, 418)).toBe(false);
  });

  // ── isInNetZone ───────────────────────────────────────────

  test('Y inside net band is in net zone', () => {
    expect(court.isInNetZone(410)).toBe(true);
  });

  test('Y outside net band is not in net zone', () => {
    expect(court.isInNetZone(300)).toBe(false);
    expect(court.isInNetZone(500)).toBe(false);
  });

  // ── isOnPlayerSide / isOnOpponentSide ─────────────────────

  test('point on player side is detected correctly', () => {
    expect(court.isOnPlayerSide(195, 550)).toBe(true);
    expect(court.isOnPlayerSide(195, 300)).toBe(false);
  });

  test('point on opponent side is detected correctly', () => {
    expect(court.isOnOpponentSide(195, 300)).toBe(true);
    expect(court.isOnOpponentSide(195, 550)).toBe(false);
  });

  test('point in net zone is neither side', () => {
    expect(court.isOnPlayerSide(195, 418)).toBe(false);
    expect(court.isOnOpponentSide(195, 418)).toBe(false);
  });

  // ── clampToPlayerSide ─────────────────────────────────────

  test('point already in player half is unchanged', () => {
    const result = court.clampToPlayerSide(195, 600);
    expect(result.x).toBeCloseTo(195);
    expect(result.y).toBeCloseTo(600);
  });

  test('point above net is clamped to net near edge', () => {
    const result = court.clampToPlayerSide(195, 300);
    expect(result.y).toBe(439); // netNearY
  });

  test('point left of sideline is clamped to left edge', () => {
    const result = court.clampToPlayerSide(0, 600);
    // At y=600 the left edge is at ~43.5
    expect(result.x).toBeGreaterThan(30);
    expect(result.x).toBeLessThan(60);
  });

  // ── clampToOpponentSide ───────────────────────────────────

  test('point already in opponent half is unchanged', () => {
    const result = court.clampToOpponentSide(195, 300);
    expect(result.x).toBeCloseTo(195);
    expect(result.y).toBeCloseTo(300);
  });

  test('point below net is clamped to net far edge', () => {
    const result = court.clampToOpponentSide(195, 600);
    expect(result.y).toBe(397); // netFarY
  });

  // ── randomPointInHalf ─────────────────────────────────────

  test('random point in player half is inside bounds', () => {
    for (let i = 0; i < 50; i++) {
      const pt = court.randomPointInHalf('player', 5);
      expect(court.isOnPlayerSide(pt.x, pt.y)).toBe(true);
    }
  });

  test('random point in opponent half is inside bounds', () => {
    for (let i = 0; i < 50; i++) {
      const pt = court.randomPointInHalf('opponent', 5);
      expect(court.isOnOpponentSide(pt.x, pt.y)).toBe(true);
    }
  });

  // ── default positions ─────────────────────────────────────

  test('player default position is on player side', () => {
    const pos = court.playerDefaultPosition();
    expect(court.isOnPlayerSide(pos.x, pos.y)).toBe(true);
  });

  test('opponent default position is on opponent side', () => {
    const pos = court.opponentDefaultPosition();
    expect(court.isOnOpponentSide(pos.x, pos.y)).toBe(true);
  });

  // ── servePosition ─────────────────────────────────────────

  test('player deuce position is at near baseline, right of centre', () => {
    const { left, right } = court.getXBoundsAtY(court.nearY);
    const centerX = (left + right) / 2;
    const pos = court.servePosition('player', 'deuce');
    expect(pos.y).toBe(court.nearY);
    expect(pos.x).toBeGreaterThan(centerX);
  });

  test('player ad position is at near baseline, left of centre', () => {
    const { left, right } = court.getXBoundsAtY(court.nearY);
    const centerX = (left + right) / 2;
    const pos = court.servePosition('player', 'ad');
    expect(pos.y).toBe(court.nearY);
    expect(pos.x).toBeLessThan(centerX);
  });

  test('opponent deuce position is at far baseline, screen-left (their own right)', () => {
    const { left, right } = court.getXBoundsAtY(court.farY);
    const centerX = (left + right) / 2;
    const pos = court.servePosition('opponent', 'deuce');
    expect(pos.y).toBe(court.farY);
    expect(pos.x).toBeLessThan(centerX);
  });

  test('opponent ad position is at far baseline, screen-right (their own left)', () => {
    const { left, right } = court.getXBoundsAtY(court.farY);
    const centerX = (left + right) / 2;
    const pos = court.servePosition('opponent', 'ad');
    expect(pos.y).toBe(court.farY);
    expect(pos.x).toBeGreaterThan(centerX);
  });

  test('player deuce and opponent deuce are diagonal (opposite screen sides)', () => {
    const playerDeuce = court.servePosition('player', 'deuce');
    const opponentDeuce = court.servePosition('opponent', 'deuce');
    const playerBounds = court.getXBoundsAtY(court.nearY);
    const opponentBounds = court.getXBoundsAtY(court.farY);
    const playerCenter = (playerBounds.left + playerBounds.right) / 2;
    const opponentCenter = (opponentBounds.left + opponentBounds.right) / 2;
    // Player is screen-right, opponent is screen-left
    expect(playerDeuce.x).toBeGreaterThan(playerCenter);
    expect(opponentDeuce.x).toBeLessThan(opponentCenter);
  });

  test('serve positions stay on their respective court halves', () => {
    const playerDeuce = court.servePosition('player', 'deuce');
    expect(court.isOnPlayerSide(playerDeuce.x, playerDeuce.y)).toBe(true);

    const playerAd = court.servePosition('player', 'ad');
    expect(court.isOnPlayerSide(playerAd.x, playerAd.y)).toBe(true);

    const opponentDeuce = court.servePosition('opponent', 'deuce');
    expect(court.isOnOpponentSide(opponentDeuce.x, opponentDeuce.y)).toBe(true);

    const opponentAd = court.servePosition('opponent', 'ad');
    expect(court.isOnOpponentSide(opponentAd.x, opponentAd.y)).toBe(true);
  });

  // ── Doubles: getCenterXAtY ────────────────────────────────

  test('getCenterXAtY returns midpoint between left and right bounds', () => {
    const y = court.farY + (court.netFarY - court.farY) * 0.5;
    const { left, right } = court.getXBoundsAtY(y);
    expect(court.getCenterXAtY(y)).toBeCloseTo((left + right) / 2);
  });

  // ── Doubles: isOnOpponentLeftHalf / isOnOpponentRightHalf ─

  test('point on left half of opponent side is detected', () => {
    const y = (court.farY + court.netFarY) / 2;
    const center = court.getCenterXAtY(y);
    expect(court.isOnOpponentLeftHalf(center - 20, y)).toBe(true);
    expect(court.isOnOpponentRightHalf(center - 20, y)).toBe(false);
  });

  test('point on right half of opponent side is detected', () => {
    const y = (court.farY + court.netFarY) / 2;
    const center = court.getCenterXAtY(y);
    expect(court.isOnOpponentRightHalf(center + 20, y)).toBe(true);
    expect(court.isOnOpponentLeftHalf(center + 20, y)).toBe(false);
  });

  test('point on player side is not on opponent half', () => {
    expect(court.isOnOpponentLeftHalf(195, 600)).toBe(false);
    expect(court.isOnOpponentRightHalf(195, 600)).toBe(false);
  });

  // ── Doubles: opponentHalfBaselinePosition ─────────────────

  test('left baseline position is on opponent left half', () => {
    const pos = court.opponentHalfBaselinePosition('left');
    expect(court.isOnOpponentSide(pos.x, pos.y)).toBe(true);
    expect(pos.x).toBeLessThan(court.getCenterXAtY(pos.y));
  });

  test('right baseline position is on opponent right half', () => {
    const pos = court.opponentHalfBaselinePosition('right');
    expect(court.isOnOpponentSide(pos.x, pos.y)).toBe(true);
    expect(pos.x).toBeGreaterThanOrEqual(court.getCenterXAtY(pos.y));
  });

  // ── Doubles: opponentHalfMidPosition ──────────────────────

  test('mid position is further from baseline than baseline position', () => {
    const base = court.opponentHalfBaselinePosition('left');
    const mid = court.opponentHalfMidPosition('left');
    expect(mid.y).toBeGreaterThan(base.y); // closer to net = higher Y
  });

  test('mid position is on the opponent side', () => {
    const mid = court.opponentHalfMidPosition('right');
    expect(court.isOnOpponentSide(mid.x, mid.y)).toBe(true);
  });

  // ── Doubles: clampToOpponentHalf ──────────────────────────

  test('clampToOpponentHalf keeps point in correct half', () => {
    // Try a point that is on the right side but clamp it to left
    const y = (court.farY + court.netFarY) / 2;
    const { right } = court.getXBoundsAtY(y);
    const clamped = court.clampToOpponentHalf(right, y, 'left');
    const center = court.getCenterXAtY(clamped.y);
    expect(clamped.x).toBeLessThanOrEqual(center);
  });

  test('clampToOpponentHalf clamps Y to opponent side', () => {
    const clamped = court.clampToOpponentHalf(195, 600, 'left');
    expect(clamped.y).toBeLessThanOrEqual(court.netFarY);
    expect(clamped.y).toBeGreaterThanOrEqual(court.farY);
  });

  // ── Doubles: randomPointInOpponentHalf ────────────────────

  test('random point in left opponent half stays in left half', () => {
    for (let i = 0; i < 20; i++) {
      const pt = court.randomPointInOpponentHalf('left', 5);
      expect(court.isOnOpponentSide(pt.x, pt.y)).toBe(true);
      expect(pt.x).toBeLessThanOrEqual(court.getCenterXAtY(pt.y));
    }
  });

  test('random point in right opponent half stays in right half', () => {
    for (let i = 0; i < 20; i++) {
      const pt = court.randomPointInOpponentHalf('right', 5);
      expect(court.isOnOpponentSide(pt.x, pt.y)).toBe(true);
      expect(pt.x).toBeGreaterThanOrEqual(court.getCenterXAtY(pt.y));
    }
  });
});
