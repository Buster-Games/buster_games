# AGENTS.md — Instructions for AI Models

> This file is for AI agents (Copilot, Cursor, Codex, ChatGPT, etc.) working in this repository.
> Humans: you don't need to read this — see README.md instead.
>
> Full project plan and design decisions: **`docs/PLAN.md`**

---

## Project Overview

**Buster Games** is a mobile-first web app housing retro 8-bit mini-games, built as a birthday gift for Lara. The visual style is 8-bit pixel art with smooth modern animations. Buster is the name of the van Lara and Asier built together.

| Game | Status | Description |
|------|--------|-------------|
| **Love at First Serve** | In development | Tennis game — Lara battles opponents to rescue Asier from Nic the gorilla |
| **Buster Drives** | Coming soon | TBD |

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Game engine | [Phaser 3](https://phaser.io) (MIT) | Scenes, physics, tweens, sprite animation, touch input |
| Bundler | [Vite](https://vitejs.dev) | Dev server + static `dist/` build for GitHub Pages |
| Language | TypeScript (strict) | All game source lives in `src/` |
| Testing | [Vitest](https://vitest.dev) | Co-located config in `vite.config.ts` |
| Hosting | GitHub Pages | Deployed from `dist/` via `.github/workflows/deploy.yml` (BG-8) |
| CI/Review | RoboDev (Python 3.11) | Automated PR gates — see section below |
| Pixel art | Pixel Lab Tier 1 | AI sprite/animation generation |
| Sprite assembly | Aseprite (self-compiled) | Frame assembly, palette lock via Lua script, PNG + Aseprite JSON export. Self-compilation is free for personal use. |
| Font | Press Start 2P (Google Fonts) | Loaded in `index.html` before game starts |
| Audio | BeepBox | Chiptune music and SFX |
| Palette | Aragon16 | 16-colour palette — `assets/palettes/aragon16.hex` |

---

## Repository Structure

```
buster_games/
├── src/
│   ├── main.ts                      # Phaser game config + scene registry
│   ├── constants.ts                 # PALETTE, PALETTE_HEX, FONT — import from here
│   ├── scenes/
│   │   ├── BootScene.ts             # First scene — splash screen, currently active
│   │   ├── HomeScene.ts             # Van + beach hero, game select (BG-9)
│   │   ├── CutsceneScene.ts         # Reusable dialogue + animation player (BG-12)
│   │   ├── DriveScene.ts            # Buster parallax drive transition (BG-15)
│   │   ├── TennisScene.ts           # Core tennis gameplay (BG-8 to BG-11)
│   │   ├── QuickMatchScene.ts       # Opponent + set length selector (BG-19)
│   │   └── ComingSoonScene.ts       # Buster Drives placeholder (BG-21)
│   ├── game/
│   │   ├── tennis/                  # Player.ts, Ball.ts, Opponent.ts, Scoreboard.ts
│   │   └── campaign/               # CampaignManager.ts, opponents.ts
│   └── ui/                         # Button.ts, DialogueBox.ts
├── assets/
│   ├── palettes/aragon16.hex        # Aragon16 — all art must use only these 16 colours
│   ├── sprites/                     # PNG + Aseprite JSON spritesheets per character
│   ├── backgrounds/                 # Court and scene backgrounds
│   └── audio/                      # music/ and sfx/
├── tests/                           # Vitest test files — mirror src/ structure
├── docs/PLAN.md                     # Full project plan, opponent roster, mechanic specs
├── index.html                       # Entry point — mobile viewport, font preload
├── vite.config.ts                   # Vite + Vitest config
├── tsconfig.json                    # TypeScript config
├── package.json                     # npm scripts and dependencies
└── robodev/                         # CI review infrastructure — do not modify
```

---

## Development

### Prerequisites
- Node.js 20+
- npm

### Commands

```bash
npm install          # Install dependencies (first time)
npm run dev          # Start dev server at http://localhost:3000/buster_games/
                     # Also exposed on LAN at http://<your-ip>:3000/buster_games/
                     # for testing on a real phone (same Wi-Fi required)
npm test             # Run all Vitest tests once
npm run test:watch   # Run tests in watch mode
npm run typecheck    # TypeScript type check (no emit)
npm run build        # Production build → dist/
npm run preview      # Preview the production build locally
```

### Key Config Facts

- **Design resolution:** 390 × 844px (iPhone 14 portrait baseline)
- **Scaling:** `Phaser.Scale.FIT` + `autoCenter: CENTER_BOTH` — the canvas auto-fits any screen, no manual scaling needed
- **Pixel art mode:** `pixelArt: true` in `main.ts` — never disable this
- **Base path:** `/buster_games/` in `vite.config.ts` — required for GitHub Pages subdirectory hosting

---

## Coding Conventions

### Colours and Fonts
- **Always** import `PALETTE`, `PALETTE_HEX`, and `FONT` from `src/constants.ts`
- **Never** hard-code colour hex strings or font names anywhere else
- `PALETTE` (numeric) → Phaser graphics, rectangles, geometry
- `PALETTE_HEX` (CSS strings) → Phaser text `color` and `stroke` style properties
- All 16 colours are in `assets/palettes/aragon16.hex` — do not introduce colours outside this palette

### Scenes
- Every scene class goes in `src/scenes/`
- Register new scenes in the `scene` array in `src/main.ts`
- Use `this.scene.start('SceneKey')` to transition between scenes

### Assets
- Spritesheets: `assets/sprites/<character>/sheet.png` + `sheet.json` (Aseprite format)
- Load via `this.load.atlas('key', 'sheet.png', 'sheet.json')` in `BootScene` preload (once preloading is built out)
- All asset paths are relative to the `public/` directory or `assets/` as configured in Vite

### TypeScript
- Strict mode is on — no `any`, no implicit returns, no unused variables
- Use `as const` on all constant objects (already done in `constants.ts`)

---

## Testing

Tests live in `tests/` and use **Vitest** with `globals: true` (no import needed for `test`, `expect`, `describe`).

```bash
npm test             # Run all tests once — use before committing
npm run test:watch   # Watch mode during development
```

### Rules
- Every new `src/` file that contains logic **must** have a corresponding test file in `tests/`
- Test files must be named `*.test.ts`
- Tests run in `environment: 'node'` — do **not** import Phaser in test files (it requires a browser/WebGL context and will crash the runner). Test pure logic and data only; mock or isolate any Phaser dependencies
- RoboDev will **warn** on PRs where source files change but no test files change

---

## RoboDev — Automated PR Review

Every PR runs a 4-gate pipeline via GitHub Actions. All gates must pass.

### Gates

```
PR opened / updated
    ├─► Gate 1: PR Hygiene       robodev/hygiene_checker.py
    │     Title format, Jira key, description length, conventional-commit prefix
    ├─► Gate 2: Jira Validation  robodev/jira_checker.py
    │     Ticket exists, status is To Do / In Progress / In Review / Done
    ├─► Gate 3: Code Review      robodev/reviewer.py
    │     File size, banned patterns, secrets, test coverage
    └─► Gate 4: Summary          robodev/summary.py
          Posts consolidated pass/fail table as a PR comment
```

`jira-sync.yml` auto-transitions the linked ticket when the PR opens (`→ In Review`) or merges (`→ Done`).

### PR Title Format

```
<type>(BG-<number>): <short description>
```

Valid prefixes: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

### Branch Naming

```
<type>/BG-<number>-<short-slug>
```

### Hard Blocks (fail the PR)
- Secret / API key pattern in diff
- Missing `BG-<number>` in title
- Description under 30 characters

### Warnings (flagged, not blocking)
- File with 500+ changed lines
- PR touching 20+ files
- Source files changed with no test file changes
- `console.log`, `debugger`, `TODO/FIXME/HACK/XXX` left in code

> Files under `robodev/`, `.github/`, and `AGENTS.md` are excluded from pattern scanning and test-coverage checks.

### Pipeline Files

| File | Purpose |
|------|---------|
| `.github/workflows/pr-review.yml` | 4-gate review pipeline |
| `.github/workflows/jira-sync.yml` | PR state → Jira status transitions |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR description template |
| `robodev/config.yml` | **All tuneable rules and thresholds** |

### GitHub Secrets Required

| Secret | Required? | Purpose |
|--------|-----------|---------|
| `GITHUB_TOKEN` | Auto | Provided by GitHub Actions |
| `JIRA_BASE_URL` | Yes | e.g. `https://yourteam.atlassian.net` |
| `JIRA_USER_EMAIL` | Yes | Jira auth email |
| `JIRA_API_TOKEN` | Yes | Jira API token |
| `OPENAI_API_KEY` | Optional | Only if `ai_review.enabled: true` in config.yml |

---

## Conventions for AI Agents

1. **Never commit secrets** — RoboDev will catch them, but don't try
2. **Always reference a Jira ticket** in PR titles and branch names
3. **Keep PRs small** — under 20 files, under 500 changed lines per file
4. **Add tests** for every source file with logic — `tests/*.test.ts`, no Phaser imports
5. **Use conventional commits** for all commit messages and PR titles
6. **Don't modify `robodev/`** unless explicitly asked
7. **All colours from `PALETTE` / `PALETTE_HEX` only** — imported from `src/constants.ts`
8. **Never disable `pixelArt: true`** or change the 390×844 design resolution
9. **Mobile-first, touch-first** — no hover states, no keyboard-only interactions
10. **Read `docs/PLAN.md`** before making structural or design decisions
