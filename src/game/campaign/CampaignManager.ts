import {
  CAMPAIGN_STEPS,
  type CampaignStep,
  type CutsceneStep,
  type MatchStep,
} from './campaignData';

const STORAGE_KEY = 'buster_campaign_step';

/**
 * CampaignManager — drives linear progression through CAMPAIGN_STEPS.
 *
 * Usage from a scene:
 *   const mgr = CampaignManager.instance;
 *   mgr.currentStep;        // the step the player is on
 *   mgr.advance();          // move to the next step
 *   mgr.reset();            // restart from beginning
 *
 * Progress is persisted to localStorage so the player can resume.
 */
export class CampaignManager {
  private static _instance: CampaignManager;
  private stepIndex: number;

  private constructor() {
    this.stepIndex = this._loadProgress();
  }

  static get instance(): CampaignManager {
    if (!CampaignManager._instance) {
      CampaignManager._instance = new CampaignManager();
    }
    return CampaignManager._instance;
  }

  /** The current step to play. */
  get currentStep(): CampaignStep | null {
    return CAMPAIGN_STEPS[this.stepIndex] ?? null;
  }

  /** The 0-based index of the current step. */
  get currentIndex(): number {
    return this.stepIndex;
  }

  /** Total number of steps. */
  get totalSteps(): number {
    return CAMPAIGN_STEPS.length;
  }

  /** Whether the campaign is finished. */
  get isComplete(): boolean {
    return this.stepIndex >= CAMPAIGN_STEPS.length;
  }

  /** Advance to the next step and persist progress. */
  advance(): void {
    this.stepIndex++;
    this._saveProgress();
  }

  /** Jump to a specific step by its `id` field. */
  jumpTo(stepId: string): void {
    const idx = CAMPAIGN_STEPS.findIndex((s) => s.id === stepId);
    if (idx >= 0) {
      this.stepIndex = idx;
      this._saveProgress();
    }
  }

  /** Reset campaign to the beginning. */
  reset(): void {
    this.stepIndex = 0;
    this._saveProgress();
  }

  // ── Persistence ────────────────────────────────────────────
  private _loadProgress(): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const val = parseInt(raw, 10);
        if (!isNaN(val) && val >= 0 && val <= CAMPAIGN_STEPS.length) {
          return val;
        }
      }
    } catch {
      // localStorage may be unavailable
    }
    return 0;
  }

  private _saveProgress(): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.stepIndex));
    } catch {
      // Silently ignore
    }
  }
}

export type { CampaignStep, CutsceneStep, MatchStep };
