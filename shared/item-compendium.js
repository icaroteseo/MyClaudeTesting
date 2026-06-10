/**
 * SRD Item Compendium — equipment, prices, and starting packages.
 * Costs use { amount, unit } with units cp / sp / gp.
 */

export const COIN_VALUES = { cp: 1, sp: 10, gp: 100 }; // value in copper pieces

/** Convert a cost to copper pieces. */
export function costToCp(cost) {
  return cost.amount * COIN_VALUES[cost.unit];
}

/** Format a cost for display, e.g. "25 gp". */
export function formatCost(cost) {
  return `${cost.amount} ${cost.unit}`;
}

/** Break a copper total into { gp, sp, cp }. */
export function cpToCoins(totalCp) {
  const t = Math.max(0, Math.floor(totalCp));
  return { gp: Math.floor(t / 100), sp: Math.floor((t % 100) / 10), cp: t % 10 };
}

/** Compact display of a copper total, e.g. "12 gp 5 sp 3 cp". */
export function formatCp(totalCp) {
  const { gp, sp, cp } = cpToCoins(totalCp);
  const parts = [];
  if (gp) parts.push(`${gp} gp`);
  if (sp) parts.push(`${sp} sp`);
  if (cp || parts.length === 0) parts.push(`${cp} cp`);
  return parts.join(' ');
}

export const ITEM_CATEGORIES = [
  'Simple Weapon', 'Martial Weapon', 'Armor', 'Adventuring Gear', 'Tool', 'Clothing', 'Pack',
];

