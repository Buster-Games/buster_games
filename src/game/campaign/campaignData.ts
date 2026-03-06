import { PALETTE_HEX } from '../../constants';
import type { DialogueLine, SpeakerPanel } from '../../scenes/CutsceneScene';
import type { DifficultyLevel } from '../tennis/Difficulty';

// ─── Types ───────────────────────────────────────────────────

/**
 * A campaign step is either a cutscene or a match.
 * Steps are played in order. The CampaignManager advances through them.
 */
export type CampaignStep = CutsceneStep | MatchStep;

export interface CutsceneStep {
  type: 'cutscene';
  id: string;
  /** Faded court background texture key. */
  courtBgKey?: string;
  /** Faded court background asset path. */
  courtBgAsset?: string;
  /** Static centre panel key (displayed when no speakerPanels). */
  panelKey?: string;
  /** Static centre panel asset path. */
  panelAsset?: string;
  /** Speaker-specific panels that slide in/out, keyed by speaker name. */
  speakerPanels?: Record<string, SpeakerPanel>;
  dialogue: DialogueLine[];
  /** Optional: play a flash effect before dialogue. */
  flashEffect?: boolean;
}

export interface MatchStep {
  type: 'match';
  id: string;
  courtId: string;
  opponentKey: string;
  opponentName: string;
  /** Doubles partner for opponent side. */
  opponent2Key?: string;
  opponent2Name?: string;
  /** Games to win — defaults to 1 (single game). Set to 2 for best-of-3 games. */
  gamesToWin?: number;
  /** Difficulty level — defaults to 'medium'. */
  difficulty?: DifficultyLevel;
  /**
   * What happens if Lara loses?
   * - 'retry': show a cutscene then replay this match (default)
   * - Step ID string: jump to that step on loss
   */
  onLose?: 'retry' | string;
  /** Cutscene to show on loss before retrying. */
  lossCutscene?: {
    panelKey?: string;
    panelAsset?: string;
    speakerPanels?: Record<string, SpeakerPanel>;
    dialogue: DialogueLine[];
    flashEffect?: boolean;
  };
}

// ─── Colour helpers ─────────────────────────────────────────

const LARA = PALETTE_HEX.green;
const ASIER = PALETTE_HEX.lightBlue;
const NIC = PALETTE_HEX.pink;
const ANN = PALETTE_HEX.coral;
const COLLIN = PALETTE_HEX.tan;
const ANDRE = PALETTE_HEX.orange;
const RITA = PALETTE_HEX.greyPink;
const GIRLS = PALETTE_HEX.gold;

// ─── Panel asset helpers ────────────────────────────────────

const panel = (name: string) => ({
  key: `panel-${name}`,
  asset: `backgrounds/cutscene-panels/${name}.png`,
});

const court = (id: string) => ({
  courtBgKey: `court-bg-${id}`,
  courtBgAsset: `backgrounds/courts/${id}.png`,
});

// ─── Campaign definition ────────────────────────────────────

