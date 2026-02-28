# ──────────────────────────────────────────────────────────────
# robodev/summary.py  — Gate 4: Post a final review-summary comment
# ──────────────────────────────────────────────────────────────
"""
Collects results from the preceding jobs (hygiene, jira, code-review)
and posts a single consolidated summary comment on the PR.
"""
from __future__ import annotations

import os
import sys

from robodev.github_client import post_pr_comment


_STATUS_ICONS = {
    "success": "✅",
    "failure": "❌",
    "cancelled": "⏭️",
    "skipped": "⏭️",
}


def _icon(result: str) -> str:
    return _STATUS_ICONS.get(result, "❓")


def run() -> int:
    hygiene = os.environ.get("HYGIENE_RESULT", "unknown")
    jira = os.environ.get("JIRA_RESULT", "unknown")
    review = os.environ.get("REVIEW_RESULT", "unknown")

    all_passed = all(r == "success" for r in [hygiene, jira, review])

    lines = [
        "## 📝 RoboDev Review Summary\n",
        "| Gate | Status |",
        "|------|--------|",
        f"| PR Hygiene | {_icon(hygiene)} {hygiene} |",
        f"| Jira Validation | {_icon(jira)} {jira} |",
        f"| Code Review | {_icon(review)} {review} |",
        "",
    ]

    if all_passed:
        lines.append("### ✅ All gates passed — ready for human review!")
    else:
        lines.append(
            "### ⚠️ One or more gates did not pass.\n"
            "Please review the individual check results above and address any issues."
        )

    post_pr_comment("\n".join(lines))

    if not all_passed:
        failed = [name for name, result in [
            ("PR Hygiene", hygiene),
            ("Jira Validation", jira),
            ("Code Review", review),
        ] if result != "success"]
        print(f"Summary: {len(failed)} gate(s) failed — {', '.join(failed)}")
        for name, result in [("PR Hygiene", hygiene), ("Jira Validation", jira), ("Code Review", review)]:
            icon = "✅" if result == "success" else "❌"
            print(f"  {icon} {name}: {result}")
        return 1

    print("Summary: all gates passed ✅")
    return 0


if __name__ == "__main__":
    sys.exit(run())
