# ──────────────────────────────────────────────────────────────
# robodev/github_client.py — Thin wrapper around GitHub REST API
# ──────────────────────────────────────────────────────────────
from __future__ import annotations

import os

import requests

from robodev.config import github_headers

API = "https://api.github.com"


def _repo() -> str:
    return os.environ["REPO_FULL_NAME"]


def _pr() -> int:
    return int(os.environ["PR_NUMBER"])


# ── Read helpers ──────────────────────────────────────────────

def get_pr_files() -> list[dict]:
    """Return the list of files changed in the PR."""
    url = f"{API}/repos/{_repo()}/pulls/{_pr()}/files"
    resp = requests.get(url, headers=github_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def get_pr_diff() -> str:
    """Return the unified diff for the entire PR."""
    url = f"{API}/repos/{_repo()}/pulls/{_pr()}"
    headers = {**github_headers(), "Accept": "application/vnd.github.v3.diff"}
    resp = requests.get(url, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.text


# ── Write helpers ─────────────────────────────────────────────

def post_pr_comment(body: str) -> None:
    """Post (or update) a top-level comment on the PR.

    If a previous RoboDev comment exists it will be updated in-place
    so the PR doesn't get flooded with bot comments.
    """
    marker = "<!-- robodev-summary -->"
    body_with_marker = f"{marker}\n{body}"

    # Look for an existing comment to update
    url = f"{API}/repos/{_repo()}/issues/{_pr()}/comments"
    resp = requests.get(url, headers=github_headers(), timeout=30)
    resp.raise_for_status()

    for comment in resp.json():
        if marker in (comment.get("body") or ""):
            # Update existing comment
            patch_url = f"{API}/repos/{_repo()}/issues/comments/{comment['id']}"
            requests.patch(
                patch_url,
                json={"body": body_with_marker},
                headers=github_headers(),
                timeout=30,
            ).raise_for_status()
            return

    # No existing comment — create a new one
    requests.post(
        url,
        json={"body": body_with_marker},
        headers=github_headers(),
        timeout=30,
    ).raise_for_status()


def post_review_comment(
    body: str,
    commit_id: str,
    path: str,
    line: int,
    side: str = "RIGHT",
) -> None:
    """Post an inline review comment on a specific file + line."""
    url = f"{API}/repos/{_repo()}/pulls/{_pr()}/comments"
    payload = {
        "body": body,
        "commit_id": commit_id,
        "path": path,
        "line": line,
        "side": side,
    }
    requests.post(
        url, json=payload, headers=github_headers(), timeout=30
    ).raise_for_status()


def create_review(
    event: str,
    body: str,
    comments: list[dict] | None = None,
) -> None:
    """Submit a formal PR review (APPROVE / REQUEST_CHANGES / COMMENT)."""
    url = f"{API}/repos/{_repo()}/pulls/{_pr()}/reviews"
    payload: dict = {
        "event": event,   # APPROVE | REQUEST_CHANGES | COMMENT
        "body": body,
    }
    if comments:
        payload["comments"] = comments

    requests.post(
        url, json=payload, headers=github_headers(), timeout=30
    ).raise_for_status()
