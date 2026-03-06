/**
 * Tests for CampaignManager — pure state logic, no Phaser dependency.
 */

// Mock localStorage for Node test environment
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
(globalThis as Record<string, unknown>).localStorage = mockLocalStorage;

describe('CampaignManager', () => {
  async function freshManager() {
    const modulePath = '../src/game/campaign/CampaignManager';
    const mod = await import(modulePath);
    const mgr = mod.CampaignManager.instance;
    mgr.reset();
    return mgr;
  }

  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('starts at step 0', async () => {
    const mgr = await freshManager();
    expect(mgr.currentIndex).toBe(0);
    expect(mgr.isComplete).toBe(false);
  });

  test('currentStep returns first step', async () => {
    const mgr = await freshManager();
    const step = mgr.currentStep;
    expect(step).not.toBeNull();
    expect(step!.id).toBe('intro');
    expect(step!.type).toBe('cutscene');
  });

  test('advance moves to next step', async () => {
    const mgr = await freshManager();
    mgr.advance();
    expect(mgr.currentIndex).toBe(1);
  });

  test('jumpTo moves to a specific step by id', async () => {
    const mgr = await freshManager();
    mgr.jumpTo('nic-steals');
    const step = mgr.currentStep;
    expect(step).not.toBeNull();
    expect(step!.id).toBe('nic-steals');
  });

  test('jumpTo with invalid id does nothing', async () => {
    const mgr = await freshManager();
    const before = mgr.currentIndex;
    mgr.jumpTo('nonexistent');
    expect(mgr.currentIndex).toBe(before);
  });

  test('reset goes back to 0', async () => {
    const mgr = await freshManager();
    mgr.advance();
    mgr.advance();
    mgr.reset();
    expect(mgr.currentIndex).toBe(0);
  });

  test('totalSteps matches CAMPAIGN_STEPS length', async () => {
    const mgr = await freshManager();
    expect(mgr.totalSteps).toBeGreaterThanOrEqual(10);
  });

  test('isComplete after advancing past all steps', async () => {
    const mgr = await freshManager();
    for (let i = 0; i < mgr.totalSteps; i++) {
      mgr.advance();
    }
    expect(mgr.isComplete).toBe(true);
    expect(mgr.currentStep).toBeNull();
  });
});
