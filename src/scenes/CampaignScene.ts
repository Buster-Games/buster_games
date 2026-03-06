import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';
import { CampaignManager } from '../game/campaign/CampaignManager';
import { COURTS } from '../game/tennis/courts';
import type { CutsceneStep, MatchStep } from '../game/campaign/campaignData';
import type { CutsceneConfig } from './CutsceneScene';

/**
 * CampaignScene — the campaign orchestrator.
 *
 * Each time this scene starts it reads the current campaign step from
 * CampaignManager and either:
 *   a) launches a CutsceneScene, or
 *   b) launches a TennisScene with the right config.
 *
 * When those scenes complete they return here (via `returnScene: 'CampaignScene'`),
 * CampaignScene checks the result and advances (or retries on loss).
 */
export class CampaignScene extends Phaser.Scene {
  private mgr = CampaignManager.instance;

  constructor() {
    super({ key: 'CampaignScene' });
  }

  create(): void {
    // Check if we received a match result from TennisScene
    const data = this.scene.settings.data as Record<string, unknown> | undefined;
    const matchResult = data?.matchResult as 'player' | 'opponent' | undefined;
    const stepId = data?.stepId as string | undefined;

    if (matchResult && stepId) {
      this._handleMatchResult(matchResult, stepId);
      return;
    }

    // Otherwise, play the current step
    this._playCurrent();
  }

  private _handleMatchResult(result: 'player' | 'opponent', stepId: string): void {
    // Find the step that just finished
    const mgr = this.mgr;
    const step = mgr.currentStep;

    if (!step || step.type !== 'match' || step.id !== stepId) {
      // Safety — just play current
      this._playCurrent();
      return;
    }

    if (result === 'player') {
      // Lara won → advance to next step
      mgr.advance();
      this._playCurrent();
    } else {
      // Lara lost → check onLose strategy
      const matchStep = step as MatchStep;
      if (matchStep.lossCutscene) {
        // Use the match's court as a faded background for the loss cutscene
        const courtDef = COURTS[matchStep.courtId];
        const lossConfig: CutsceneConfig = {
          courtBgKey: courtDef?.textureKey,
          courtBgAsset: courtDef?.asset,
          panelKey: matchStep.lossCutscene.panelKey,
          panelAsset: matchStep.lossCutscene.panelAsset,
          speakerPanels: matchStep.lossCutscene.speakerPanels,
          dialogue: matchStep.lossCutscene.dialogue,
          flashEffect: matchStep.lossCutscene.flashEffect,
          nextScene: 'CampaignScene',
          nextData: {},
        };
        this.scene.start('CutsceneScene', lossConfig);
      } else if (matchStep.onLose && matchStep.onLose !== 'retry') {
        mgr.jumpTo(matchStep.onLose);
        this._playCurrent();
      } else {
        // Default: just replay the match (step index stays the same)
        this._playCurrent();
      }
    }
  }

  private _playCurrent(): void {
    const step = this.mgr.currentStep;

    if (!step) {
      // Campaign complete — show finished screen
      this._showComplete();
      return;
    }

    if (step.type === 'cutscene') {
      this._playCutscene(step as CutsceneStep);
    } else {
      this._playMatch(step as MatchStep);
    }
  }

  private _playCutscene(step: CutsceneStep): void {
    // Advance past the cutscene before we leave — the cutscene's nextScene
    // will bring us back, where we'll play the step after this one.
    this.mgr.advance();

    const config: CutsceneConfig = {
      courtBgKey: step.courtBgKey,
      courtBgAsset: step.courtBgAsset,
      panelKey: step.panelKey,
      panelAsset: step.panelAsset,
      speakerPanels: step.speakerPanels,
      dialogue: step.dialogue,
      flashEffect: step.flashEffect,
      nextScene: 'CampaignScene',
      nextData: {},
    };

    this.scene.start('CutsceneScene', config);
  }

  private _playMatch(step: MatchStep): void {
    const isDoubles = !!(step.opponent2Key && step.opponent2Name);

    this.scene.start('TennisScene', {
      courtId: step.courtId,
      opponentKey: step.opponentKey,
      opponentName: step.opponentName,
      setsToWin: step.setsToWin ?? 2,
      difficulty: step.difficulty ?? 'medium',
      isDoubles,
      opponent2Key: step.opponent2Key ?? '',
      opponent2Name: step.opponent2Name ?? '',
      returnScene: 'CampaignScene',
      returnData: { stepId: step.id },
    });
  }

  private _showComplete(): void {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.nearBlack, 1);
    bg.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height / 2 - 40, 'THE END', {
        fontFamily: FONT,
        fontSize: '28px',
        color: PALETTE_HEX.gold,
        stroke: PALETTE_HEX.darkBrown,
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 20, 'Thanks for playing!', {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.cream,
      })
      .setOrigin(0.5);

    const backBtn = this.add
      .text(width / 2, height / 2 + 80, 'BACK TO MENU', {
        fontFamily: FONT,
        fontSize: '12px',
        color: PALETTE_HEX.cream,
        backgroundColor: PALETTE_HEX.blue,
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.scene.start('GameModeScene');
    });

    const resetBtn = this.add
      .text(width / 2, height / 2 + 130, 'PLAY AGAIN', {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.gold,
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    resetBtn.on('pointerdown', () => {
      this.mgr.reset();
      this._playCurrent();
    });
  }
}