export const CAMPAIGN_STEPS: CampaignStep[] = [
  // ═══════════════════════════════════════════════════════════
  // 1. OPENING — Lara & Asier chat about tennis
  //    Static asier-lara-tennis panel over acrylic-marketst court
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'intro',
    ...court('acrylic-marketst'),
    panelKey: panel('asier-lara-tennis').key,
    panelAsset: panel('asier-lara-tennis').asset,
    dialogue: [
      { speaker: 'Asier', text: 'Beautiful day for some tennis, no?', color: ASIER },
      { speaker: 'Lara', text: 'Perfect! I hope you\'re ready to lose.', color: LARA },
      { speaker: 'Asier', text: 'Lose?? I\'ve been practising my serve all week!', color: ASIER },
      { speaker: 'Lara', text: 'Practising? You mean watching tennis reels on your phone?', color: LARA },
      { speaker: 'Asier', text: '...That counts! Let\'s settle this on the court.', color: ASIER },
      { speaker: 'Lara', text: 'You\'re on! Prepare to be destroyed.', color: LARA },
      { speaker: 'Asier', text: 'We\'ll see about that!', color: ASIER },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 2. MATCH — Asier vs Lara (Market St)
  // ═══════════════════════════════════════════════════════════
  {
    type: 'match',
    id: 'asier-match',
    courtId: 'acrylic-marketst',
    opponentKey: 'asier',
    opponentName: 'ASIER',
    gamesToWin: 1,
    difficulty: 'easy',
    onLose: 'retry',
    lossCutscene: {
      ...panel('asier'),
      speakerPanels: {
        Asier: { ...panel('asier'), side: 'right' },
        Lara:  { ...panel('lara'), side: 'left' },
      },
      dialogue: [
        { speaker: 'Asier', text: 'Ha! You want to play again, loser??', color: ASIER },
        { speaker: 'Lara', text: 'You\'re ON!! I wasn\'t even trying!', color: LARA },
        { speaker: 'Asier', text: 'Sure you weren\'t...', color: ASIER },
        { speaker: 'Lara', text: 'Just serve the ball, smart guy!', color: LARA },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 3. NIC STEALS ASIER — flash white, sliding panels
  //    Court bg: acrylic-marketst   (just played there)
  //    Nic → nic-steal-asier panel from right
  //    Lara → lara panel from left
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'nic-steals',
    ...court('acrylic-marketst'),
    flashEffect: true,
    speakerPanels: {
      Nic:  { ...panel('nic-steal-asier'), side: 'right' },
      Lara: { ...panel('lara'), side: 'left' },
    },
    dialogue: [
      { speaker: 'Nic', text: 'SURPRISE!!', color: NIC },
      { speaker: 'Lara', text: 'What the— NIC?! What are you doing here?!', color: LARA },
      { speaker: 'Nic', text: 'Ever since you two started dating, I never see Asier anymore!', color: NIC },
      { speaker: 'Nic', text: 'So I\'m taking him. He\'s MINE now.', color: NIC },
      { speaker: 'Lara', text: 'You can\'t just STEAL my boyfriend!', color: LARA },
      { speaker: 'Nic', text: 'Too late! If you want him back...', color: NIC },
      { speaker: 'Nic', text: 'You\'ll have to beat ALL of my trained disciples first!', color: NIC },
      { speaker: 'Lara', text: 'Your WHAT?! Fine. Bring it on.', color: LARA },
      { speaker: 'Nic', text: 'Good luck... you\'re going to need it!', color: NIC },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 4a. OPPONENT 1 — Ann & Collin (doubles)
  //     Court bg: grass-somerset
  //     Static backdrop: ann-collin-tennis → then individual panels
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'ann-collin-intro',
    ...court('grass-somerset'),
    speakerPanels: {
      Ann:    { ...panel('ann'), side: 'right' },
      Collin: { ...panel('collin'), side: 'right' },
      Lara:   { ...panel('lara'), side: 'left' },
    },
    dialogue: [
      { speaker: 'Ann', text: 'Oh hello darling! Nic said you might be popping by.', color: ANN },
      { speaker: 'Lara', text: 'Mum?! Collin?! You\'re working for Nic?!', color: LARA },
      { speaker: 'Collin', text: 'Working for him is a strong term... he promised us a nice dinner.', color: COLLIN },
      { speaker: 'Ann', text: 'A VERY nice dinner. Three courses!', color: ANN },
      { speaker: 'Lara', text: 'Unbelievable. You sold me out for dinner.', color: LARA },
      { speaker: 'Ann', text: 'Don\'t be dramatic, love. It\'s just a quick game of tennis!', color: ANN },
      { speaker: 'Collin', text: 'Fair warning though — your mum\'s got a killer backhand.', color: COLLIN },
      { speaker: 'Lara', text: 'Mum, you don\'t even play tennis!', color: LARA },
      { speaker: 'Ann', text: 'I played once or twice... I\'m basically a pro. Ready, Collin?', color: ANN },
      { speaker: 'Collin', text: 'Born ready!', color: COLLIN },
      { speaker: 'Lara', text: 'This is ridiculous... Let\'s go.', color: LARA },
    ],
  },
  {
    type: 'match',
    id: 'ann-collin-match',
    courtId: 'grass-somerset',
    opponentKey: 'ann',
    opponentName: 'ANN',
    opponent2Key: 'collin',
    opponent2Name: 'COLLIN',
    gamesToWin: 1,
    difficulty: 'easy',
    onLose: 'retry',
    lossCutscene: {
      speakerPanels: {
        Ann:    { ...panel('ann'), side: 'right' },
        Collin: { ...panel('collin'), side: 'right' },
        Lara:   { ...panel('lara'), side: 'left' },
      },
      dialogue: [
        { speaker: 'Ann', text: 'Oh bad luck, darling!', color: ANN },
        { speaker: 'Lara', text: 'I\'m NOT losing to my own Mum!', color: LARA },
        { speaker: 'Collin', text: 'You kind of just did though...', color: COLLIN },
        { speaker: 'Lara', text: 'REMATCH. Now.', color: LARA },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 4b. OPPONENT 2 — Andre & Rita (doubles)
  //     Court bg: clay-fingal
  //     Individual sliding panels
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'andre-rita-intro',
    ...court('clay-fingal'),
    speakerPanels: {
      Andre: { ...panel('andre'), side: 'right' },
      Rita:  { ...panel('rita'), side: 'right' },
      Lara:  { ...panel('lara'), side: 'left' },
    },
    dialogue: [
      { speaker: 'Andre', text: 'Lara! What a lovely surprise!', color: ANDRE },
      { speaker: 'Lara', text: 'Dad! Please don\'t tell me Nic got to you too...', color: LARA },
      { speaker: 'Rita', text: 'He made a very compelling PowerPoint presentation.', color: RITA },
      { speaker: 'Andre', text: 'It had animations and everything! Very professional.', color: ANDRE },
      { speaker: 'Lara', text: 'I can\'t believe this...', color: LARA },
      { speaker: 'Rita', text: 'Don\'t worry, we\'ll go easy on you.', color: RITA },
      { speaker: 'Andre', text: 'Speak for yourself! I\'ve been waiting for this moment.', color: ANDRE },
      { speaker: 'Lara', text: 'The moment to play tennis against your own daughter?', color: LARA },
      { speaker: 'Andre', text: 'The moment to BEAT my own daughter! Big difference!', color: ANDRE },
      { speaker: 'Lara', text: 'In your dreams, Dad. Let\'s do this!', color: LARA },
    ],
  },
  {
    type: 'match',
    id: 'andre-rita-match',
    courtId: 'clay-fingal',
    opponentKey: 'andre',
    opponentName: 'ANDRE',
    opponent2Key: 'rita',
    opponent2Name: 'RITA',
    gamesToWin: 1,
    difficulty: 'medium',
    onLose: 'retry',
    lossCutscene: {
      speakerPanels: {
        Andre: { ...panel('andre'), side: 'right' },
        Rita:  { ...panel('rita'), side: 'right' },
        Lara:  { ...panel('lara'), side: 'left' },
      },
      dialogue: [
        { speaker: 'Andre', text: 'Better luck next time, sweetheart!', color: ANDRE },
        { speaker: 'Lara', text: 'I\'m getting Asier back whether you like it or not!', color: LARA },
        { speaker: 'Rita', text: 'That\'s the spirit, dear! Try again!', color: RITA },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 5. FINAL BOSS — Nic
  //    Court bg: acrylic-pavo
  //    Nic → nic-steal-asier (intro), nic (mid-match), Lara → lara
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'nic-boss-intro',
    ...court('acrylic-pavo'),
    speakerPanels: {
      Nic:  { ...panel('nic-steal-asier'), side: 'right' },
      Lara: { ...panel('lara'), side: 'left' },
    },
    dialogue: [
      { speaker: 'Lara', text: 'NIC! I beat all your so-called "disciples". Give Asier back!', color: LARA },
      { speaker: 'Nic', text: 'Impressive... but you haven\'t beaten ME yet!', color: NIC },
      { speaker: 'Lara', text: 'Have you looked in a mirror lately? I think you\'re balding.', color: LARA },
      { speaker: 'Nic', text: 'EXCUSE ME?! That is a MATURED hairline!', color: NIC },
      { speaker: 'Lara', text: 'Sure, Nic. Sure it is.', color: LARA },
      { speaker: 'Nic', text: 'Enough talk! Asier will ALWAYS choose me!', color: NIC },
      { speaker: 'Lara', text: 'Asier will always love ME. Now let\'s settle this!', color: LARA },
    ],
  },
  {
    type: 'match',
    id: 'nic-match-set1',
    courtId: 'acrylic-pavo',
    opponentKey: 'nic',
    opponentName: 'NIC',
    gamesToWin: 1,
    difficulty: 'medium',
    onLose: 'retry',
    lossCutscene: {
      speakerPanels: {
        Nic:  { ...panel('nic'), side: 'right' },
        Lara: { ...panel('lara'), side: 'left' },
      },
      dialogue: [
        { speaker: 'Nic', text: 'HA! You\'ll never get him back!', color: NIC },
        { speaker: 'Lara', text: 'I\'m just warming up.', color: LARA },
      ],
    },
  },
  {
    type: 'cutscene',
    id: 'nic-mid-match',
    ...court('acrylic-pavo'),
    speakerPanels: {
      Nic:  { ...panel('nic'), side: 'right' },
      Lara: { ...panel('lara'), side: 'left' },
    },
    dialogue: [
      { speaker: 'Nic', text: 'Not bad... but I\'m going to beat you no matter what!', color: NIC },
      { speaker: 'Nic', text: 'You CAN\'T have Asier! He\'s my best mate!', color: NIC },
      { speaker: 'Lara', text: 'He\'s my BOYFRIEND, Nic. There\'s a difference!', color: LARA },
      { speaker: 'Nic', text: 'This isn\'t over! Best of three — RIGHT NOW!', color: NIC },
      { speaker: 'Lara', text: 'Bring it!', color: LARA },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 5b. THE GIRLS CHEER — Lara's friends show up to support her
  //     Static the-girls panel over acrylic-pavo court
  //     Then Nic complains about having no support
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'girls-cheer',
    ...court('acrylic-pavo'),
    ...panel('the-girls'),
    speakerPanels: {
      'The Girls': { ...panel('the-girls'), side: 'left' },
      Nic:         { ...panel('nic'), side: 'right' },
      Lara:        { ...panel('lara'), side: 'left' },
    },
    dialogue: [
      { speaker: 'The Girls', text: 'LARAAA!! WE LOVE YOU!!', color: GIRLS },
      { speaker: 'The Girls', text: 'BEAT THAT GORILLA!! 🦍', color: GIRLS },
      { speaker: 'Lara', text: 'GIRLS!! You came!!', color: LARA },
      { speaker: 'The Girls', text: 'Of COURSE we came! Now go get your man back!', color: GIRLS },
      { speaker: 'Nic', text: 'Excuse me?! Where are MY supporters?!', color: NIC },
      { speaker: 'The Girls', text: '...', color: GIRLS },
      { speaker: 'Nic', text: 'This is so unfair. I\'m literally RIGHT HERE.', color: NIC },
      { speaker: 'Lara', text: 'Maybe if you weren\'t kidnapping people, Nic.', color: LARA },
      { speaker: 'The Girls', text: 'GO LARA GO!! 🎉', color: GIRLS },
      { speaker: 'Nic', text: 'I don\'t need cheerleaders anyway... I have MUSCLES.', color: NIC },
    ],
  },

  {
    type: 'match',
    id: 'nic-match-final',
    courtId: 'acrylic-pavo',
    opponentKey: 'nic',
    opponentName: 'NIC',
    gamesToWin: 2,
    difficulty: 'hard',
    onLose: 'retry',
    lossCutscene: {
      speakerPanels: {
        Nic:  { ...panel('nic'), side: 'right' },
        Lara: { ...panel('lara'), side: 'left' },
      },
      dialogue: [
        { speaker: 'Nic', text: 'Face it. You can\'t beat the NICMEISTER!', color: NIC },
        { speaker: 'Lara', text: 'Did you just call yourself the Nicmeister?', color: LARA },
        { speaker: 'Nic', text: '...No.', color: NIC },
        { speaker: 'Lara', text: 'Again. NOW.', color: LARA },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 6. REUNION — Lara & Asier reunited
  //    Static asier-lara-united panel over acrylic-pavo court
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'reunion',
    ...court('acrylic-pavo'),
    panelKey: panel('asier-lara-united').key,
    panelAsset: panel('asier-lara-united').asset,
    dialogue: [
      { speaker: 'Asier', text: 'LARA!! You came for me!', color: ASIER },
      { speaker: 'Lara', text: 'Of course I did, you muppet!', color: LARA },
      { speaker: 'Asier', text: 'I missed you so much...', color: ASIER },
      { speaker: 'Lara', text: 'Don\'t say I don\'t do anything for you!', color: LARA },
      { speaker: 'Asier', text: 'You literally fought your entire family to rescue me.', color: ASIER },
      { speaker: 'Lara', text: 'And a balding gorilla. Don\'t forget the gorilla.', color: LARA },
      { speaker: 'Nic', text: '(from a distance) I HEARD THAT! IT\'S A MATURED HAIRLINE!', color: NIC },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 6b. "Should we play some tennis?" — over New Farm
  //     Static asier-lara-united panel over grass-new-farm court
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'finale-tennis',
    ...court('grass-new-farm'),
    panelKey: panel('asier-lara-tennis').key,
    panelAsset: panel('asier-lara-tennis').asset,
    dialogue: [
      { speaker: 'Asier', text: 'So... should we play some tennis?', color: ASIER },
      { speaker: 'Lara', text: 'After all that? You want MORE tennis?!', color: LARA },
      { speaker: 'Asier', text: 'What can I say — I like watching you win!', color: ASIER },
      { speaker: 'Lara', text: 'Oh so NOW you admit I\'m better than you!', color: LARA },
      { speaker: 'Asier', text: 'I said no such thing! I said I like watching you win...', color: ASIER },
      { speaker: 'Asier', text: '...because it means I get to beat you next time!', color: ASIER },
      { speaker: 'Lara', text: 'In your dreams! You\'re on!', color: LARA },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 6c. BONUS MATCH — Asier vs Lara at Grass New Farm
  // ═══════════════════════════════════════════════════════════
  {
    type: 'match',
    id: 'finale-match',
    courtId: 'grass-new-farm',
    opponentKey: 'asier',
    opponentName: 'ASIER',
    gamesToWin: 1,
    difficulty: 'easy',
    onLose: 'retry',
    lossCutscene: {
      speakerPanels: {
        Asier: { ...panel('asier'), side: 'right' },
        Lara:  { ...panel('lara'), side: 'left' },
      },
      dialogue: [
        { speaker: 'Asier', text: 'Told you! Rematch?', color: ASIER },
        { speaker: 'Lara', text: 'You got lucky. AGAIN!', color: LARA },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 7. FINAL MESSAGE
  //    Static asier-lara-united panel over grass-new-farm court
  // ═══════════════════════════════════════════════════════════
  {
    type: 'cutscene',
    id: 'love-message',
    ...court('grass-new-farm'),
    panelKey: panel('asier-lara-united').key,
    panelAsset: panel('asier-lara-united').asset,
    dialogue: [
      { speaker: '❤', text: 'I love you, Lara.\n\nHappy Birthday!', color: PALETTE_HEX.pink },
      { speaker: '', text: '— Asier', color: ASIER },
    ],
  },
];