export const ITEM_COMPENDIUM = [
  // ---- Simple Weapons ----
  { name: 'Club',           category: 'Simple Weapon', cost: { amount: 1, unit: 'sp' }, weight: 2,    meta: '1d4 bludgeoning · light' },
  { name: 'Dagger',         category: 'Simple Weapon', cost: { amount: 2, unit: 'gp' }, weight: 1,    meta: '1d4 piercing · finesse, light, thrown' },
  { name: 'Greatclub',      category: 'Simple Weapon', cost: { amount: 2, unit: 'sp' }, weight: 10,   meta: '1d8 bludgeoning · two-handed' },
  { name: 'Handaxe',        category: 'Simple Weapon', cost: { amount: 5, unit: 'gp' }, weight: 2,    meta: '1d6 slashing · light, thrown' },
  { name: 'Javelin',        category: 'Simple Weapon', cost: { amount: 5, unit: 'sp' }, weight: 2,    meta: '1d6 piercing · thrown (30/120)' },
  { name: 'Light Hammer',   category: 'Simple Weapon', cost: { amount: 2, unit: 'gp' }, weight: 2,    meta: '1d4 bludgeoning · light, thrown' },
  { name: 'Mace',           category: 'Simple Weapon', cost: { amount: 5, unit: 'gp' }, weight: 4,    meta: '1d6 bludgeoning' },
  { name: 'Quarterstaff',   category: 'Simple Weapon', cost: { amount: 2, unit: 'sp' }, weight: 4,    meta: '1d6 bludgeoning · versatile (1d8)' },
  { name: 'Sickle',         category: 'Simple Weapon', cost: { amount: 1, unit: 'gp' }, weight: 2,    meta: '1d4 slashing · light' },
  { name: 'Spear',          category: 'Simple Weapon', cost: { amount: 1, unit: 'gp' }, weight: 3,    meta: '1d6 piercing · thrown, versatile (1d8)' },
  { name: 'Dart',           category: 'Simple Weapon', cost: { amount: 5, unit: 'cp' }, weight: 0.25, meta: '1d4 piercing · finesse, thrown' },
  { name: 'Shortbow',       category: 'Simple Weapon', cost: { amount: 25, unit: 'gp' }, weight: 2,   meta: '1d6 piercing · range 80/320, two-handed' },
  { name: 'Sling',          category: 'Simple Weapon', cost: { amount: 1, unit: 'sp' }, weight: 0,    meta: '1d4 bludgeoning · range 30/120' },
  { name: 'Light Crossbow', category: 'Simple Weapon', cost: { amount: 25, unit: 'gp' }, weight: 5,   meta: '1d8 piercing · range 80/320, loading' },

  // ---- Martial Weapons ----
  { name: 'Battleaxe',      category: 'Martial Weapon', cost: { amount: 10, unit: 'gp' }, weight: 4,  meta: '1d8 slashing · versatile (1d10)' },
  { name: 'Flail',          category: 'Martial Weapon', cost: { amount: 10, unit: 'gp' }, weight: 2,  meta: '1d8 bludgeoning' },
  { name: 'Glaive',         category: 'Martial Weapon', cost: { amount: 20, unit: 'gp' }, weight: 6,  meta: '1d10 slashing · heavy, reach, two-handed' },
  { name: 'Greataxe',       category: 'Martial Weapon', cost: { amount: 30, unit: 'gp' }, weight: 7,  meta: '1d12 slashing · heavy, two-handed' },
  { name: 'Greatsword',     category: 'Martial Weapon', cost: { amount: 50, unit: 'gp' }, weight: 6,  meta: '2d6 slashing · heavy, two-handed' },
  { name: 'Halberd',        category: 'Martial Weapon', cost: { amount: 20, unit: 'gp' }, weight: 6,  meta: '1d10 slashing · heavy, reach, two-handed' },
  { name: 'Longsword',      category: 'Martial Weapon', cost: { amount: 15, unit: 'gp' }, weight: 3,  meta: '1d8 slashing · versatile (1d10)' },
  { name: 'Maul',           category: 'Martial Weapon', cost: { amount: 10, unit: 'gp' }, weight: 10, meta: '2d6 bludgeoning · heavy, two-handed' },
  { name: 'Morningstar',    category: 'Martial Weapon', cost: { amount: 15, unit: 'gp' }, weight: 4,  meta: '1d8 piercing' },
  { name: 'Pike',           category: 'Martial Weapon', cost: { amount: 5, unit: 'gp' }, weight: 18,  meta: '1d10 piercing · heavy, reach, two-handed' },
  { name: 'Rapier',         category: 'Martial Weapon', cost: { amount: 25, unit: 'gp' }, weight: 2,  meta: '1d8 piercing · finesse' },
  { name: 'Scimitar',       category: 'Martial Weapon', cost: { amount: 25, unit: 'gp' }, weight: 3,  meta: '1d6 slashing · finesse, light' },
  { name: 'Shortsword',     category: 'Martial Weapon', cost: { amount: 10, unit: 'gp' }, weight: 2,  meta: '1d6 piercing · finesse, light' },
  { name: 'Trident',        category: 'Martial Weapon', cost: { amount: 5, unit: 'gp' }, weight: 4,   meta: '1d6 piercing · thrown, versatile (1d8)' },
  { name: 'War Pick',       category: 'Martial Weapon', cost: { amount: 5, unit: 'gp' }, weight: 2,   meta: '1d8 piercing' },
  { name: 'Warhammer',      category: 'Martial Weapon', cost: { amount: 15, unit: 'gp' }, weight: 2,  meta: '1d8 bludgeoning · versatile (1d10)' },
  { name: 'Whip',           category: 'Martial Weapon', cost: { amount: 2, unit: 'gp' }, weight: 3,   meta: '1d4 slashing · finesse, reach' },
  { name: 'Hand Crossbow',  category: 'Martial Weapon', cost: { amount: 75, unit: 'gp' }, weight: 3,  meta: '1d6 piercing · range 30/120, light, loading' },
  { name: 'Heavy Crossbow', category: 'Martial Weapon', cost: { amount: 50, unit: 'gp' }, weight: 18, meta: '1d10 piercing · range 100/400, heavy, loading' },
  { name: 'Longbow',        category: 'Martial Weapon', cost: { amount: 50, unit: 'gp' }, weight: 2,  meta: '1d8 piercing · range 150/600, heavy, two-handed' },

  // ---- Armor ----
  { name: 'Padded Armor',    category: 'Armor', cost: { amount: 5, unit: 'gp' },    weight: 8,  meta: 'AC 11 + DEX · disadvantage on Stealth' },
  { name: 'Leather Armor',   category: 'Armor', cost: { amount: 10, unit: 'gp' },   weight: 10, meta: 'AC 11 + DEX' },
  { name: 'Studded Leather', category: 'Armor', cost: { amount: 45, unit: 'gp' },   weight: 13, meta: 'AC 12 + DEX' },
  { name: 'Hide Armor',      category: 'Armor', cost: { amount: 10, unit: 'gp' },   weight: 12, meta: 'AC 12 + DEX (max 2)' },
  { name: 'Chain Shirt',     category: 'Armor', cost: { amount: 50, unit: 'gp' },   weight: 20, meta: 'AC 13 + DEX (max 2)' },
  { name: 'Scale Mail',      category: 'Armor', cost: { amount: 50, unit: 'gp' },   weight: 45, meta: 'AC 14 + DEX (max 2) · disadvantage on Stealth' },
  { name: 'Breastplate',     category: 'Armor', cost: { amount: 400, unit: 'gp' },  weight: 20, meta: 'AC 14 + DEX (max 2)' },
  { name: 'Half Plate',      category: 'Armor', cost: { amount: 750, unit: 'gp' },  weight: 40, meta: 'AC 15 + DEX (max 2) · disadvantage on Stealth' },
  { name: 'Ring Mail',       category: 'Armor', cost: { amount: 30, unit: 'gp' },   weight: 40, meta: 'AC 14 · disadvantage on Stealth' },
  { name: 'Chain Mail',      category: 'Armor', cost: { amount: 75, unit: 'gp' },   weight: 55, meta: 'AC 16 · STR 13 · disadvantage on Stealth' },
  { name: 'Splint Armor',    category: 'Armor', cost: { amount: 200, unit: 'gp' },  weight: 60, meta: 'AC 17 · STR 15 · disadvantage on Stealth' },
  { name: 'Plate Armor',     category: 'Armor', cost: { amount: 1500, unit: 'gp' }, weight: 65, meta: 'AC 18 · STR 15 · disadvantage on Stealth' },
  { name: 'Shield',          category: 'Armor', cost: { amount: 10, unit: 'gp' },   weight: 6,  meta: '+2 AC' },

  // ---- Adventuring Gear ----
  { name: 'Arrows (20)',          category: 'Adventuring Gear', cost: { amount: 1, unit: 'gp' },  weight: 1 },
  { name: 'Crossbow Bolts (20)',  category: 'Adventuring Gear', cost: { amount: 1, unit: 'gp' },  weight: 1.5 },
  { name: 'Backpack',             category: 'Adventuring Gear', cost: { amount: 2, unit: 'gp' },  weight: 5 },
  { name: 'Bedroll',              category: 'Adventuring Gear', cost: { amount: 1, unit: 'gp' },  weight: 7 },
  { name: 'Caltrops (bag of 20)', category: 'Adventuring Gear', cost: { amount: 1, unit: 'gp' },  weight: 2 },
  { name: 'Chain (10 feet)',      category: 'Adventuring Gear', cost: { amount: 5, unit: 'gp' },  weight: 10 },
  { name: 'Component Pouch',      category: 'Adventuring Gear', cost: { amount: 25, unit: 'gp' }, weight: 2 },
  { name: 'Arcane Focus',         category: 'Adventuring Gear', cost: { amount: 10, unit: 'gp' }, weight: 1 },
  { name: 'Druidic Focus',        category: 'Adventuring Gear', cost: { amount: 10, unit: 'gp' }, weight: 0 },
  { name: 'Crowbar',              category: 'Adventuring Gear', cost: { amount: 2, unit: 'gp' },  weight: 5 },
  { name: 'Grappling Hook',       category: 'Adventuring Gear', cost: { amount: 2, unit: 'gp' },  weight: 4 },
  { name: "Healer's Kit",         category: 'Adventuring Gear', cost: { amount: 5, unit: 'gp' },  weight: 3,  meta: '10 uses · stabilize at 0 HP' },
  { name: 'Holy Symbol',          category: 'Adventuring Gear', cost: { amount: 5, unit: 'gp' },  weight: 1 },
  { name: 'Hooded Lantern',       category: 'Adventuring Gear', cost: { amount: 5, unit: 'gp' },  weight: 2,  meta: 'bright 30 ft / dim 30 ft · 6 h per oil flask' },
  { name: 'Hunting Trap',         category: 'Adventuring Gear', cost: { amount: 5, unit: 'gp' },  weight: 25, meta: 'DEX save or 1d4 and held in place' },
  { name: 'Iron Pot',             category: 'Adventuring Gear', cost: { amount: 2, unit: 'gp' },  weight: 10 },
  { name: 'Ink (1 oz bottle)',    category: 'Adventuring Gear', cost: { amount: 10, unit: 'gp' }, weight: 0 },
  { name: 'Ink Pen',              category: 'Adventuring Gear', cost: { amount: 2, unit: 'cp' },  weight: 0 },
  { name: 'Mess Kit',             category: 'Adventuring Gear', cost: { amount: 2, unit: 'sp' },  weight: 1 },
  { name: 'Oil (flask)',          category: 'Adventuring Gear', cost: { amount: 1, unit: 'sp' },  weight: 1 },
  { name: 'Piton',                category: 'Adventuring Gear', cost: { amount: 5, unit: 'cp' },  weight: 0.25 },
  { name: 'Potion of Healing',    category: 'Adventuring Gear', cost: { amount: 50, unit: 'gp' }, weight: 0.5, meta: 'regain 2d4+2 HP' },
  { name: 'Rations (1 day)',      category: 'Adventuring Gear', cost: { amount: 5, unit: 'sp' },  weight: 2 },
  { name: 'Rope, Hempen (50 ft)', category: 'Adventuring Gear', cost: { amount: 1, unit: 'gp' },  weight: 10 },
  { name: 'Rope, Silk (50 ft)',   category: 'Adventuring Gear', cost: { amount: 10, unit: 'gp' }, weight: 5 },
  { name: 'Shovel',               category: 'Adventuring Gear', cost: { amount: 2, unit: 'gp' },  weight: 5 },
  { name: 'Spellbook',            category: 'Adventuring Gear', cost: { amount: 50, unit: 'gp' }, weight: 3 },
  { name: 'Tinderbox',            category: 'Adventuring Gear', cost: { amount: 5, unit: 'sp' },  weight: 1 },
  { name: 'Torch',                category: 'Adventuring Gear', cost: { amount: 1, unit: 'cp' },  weight: 1,  meta: 'bright 20 ft / dim 20 ft · 1 hour' },
  { name: 'Waterskin',            category: 'Adventuring Gear', cost: { amount: 2, unit: 'sp' },  weight: 5 },

  // ---- Tools ----
  { name: "Thieves' Tools",  category: 'Tool', cost: { amount: 25, unit: 'gp' }, weight: 1 },
  { name: 'Disguise Kit',    category: 'Tool', cost: { amount: 25, unit: 'gp' }, weight: 3 },
  { name: 'Gaming Set',      category: 'Tool', cost: { amount: 1, unit: 'sp' },  weight: 0 },
  { name: 'Lute',            category: 'Tool', cost: { amount: 35, unit: 'gp' }, weight: 2 },

  // ---- Clothing ----
  { name: 'Common Clothes',     category: 'Clothing', cost: { amount: 5, unit: 'sp' },  weight: 3 },
  { name: 'Fine Clothes',       category: 'Clothing', cost: { amount: 15, unit: 'gp' }, weight: 6 },
  { name: "Traveler's Clothes", category: 'Clothing', cost: { amount: 2, unit: 'gp' },  weight: 4 },
  { name: 'Costume',            category: 'Clothing', cost: { amount: 5, unit: 'gp' },  weight: 4 },
  { name: 'Signet Ring',        category: 'Clothing', cost: { amount: 5, unit: 'gp' },  weight: 0 },
  { name: 'Insignia of Rank',   category: 'Clothing', cost: { amount: 1, unit: 'gp' },  weight: 0 },

  // ---- Packs ----
  { name: "Burglar's Pack",     category: 'Pack', cost: { amount: 16, unit: 'gp' }, weight: 44, meta: 'backpack, ball bearings, string, bell, candles, crowbar, hammer, pitons, lantern, oil, rations, tinderbox, waterskin, rope' },
  { name: "Diplomat's Pack",    category: 'Pack', cost: { amount: 39, unit: 'gp' }, weight: 36, meta: 'chest, scroll cases, fine clothes, ink, pen, lamp, oil, paper, perfume, sealing wax, soap' },
  { name: "Dungeoneer's Pack",  category: 'Pack', cost: { amount: 12, unit: 'gp' }, weight: 61, meta: 'backpack, crowbar, hammer, pitons, torches, tinderbox, rations, waterskin, rope' },
  { name: "Entertainer's Pack", category: 'Pack', cost: { amount: 40, unit: 'gp' }, weight: 38, meta: 'backpack, bedroll, costumes, candles, rations, waterskin, disguise kit' },
  { name: "Explorer's Pack",    category: 'Pack', cost: { amount: 10, unit: 'gp' }, weight: 59, meta: 'backpack, bedroll, mess kit, tinderbox, torches, rations, waterskin, rope' },
  { name: "Priest's Pack",      category: 'Pack', cost: { amount: 19, unit: 'gp' }, weight: 24, meta: 'backpack, blanket, candles, tinderbox, alms box, incense, censer, vestments, rations, waterskin' },
  { name: "Scholar's Pack",     category: 'Pack', cost: { amount: 40, unit: 'gp' }, weight: 10, meta: 'backpack, book of lore, ink, pen, parchment, sand bag, small knife' },
];

