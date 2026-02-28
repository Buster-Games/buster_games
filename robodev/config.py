# ──────────────────────────────────────────────────────────────
# robodev/config.py — Central configuration loader
# ──────────────────────────────────────────────────────────────
from __future__ import annotations

import os
from pathlib import Path

import yaml


_CONFIG_PATH = Path(__file__).resolve().parent / "config.yml"


def load_config() -> dict:
    """Load the robodev YAML configuration."""
    with open(_CONFIG_PATH, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def github_headers() -> dict[str, str]:
    """Return authorization headers for the GitHub REST API."""
    token = os.environ["GITHUB_TOKEN"]
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def jira_auth() -> tuple[str, str]:
    """Return (email, api_token) for Jira Basic auth."""
    return (
        os.environ.get("JIRA_USER_EMAIL", ""),
        os.environ.get("JIRA_API_TOKEN", ""),
    )


def jira_base_url() -> str:
    return os.environ.get("JIRA_BASE_URL", "").rstrip("/")
