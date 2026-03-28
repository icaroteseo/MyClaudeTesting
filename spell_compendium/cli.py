"""Command-line interface for the spell compendium."""

import argparse
import sys

from .compendium import SpellCompendium

DEFAULT_CACHE = "spells_cache.json"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="spell-compendium",
        description="Browse D&D 5e spells from the 5e API.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # fetch
    fetch_p = sub.add_parser("fetch", help="Fetch all spells and save to cache.")
    fetch_p.add_argument(
        "--cache", default=DEFAULT_CACHE, help="Cache file path (default: spells_cache.json)"
    )

    # get
    get_p = sub.add_parser("get", help="Show full details for a spell by index.")
    get_p.add_argument("index", help="Spell index, e.g. 'fireball'")
    get_p.add_argument("--cache", default=DEFAULT_CACHE)

    # search
    search_p = sub.add_parser("search", help="Search spells by name.")
    search_p.add_argument("query", help="Name substring to search for.")
    search_p.add_argument("--cache", default=DEFAULT_CACHE)

    # filter
    filter_p = sub.add_parser("filter", help="Filter spells by criteria.")
    filter_p.add_argument("--level", type=int, help="Spell level (0 = cantrip)")
    filter_p.add_argument("--school", help="Magic school, e.g. 'evocation'")
    filter_p.add_argument(
        "--class", dest="cls", help="Class name, e.g. 'Wizard'"
    )
    filter_p.add_argument(
        "--concentration", action="store_true", default=None,
        help="Only concentration spells"
    )
    filter_p.add_argument(
        "--ritual", action="store_true", default=None,
        help="Only ritual spells"
    )
    filter_p.add_argument("--damage-type", help="Damage type, e.g. 'fire'")
    filter_p.add_argument("--cache", default=DEFAULT_CACHE)

    return parser


def _load(cache: str) -> SpellCompendium:
    return SpellCompendium.from_api_or_cache(cache, verbose=True)


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "fetch":
        compendium = SpellCompendium.from_api(verbose=True)
        compendium.save(args.cache)
        print(f"Saved {len(compendium)} spells to {args.cache}")

    elif args.command == "get":
        compendium = _load(args.cache)
        spell = compendium.get_or_fetch(args.index)
        if spell is None:
            print(f"Spell not found: {args.index}", file=sys.stderr)
            sys.exit(1)
        print(spell.detail())

    elif args.command == "search":
        compendium = _load(args.cache)
        results = compendium.search(args.query)
        if not results:
            print("No spells found.")
        for s in sorted(results, key=lambda x: (x.level, x.name)):
            print(s.summary())

    elif args.command == "filter":
        compendium = _load(args.cache)
        results = compendium.filter(
            level=args.level,
            school=args.school,
            classes=[args.cls] if args.cls else None,
            concentration=True if args.concentration else None,
            ritual=True if args.ritual else None,
            damage_type=args.damage_type,
        )
        if not results:
            print("No spells matched the filter.")
        for s in results:
            print(s.summary())


if __name__ == "__main__":
    main()
