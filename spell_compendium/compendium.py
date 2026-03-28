"""SpellCompendium — load, cache, and query D&D 5e spells."""

import json
import os
from typing import Optional

from .api import fetch_all_spells, fetch_spell, fetch_spell_list
from .models import Spell


class SpellCompendium:
    """
    A searchable collection of D&D 5e spells.

    Usage
    -----
    # Load from the 5e API (fetches all spells):
    compendium = SpellCompendium.from_api()

    # Load from a previously saved cache file:
    compendium = SpellCompendium.from_cache("spells.json")

    # Look up a single spell by index:
    fireball = compendium.get("fireball")

    # Search by name substring:
    results = compendium.search("fire")

    # Filter by various criteria:
    wizard_3rd = compendium.filter(classes=["Wizard"], level=3)
    """

    def __init__(self, spells: list[Spell]):
        self._spells: dict[str, Spell] = {s.index: s for s in spells}

    # ------------------------------------------------------------------
    # Constructors
    # ------------------------------------------------------------------

    @classmethod
    def from_api(cls, verbose: bool = False) -> "SpellCompendium":
        """Fetch all spells from the 5e API and return a populated compendium."""

        def progress(current: int, total: int):
            if verbose:
                print(f"\rFetching spells… {current}/{total}", end="", flush=True)

        raw = fetch_all_spells(on_progress=progress if verbose else None)
        if verbose:
            print()
        return cls([Spell.from_api(d) for d in raw])

    @classmethod
    def from_cache(cls, path: str) -> "SpellCompendium":
        """Load a compendium from a JSON cache file saved by :meth:`save`."""
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        return cls([Spell.from_api(d) for d in raw])

    @classmethod
    def from_api_or_cache(cls, path: str, verbose: bool = False) -> "SpellCompendium":
        """Use a cache file if it exists, otherwise fetch from the API and save."""
        if os.path.exists(path):
            if verbose:
                print(f"Loading spells from cache: {path}")
            return cls.from_cache(path)
        compendium = cls.from_api(verbose=verbose)
        compendium.save(path)
        if verbose:
            print(f"Spells saved to cache: {path}")
        return compendium

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str) -> None:
        """Save the raw spell list to a JSON file for later use with :meth:`from_cache`."""
        data = [self._spell_to_raw(s) for s in self._spells.values()]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @staticmethod
    def _spell_to_raw(s: Spell) -> dict:
        return {
            "index": s.index,
            "name": s.name,
            "level": s.level,
            "school": {"name": s.school},
            "casting_time": s.casting_time,
            "range": s.range,
            "components": s.components,
            "duration": s.duration,
            "concentration": s.concentration,
            "ritual": s.ritual,
            "desc": s.desc,
            "higher_level": s.higher_level,
            "material": s.material,
            "attack_type": s.attack_type,
            "damage": (
                {"damage_type": {"name": s.damage_type}} if s.damage_type else {}
            ),
            "classes": [{"name": c} for c in s.classes],
            "subclasses": [{"name": sc} for sc in s.subclasses],
        }

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    def get(self, index: str) -> Optional[Spell]:
        """Return the spell with the given index, or None if not found."""
        return self._spells.get(index)

    def get_or_fetch(self, index: str) -> Optional[Spell]:
        """Return the spell from the cache, fetching from the API if missing."""
        if index not in self._spells:
            try:
                raw = fetch_spell(index)
                spell = Spell.from_api(raw)
                self._spells[index] = spell
            except Exception:
                return None
        return self._spells[index]

    # ------------------------------------------------------------------
    # Search & filter
    # ------------------------------------------------------------------

    def search(self, query: str) -> list[Spell]:
        """Return all spells whose name contains *query* (case-insensitive)."""
        q = query.lower()
        return [s for s in self._spells.values() if q in s.name.lower()]

    def filter(
        self,
        *,
        level: Optional[int] = None,
        school: Optional[str] = None,
        classes: Optional[list[str]] = None,
        concentration: Optional[bool] = None,
        ritual: Optional[bool] = None,
        damage_type: Optional[str] = None,
    ) -> list[Spell]:
        """
        Return spells matching all provided criteria.

        Parameters
        ----------
        level:         Spell slot level (0 = cantrip).
        school:        Magic school name, case-insensitive (e.g. "evocation").
        classes:       Class names — spell must be available to at least one.
        concentration: Filter by concentration requirement.
        ritual:        Filter by ritual flag.
        damage_type:   Damage type name, case-insensitive (e.g. "fire").
        """
        results = list(self._spells.values())

        if level is not None:
            results = [s for s in results if s.level == level]
        if school is not None:
            sl = school.lower()
            results = [s for s in results if s.school.lower() == sl]
        if classes is not None:
            cls_lower = {c.lower() for c in classes}
            results = [
                s for s in results if any(c.lower() in cls_lower for c in s.classes)
            ]
        if concentration is not None:
            results = [s for s in results if s.concentration == concentration]
        if ritual is not None:
            results = [s for s in results if s.ritual == ritual]
        if damage_type is not None:
            dt = damage_type.lower()
            results = [
                s
                for s in results
                if s.damage_type and s.damage_type.lower() == dt
            ]

        return sorted(results, key=lambda s: (s.level, s.name))

    # ------------------------------------------------------------------
    # Convenience properties
    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return len(self._spells)

    def __iter__(self):
        return iter(self._spells.values())

    def all(self) -> list[Spell]:
        """Return all spells sorted by level then name."""
        return sorted(self._spells.values(), key=lambda s: (s.level, s.name))

    def spell_list(self) -> list[str]:
        """Fetch a lightweight spell index list from the API (names + indices only)."""
        return fetch_spell_list()
