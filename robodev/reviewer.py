# ──────────────────────────────────────────────────────────────
# robodev/reviewer.py  — Gate 3: AI-powered code review
# ──────────────────────────────────────────────────────────────
"""
Analyses the PR diff with a combination of:
  • Rule-based checks (file size, banned patterns, secrets detection)
  • AI-powered review via OpenAI (optional — gracefully degrades)

Results are posted as inline review comments + a summary review.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import PurePosixPath

from robodev.config import load_config
from robodev.github_client import (
    create_review,
    get_pr_diff,
    get_pr_files,
)


# ── Rule-based checks ────────────────────────────────────────

def _check_file_size(files: list[dict], max_changed: int) -> list[str]:
    """Flag files with an excessive number of changed lines."""
    issues = []
    for f in files:
        changes = f.get("changes", 0)
        if changes > max_changed:
            issues.append(
                f"- ⚠️ `{f['filename']}` has **{changes}** changed lines "
                f"(threshold: {max_changed}). Consider splitting this change."
            )
    return issues


# Paths excluded from banned-pattern scanning and test-coverage checks.
# These are review infrastructure, not application source code.
_EXCLUDED_PATHS = ("robodev/", ".github/", "AGENTS.md")


def _parse_added_lines(diff: str) -> list[tuple[str, str]]:
    """Extract (filename, line_text) for every added line in a unified diff.

    Only lines starting with '+' (but not '+++') are returned, and files
    whose path starts with an excluded prefix are skipped entirely.
    """
    current_file: str | None = None
    results: list[tuple[str, str]] = []
    for raw_line in diff.splitlines():
        # Detect file header: +++ b/path/to/file
        if raw_line.startswith("+++ b/"):
            path = raw_line[6:]
            if any(path.startswith(ex) for ex in _EXCLUDED_PATHS):
                current_file = None          # skip this file
            else:
                current_file = path
            continue
        # Only look at added lines inside a non-excluded file
        if current_file and raw_line.startswith("+") and not raw_line.startswith("+++"):
            results.append((current_file, raw_line[1:]))   # strip leading '+'
    return results


def _check_banned_patterns(diff: str, patterns: list[dict]) -> list[str]:
    """Scan *added* lines in the diff for banned patterns.

    Skips robodev/ infrastructure so that config definitions of the
    patterns themselves don't trigger false positives.
    """
    added_lines = _parse_added_lines(diff)
    if not added_lines:
        return []

    # Build one big string of added content for regex scanning
    added_text = "\n".join(line for _, line in added_lines)

    issues = []
    for entry in patterns:
        regex = entry.get("regex", "")
        label = entry.get("label", regex)
        severity = entry.get("severity", "warning")
        icon = "❌" if severity == "error" else "⚠️"
        for match in re.finditer(regex, added_text):
            issues.append(f"- {icon} **{label}** detected in diff near: `{match.group()[:80]}`")
    return issues


def _check_large_pr(files: list[dict], max_files: int) -> list[str]:
    """Warn if the PR touches too many files."""
    if len(files) > max_files:
        return [
            f"- ⚠️ This PR modifies **{len(files)} files** "
            f"(recommended max: {max_files}). Large PRs are harder to review."
        ]
    return []


def _check_test_coverage(files: list[dict], require_tests: bool) -> list[str]:
    """Warn if source files are added/modified but no test files appear."""
    if not require_tests:
        return []

    src_changed = False
    test_found = False
    for f in files:
        name = f["filename"]
        # Skip infrastructure files — they don't need app-level tests
        if any(name.startswith(ex) for ex in _EXCLUDED_PATHS):
            continue
        if f["status"] in ("added", "modified"):
            if "test" in name.lower() or "spec" in name.lower():
                test_found = True
            elif PurePosixPath(name).suffix in (".py", ".js", ".ts", ".jsx", ".tsx"):
                src_changed = True

    if src_changed and not test_found:
        return [
            "- ⚠️ Source files were changed but **no test files** were "
            "added or modified. Please add tests for new functionality."
        ]
    return []


# ── AI-powered review (optional) ─────────────────────────────

def _ai_review(diff: str, config: dict) -> str | None:
    """Send the diff to OpenAI for an AI-powered review.

    Returns a Markdown-formatted review or None if unavailable.
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return None

    try:
        import openai
    except ImportError:
        return None

    ai_cfg = config.get("ai_review", {})
    model = ai_cfg.get("model", "gpt-4o")
    max_diff_chars = ai_cfg.get("max_diff_chars", 60_000)

    # Truncate very large diffs so we don't blow the context window
    truncated = diff[:max_diff_chars]
    if len(diff) > max_diff_chars:
        truncated += "\n\n... (diff truncated for review) ..."

    system_prompt = ai_cfg.get(
        "system_prompt",
        (
            "You are RoboDev, a senior software engineer reviewing a pull request. "
            "Be concise and constructive. Focus on bugs, security issues, performance, "
            "readability, and adherence to best practices. "
            "Format your response as Markdown with sections: "
            "## Summary, ## Issues Found, ## Suggestions, ## Verdict "
            "(APPROVE / REQUEST_CHANGES / COMMENT)."
        ),
    )

    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"PR Title: {os.environ.get('PR_TITLE', '')}\n"
                    f"PR Description: {os.environ.get('PR_BODY', '')}\n\n"
                    f"```diff\n{truncated}\n```"
                ),
            },
        ],
        temperature=0.2,
        max_tokens=2000,
    )
    return response.choices[0].message.content


# ── Main entry point ──────────────────────────────────────────

def run() -> int:
    cfg = load_config()
    review_cfg = cfg.get("code_review", {})

    files = get_pr_files()
    diff = get_pr_diff()

    issues: list[str] = []

    # Rule-based checks
    max_changed = review_cfg.get("max_changed_lines_per_file", 500)
    issues.extend(_check_file_size(files, max_changed))

    max_files = review_cfg.get("max_files_per_pr", 20)
    issues.extend(_check_large_pr(files, max_files))

    banned = review_cfg.get("banned_patterns", [])
    issues.extend(_check_banned_patterns(diff, banned))

    require_tests = review_cfg.get("require_tests", True)
    issues.extend(_check_test_coverage(files, require_tests))

    # AI review
    ai_summary = None
    if cfg.get("ai_review", {}).get("enabled", False):
        ai_summary = _ai_review(diff, cfg)

    # ── Build the review body ─────────────────────────────────
    body_lines = ["## 🤖 RoboDev Code Review\n"]

    if issues:
        body_lines.append("### Rule-Based Findings\n")
        body_lines.extend(issues)
        body_lines.append("")

    if ai_summary:
        body_lines.append("### AI-Powered Review\n")
        body_lines.append(ai_summary)
        body_lines.append("")

    if not issues and not ai_summary:
        body_lines.append("✅ No issues detected — looking good!\n")

    # Decide review verdict
    has_errors = any("❌" in i for i in issues)
    if has_errors:
        event = "REQUEST_CHANGES"
        body_lines.append("\n> 🚫 **Requesting changes** — please address the errors above.")
    else:
        event = "COMMENT"
        body_lines.append("\n> ℹ️ Review complete. A human reviewer should still approve this PR.")

    review_body = "\n".join(body_lines)
    create_review(event=event, body=review_body)

    if has_errors:
        print("Code review FAILED — errors found")
        return 1

    print("Code review passed ✅")
    return 0


if __name__ == "__main__":
    sys.exit(run())
