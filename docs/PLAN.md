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
| [Aseprite](https://github.com/aseprite/aseprite) (self-compiled) | ✅ Free | Assemble/edit sprites, palette-lock to Brazilian Afternoon, export PNG + Aseprite JSON for Phaser. Self-compilation is free for personal use per the EULA. Preferred over LibreSprite — actively maintained, has tilemap support and Lua scripting for palette automation |
| [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) | ✅ Free | Google Font — 8-bit typeface for all UI text |
| [BeepBox](https://beepbox.co) | ✅ Free | In-browser chiptune composer for music and SFX |
| Brazilian Afternoon palette | ✅ In repo | `assets/palettes/brazilian-afternoon.hex` — ~30 warm colours for beach/summer aesthetic |

---

## Colour Palette — Brazilian Afternoon

File: `assets/palettes/brazilian-afternoon.hex`

A warm, beach-inspired palette with ~30 colours organised into groups:

| Group | Colours | Usage |
|-------|---------|-------|
| Whites & Creams | `#ffffff`, `#e8d5ae`, `#e1c4a4` | Highlights, text, skin |
| Tans & Browns | `#e1c074`, `#d49d56`, `#b58057`, `#925a3e` | Sand, wood, warm accents |
| Oranges & Corals | `#ff8a27`, `#d06a49`, `#ac634a`, `#9c483b` | Sunset, energy, alerts |
| Pinks & Roses | `#c66e6e`, `#b9a3a0`, `#844d45` | Accents, UI highlights |
| Greens | `#bdbc69`, `#999c50`, `#699254`, `#467f53`, `#5a5f51`, `#868c65` | Foliage, court grass |
| Blues | `#cee6e8`, `#7faec6`, `#3d94c0`, `#49617d`, `#93cad0`, `#8eb3ba` | Sky, water, buttons |
| Greys & Darks | `#b6bab9`, `#929a9c`, `#6f7d85`, `#596674`, `#5c4e4e` | Shadows, outlines, UI |

---

## Art Pipeline

```
1. Generate sprite frames in Pixel Lab (Tier 1)
   → Use pixel art style, ~32×32px characters
   → Reference Brazilian Afternoon palette colours in prompts
   → Export individual PNG frames (Pixel Lab animation tool)
        │
2. Import PNGs into Aseprite (self-compiled — free for personal use)
   → Assemble frames into animation timeline
   → Run Lua palette-clamp script to snap any off-palette pixels to
     exact Brazilian Afternoon hex values automatically
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
│   ├── main.ts                      ← Phaser game config + scene registry
│   ├── constants.ts                 ← PALETTE, PALETTE_HEX, FONT - import from here
│   ├── scenes/
│   │   ├── HomeScene.ts             ← Entry point - title, birthday message, game select
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
│   │   └── brazilian-afternoon.hex
│   ├── sprites/
│   │   ├── lara/
│   │   ├── asier/
│   │   ├── nic-gorilla/
│   │   ├── opponents/
│   │   └── buster-van/
│   ├── items/                       ← UI icons (tennis racquet, van, etc.)
│   ├── backgrounds/
│   │   ├── home-beach.png           ← Home screen — Lara & Asier on Buster at beach
│   │   ├── courts/
│   │   └── cutscene-panels/
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   └── fonts/
├── tests/
├── docs/
│   └── PLAN.md                      ← This file
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Scene Flow

```
HomeScene (entry point - title + game select)
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

## Ticket Breakdown by Epic

### Epic 1 — Project Foundation & Infrastructure ✅ DONE

| Ticket | Type | Title | Status |
|--------|------|-------|--------|
| BG-1.1 | Story | Scaffold Vite + Phaser 3 + TypeScript | ✅ Done |
| BG-1.2 | Story | Configure GitHub Pages deployment | ✅ Done |
| BG-1.3 | Story | Establish folder structure | ✅ Done |

---

### Epic 2 — Home Screen ✅ DONE

| Ticket | Type | Title | Status |
|--------|------|-------|--------|
| BG-2.1 | Story | Build Home Screen scene | ✅ Done |
| BG-2.2 | Story | Add game selection buttons | ✅ Done |

---

### Epic 3 — Tennis Core Engine 🎯 NEXT

The core gameplay. When player taps "Love at First Serve", go straight to a tennis match.

| Ticket | Type | Title | Description | Status |
|--------|------|-------|-------------|--------|
| BG-3.1 | Story | Tennis court background + scene setup | TennisScene.ts — pixel court render, basic scene structure | |
| BG-3.2 | Story | Scoreboard UI | Overlay showing names, sets, games, points in palette colours | |
| BG-3.3 | Story | Ball physics and arc system | Ball.ts — parabolic arc via tweens, ball shadow, bounce | |
| BG-3.4 | Story | Player auto-run movement | Player.ts — Lara auto-positions toward ball landing zone | |
| BG-3.5 | Story | Tap-to-hit timing mechanic | Timing offset on tap → early=left, on-time=optimal, late=right. Visual timing indicator | |
| BG-3.6 | Story | AI opponent movement and shot logic | Opponent.ts — AI auto-positions and returns; difficulty 0–1 scale | |
| BG-3.7 | Story | Full tennis scoring system | Scoreboard.ts — 0/15/30/40/deuce/advantage, game/set/match win logic | |
| BG-3.8 | Story | Match end flow | Win/lose detection, result screen, return to menu | |

**Build order:** 3.1 → 3.3 → 3.2 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8

---

### Epic 4 — Cutscene & Dialogue System

| Ticket | Type | Title | Description | Status |
|--------|------|-------|-------------|--------|
| BG-4.1 | Story | Reusable dialogue box component | DialogueBox.ts — portrait + typewriter text effect | |
| BG-4.2 | Story | Cutscene scene player | CutsceneScene.ts — script array player, tap to advance, transitions | |
| BG-4.3 | Story | Opening cutscene: Nic steals Asier | Script + panels for intro sequence | |
| BG-4.4 | Story | Per-opponent pre/post match cutscenes | Dialogue scripts for all 6 opponents in opponents.ts | |
| BG-4.5 | Story | Victory cutscene: Nic returns Asier | Final cutscene — handover, celebration, drive off in Buster | |

---

### Epic 5 — Buster Drive Transition

| Ticket | Type | Title | Description | Status |
|--------|------|-------|-------------|--------|
| BG-5.1 | Story | Buster Drive parallax scrolling scene | DriveScene.ts — multi-layer TileSprite parallax, Buster van tween | |
| BG-5.2 | Story | Campaign progress map overlay | Illustrated map with opponent location markers | |

---

### Epic 6 — Campaign Mode

| Ticket | Type | Title | Description | Status |
|--------|------|-------|-------------|--------|
| BG-6.1 | Story | Campaign state manager | CampaignManager.ts — tracks match index, results; persists to localStorage | |
| BG-6.2 | Story | Wire full campaign end-to-end | Connect all scenes in sequence. Full playthrough from intro to victory | |

---

### Epic 7 — Quick Match Mode

| Ticket | Type | Title | Description | Status |
|--------|------|-------|-------------|--------|
| BG-7.1 | Story | Opponent selection screen | 6 opponent portrait cards with name + difficulty; tap to select | |
| BG-7.2 | Story | Set length selection | 1/3/5 set choice UI | |
| BG-7.3 | Story | Quick Match flow | Launch TennisScene → result screen → menu | |

---

### Epic 8 — Game Assets

| Ticket | Type | Title | Description | Status |
|--------|------|-------|-------------|--------|
| BG-8.1 | Story | Lara player sprite sheet | idle, run-L/R, swing-forehand, swing-backhand, celebrate | |
| BG-8.2 | Story | Asier sprite sheet | idle, wave, being-carried | |
| BG-8.3 | Story | Nic (gorilla) sprite sheet | idle, stomp, swing, celebrate, hand-over-Asier | |
| BG-8.4 | Story | Opponent sprite sheets (all 6) | Emeric, Mum & Collin, Ammie/Gabby/Hannah, Dad & Rita, Roger Federer | |
| BG-8.5 | Story | Court backgrounds | 6 different court backgrounds for each opponent | |
| BG-8.6 | Story | Drive parallax layers | Sky, hills, road layers for DriveScene | |
| BG-8.7 | Story | UI assets | Buttons, scoreboard, dialogue box, timing indicator | |
| BG-8.8 | Story | Audio: music | Home theme, match theme, victory jingle, defeat sting (BeepBox) | |
| BG-8.9 | Story | Audio: SFX | Ball hit, footstep, crowd, gorilla roar, van engine | |

---

### Epic 9 — Coming Soon Screen

| Ticket | Type | Title | Description | Status |
|--------|------|-------|-------------|--------|
| BG-9.1 | Story | Buster Drives coming soon scene | ComingSoonScene.ts — Buster van art, "COMING SOON" text, tap to return | |
