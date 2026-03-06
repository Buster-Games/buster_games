import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';
import { MusicManager } from '../game/MusicManager';
import { attachLoadingBar } from '../ui/LoadingBar';

/**
 * A single dialogue line in a cutscene.
 */
export interface DialogueLine {
  /** Character name displayed above the text */
  speaker: string;
  /** The dialogue text */
  text: string;
  /** Speaker name colour (CSS hex) — defaults to cream */
  color?: string;
}

/** Config for a speaker-specific panel that slides in from one side. */
export interface SpeakerPanel {
  key: string;
  asset: string;
  side: 'left' | 'right';
}

/**
 * CutsceneScene config — passed via scene data.
 *
 *   this.scene.start('CutsceneScene', { ... } as CutsceneConfig);
 */
export interface CutsceneConfig {
  /** Faded court background texture key. */
  courtBgKey?: string;
  /** Faded court background asset path. */
  courtBgAsset?: string;
  /** Static centre panel texture key (shown when no speakerPanels). */
  panelKey?: string;
  /** Static centre panel asset path. */
  panelAsset?: string;
  /** Speaker-specific panels that slide in/out. Keyed by speaker name (case-insensitive match). */
  speakerPanels?: Record<string, SpeakerPanel>;
  /** Array of dialogue lines to display sequentially. */
  dialogue: DialogueLine[];
  /** Scene key to transition to when the cutscene ends. */
  nextScene: string;
  /** Optional data to pass when starting nextScene. */
  nextData?: Record<string, unknown>;
  /** If true, play a dramatic flash effect before the first line. */
  flashEffect?: boolean;
}

/** Duration of the slide-in / slide-out tweens (ms). */
const SLIDE_DURATION = 350;

/**
 * CutsceneScene — Reusable dialogue + background panel player.
 *
 * Visual stack (bottom → top):
 *   1. Faded court background (if courtBgKey set)
 *   2. Static centre panel   (if panelKey set and no speakerPanels)
 *      -OR- sliding speaker panels (if speakerPanels set)
 *   3. Dialogue box + text at the bottom
 */
export class CutsceneScene extends Phaser.Scene {
  private config!: CutsceneConfig;
  private dialogueIndex = 0;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private tapHint!: Phaser.GameObjects.Text;
  private isTransitioning = false;

  // Sliding speaker panels
  private panelImages = new Map<string, Phaser.GameObjects.Image>();
  private activeSpeakerKey: string | null = null;

  constructor() {
    super({ key: 'CutsceneScene' });
  }

  preload(): void {
    attachLoadingBar(this);

    const data = this.scene.settings.data as CutsceneConfig;
    this.config = data;
    this.dialogueIndex = 0;
    this.isTransitioning = false;
    this.panelImages = new Map();
    this.activeSpeakerKey = null;

    // Court background
    if (data.courtBgKey && data.courtBgAsset && !this.textures.exists(data.courtBgKey)) {
      this.load.image(data.courtBgKey, data.courtBgAsset);
    }

    // Static centre panel
    if (data.panelKey && data.panelAsset && !this.textures.exists(data.panelKey)) {
      this.load.image(data.panelKey, data.panelAsset);
    }

    // Speaker-specific panels
    if (data.speakerPanels) {
      for (const sp of Object.values(data.speakerPanels)) {
        if (!this.textures.exists(sp.key)) {
          this.load.image(sp.key, sp.asset);
        }
      }
    }
  }

