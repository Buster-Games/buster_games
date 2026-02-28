# ──────────────────────────────────────────────────────────────
# robodev/jira_sync.py  — Bidirectional PR ↔ Jira status sync
# ──────────────────────────────────────────────────────────────
"""
When a PR is opened / merged / closed, this module transitions
the linked Jira ticket and adds a remote link back to the PR.
"""
from __future__ import annotations

import os
import re
import sys

import requests

from robodev.config import load_config, jira_auth, jira_base_url


def _env(name: str) -> str:
    return os.environ.get(name, "")


def _extract_keys(text: str, project_keys: list[str]) -> list[str]:
    if not project_keys:
        return []
    pat = "|".join(re.escape(k) for k in project_keys)
    return list(set(re.findall(rf"({pat}-\d+)", text, re.IGNORECASE)))


def _add_remote_link(key: str, pr_url: str, pr_title: str) -> None:
    """Add a remote link on the Jira issue pointing to the GitHub PR."""
    base = jira_base_url()
    if not base:
        return
    url = f"{base}/rest/api/3/issue/{key}/remotelink"
    payload = {
        "object": {
            "url": pr_url,
            "title": f"PR: {pr_title}",
            "icon": {
                "url16x16": "https://github.com/favicon.ico",
                "title": "GitHub PR",
            },
        }
    }
    try:
        requests.post(url, json=payload, auth=jira_auth(), timeout=15)
    except requests.RequestException as exc:
        print(f"Warning: could not add remote link to {key}: {exc}")


def _transition_issue(key: str, target_status: str) -> None:
    """Attempt to transition a Jira issue to the given status name."""
    base = jira_base_url()
    if not base:
        return

    # Get available transitions
    url = f"{base}/rest/api/3/issue/{key}/transitions"
    try:
        resp = requests.get(url, auth=jira_auth(), timeout=15)
        resp.raise_for_status()
    except requests.RequestException:
        return

    transitions = resp.json().get("transitions", [])
    for t in transitions:
        if t["name"].lower() == target_status.lower():
            requests.post(
                url,
                json={"transition": {"id": t["id"]}},
                auth=jira_auth(),
                timeout=15,
            )
            print(f"Transitioned {key} → {target_status}")
            return

    print(f"No matching transition '{target_status}' for {key}")


def run() -> int:
    cfg = load_config()
    jira_cfg = cfg.get("jira", {})
    project_keys = jira_cfg.get("project_keys", [])
    sync_cfg = jira_cfg.get("sync", {})

    title = _env("PR_TITLE")
    pr_url = _env("PR_URL")
    pr_merged = _env("PR_MERGED") == "true"
    pr_state = _env("PR_STATE")

    keys = _extract_keys(title, project_keys)
    if not keys:
        print("No Jira keys found in PR title — nothing to sync")
        return 0

    for key in keys:
        # Always add a remote link
        _add_remote_link(key, pr_url, title)

        # Determine desired transition
        if pr_merged:
            target = sync_cfg.get("on_merge", "Done")
        elif pr_state == "closed":
            target = sync_cfg.get("on_close", "")
        elif pr_state == "open":
            target = sync_cfg.get("on_open", "In Review")
        else:
            target = ""

        if target:
            _transition_issue(key, target)

    print("Jira sync complete ✅")
    return 0


if __name__ == "__main__":
    sys.exit(run())
