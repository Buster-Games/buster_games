import { sampleMaxHits, shouldOpponentMiss, MAX_OPPONENT_HITS } from '../src/game/tennis/Difficulty';

describe('Difficulty', () => {
  describe('sampleMaxHits', () => {
    test('returns a value between 1 and MAX_OPPONENT_HITS for easy', () => {
      for (let i = 0; i < 100; i++) {
        const val = sampleMaxHits('easy');
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(MAX_OPPONENT_HITS);
      }
    });

    test('returns a value between 1 and MAX_OPPONENT_HITS for medium', () => {
      for (let i = 0; i < 100; i++) {
        const val = sampleMaxHits('medium');
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(MAX_OPPONENT_HITS);
      }
    });

    test('returns a value between 1 and MAX_OPPONENT_HITS for hard', () => {
      for (let i = 0; i < 100; i++) {
        const val = sampleMaxHits('hard');
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(MAX_OPPONENT_HITS);
      }
    });

    test('easy has lower average than hard', () => {
      const N = 1000;
      let easySum = 0;
      let hardSum = 0;
      for (let i = 0; i < N; i++) {
        easySum += sampleMaxHits('easy');
        hardSum += sampleMaxHits('hard');
      }
      expect(easySum / N).toBeLessThan(hardSum / N);
    });

    test('medium average is between easy and hard', () => {
      const N = 1000;
      let easySum = 0;
      let medSum = 0;
      let hardSum = 0;
      for (let i = 0; i < N; i++) {
        easySum += sampleMaxHits('easy');
        medSum += sampleMaxHits('medium');
        hardSum += sampleMaxHits('hard');
      }
      const easyAvg = easySum / N;
      const medAvg = medSum / N;
      const hardAvg = hardSum / N;
      expect(medAvg).toBeGreaterThan(easyAvg);
      expect(medAvg).toBeLessThan(hardAvg);
    });
  });

  describe('shouldOpponentMiss', () => {
    test('returns false when hit count < max hits', () => {
      expect(shouldOpponentMiss(1, 5)).toBe(false);
      expect(shouldOpponentMiss(4, 5)).toBe(false);
    });

    test('returns true when hit count >= max hits', () => {
      expect(shouldOpponentMiss(5, 5)).toBe(true);
      expect(shouldOpponentMiss(6, 5)).toBe(true);
    });

    test('returns true when hit count equals 1 and max is 1', () => {
      expect(shouldOpponentMiss(1, 1)).toBe(true);
    });
  });
});
