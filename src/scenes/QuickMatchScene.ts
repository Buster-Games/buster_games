import Phaser from 'phaser';
import { PALETTE, PALETTE_HEX, FONT } from '../constants';
import { COURTS } from '../game/tennis';
import _characters from 'virtual:characters';

/**
 * Opponent definition for the quick-match selector.
 */
interface OpponentDef {
  id: string;
  name: string;
  /** Sprite key prefix (folder name under assets/sprites/) */
  spriteKey: string;
}

// All characters are discovered at build time by the charactersPlugin in vite.config.ts.
// Just add a folder under assets/sprites/ with a metadata.json — no code changes needed.
// Lara is always the player and is excluded from the opponent list.
const OPPONENTS: OpponentDef[] = (_characters as OpponentDef[]).filter(o => o.id !== 'lara');

const SET_OPTIONS = [1, 3] as const;

/**
 * QuickMatchScene — Lets the player configure a quick match.
 *
 * Selectable options:
 *   - Court (from COURTS registry)
 *   - Opponent (Asier or Nic)
 *   - Number of sets (1 or 3)
 */
export class QuickMatchScene extends Phaser.Scene {
  private selectedCourtIdx = 0;
  private selectedOpponentIdx = 0;
  private selectedSetsIdx = 0;

  private courtIds: string[] = [];

  // UI text references for live updates
  private courtNameText!: Phaser.GameObjects.Text;
  private opponentNameText!: Phaser.GameObjects.Text;
  private opponentDescText!: Phaser.GameObjects.Text;
  private setsText!: Phaser.GameObjects.Text;
  private courtBg!: Phaser.GameObjects.Image;
  private opponentSprite!: Phaser.GameObjects.Sprite | null;
  private playerSprite!: Phaser.GameObjects.Sprite | null;
  private playerAnimTimer!: Phaser.Time.TimerEvent | null;
  private opponentAnimTimer!: Phaser.Time.TimerEvent | null;

  // Animations available for the player preview cycle
  private static readonly PLAYER_ANIMS = [
    'lara-idle-south',
    'lara-run-south',
    'lara-celebrate-south',
  ] as const;

  constructor() {
    super({ key: 'QuickMatchScene' });
  }

