"""Tests for the spell compendium module."""

import json
import os
import tempfile

import pytest

from spell_compendium.models import Spell
from spell_compendium.compendium import SpellCompendium

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

FIREBALL_RAW = {
    "index": "fireball",
    "name": "Fireball",
    "level": 3,
    "school": {"name": "Evocation"},
    "casting_time": "1 action",
    "range": "150 feet",
    "components": ["V", "S", "M"],
    "material": "A tiny ball of bat guano and sulfur",
    "duration": "Instantaneous",
    "concentration": False,
    "ritual": False,
    "desc": ["A bright streak flashes from your pointing finger..."],
    "higher_level": ["When you cast this spell using a spell slot of 4th level or higher..."],
    "attack_type": "ranged",
    "damage": {"damage_type": {"name": "Fire"}},
    "classes": [{"name": "Sorcerer"}, {"name": "Wizard"}],
    "subclasses": [{"name": "Fiend"}],
}

CURE_WOUNDS_RAW = {
    "index": "cure-wounds",
    "name": "Cure Wounds",
    "level": 1,
    "school": {"name": "Evocation"},
    "casting_time": "1 action",
    "range": "Touch",
    "components": ["V", "S"],
    "material": None,
    "duration": "Instantaneous",
    "concentration": False,
    "ritual": False,
    "desc": ["A creature you touch regains a number of hit points..."],
    "higher_level": [],
    "attack_type": None,
    "damage": {},
    "classes": [{"name": "Bard"}, {"name": "Cleric"}, {"name": "Druid"}],
    "subclasses": [],
}

DETECT_MAGIC_RAW = {
    "index": "detect-magic",
    "name": "Detect Magic",
    "level": 1,
    "school": {"name": "Divination"},
    "casting_time": "1 action",
    "range": "Self",
    "components": ["V", "S"],
    "material": None,
    "duration": "10 minutes",
    "concentration": True,
    "ritual": True,
    "desc": ["For the duration, you sense the presence of magic..."],
    "higher_level": [],
    "attack_type": None,
    "damage": {},
    "classes": [{"name": "Wizard"}, {"name": "Sorcerer"}, {"name": "Cleric"}],
    "subclasses": [],
}


@pytest.fixture
def sample_spells():
    return [
        Spell.from_api(FIREBALL_RAW),
        Spell.from_api(CURE_WOUNDS_RAW),
        Spell.from_api(DETECT_MAGIC_RAW),
    ]


@pytest.fixture
def compendium(sample_spells):
    return SpellCompendium(sample_spells)


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class TestSpellFromApi:
    def test_basic_fields(self):
        s = Spell.from_api(FIREBALL_RAW)
        assert s.index == "fireball"
        assert s.name == "Fireball"
        assert s.level == 3
        assert s.school == "Evocation"
        assert s.casting_time == "1 action"
        assert s.range == "150 feet"
        assert s.components == ["V", "S", "M"]
        assert s.material == "A tiny ball of bat guano and sulfur"
        assert s.duration == "Instantaneous"
        assert s.concentration is False
        assert s.ritual is False
        assert s.attack_type == "ranged"
        assert s.damage_type == "Fire"
        assert s.classes == ["Sorcerer", "Wizard"]
        assert s.subclasses == ["Fiend"]

    def test_optional_fields_absent(self):
        s = Spell.from_api(CURE_WOUNDS_RAW)
        assert s.material is None
        assert s.attack_type is None
        assert s.damage_type is None
        assert s.higher_level == []

    def test_summary_cantrip(self):
        raw = {**FIREBALL_RAW, "level": 0, "index": "fire-bolt", "name": "Fire Bolt"}
        s = Spell.from_api(raw)
        assert "Cantrip" in s.summary()

    def test_summary_level(self):
        s = Spell.from_api(FIREBALL_RAW)
        assert "Level 3" in s.summary()
        assert "[C]" not in s.summary()
        assert "[R]" not in s.summary()

    def test_summary_concentration_ritual_flags(self):
        s = Spell.from_api(DETECT_MAGIC_RAW)
        assert "[C]" in s.summary()
        assert "[R]" in s.summary()

    def test_detail_includes_name(self):
        s = Spell.from_api(FIREBALL_RAW)
        detail = s.detail()
        assert "Fireball" in detail
        assert "Evocation" in detail
        assert "bat guano" in detail

    def test_detail_higher_level(self):
        s = Spell.from_api(FIREBALL_RAW)
        detail = s.detail()
        assert "At Higher Levels" in detail

    def test_detail_no_higher_level_section_when_empty(self):
        s = Spell.from_api(CURE_WOUNDS_RAW)
        assert "At Higher Levels" not in s.detail()


