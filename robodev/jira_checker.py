# ──────────────────────────────────────────────────────────────
# robodev/jira_checker.py  — Gate 2: Jira ticket validation
# ──────────────────────────────────────────────────────────────
"""
Validates that:
  1. The PR references a valid Jira ticket (exists & is not Closed/Done)
  2. The ticket is in an expected status (e.g. "In Progress", "In Review")
  3. Posts a summary back to the PR as a comment
"""
from __future__ import annotations

import os
import re
import sys

import requests

from robodev.config import load_config, jira_auth, jira_base_url
from robodev.github_client import post_pr_comment


def _env(name: str) -> str:
    return os.environ.get(name, "")


def _extract_ticket_keys(text: str, project_keys: list[str]) -> list[str]:
    """Pull all PROJ-123 style keys out of a string."""
    if not project_keys:
        return []
    pattern = "|".join(re.escape(k) for k in project_keys)
    return re.findall(rf"({pattern}-\d+)", text, re.IGNORECASE)


def _fetch_jira_issue(key: str) -> dict | None:
    """Fetch issue details from Jira. Returns None on failure."""
    base = jira_base_url()
    if not base:
        return None
    url = f"{base}/rest/api/3/issue/{key}?fields=summary,status,assignee,issuetype"
    try:
        resp = requests.get(url, auth=jira_auth(), timeout=15)
        if resp.status_code == 200:
            return resp.json()
    except requests.RequestException:
        pass
    return None


def run() -> int:
    cfg = load_config()
    jira_cfg = cfg.get("jira", {})
    project_keys = jira_cfg.get("project_keys", [])
    allowed_statuses = [s.lower() for s in jira_cfg.get("allowed_pr_statuses", [])]
    blocked_statuses = [s.lower() for s in jira_cfg.get("blocked_statuses", [])]

    title = _env("PR_TITLE")
    body = _env("PR_BODY")
    combined = f"{title}\n{body}"

    keys = _extract_ticket_keys(combined, project_keys)

    if not keys:
        msg = (
            "## 🎫 Jira Validation\n\n"
            "⚠️ No Jira ticket reference found in the PR title or description.\n"
            f"Expected format: `{'|'.join(project_keys)}-<number>`"
        )
        post_pr_comment(msg)
        # Depending on strictness, fail or warn
        if jira_cfg.get("require_ticket", True):
            print("Jira check FAILED — no ticket found")
            return 1
        return 0

    # ── Validate each referenced ticket ───────────────────────
    base = jira_base_url()
    lines = ["## 🎫 Jira Validation\n"]
    has_error = False

    for key in sorted(set(keys)):
        issue = _fetch_jira_issue(key)
        if issue is None:
            if base:
                lines.append(f"- ❌ **{key}** — could not fetch from Jira (does it exist?)")
                has_error = True
            else:
                lines.append(f"- ℹ️ **{key}** — Jira integration not configured; skipping validation")
            continue

        fields = issue.get("fields", {})
        status = (fields.get("status") or {}).get("name", "Unknown")
        summary = fields.get("summary", "")
        assignee = (fields.get("assignee") or {}).get("displayName", "Unassigned")
        issue_type = (fields.get("issuetype") or {}).get("name", "")

        # Check blocked statuses
        if blocked_statuses and status.lower() in blocked_statuses:
            lines.append(
                f"- ❌ **[{key}]({base}/browse/{key})** — "
                f"status `{status}` is not allowed for open PRs"
            )
            has_error = True
        elif allowed_statuses and status.lower() not in allowed_statuses:
            lines.append(
                f"- ⚠️ **[{key}]({base}/browse/{key})** — "
                f"status `{status}` (expected: {', '.join(allowed_statuses)})"
            )
        else:
            lines.append(
                f"- ✅ **[{key}]({base}/browse/{key})** — "
                f"{issue_type}: _{summary}_ | Status: `{status}` | Assignee: {assignee}"
            )

    post_pr_comment("\n".join(lines))

    if has_error:
        print("Jira check FAILED")
        return 1

    print("Jira check passed ✅")
    return 0


if __name__ == "__main__":
    sys.exit(run())