  create(): void {
    // Duck music during dialogue
    MusicManager.duck(this);

    const { width, height } = this.scale;

    // ── Court background (faded) ─────────────────────────────
    if (this.config.courtBgKey && this.textures.exists(this.config.courtBgKey)) {
      const bg = this.add.image(width / 2, height / 2, this.config.courtBgKey);
      const s = Math.max(width / bg.width, height / bg.height);
      bg.setScale(s).setDepth(0).setAlpha(0.45);
    } else {
      // Fallback: solid dark bg
      const bg = this.add.graphics();
      bg.fillStyle(PALETTE.nearBlack, 1);
      bg.fillRect(0, 0, width, height);
      bg.setDepth(0);
    }

    // ── Static centre panel (if no sliding panels) ───────────
    const hasSliding = !!this.config.speakerPanels;
    if (this.config.panelKey && this.textures.exists(this.config.panelKey) && !hasSliding) {
      const panel = this.add.image(width / 2, height / 2 - 80, this.config.panelKey);
      const maxW = width * 0.85;
      const maxH = (height - 200) * 0.85;  // leave room for dialogue box
      const ps = Math.min(maxW / panel.width, maxH / panel.height);
      panel.setScale(ps).setDepth(10);
    }

    // ── Sliding speaker panels (created off-screen) ──────────
    if (this.config.speakerPanels) {
      const panelCenterY = (height - 200) / 2;
      for (const [speaker, sp] of Object.entries(this.config.speakerPanels)) {
        if (!this.textures.exists(sp.key)) continue;
        const offX = sp.side === 'left' ? -width : width * 2;
        const img = this.add.image(offX, panelCenterY, sp.key);
        // Scale panel to fit nicely in the viewport above the dialogue box
        const maxW = width * 0.75;
        const maxH = (height - 200) * 0.8;
        const ps = Math.min(maxW / img.width, maxH / img.height);
        img.setScale(ps).setDepth(20).setAlpha(0);
        this.panelImages.set(speaker.toLowerCase(), img);
      }
    }

    // ── Flash effect ─────────────────────────────────────────
    if (this.config.flashEffect) {
      const flash = this.add.graphics();
      flash.fillStyle(PALETTE.white, 1);
      flash.fillRect(0, 0, width, height);
      flash.setDepth(900);

      this.tweens.add({
        targets: flash,
        alpha: { from: 1, to: 0 },
        duration: 200,
        yoyo: true,
        repeat: 2,
        onComplete: () => flash.destroy(),
      });
    }

    // ── Dialogue box (bottom overlay) ────────────────────────
    const boxH = 200;
    const boxY = height - boxH;

    const boxBg = this.add.graphics();
    boxBg.fillStyle(PALETTE.nearBlack, 0.75);
    boxBg.fillRect(0, boxY, width, boxH);
    boxBg.setDepth(100);

    // Thin gold line at top of dialogue box
    boxBg.lineStyle(2, PALETTE.gold, 0.6);
    boxBg.lineBetween(0, boxY, width, boxY);

    // Speaker name
    this.speakerText = this.add
      .text(24, boxY + 16, '', {
        fontFamily: FONT,
        fontSize: '12px',
        color: PALETTE_HEX.gold,
      })
      .setDepth(101);

    // Body text (word-wrapped)
    this.bodyText = this.add
      .text(24, boxY + 42, '', {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.cream,
        wordWrap: { width: width - 48 },
        lineSpacing: 6,
      })
      .setDepth(101);

    // Tap hint
    this.tapHint = this.add
      .text(width / 2, height - 16, '▼ TAP TO CONTINUE', {
        fontFamily: FONT,
        fontSize: '8px',
        color: PALETTE_HEX.midGrey,
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Pulse the tap hint
    this.tweens.add({
      targets: this.tapHint,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Show first line
    this._showLine(0);

    // Tap to advance
    this.input.on('pointerdown', () => {
      this._advance();
    });
  }

  private _showLine(index: number): void {
    const line = this.config.dialogue[index];
    if (!line) return;

    this.speakerText.setText(line.speaker.toUpperCase());
    this.speakerText.setColor(line.color ?? PALETTE_HEX.gold);
    this.bodyText.setText(line.text);

    if (this.config.speakerPanels) {
      this._updateSpeakerPanel(line.speaker);
    }
  }

  /**
   * Slide the active speaker's cutscene panel in, dim the previous one.
   */
  private _updateSpeakerPanel(speaker: string): void {
    const key = speaker.toLowerCase();
    if (key === this.activeSpeakerKey) return;

    const { width, height } = this.scale;
    const panelCenterY = (height - 200) / 2;
    const cfg = this.config.speakerPanels;
    if (!cfg) return;

    // Find the speaker panel config (case-insensitive match)
    const spCfg = cfg[speaker] ?? cfg[key] ??
      Object.entries(cfg).find(([k]) => k.toLowerCase() === key)?.[1];
    if (!spCfg) return; // No panel for this speaker — just show text

    const img = this.panelImages.get(key);
    if (!img) return;

    const onX = width / 2;

    // Slide out the previously active panel
    if (this.activeSpeakerKey) {
      const prevImg = this.panelImages.get(this.activeSpeakerKey);
      const prevCfg = this._findSpeakerCfg(this.activeSpeakerKey);
      if (prevImg && prevCfg) {
        const exitX = prevCfg.side === 'left' ? -width * 0.3 : width * 1.3;
        this.tweens.add({
          targets: prevImg,
          x: exitX,
          alpha: 0,
          duration: SLIDE_DURATION,
          ease: 'Power2',
        });
      }
    }

    // Slide in the new panel
    const enterFrom = spCfg.side === 'left' ? -width * 0.3 : width * 1.3;
    img.setPosition(enterFrom, panelCenterY);
    this.tweens.add({
      targets: img,
      x: onX,
      alpha: 1,
      duration: SLIDE_DURATION,
      ease: 'Back.easeOut',
    });

    this.activeSpeakerKey = key;
  }

  /** Look up a speaker's panel config by lowercase key. */
  private _findSpeakerCfg(key: string): SpeakerPanel | undefined {
    const cfg = this.config.speakerPanels;
    if (!cfg) return undefined;
    return cfg[key] ?? Object.entries(cfg).find(([k]) => k.toLowerCase() === key)?.[1];
  }

  private _advance(): void {
    if (this.isTransitioning) return;

    this.dialogueIndex++;
    if (this.dialogueIndex < this.config.dialogue.length) {
      this._showLine(this.dialogueIndex);
    } else {
      // End of dialogue — transition
      this.isTransitioning = true;
      this.tapHint.setText('');

      this.cameras.main.fadeOut(400, 0x59, 0x66, 0x74);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(this.config.nextScene, this.config.nextData ?? {});
      });
    }
  }
}
