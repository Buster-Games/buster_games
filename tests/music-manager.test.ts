import { MusicManager } from '../src/game/MusicManager';
import { CAMPAIGN_STEPS } from '../src/game/campaign/campaignData';

describe('MusicManager', () => {
  const tracks = MusicManager.trackRegistry;
  const campaignMusic = MusicManager.campaignMusicMap;

  // ─── Track registry ──────────────────────────────────────────

  test('every track path ends with .mp3', () => {
    for (const [key, path] of Object.entries(tracks)) {
      expect(path, `track "${key}"`).toMatch(/\.mp3$/);
    }
  });

  test('track keys are lowercase kebab-case', () => {
    for (const key of Object.keys(tracks)) {
      expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  // ─── Campaign music map ──────────────────────────────────────

  test('every campaign step ID has a music mapping', () => {
    for (const step of CAMPAIGN_STEPS) {
      expect(
        step.id in campaignMusic,
        `step "${step.id}" missing from CAMPAIGN_MUSIC`,
      ).toBe(true);
    }
  });

  test('every non-null campaign music value is a valid track key', () => {
    for (const [stepId, trackKey] of Object.entries(campaignMusic)) {
      if (trackKey === null) continue;
      expect(
        trackKey in tracks,
        `step "${stepId}" references unknown track "${trackKey}"`,
      ).toBe(true);
    }
  });

  test('love-message maps to null (silence)', () => {
    expect(campaignMusic['love-message']).toBeNull();
  });

  // ─── Non-menu track pool ─────────────────────────────────────

  test('at least 2 non-menu tracks exist for random selection', () => {
    const nonMenu = Object.keys(tracks).filter(k => k !== 'menu');
    expect(nonMenu.length).toBeGreaterThanOrEqual(2);
  });

  test('menu track exists', () => {
    expect(tracks['menu']).toBeDefined();
  });
});
