import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';
import { COURTS } from '../game/tennis';

/**
 * GameModeScene — Shown after selecting "Love at First Serve".
 *
 * Lets the player choose between Campaign (coming soon) and Quick Match.
 */
export class GameModeScene extends Phaser.Scene {
  private courtBg!: Phaser.GameObjects.Image;
  private courtCycleTimer!: Phaser.Time.TimerEvent;
  private currentCourtIdx = 0;
  private courtIds: string[] = [];

  constructor() {
    super({ key: 'GameModeScene' });
  }

  preload(): void {
    for (const [id, def] of Object.entries(COURTS)) {
      const key = `gamemode-court-${id}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, def.asset);
      }
    }
  }

  create(): void {
    const { width, height } = this.scale;
    this.courtIds = Object.keys(COURTS);

    // Pick a random starting court
    this.currentCourtIdx = Math.floor(Math.random() * this.courtIds.length);

    // Cleanup timer on shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.courtCycleTimer?.remove();
    });

    // ── Court image underlay (cover-scaled, very faded) ───────────
    const initId = this.courtIds[this.currentCourtIdx];
    const initDef = COURTS[initId];
    const initScale = Math.max(width / initDef.imageSize.w, height / initDef.imageSize.h);
    this.courtBg = this.add
      .image(width / 2, height / 2, `gamemode-court-${initId}`)
      .setScale(initScale)
      .setAlpha(0.5)
      .setDepth(-1);

    // Start cycling every 5 seconds
    this.courtCycleTimer = this.time.addEvent({
      delay: 5000,
      callback: this._cycleCourtBg,
      callbackScope: this,
      loop: true,
    });

    // ── Dark overlay so text stays legible ──────────────────
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.nearBlack, 0.6);
    bg.fillRect(0, 0, width, height);

    // Subtle court-line decoration
    bg.lineStyle(1, PALETTE.darkBlue, 0.3);
    for (let y = 0; y < height; y += 40) {
      bg.lineBetween(0, y, width, y);
    }

    // ── Title ────────────────────────────────────────────────
    this.add
      .text(width / 2, 60, 'LOVE AT\nFIRST SERVE', {
        fontFamily: FONT,
        fontSize: '22px',
        color: PALETTE_HEX.cream,
        align: 'center',
        lineSpacing: 8,
        stroke: PALETTE_HEX.darkBlue,
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // ── Subtitle ─────────────────────────────────────────────
    this.add
      .text(width / 2, 130, 'Choose your mode', {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.gold,
        align: 'center',
      })
      .setOrigin(0.5);

    // ── Quick Match button ───────────────────────────────────
    this._createModeButton(
      width / 2,
      height * 0.38,
      'QUICK MATCH',
      'Jump straight into a match',
      true,
      () => {
        this.scene.start('QuickMatchScene');
      }
    );

    // ── Campaign button (disabled) ───────────────────────────
    this._createModeButton(
      width / 2,
      height * 0.55,
      'CAMPAIGN',
      'Battle through opponents\nto rescue Asier',
      false,
      () => { /* not ready */ }
    );

    // ── Back button ──────────────────────────────────────────
    const backBtn = this.add
      .text(20, 20, '← BACK', {
        fontFamily: FONT,
        fontSize: '12px',
        color: PALETTE_HEX.cream,
        backgroundColor: PALETTE_HEX.nearBlack,
        padding: { x: 8, y: 4 },
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(300);

    backBtn.on('pointerdown', () => {
      this.scene.start('HomeScene');
    });
  }

  private _cycleCourtBg(): void {
    const { width, height } = this.scale;
    const nextIdx = (() => {
      let idx: number;
      do { idx = Math.floor(Math.random() * this.courtIds.length); }
      while (idx === this.currentCourtIdx && this.courtIds.length > 1);
      return idx;
    })();
    this.currentCourtIdx = nextIdx;
    const id = this.courtIds[nextIdx];
    const def = COURTS[id];
    const coverScale = Math.max(width / def.imageSize.w, height / def.imageSize.h);

    this.tweens.add({
      targets: this.courtBg,
      alpha: 0,
      duration: 400,
      ease: 'Linear',
      onComplete: () => {
        this.courtBg.setTexture(`gamemode-court-${id}`).setScale(coverScale);
        this.tweens.add({
          targets: this.courtBg,
          alpha: 0.5,
          duration: 600,
          ease: 'Linear',
        });
      },
    });
  }

  /**
   * Creates a mode selection button.
   */
  private _createModeButton(
    x: number,
    y: number,
    label: string,
    subtitle: string,
    enabled: boolean,
    onTap: () => void
  ): void {
    const btnW = 300;
    const btnH = 110;
    const container = this.add.container(x, y);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(PALETTE.nearBlack, 0.5);
    shadow.fillRoundedRect(-btnW / 2 + 4, -btnH / 2 + 4, btnW, btnH, 12);
    container.add(shadow);

    // Background
    const bgGfx = this.add.graphics();
    this._drawButton(bgGfx, btnW, btnH, enabled, false);
    container.add(bgGfx);

    // Label
    const labelText = this.add
      .text(0, -14, label, {
        fontFamily: FONT,
        fontSize: '16px',
        color: enabled ? PALETTE_HEX.cream : PALETTE_HEX.midGrey,
        align: 'center',
        stroke: enabled ? PALETTE_HEX.darkBlue : undefined,
        strokeThickness: enabled ? 3 : 0,
      })
      .setOrigin(0.5);
    container.add(labelText);

    // Subtitle
    const subText = this.add
      .text(0, 18, subtitle, {
        fontFamily: FONT,
        fontSize: '8px',
        color: enabled ? PALETTE_HEX.lightGrey : PALETTE_HEX.darkGrey,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);
    container.add(subText);

    // "Coming Soon" badge
    if (!enabled) {
      const badge = this.add
        .text(btnW / 2 - 10, -btnH / 2 + 8, 'SOON', {
          fontFamily: FONT,
          fontSize: '8px',
          color: PALETTE_HEX.nearBlack,
          backgroundColor: PALETTE_HEX.gold,
          padding: { x: 4, y: 2 },
        })
        .setOrigin(1, 0);
      container.add(badge);
    }

    // Floating animation
    this.tweens.add({
      targets: container,
      y: y - 3,
      duration: 1800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Hit area
    const hitArea = this.add
      .rectangle(0, 0, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: enabled });
    container.add(hitArea);

    if (enabled) {
      hitArea.on('pointerover', () => {
        this._drawButton(bgGfx, btnW, btnH, true, true);
        this.tweens.add({ targets: container, scaleX: 1.02, scaleY: 1.02, duration: 100, ease: 'Back.easeOut' });
      });
      hitArea.on('pointerout', () => {
        this._drawButton(bgGfx, btnW, btnH, true, false);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100, ease: 'Back.easeOut' });
      });
      hitArea.on('pointerdown', () => {
        this.tweens.add({ targets: container, scaleX: 0.97, scaleY: 0.97, duration: 50, yoyo: true, onComplete: onTap });
      });
    }
  }

  private _drawButton(
    gfx: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    enabled: boolean,
    hovered: boolean
  ): void {
    gfx.clear();
    const bgColor = enabled ? (hovered ? PALETTE.lightBlue : PALETTE.blue) : PALETTE.darkGrey;
    const borderColor = enabled ? PALETTE.cream : PALETTE.midGrey;

    gfx.fillStyle(bgColor, enabled ? 0.85 : 0.5);
    gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    gfx.lineStyle(3, borderColor, 1);
    gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

    if (enabled) {
      gfx.lineStyle(1, PALETTE.white, 0.12);
      gfx.strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 10);
    }
  }
}