/**
 * Default starting equipment package and starting-gold roll per class (SRD).
 * Gold: roll `dice`, multiply by 10 unless times10 is false (Monk).
 */
export const CLASS_STARTING = {
  Barbarian: { gold: { dice: '2d4' }, items: [['Greataxe', 1], ['Handaxe', 2], ["Explorer's Pack", 1], ['Javelin', 4]] },
  Bard:      { gold: { dice: '5d4' }, items: [['Rapier', 1], ['Lute', 1], ['Leather Armor', 1], ['Dagger', 1], ["Entertainer's Pack", 1]] },
  Cleric:    { gold: { dice: '5d4' }, items: [['Mace', 1], ['Scale Mail', 1], ['Shield', 1], ['Holy Symbol', 1], ["Priest's Pack", 1], ['Light Crossbow', 1], ['Crossbow Bolts (20)', 1]] },
  Druid:     { gold: { dice: '2d4' }, items: [['Shield', 1], ['Scimitar', 1], ['Leather Armor', 1], ["Explorer's Pack", 1], ['Druidic Focus', 1]] },
  Fighter:   { gold: { dice: '5d4' }, items: [['Chain Mail', 1], ['Longsword', 1], ['Shield', 1], ['Light Crossbow', 1], ['Crossbow Bolts (20)', 1], ["Dungeoneer's Pack", 1]] },
  Monk:      { gold: { dice: '5d4', times10: false }, items: [['Shortsword', 1], ["Dungeoneer's Pack", 1], ['Dart', 10]] },
  Paladin:   { gold: { dice: '5d4' }, items: [['Longsword', 1], ['Shield', 1], ['Javelin', 5], ['Chain Mail', 1], ["Priest's Pack", 1], ['Holy Symbol', 1]] },
  Ranger:    { gold: { dice: '5d4' }, items: [['Scale Mail', 1], ['Shortsword', 2], ['Longbow', 1], ['Arrows (20)', 1], ["Dungeoneer's Pack", 1]] },
  Rogue:     { gold: { dice: '4d4' }, items: [['Rapier', 1], ['Shortbow', 1], ['Arrows (20)', 1], ["Burglar's Pack", 1], ['Leather Armor', 1], ['Dagger', 2], ["Thieves' Tools", 1]] },
  Sorcerer:  { gold: { dice: '3d4' }, items: [['Light Crossbow', 1], ['Crossbow Bolts (20)', 1], ['Component Pouch', 1], ["Dungeoneer's Pack", 1], ['Dagger', 2]] },
  Warlock:   { gold: { dice: '4d4' }, items: [['Light Crossbow', 1], ['Crossbow Bolts (20)', 1], ['Component Pouch', 1], ["Scholar's Pack", 1], ['Leather Armor', 1], ['Mace', 1], ['Dagger', 2]] },
  Wizard:    { gold: { dice: '4d4' }, items: [['Quarterstaff', 1], ['Component Pouch', 1], ["Scholar's Pack", 1], ['Spellbook', 1]] },
};

/** Starting items and gold per background (SRD subset). */
export const BACKGROUND_STARTING = {
  Acolyte:     { goldGp: 15, items: [['Holy Symbol', 1], ['Common Clothes', 1]] },
  Criminal:    { goldGp: 15, items: [['Crowbar', 1], ['Common Clothes', 1], ['Gaming Set', 1]] },
  Entertainer: { goldGp: 15, items: [['Costume', 1], ['Common Clothes', 1]] },
  'Folk Hero': { goldGp: 10, items: [['Shovel', 1], ['Iron Pot', 1], ['Common Clothes', 1]] },
  Noble:       { goldGp: 25, items: [['Fine Clothes', 1], ['Signet Ring', 1], ['Gaming Set', 1]] },
  Outlander:   { goldGp: 10, items: [['Quarterstaff', 1], ['Hunting Trap', 1], ["Traveler's Clothes", 1]] },
  Sage:        { goldGp: 10, items: [['Ink (1 oz bottle)', 1], ['Ink Pen', 1], ['Dagger', 1], ['Common Clothes', 1]] },
  Soldier:     { goldGp: 10, items: [['Insignia of Rank', 1], ['Gaming Set', 1], ['Common Clothes', 1]] },
};
