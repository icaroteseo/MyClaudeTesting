"""Data models for D&D 5e spells."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Spell:
    index: str
    name: str
    level: int
    school: str
    casting_time: str
    range: str
    components: list[str]
    duration: str
    concentration: bool
    ritual: bool
    desc: list[str]
    classes: list[str]
    higher_level: list[str] = field(default_factory=list)
    material: Optional[str] = None
    attack_type: Optional[str] = None
    damage_type: Optional[str] = None
    subclasses: list[str] = field(default_factory=list)

    @classmethod
    def from_api(cls, data: dict) -> "Spell":
        """Construct a Spell from raw 5e API response data."""
        return cls(
            index=data["index"],
            name=data["name"],
            level=data["level"],
            school=data.get("school", {}).get("name", ""),
            casting_time=data.get("casting_time", ""),
            range=data.get("range", ""),
            components=data.get("components", []),
            duration=data.get("duration", ""),
            concentration=data.get("concentration", False),
            ritual=data.get("ritual", False),
            desc=data.get("desc", []),
            higher_level=data.get("higher_level", []),
            material=data.get("material"),
            attack_type=data.get("attack_type"),
            damage_type=data.get("damage", {}).get("damage_type", {}).get("name"),
            classes=[c["name"] for c in data.get("classes", [])],
            subclasses=[s["name"] for s in data.get("subclasses", [])],
        )

    def summary(self) -> str:
        """Single-line summary of the spell."""
        level_str = "Cantrip" if self.level == 0 else f"Level {self.level}"
        conc = " [C]" if self.concentration else ""
        ritual = " [R]" if self.ritual else ""
        return (
            f"{self.name} — {level_str} {self.school}{conc}{ritual} | "
            f"{self.casting_time} | {self.range} | {self.duration}"
        )

    def detail(self) -> str:
        """Full formatted detail block for the spell."""
        lines = [
            f"=== {self.name} ===",
            f"Level:        {'Cantrip' if self.level == 0 else self.level}",
            f"School:       {self.school}",
            f"Casting Time: {self.casting_time}",
            f"Range:        {self.range}",
            f"Components:   {', '.join(self.components)}"
            + (f" ({self.material})" if self.material else ""),
            f"Duration:     {self.duration}"
            + (" (Concentration)" if self.concentration else ""),
            f"Ritual:       {'Yes' if self.ritual else 'No'}",
        ]
        if self.attack_type:
            lines.append(f"Attack Type:  {self.attack_type.title()}")
        if self.damage_type:
            lines.append(f"Damage Type:  {self.damage_type}")
        if self.classes:
            lines.append(f"Classes:      {', '.join(self.classes)}")
        lines.append("")
        lines.extend(self.desc)
        if self.higher_level:
            lines.append("")
            lines.append("At Higher Levels:")
            lines.extend(self.higher_level)
        return "\n".join(lines)
