import { CAMPAIGN_STEPS } from '../src/game/campaign/campaignData';

describe('campaignData', () => {
  test('CAMPAIGN_STEPS has at least 10 steps', () => {
    expect(CAMPAIGN_STEPS.length).toBeGreaterThanOrEqual(10);
  });

  test('every step has a unique id', () => {
    const ids = CAMPAIGN_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every step has a valid type', () => {
    for (const step of CAMPAIGN_STEPS) {
      expect(['cutscene', 'match']).toContain(step.type);
    }
  });

  test('cutscene steps have dialogue with at least one line', () => {
    const cutscenes = CAMPAIGN_STEPS.filter((s) => s.type === 'cutscene');
    expect(cutscenes.length).toBeGreaterThan(0);
    for (const step of cutscenes) {
      if (step.type === 'cutscene') {
        expect(step.dialogue.length).toBeGreaterThan(0);
        for (const line of step.dialogue) {
          expect(line.speaker).toBeDefined();
          expect(line.text.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('cutscene steps have either a static panel or speakerPanels', () => {
    const cutscenes = CAMPAIGN_STEPS.filter((s) => s.type === 'cutscene');
    for (const step of cutscenes) {
      if (step.type === 'cutscene') {
        const hasPanel = step.panelKey && step.panelAsset;
        const hasSpeakers = step.speakerPanels && Object.keys(step.speakerPanels).length > 0;
        expect(hasPanel || hasSpeakers).toBeTruthy();
      }
    }
  });

  test('cutscene steps have a court background', () => {
    const cutscenes = CAMPAIGN_STEPS.filter((s) => s.type === 'cutscene');
    for (const step of cutscenes) {
      if (step.type === 'cutscene') {
        expect(step.courtBgKey).toBeTruthy();
        expect(step.courtBgAsset).toBeTruthy();
      }
    }
  });

  test('match steps have court and opponent config', () => {
    const matches = CAMPAIGN_STEPS.filter((s) => s.type === 'match');
    expect(matches.length).toBeGreaterThan(0);
    for (const step of matches) {
      if (step.type === 'match') {
        expect(step.courtId).toBeTruthy();
        expect(step.opponentKey).toBeTruthy();
        expect(step.opponentName).toBeTruthy();
      }
    }
  });

  test('doubles matches have opponent2 config', () => {
    const doubles = CAMPAIGN_STEPS.filter(
      (s) => s.type === 'match' && s.opponent2Key
    );
    expect(doubles.length).toBeGreaterThanOrEqual(2); // Anna+Collin and Andre+Rita
    for (const step of doubles) {
      if (step.type === 'match') {
        expect(step.opponent2Key).toBeTruthy();
        expect(step.opponent2Name).toBeTruthy();
      }
    }
  });

  test('first step is the intro cutscene', () => {
    expect(CAMPAIGN_STEPS[0].type).toBe('cutscene');
    expect(CAMPAIGN_STEPS[0].id).toBe('intro');
  });

  test('last step is the love message', () => {
    const last = CAMPAIGN_STEPS[CAMPAIGN_STEPS.length - 1];
    expect(last.type).toBe('cutscene');
    expect(last.id).toBe('love-message');
  });

  test('nic-steals cutscene has flashEffect', () => {
    const nic = CAMPAIGN_STEPS.find((s) => s.id === 'nic-steals');
    expect(nic).toBeDefined();
    if (nic && nic.type === 'cutscene') {
      expect(nic.flashEffect).toBe(true);
    }
  });

  test('match steps with lossCutscene have valid dialogue and visuals', () => {
    const matches = CAMPAIGN_STEPS.filter((s) => s.type === 'match');
    for (const step of matches) {
      if (step.type === 'match' && step.lossCutscene) {
        // Must have either a static panel or speaker panels
        const hasPanel = step.lossCutscene.panelKey && step.lossCutscene.panelAsset;
        const hasSpeakers = step.lossCutscene.speakerPanels && Object.keys(step.lossCutscene.speakerPanels).length > 0;
        expect(hasPanel || hasSpeakers).toBeTruthy();
        expect(step.lossCutscene.dialogue.length).toBeGreaterThan(0);
      }
    }
  });

  test('onLose references valid step ids or "retry"', () => {
    const ids = new Set(CAMPAIGN_STEPS.map((s) => s.id));
    const matches = CAMPAIGN_STEPS.filter((s) => s.type === 'match');
    for (const step of matches) {
      if (step.type === 'match' && step.onLose && step.onLose !== 'retry') {
        expect(ids.has(step.onLose)).toBe(true);
      }
    }
  });
});