  preload(): void {
    // Preload all court background images
    for (const [id, def] of Object.entries(COURTS)) {
      const key = `quickmatch-court-${id}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, def.asset);
      }
    }

    // Preload south-facing animation frames for player (Lara) and all opponents
    const charKeys = ['lara', ...OPPONENTS.map(o => o.spriteKey)];
    for (const charKey of charKeys) {
      const base = `sprites/${charKey}`;
      for (let i = 0; i < 4; i++) {
        const idleKey = `${charKey}-idle-south-${i}`;
        if (!this.textures.exists(idleKey)) {
          this.load.image(idleKey, `${base}/animations/breathing-idle/south/frame_00${i}.png`);
        }
        const celebKey = `${charKey}-celebrate-south-${i}`;
        if (!this.textures.exists(celebKey)) {
          this.load.image(celebKey, `${base}/animations/celebration/south/frame_00${i}.png`);
        }
      }
      for (let i = 0; i < 6; i++) {
        const runKey = `${charKey}-run-south-${i}`;
        if (!this.textures.exists(runKey)) {
          this.load.image(runKey, `${base}/animations/running-6-frames/south/frame_00${i}.png`);
        }
      }
    }
  }

  create(): void {
    const { width, height } = this.scale;
    this.courtIds = Object.keys(COURTS);
    this.playerSprite = null;
    this.playerAnimTimer = null;
    this.opponentSprite = null;
    this.opponentAnimTimer = null;

    // Register preview animations if not already created
    this._ensureLaraAnims();
    this._ensureCharacterAnims(OPPONENTS[this.selectedOpponentIdx].spriteKey);

    // Cleanup timers when scene shuts down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.playerAnimTimer?.remove();
      this.opponentAnimTimer?.remove();
    });

    // ── Background ───────────────────────────────────────────
    // Court image underlay (cover-scaled, very faded)
    const firstCourtId = this.courtIds[this.selectedCourtIdx];
    const firstCourtDef = COURTS[firstCourtId];
    const coverScale = Math.max(width / firstCourtDef.imageSize.w, height / firstCourtDef.imageSize.h);
    this.courtBg = this.add
      .image(width / 2, height / 2, `quickmatch-court-${firstCourtId}`)
      .setScale(coverScale)
      .setAlpha(0.13)
      .setDepth(-1);

    // Dark nearBlack overlay so text stays legible
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.nearBlack, 0.4);
    bg.fillRect(0, 0, width, height);

    // Grid decoration
    bg.lineStyle(1, PALETTE.darkBlue, 0.15);
    for (let y = 0; y < height; y += 40) {
      bg.lineBetween(0, y, width, y);
    }
    for (let x = 0; x < width; x += 40) {
      bg.lineBetween(x, 0, x, height);
    }

    // ── Title ────────────────────────────────────────────────
    this.add
      .text(width / 2, 55, 'QUICK MATCH', {
        fontFamily: FONT,
        fontSize: '20px',
        color: PALETTE_HEX.cream,
        align: 'center',
        stroke: PALETTE_HEX.darkBlue,
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // ── Court selector ───────────────────────────────────────
    const courtY = 160;
    this._createSectionLabel(width / 2, courtY - 35, 'COURT');

    this.courtNameText = this.add
      .text(width / 2, courtY, this._currentCourtName(), {
        fontFamily: FONT,
        fontSize: '14px',
        color: PALETTE_HEX.gold,
        align: 'center',
      })
      .setOrigin(0.5);

    this._createArrows(width, courtY, () => this._prevCourt(), () => this._nextCourt());

    // ── Opponent selector ────────────────────────────────────
    const oppY = 340;
    const playerX = width * 0.27;
    const opponentX = width * 0.73;

    // Section labels
    this._createSectionLabel(playerX, oppY - 95, 'YOU');
    this._createSectionLabel(opponentX, oppY - 95, 'OPPONENT');

    // VS divider
    this.add
      .text(width / 2, oppY - 20, 'VS', {
        fontFamily: FONT,
        fontSize: '18px',
        color: PALETTE_HEX.gold,
        stroke: PALETTE_HEX.darkBlue,
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Player (Lara) animated sprite
    this.playerSprite = this.add
      .sprite(playerX, oppY - 20, 'lara-idle-south-0')
      .setOrigin(0.5);
    this._scalePlayerSprite();
    this.playerSprite.play('lara-idle-south');
    this._startPlayerAnimCycle();

    this.add
      .text(playerX, oppY + 50, 'LARA', {
        fontFamily: FONT,
        fontSize: '16px',
        color: PALETTE_HEX.cream,
        align: 'center',
        stroke: PALETTE_HEX.darkBlue,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Opponent animated sprite
    const initOppKey = OPPONENTS[this.selectedOpponentIdx].spriteKey;
    this.opponentSprite = this.add
      .sprite(opponentX, oppY - 20, `${initOppKey}-idle-south-0`)
      .setOrigin(0.5);
    this._scaleOpponentSprite();
    this.opponentSprite.play(`${initOppKey}-idle-south`);
    this._startOpponentAnimCycle();

    this.opponentNameText = this.add
      .text(opponentX, oppY + 50, OPPONENTS[this.selectedOpponentIdx].name, {
        fontFamily: FONT,
        fontSize: '16px',
        color: PALETTE_HEX.cream,
        align: 'center',
        stroke: PALETTE_HEX.darkBlue,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.opponentDescText = this.add
      .text(opponentX, oppY + 75, '', {
        fontFamily: FONT,
        fontSize: '9px',
        color: PALETTE_HEX.lightGrey,
        align: 'center',
      })
      .setOrigin(0.5);

    this._createArrows(width, oppY, () => this._prevOpponent(), () => this._nextOpponent());

    // ── Sets selector ────────────────────────────────────────
    const setsY = 510;
    this._createSectionLabel(width / 2, setsY - 35, 'SETS');

    this.setsText = this.add
      .text(width / 2, setsY, this._currentSetsLabel(), {
        fontFamily: FONT,
        fontSize: '14px',
        color: PALETTE_HEX.gold,
        align: 'center',
      })
      .setOrigin(0.5);

    this._createArrows(width, setsY, () => this._prevSets(), () => this._nextSets());

    // ── Play button ──────────────────────────────────────────
    this._createPlayButton(width / 2, height - 140);

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
      this.scene.start('GameModeScene');
    });
  }

  // ── Selectors ──────────────────────────────────────────────

  private _currentCourtName(): string {
    const id = this.courtIds[this.selectedCourtIdx];
    return COURTS[id].name;
  }

  private _currentSetsLabel(): string {
    const sets = SET_OPTIONS[this.selectedSetsIdx];
    return sets === 1 ? '1 SET' : `BEST OF ${sets}`;
  }

  private _prevCourt(): void {
    this.selectedCourtIdx = (this.selectedCourtIdx - 1 + this.courtIds.length) % this.courtIds.length;
    this.courtNameText.setText(this._currentCourtName());
    this._crossfadeCourtBg();
  }

  private _nextCourt(): void {
    this.selectedCourtIdx = (this.selectedCourtIdx + 1) % this.courtIds.length;
    this.courtNameText.setText(this._currentCourtName());
    this._crossfadeCourtBg();
  }

  private _prevOpponent(): void {
    this.selectedOpponentIdx = (this.selectedOpponentIdx - 1 + OPPONENTS.length) % OPPONENTS.length;
    this._updateOpponentDisplay();
  }

  private _nextOpponent(): void {
    this.selectedOpponentIdx = (this.selectedOpponentIdx + 1) % OPPONENTS.length;
    this._updateOpponentDisplay();
  }

  private _updateOpponentDisplay(): void {
    const opp = OPPONENTS[this.selectedOpponentIdx];
    this.opponentNameText.setText(opp.name);
    this.opponentDescText.setText('');

    if (this.opponentSprite) {
      this._ensureCharacterAnims(opp.spriteKey);
      this.opponentSprite.play(`${opp.spriteKey}-idle-south`);
      this._scaleOpponentSprite();
    }
  }

  private _scaleOpponentSprite(): void {
    if (!this.opponentSprite) return;
    const maxSize = 100;
    const w = this.opponentSprite.width;
    const h = this.opponentSprite.height;
    if (w === 0 || h === 0) return;
    const s = Math.min(maxSize / w, maxSize / h);
    this.opponentSprite.setScale(s);
  }

  private _scalePlayerSprite(): void {
    if (!this.playerSprite) return;
    const maxSize = 100;
    const w = this.playerSprite.width;
    const h = this.playerSprite.height;
    if (w === 0 || h === 0) return;
    const s = Math.min(maxSize / w, maxSize / h);
    this.playerSprite.setScale(s);
  }

  /**
   * Register preview animations for a given character key if they don't already exist.
   */
  private _ensureCharacterAnims(charKey: string): void {
    if (!this.anims.exists(`${charKey}-idle-south`)) {
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let i = 0; i < 4; i++) frames.push({ key: `${charKey}-idle-south-${i}` });
      this.anims.create({ key: `${charKey}-idle-south`, frames, frameRate: 4, repeat: -1, yoyo: true });
    }
    if (!this.anims.exists(`${charKey}-run-south`)) {
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let i = 0; i < 6; i++) frames.push({ key: `${charKey}-run-south-${i}` });
      this.anims.create({ key: `${charKey}-run-south`, frames, frameRate: 12, repeat: -1 });
    }
    if (!this.anims.exists(`${charKey}-celebrate-south`)) {
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let i = 0; i < 4; i++) frames.push({ key: `${charKey}-celebrate-south-${i}` });
      this.anims.create({ key: `${charKey}-celebrate-south`, frames, frameRate: 6, repeat: -1, yoyo: true });
    }
  }

  /** Alias so existing call site still works. */
  private _ensureLaraAnims(): void {
    this._ensureCharacterAnims('lara');
  }

  /**
   * Start a looping timer that randomly switches Lara's animation every 3 seconds.
   */
  private _startPlayerAnimCycle(): void {
    this.playerAnimTimer = this.time.addEvent({
      delay: 3000,
      callback: this._cyclePlayerAnim,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Pick a random player animation that isn't the currently playing one.
   */
  private _cyclePlayerAnim(): void {
    if (!this.playerSprite) return;
    const anims = QuickMatchScene.PLAYER_ANIMS;
    const current = this.playerSprite.anims.currentAnim?.key ?? '';
    const choices = anims.filter(a => a !== current);
    const next = choices[Math.floor(Math.random() * choices.length)];
    this.playerSprite.play(next);
    this._scalePlayerSprite();
  }

  /** Start a looping timer that randomly cycles the opponent's animation every 3 seconds. */
  private _startOpponentAnimCycle(): void {
    this.opponentAnimTimer?.remove();
    this.opponentAnimTimer = this.time.addEvent({
      delay: 3000,
      callback: this._cycleOpponentAnim,
      callbackScope: this,
      loop: true,
    });
  }

  /** Pick a random animation for the current opponent that differs from the active one. */
  private _cycleOpponentAnim(): void {
    if (!this.opponentSprite) return;
    const key = OPPONENTS[this.selectedOpponentIdx].spriteKey;
    const all = [
      `${key}-idle-south`,
      `${key}-run-south`,
      `${key}-celebrate-south`,
    ];
    const current = this.opponentSprite.anims.currentAnim?.key ?? '';
    const choices = all.filter(a => a !== current);
    const next = choices[Math.floor(Math.random() * choices.length)];
    this.opponentSprite.play(next);
    this._scaleOpponentSprite();
  }

  /**
   * Crossfade the court background image to the newly selected court.
   * Tweens alpha to 0, swaps texture, then tweens back.
   */
  private _crossfadeCourtBg(): void {
    const { width, height } = this.scale;
    const id = this.courtIds[this.selectedCourtIdx];
    const def = COURTS[id];
    const coverScale = Math.max(width / def.imageSize.w, height / def.imageSize.h);
    this.tweens.add({
      targets: this.courtBg,
      alpha: 0,
      duration: 150,
      ease: 'Linear',
      onComplete: () => {
        this.courtBg.setTexture(`quickmatch-court-${id}`).setScale(coverScale);
        this.tweens.add({
          targets: this.courtBg,
          alpha: 0.7,
          duration: 250,
          ease: 'Linear',
        });
      },
    });
  }

  private _prevSets(): void {
    this.selectedSetsIdx = (this.selectedSetsIdx - 1 + SET_OPTIONS.length) % SET_OPTIONS.length;
    this.setsText.setText(this._currentSetsLabel());
  }

  private _nextSets(): void {
    this.selectedSetsIdx = (this.selectedSetsIdx + 1) % SET_OPTIONS.length;
    this.setsText.setText(this._currentSetsLabel());
  }

  // ── UI helpers ─────────────────────────────────────────────

  private _createSectionLabel(x: number, y: number, label: string): void {
    this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '10px',
        color: PALETTE_HEX.lightBlue,
        align: 'center',
      })
      .setOrigin(0.5);
  }

  /**
   * Create left/right arrows flanking a selector row.
   */
  private _createArrows(
    screenW: number,
    y: number,
    onLeft: () => void,
    onRight: () => void
  ): void {
    const arrowPadding = 40;

    const leftArrow = this.add
      .text(arrowPadding, y, '<', {
        fontFamily: FONT,
        fontSize: '24px',
        color: PALETTE_HEX.cream,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    leftArrow.on('pointerdown', onLeft);
    leftArrow.on('pointerover', () => leftArrow.setColor(PALETTE_HEX.gold));
    leftArrow.on('pointerout', () => leftArrow.setColor(PALETTE_HEX.cream));

    const rightArrow = this.add
      .text(screenW - arrowPadding, y, '>', {
        fontFamily: FONT,
        fontSize: '24px',
        color: PALETTE_HEX.cream,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    rightArrow.on('pointerdown', onRight);
    rightArrow.on('pointerover', () => rightArrow.setColor(PALETTE_HEX.gold));
    rightArrow.on('pointerout', () => rightArrow.setColor(PALETTE_HEX.cream));
  }

  /**
   * Create the big PLAY button.
   */
  private _createPlayButton(x: number, y: number): void {
    const btnW = 240;
    const btnH = 64;
    const container = this.add.container(x, y);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(PALETTE.nearBlack, 0.5);
    shadow.fillRoundedRect(-btnW / 2 + 4, -btnH / 2 + 4, btnW, btnH, 12);
    container.add(shadow);

    // Background
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(PALETTE.green, 0.9);
    bgGfx.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    bgGfx.lineStyle(3, PALETTE.cream, 1);
    bgGfx.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    container.add(bgGfx);

    // Label
    const label = this.add
      .text(0, 0, 'PLAY', {
        fontFamily: FONT,
        fontSize: '22px',
        color: PALETTE_HEX.cream,
        stroke: PALETTE_HEX.darkBlue,
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    container.add(label);

    // Floating
    this.tweens.add({
      targets: container,
      y: y - 4,
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Hit area
    const hitArea = this.add
      .rectangle(0, 0, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      bgGfx.clear();
      bgGfx.fillStyle(PALETTE.forestGreen, 0.95);
      bgGfx.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      bgGfx.lineStyle(3, PALETTE.gold, 1);
      bgGfx.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    hitArea.on('pointerout', () => {
      bgGfx.clear();
      bgGfx.fillStyle(PALETTE.green, 0.9);
      bgGfx.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      bgGfx.lineStyle(3, PALETTE.cream, 1);
      bgGfx.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    hitArea.on('pointerdown', () => {
      const courtId = this.courtIds[this.selectedCourtIdx];
      const opponent = OPPONENTS[this.selectedOpponentIdx];
      const sets = SET_OPTIONS[this.selectedSetsIdx];

      this.scene.start('TennisScene', {
        courtId,
        opponentKey: opponent.spriteKey,
        opponentName: opponent.name,
        setsToWin: sets === 1 ? 1 : 2, // 1 set = win 1, best of 3 = win 2
      });
    });
  }
}
