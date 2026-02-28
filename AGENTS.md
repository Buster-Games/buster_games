# AGENTS.md — Instructions for AI Models

> This file is for AI agents (Copilot, Cursor, Codex, ChatGPT, etc.) working in this repository.
> Humans: you don't need to read this — see README.md instead.

---

## Project Overview

**Buster Games** is a mobile web app containing a suite of retro 8-bit mini-games. The visual style is 8-bit retro with a modern feel. The app is built for a user named Lara.

### Games

| Game | Description |
|------|-------------|
| **Love at First Serve** | A tennis game where Lara battles opponents to rescue Asier from a 500lb gorilla named Nic |
| **Buster Drives** | TBD |

---

## RoboDev — Automated PR Review System

This repo has an automated review bot called **RoboDev** that runs on every pull request via GitHub Actions. You must understand this system before making changes, opening PRs, or modifying CI.

### Architecture

```
PR opened / updated / reopened / edited
        │
        ├─► Gate 1: PR Hygiene      (robodev/hygiene_checker.py)
        │     Validates title format, Jira key, description length,
        │     conventional-commit prefix
        │
        ├─► Gate 2: Jira Validation  (robodev/jira_checker.py)
        │     Checks ticket exists, is in an allowed status,
        │     not Done/Closed/Cancelled
        │
        ├─► Gate 3: Code Review      (robodev/reviewer.py)
        │     Rule-based: file size, banned patterns, test coverage
        │     AI-powered: optional OpenAI review of the diff
        │
        └─► Gate 4: Summary          (robodev/summary.py)
              Posts consolidated pass/fail table as a PR comment
```

A separate workflow (`jira-sync.yml`) auto-transitions Jira tickets when PRs are opened, merged, or closed.

### Pipeline Files

| File | Purpose |
|------|---------|
| `.github/workflows/pr-review.yml` | Main 4-gate review pipeline, runs on `pull_request` events |
| `.github/workflows/jira-sync.yml` | PR state → Jira ticket status transitions |
| `.github/PULL_REQUEST_TEMPLATE.md` | Enforces Jira ticket, description, checklist on every PR |

### Python Modules

All review logic lives in the `robodev/` package:

| Module | Role |
|--------|------|
| `config.py` | Loads `config.yml`, provides GitHub/Jira auth helpers |
| `config.yml` | **All tuneable rules, thresholds, and settings** |
| `github_client.py` | Thin wrapper for GitHub REST API (comments, reviews, diffs) |
| `hygiene_checker.py` | Gate 1 — PR title/body validation |
| `jira_checker.py` | Gate 2 — Jira ticket existence & status checks |
| `jira_sync.py` | Jira status transitions + remote link creation |
| `reviewer.py` | Gate 3 — Rule-based checks + optional AI review |
| `summary.py` | Gate 4 — Consolidated summary comment |
| `requirements.txt` | Python dependencies: `requests`, `PyYAML`, `openai` |

### Dependencies

- **Runtime:** Python 3.11, `requests`, `PyYAML`
- **Optional:** `openai` (only if AI review is enabled)
- **CI:** GitHub Actions (ubuntu-latest runners)

---

## PR Requirements

When creating or suggesting PRs for this repo, follow these rules strictly:

### Title Format

Titles **must** include a Jira ticket key and follow conventional-commit format:

```
<type>(BG-<number>): <short description>
```

Examples:
```
feat(BG-42): add tennis scoring system
fix(BG-99): prevent gorilla from escaping bounds
refactor(BG-15): extract sprite animation into shared module
```

Valid type prefixes: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Description Requirements

- Minimum **30 characters**
- Must explain **what** changed and **why**
- Should reference the Jira ticket key (e.g. `BG-4`) in the body as well

### Branch Naming

Follow the pattern: `<type>/BG-<number>-<short-slug>`

Examples: `feat/BG-42-tennis-scoring`, `fix/BG-99-gorilla-bounds`

---

## Code Review Rules

These are enforced automatically by RoboDev. Do not violate them:

### Hard Blocks (will fail the PR)

- **Secrets in diffs** — any pattern matching `(api_key|secret|password|token) := "..."` with 16+ chars
- **Missing Jira ticket** — title must contain `BG-<number>`
- **Description too short** — under 30 characters

### Warnings (won't block, but flagged)

- **Large files** — more than 500 changed lines per file
- **Large PRs** — more than 20 files modified
- **Missing tests** — source files changed (`.py`, `.js`, `.ts`, `.jsx`, `.tsx`) with no test file changes
- **`console.log`** left in code
- **`debugger`** statements
- **`TODO` / `FIXME` / `HACK` / `XXX`** comments

### Test Expectations

If you modify or add source files, you **must** include corresponding test files. The bot looks for filenames containing `test` or `spec`.

---

## Configuration Reference

All review behaviour is controlled by `robodev/config.yml`. Here are the key settings:

### Jira

```yaml
jira:
  project_keys: [BG]                    # Jira project prefixes to look for
  require_ticket: true                   # Fail PR if no ticket found
  allowed_pr_statuses:                   # Tickets must be in one of these
    - In Progress
    - In Review
    - Code Review
  blocked_statuses: [Done, Closed, Cancelled]  # These block PRs
  sync:
    on_open: "In Review"                 # Transition when PR opens
    on_merge: "Done"                     # Transition when PR merges
```

### Hygiene

```yaml
hygiene:
  require_jira_in_title: true
  min_body_length: 30
  conventional_commit_prefixes: [feat, fix, docs, ...]
```

### Code Review

```yaml
code_review:
  max_changed_lines_per_file: 500
  max_files_per_pr: 20
  require_tests: true
  banned_patterns:
    - { label: "...", regex: "...", severity: error|warning }
```

### AI Review

```yaml
ai_review:
  enabled: false          # Set to true to activate
  model: "gpt-4o"
  max_diff_chars: 60000   # Diffs larger than this are truncated
  system_prompt: "..."    # Customise the reviewer personality
```

When enabled, the AI reviewer sends the PR diff to OpenAI and posts its analysis (Summary, Issues, Suggestions, Verdict) as part of the code review comment.

---

## GitHub Secrets Required

These are configured in the GitHub repo settings (Settings → Secrets and variables → Actions). They are **not** stored in code.

| Secret | Required? | Purpose |
|--------|-----------|---------|
| `GITHUB_TOKEN` | Auto-provided | GitHub Actions provides this automatically — no setup needed |
| `JIRA_BASE_URL` | Yes | Jira instance URL, e.g. `https://yourteam.atlassian.net` |
| `JIRA_USER_EMAIL` | Yes | Email address for Jira API authentication |
| `JIRA_API_TOKEN` | Yes | Jira API token for Basic auth |
| `OPENAI_API_KEY` | Only if AI review enabled | OpenAI API key for GPT-powered review |

---

## Conventions for AI Agents

When working in this codebase:

1. **Never commit secrets** — the bot will catch them, but don't try
2. **Always reference a Jira ticket** in PR titles and branch names
3. **Keep PRs small** — under 20 files, under 500 changed lines per file
4. **Add tests** for any source code changes
5. **Use conventional commits** for all commit messages and PR titles
6. **Don't modify `robodev/`** unless explicitly asked — it's the review infrastructure
7. **The app style is 8-bit retro** — respect this in any UI/asset work
8. **Target platform is mobile web** — responsive, touch-first design
