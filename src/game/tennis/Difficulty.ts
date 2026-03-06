/**
 * Difficulty — controls how many shots the opponent returns before missing.
 *
 * Each point, we sample a "max hits" value from a distribution of 1..MAX_OPPONENT_HITS.
 * The distribution is generated mathematically so changing MAX_OPPONENT_HITS
 * automatically rescales everything — no manual array editing needed.
 *
 * Each difficulty is defined by a "peak" position (0–1 across the range):
 *   - Easy:   peak near the bottom (~20% of range)  → mostly 1–3 hits
 *   - Medium: peak in the middle  (~45% of range)   → spread across mid-range
 *   - Hard:   peak near the top   (~75% of range)   → mostly high-end hits
 *
 * Weights follow a Gaussian-like bell curve centred on the peak.
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Maximum number of shots the opponent can ever return in a single point.
 * Change this one number to scale the entire system up or down.
 */
export const MAX_OPPONENT_HITS = 10;

/**
 * Where each difficulty's bell-curve peaks (0 = always 1 hit, 1 = always max).
 * The spread controls how wide the curve is (higher = flatter / more variance).
 */
const DIFFICULTY_PARAMS: Record<DifficultyLevel, { peak: number; spread: number }> = {
  easy:   { peak: 0.15, spread: 0.22 },
  medium: { peak: 0.35, spread: 0.25 },
  hard:   { peak: 0.75, spread: 0.25 },
};

/**
 * Build a weight array of length `n` with a bell curve centred at `peak` (0–1).
 */
function buildWeights(n: number, peak: number, spread: number): number[] {
  const weights: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);                         // 0..1
    const d = (t - peak) / spread;
    weights.push(Math.exp(-0.5 * d * d));           // Gaussian bell
  }
  return weights;
}

/** Cached weight arrays — rebuilt only if MAX_OPPONENT_HITS changes at runtime. */
let cachedN = 0;
let cachedDistributions: Record<DifficultyLevel, number[]> | null = null;

function getDistributions(): Record<DifficultyLevel, number[]> {
  if (cachedDistributions && cachedN === MAX_OPPONENT_HITS) return cachedDistributions;
  cachedN = MAX_OPPONENT_HITS;
  cachedDistributions = {
    easy:   buildWeights(MAX_OPPONENT_HITS, DIFFICULTY_PARAMS.easy.peak,   DIFFICULTY_PARAMS.easy.spread),
    medium: buildWeights(MAX_OPPONENT_HITS, DIFFICULTY_PARAMS.medium.peak, DIFFICULTY_PARAMS.medium.spread),
    hard:   buildWeights(MAX_OPPONENT_HITS, DIFFICULTY_PARAMS.hard.peak,   DIFFICULTY_PARAMS.hard.spread),
  };
  return cachedDistributions;
}

/**
 * Sample a max-hits value (1..MAX_OPPONENT_HITS) from the given difficulty.
 */
export function sampleMaxHits(difficulty: DifficultyLevel): number {
  const weights = getDistributions()[difficulty];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1; // 1-indexed
  }
  return weights.length; // fallback: max hits
}

/**
 * Given opponent's rally count (how many times they've hit the ball this point),
 * and the sampled max-hits for this point, returns true if the opponent should
 * miss on this hit attempt.
 */
export function shouldOpponentMiss(opponentHitCount: number, maxHits: number): boolean {
  return opponentHitCount >= maxHits;
}
