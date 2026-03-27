/**
 * D&D 5e Utility Functions
 */

/**
 * Compute 5e ability modifier from an ability score.
 * @param {number} score
 * @returns {number}
 */
export function abilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

/**
 * Format a modifier with explicit sign (+3, -1, +0).
 * @param {number} n
 * @returns {string}
 */
export function formatModifier(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * 5e proficiency bonus by character level.
 * @param {number} level  1–20
 * @returns {number}
 */
export function proficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

/**
 * Standard 5e full-caster spell slots by character level (PHB Table).
 * Returns array indexed [1..9] with slot count (index 0 unused).
 * @param {number} level  1–20
 * @returns {number[]}
 */
export function fullCasterSpellSlots(level) {
  const table = [
    [0,0,0,0,0,0,0,0,0,0], // placeholder [0]
    [0,2,0,0,0,0,0,0,0,0], // 1
    [0,3,0,0,0,0,0,0,0,0], // 2
    [0,4,2,0,0,0,0,0,0,0], // 3
    [0,4,3,0,0,0,0,0,0,0], // 4
    [0,4,3,2,0,0,0,0,0,0], // 5
    [0,4,3,3,0,0,0,0,0,0], // 6
    [0,4,3,3,1,0,0,0,0,0], // 7
    [0,4,3,3,2,0,0,0,0,0], // 8
    [0,4,3,3,3,1,0,0,0,0], // 9
    [0,4,3,3,3,2,0,0,0,0], // 10
    [0,4,3,3,3,2,1,0,0,0], // 11
    [0,4,3,3,3,2,1,0,0,0], // 12
    [0,4,3,3,3,2,1,1,0,0], // 13
    [0,4,3,3,3,2,1,1,0,0], // 14
    [0,4,3,3,3,2,1,1,1,0], // 15
    [0,4,3,3,3,2,1,1,1,0], // 16
    [0,4,3,3,3,2,1,1,1,1], // 17
    [0,4,3,3,3,3,1,1,1,1], // 18
    [0,4,3,3,3,3,2,1,1,1], // 19
    [0,4,3,3,3,3,2,2,1,1], // 20
  ];
  const clamped = Math.max(1, Math.min(20, level));
  return table[clamped];
}

/**
 * Create a DOM element with optional attributes and children.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {...(string|Node)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') element.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
    else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
    else element.setAttribute(key, value);
  }
  for (const child of children) {
    if (child == null) continue;
    element.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return element;
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** All 18 D&D 5e skills with their associated ability. */
export const SKILLS = [
  { name: 'Acrobatics',      ability: 'dex' },
  { name: 'Animal Handling', ability: 'wis' },
  { name: 'Arcana',          ability: 'int' },
  { name: 'Athletics',       ability: 'str' },
  { name: 'Deception',       ability: 'cha' },
  { name: 'History',         ability: 'int' },
  { name: 'Insight',         ability: 'wis' },
  { name: 'Intimidation',    ability: 'cha' },
  { name: 'Investigation',   ability: 'int' },
  { name: 'Medicine',        ability: 'wis' },
  { name: 'Nature',          ability: 'int' },
  { name: 'Perception',      ability: 'wis' },
  { name: 'Performance',     ability: 'cha' },
  { name: 'Persuasion',      ability: 'cha' },
  { name: 'Religion',        ability: 'int' },
  { name: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth',         ability: 'dex' },
  { name: 'Survival',        ability: 'wis' },
];

/** The 6 ability score names. */
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Standard 5e conditions. */
export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion',
  'Frightened', 'Grappled', 'Incapacitated', 'Invisible',
  'Paralyzed', 'Petrified', 'Poisoned', 'Prone',
  'Restrained', 'Stunned', 'Unconscious',
];

/** Spell schools. */
export const SPELL_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
];
