# ──────────────────────────────────────────────────────────────
# robodev/hygiene_checker.py  — Gate 1: PR hygiene validation
# ──────────────────────────────────────────────────────────────
"""
Checks enforced:
  1. PR title matches conventional-commit style or contains a Jira key
  2. PR description is non-empty and meets minimum length
  3. No WIP / Draft markers in the title (unless the PR is actually a draft)
"""
from __future__ import annotations

import os
import re
import sys

from robodev.config import load_config
from robodev.github_client import post_pr_comment


def _env(name: str) -> str:
    return os.environ.get(name, "")


def run() -> int:
    cfg = load_config()
    hygiene = cfg.get("hygiene", {})

    title = _env("PR_TITLE")
    body = _env("PR_BODY")
    errors: list[str] = []
    warnings: list[str] = []

    # ── Title checks ──────────────────────────────────────────
    jira_keys = cfg.get("jira", {}).get("project_keys", [])
    jira_pattern = "|".join(re.escape(k) for k in jira_keys) if jira_keys else ""

    # Check for Jira key in title
    if hygiene.get("require_jira_in_title", True):
        if jira_pattern and not re.search(rf"({jira_pattern})-\d+", title, re.IGNORECASE):
            errors.append(
                f"❌ **PR title must reference a Jira ticket** "
                f"(expected pattern: `{'/'.join(jira_keys)}-123`). "
                f"Current title: _{title}_"
            )

    # Conventional commit prefix (optional enforcement)
    cc_prefixes = hygiene.get("conventional_commit_prefixes", [])
    if cc_prefixes:
        prefix_re = "|".join(re.escape(p) for p in cc_prefixes)
        if not re.match(rf"^({prefix_re})(\(.+\))?!?:\s", title):
            warnings.append(
                f"⚠️ Title does not follow conventional-commit format. "
                f"Expected prefixes: `{', '.join(cc_prefixes)}`"
            )

    # WIP / Draft check
    if re.search(r"\b(WIP|DO NOT MERGE|DRAFT)\b", title, re.IGNORECASE):
        warnings.append("⚠️ PR title contains a WIP/Draft marker.")

    # ── Body checks ───────────────────────────────────────────
    min_body_len = hygiene.get("min_body_length", 30)
    if not body or len(body.strip()) < min_body_len:
        errors.append(
            f"❌ **PR description is too short** (min {min_body_len} chars). "
            "Please describe *what* changed and *why*."
        )

    # ── Report ────────────────────────────────────────────────
    if errors or warnings:
        lines = ["## 🔍 PR Hygiene Report\n"]
        lines.extend(errors)
        lines.extend(warnings)
        if errors:
            lines.append("\n> **Merge blocked** — please fix the errors above.")
        post_pr_comment("\n".join(lines))

    if errors:
        print("PR hygiene check FAILED — issues found:")
        for e in errors:
            # Strip markdown formatting for plain log output
            plain = e.replace("❌ ", "").replace("**", "")
            print(f"  • {plain}")
        if warnings:
            print("  Warnings also raised:")
            for w in warnings:
                plain = w.replace("⚠️ ", "")
                print(f"  ⚠ {plain}")
        return 1

    if warnings:
        print("PR hygiene check passed ✅ (with warnings):")
        for w in warnings:
            plain = w.replace("⚠️ ", "")
            print(f"  ⚠ {plain}")
    else:
        print("PR hygiene check passed ✅")
    return 0


# Allow running as `python -m robodev.hygiene_checker`
if __name__ == "__main__":
    sys.exit(run())
