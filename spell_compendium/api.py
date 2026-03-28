"""Fetches spell data from the D&D 5e API (https://www.dnd5eapi.co)."""

import urllib.request
import urllib.error
import json
from typing import Optional

BASE_URL = "https://www.dnd5eapi.co"


def _get(path: str) -> dict:
    url = BASE_URL + path
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def fetch_spell_list() -> list[dict]:
    """Return the full list of spell stubs [{index, name, url}, ...]."""
    data = _get("/api/spells")
    return data.get("results", [])


def fetch_spell(index: str) -> dict:
    """Fetch full spell data for a given spell index."""
    return _get(f"/api/spells/{index}")


def fetch_all_spells(
    on_progress: Optional[callable] = None,
) -> list[dict]:
    """Fetch full data for every spell. Optionally calls on_progress(current, total)."""
    stubs = fetch_spell_list()
    total = len(stubs)
    spells = []
    for i, stub in enumerate(stubs, 1):
        spells.append(fetch_spell(stub["index"]))
        if on_progress:
            on_progress(i, total)
    return spells
