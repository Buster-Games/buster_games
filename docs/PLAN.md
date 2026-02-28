# Buster Games — Project Plan

> Living reference document. Update this as decisions change.

---

## Overview

**Buster Games** is a mobile web app housing a suite of retro 8-bit mini-games, built as a birthday gift for Lara. The app is styled with a modern retro aesthetic — nostalgic pixel art that animates smoothly and feels polished. Buster is the name of the van Lara and Asier built together, and it is the heart of the app's story.

**Target platform:** Mobile web (any device, responsive, touch-first)  
**Hosting:** GitHub Pages (free, static site)

---

## Tool Stack

| Tool | Cost | Purpose |
|------|------|---------|
| [Phaser 3](https://phaser.io) | ✅ Free (MIT) | Game engine — scenes, physics, tweens, sprite animation, touch input |
| [Vite](https://vitejs.dev) | ✅ Free | Bundler — fast dev server, outputs static `dist/` for GitHub Pages |
| TypeScript | ✅ Free | Type-safe game logic, IDE autocomplete |
| GitHub Pages | ✅ Free | Hosting via `gh-pages` deploy action |
| [Pixel Lab](https://pixellab.ai) Tier 1 | $12/mo | AI pixel art — characters, animations, environments, sprite sheets. Tier 1 unlocks animation tools, up to 320×320px output, commercial licence |
| [Aseprite](https://github.com/aseprite/aseprite) (self-compiled) | ✅ Free | Assemble/edit sprites, palette-lock to Aragon16, export PNG + Aseprite JSON for Phaser. Self-compilation is free for personal use per the EULA. Preferred over LibreSprite — actively maintained, has tilemap support and Lua scripting for palette automation |
| [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) | ✅ Free | Google Font — 8-bit typeface for all UI text |
| [BeepBox](https://beepbox.co) | ✅ Free | In-browser chiptune composer for music and SFX |
| Aragon16 palette | ✅ In repo | `assets/palettes/aragon16.hex` — all art must use only these 16 colours |

---

## Colour Palette — Aragon16

File: `assets/palettes/aragon16.hex`

| # | Hex | Role |
|---|-----|------|
| 1 | `#f9f8dd` | Cream / highlights |
| 2 | `#d2e291` | Light green / grass |
| 3 | `#a8d455` | Lime green / court grass |
| 4 | `#9cab6c` | Olive green / foliage |
| 5 | `#5c8d58` | Forest green / deep foliage |
| 6 | `#3b473c` | Near-black green / shadows |
| 7 | `#8b8893` | Light grey / UI panels |
| 8 | `#54555c` | Dark grey / UI borders |
| 9 | `#e0bf7a` | Warm tan / sand, skin highlights |
| 10 | `#ba9572` | Medium skin / clay court |
| 11 | `#876661` | Dusty rose-brown / shading |
| 12 | `#272120` | Near-black / outlines |
| 13 | `#b7c4d0` | Light steel blue / sky |
| 14 | `#8daad6` | Cornflower blue / hard court |
| 15 | `#9197b6` | Periwinkle / UI accents |
| 16 | `#6b72d4` | Bright blue-violet / primary accent |

---

## Art Pipeline

```
1. Generate sprite frames in Pixel Lab (Tier 1)
   → Use pixel art style, ~32×32px characters
   → Reference Aragon16 palette colours in prompts
   → Export individual PNG frames (Pixel Lab animation tool)
        │
2. Import PNGs into Aseprite (self-compiled — free for personal use)
   → Assemble frames into animation timeline
   → Run Lua palette-clamp script to snap any off-palette pixels to
     exact Aragon16 hex values automatically
   → Tag each animation (idle, run-left, run-right, swing, etc.)
        │
3. Export from Aseprite
   → Spritesheet PNG + Aseprite JSON format
   → Phaser 3 loads natively via scene.load.atlas('key', 'sheet.png', 'sheet.json')
        │
4. Place in assets/sprites/<character>/
   → sprites/lara/, sprites/asier/, sprites/nic-gorilla/, sprites/opponents/, sprites/buster-van/
```

---

## Project Structure

```
buster_games/
├── src/
│   ├── index.html
│   ├── main.ts                      ← Phaser game config + scene registry
│   ├── scenes/
│   │   ├── BootScene.ts             ← Preload all assets
│   │   ├── HomeScene.ts             ← Van + beach hero, game select buttons
│   │   ├── CampaignMenuScene.ts     ← Campaign entry point
│   │   ├── CutsceneScene.ts         ← Reusable dialogue + animation player
│   │   ├── DriveScene.ts            ← Buster drives between matches (parallax)
│   │   ├── TennisScene.ts           ← Core tennis gameplay
│   │   ├── QuickMatchScene.ts       ← Opponent + set length selector
│   │   └── ComingSoonScene.ts       ← Buster Drives placeholder
│   ├── game/
│   │   ├── tennis/
│   │   │   ├── TennisGame.ts        ← Match orchestrator
│   │   │   ├── Player.ts            ← Lara auto-run + tap-to-hit
│   │   │   ├── Ball.ts              ← Ball physics + arc
│   │   │   ├── Opponent.ts          ← AI movement + shot logic
│   │   │   └── Scoreboard.ts        ← Points/games/sets scoring
│   │   └── campaign/
│   │       ├── CampaignManager.ts   ← State, localStorage persistence
│   │       └── opponents.ts         ← Opponent roster data + dialogue scripts
│   └── ui/
│       ├── Button.ts                ← Reusable pixel-style button
│       └── DialogueBox.ts           ← Speaker portrait + typewriter text box
├── assets/
│   ├── palettes/
│   │   └── aragon16.hex
│   ├── sprites/
│   │   ├── lara/
│   │   ├── asier/
│   │   ├── nic-gorilla/
│   │   ├── opponents/
│   │   └── buster-van/
│   ├── backgrounds/
│   │   ├── home-beach.png
│   │   ├── courts/
│   │   └── cutscene-panels/
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   └── fonts/
├── tests/
├── docs/
│   └── PLAN.md                      ← This file
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Scene Flow

```
BootScene (preload all assets)
    └─► HomeScene
            ├─► Love at First Serve
            │       ├─► Campaign
            │       │       ├─► CutsceneScene: Nic steals Asier (intro)
            │       │       ├─► [Loop for each opponent]
            │       │       │       ├─► DriveScene: Buster drives to location
            │       │       │       ├─► CutsceneScene: pre-match taunt
            │       │       │       ├─► TennisScene: match
            │       │       │       └─► CutsceneScene: post-match reaction
            │       │       ├─► TennisScene: Final vs Nic (gorilla)
            │       │       └─► CutsceneScene: Nic returns Asier → drive off in Buster
            │       └─► Quick Match
            │               ├─► QuickMatchScene: pick opponent + set length (1/3/5)
            │               └─► TennisScene → result screen → return to menu
            └─► Buster Drives
                    └─► ComingSoonScene
```

---

## Campaign — Opponent Roster

| Order | Opponent | Type | Difficulty | Notes |
|-------|----------|------|------------|-------|
| 1 | Emeric | Singles | Easy | Slow, unpredictable shot placement |
| 2 | Mum & Collin | Doubles | Easy-Medium | Two characters; one AI-controlled, one in background |
| 3 | Ammie, Gabby & Hannah | 3v1 | Medium | Chaotic — three characters rotating; faster pace |
| 4 | Dad & Rita | Doubles | Medium-Hard | More aggressive than Mum & Collin |
| 5 | Roger Federer | Singles | Hard | Fast, precise shots, elegant animations |
| 6 | Nic (the gorilla) 🦍 | Singles | Boss | Power shots, screen shake, intimidation effects |

---

## Tennis Mechanics Spec

### Control Scheme
- **Auto-run:** Lara automatically moves toward the predicted ball landing zone. The player does not control movement.
- **Tap to hit:** The player taps anywhere on screen to swing. Timing determines shot outcome.
- **Timing window:** A visual indicator (shrinking ring or colour-shift glow around Lara) signals as the ball approaches. This makes timing approachable without being trivial.

### Shot Direction (Timing-Based)
| Tap timing | Result |
|------------|--------|
| Early (tap before optimal window) | Ball goes wide to the left |
| On-time (tap within optimal window) | Ball goes to opponent's weak side (chosen contextually) |
| Late (tap after optimal window) | Ball goes wide to the right |
| Very early / very late | Ball goes into the net or out |

### Ball Physics
- Ball follows a **parabolic arc** via Phaser tweens
- A **shadow** under the ball communicates height and bounce trajectory
- Shot speed and bounce height are influenced by:
  - Distance from net (deep shots arc higher)
  - Incoming ball angle (cross-court vs down the line)
  - Opponent difficulty (harder opponents return with more pace/spin)
- Physics is **lenient** and forgiving — this is a casual game, not a simulator

### Scoring
- Standard tennis: 0 / 15 / 30 / 40 / Deuce / Advantage
- Sets won by reaching 6 games (with 2-game lead) or a tiebreak at 6-6
- Match formats: 1 set, best of 3, best of 5

---

## Campaign Story Beats

1. **Intro:** Lara and Asier are together, happy. Nic the gorilla lumbers in, grabs Asier, tucks him under his arm. Nic issues a challenge — beat all his minions and she can have Asier back.
2. **Matches 1–5:** Before each match, a short cutscene with Nic sending the opponent and taunting. After each win, a reaction cutscene. Lara drives Buster between locations.
3. **Final match vs Nic:** Big entrance cutscene. Screen shakes as Nic stomps onto court. Epic showdown.
4. **Victory:** Nic reluctantly hands Asier over. Lara and Asier celebrate. They jump in Buster and drive off into the sunset together.

---

## Jira Ticket Reference

See the Jira board (BG project) for the full ticket breakdown. Epics:

| Epic | Title |
|------|-------|
| BG-6 | Project Foundation & Infrastructure |
| BG-11 | Home Screen |
| BG-12 | Tennis Core Engine |
| BG-13 | Cutscene & Dialogue System |
| BG-14 | Buster Drive Transition |
| BG-15 | Campaign Mode |
| BG-16 | Quick Match Mode |
| BG-17 | Game Assets |
| BG-18 | Coming Soon Screen |