# ---------------------------------------------------------------------------
# Compendium tests
# ---------------------------------------------------------------------------

class TestSpellCompendium:
    def test_len(self, compendium):
        assert len(compendium) == 3

    def test_get_existing(self, compendium):
        s = compendium.get("fireball")
        assert s is not None
        assert s.name == "Fireball"

    def test_get_missing(self, compendium):
        assert compendium.get("nonexistent-spell") is None

    def test_iter(self, compendium):
        names = {s.name for s in compendium}
        assert names == {"Fireball", "Cure Wounds", "Detect Magic"}

    def test_all_sorted(self, compendium):
        spells = compendium.all()
        levels = [s.level for s in spells]
        assert levels == sorted(levels)

    def test_search_case_insensitive(self, compendium):
        results = compendium.search("FIRE")
        assert any(s.index == "fireball" for s in results)

    def test_search_no_results(self, compendium):
        assert compendium.search("xyzzy") == []

    def test_filter_by_level(self, compendium):
        results = compendium.filter(level=3)
        assert len(results) == 1
        assert results[0].index == "fireball"

    def test_filter_by_school(self, compendium):
        results = compendium.filter(school="divination")
        assert len(results) == 1
        assert results[0].index == "detect-magic"

    def test_filter_by_class(self, compendium):
        results = compendium.filter(classes=["Wizard"])
        assert any(s.index == "fireball" for s in results)
        assert any(s.index == "detect-magic" for s in results)

    def test_filter_by_concentration(self, compendium):
        results = compendium.filter(concentration=True)
        assert len(results) == 1
        assert results[0].index == "detect-magic"

    def test_filter_by_ritual(self, compendium):
        results = compendium.filter(ritual=True)
        assert len(results) == 1
        assert results[0].index == "detect-magic"

    def test_filter_by_damage_type(self, compendium):
        results = compendium.filter(damage_type="fire")
        assert len(results) == 1
        assert results[0].index == "fireball"

    def test_filter_combined(self, compendium):
        results = compendium.filter(school="evocation", classes=["Wizard"])
        assert any(s.index == "fireball" for s in results)

    def test_filter_no_match(self, compendium):
        assert compendium.filter(level=9) == []

    def test_save_and_load_roundtrip(self, compendium):
        with tempfile.NamedTemporaryFile(
            suffix=".json", delete=False, mode="w"
        ) as f:
            path = f.name
        try:
            compendium.save(path)
            loaded = SpellCompendium.from_cache(path)
            assert len(loaded) == len(compendium)
            s = loaded.get("fireball")
            assert s is not None
            assert s.name == "Fireball"
            assert s.damage_type == "Fire"
        finally:
            os.unlink(path)

    def test_from_api_or_cache_uses_cache(self, compendium):
        with tempfile.NamedTemporaryFile(
            suffix=".json", delete=False, mode="w"
        ) as f:
            path = f.name
        try:
            compendium.save(path)
            loaded = SpellCompendium.from_api_or_cache(path)
            assert len(loaded) == len(compendium)
        finally:
            os.unlink(path)
