/**
 * D&D 5e Dice Engine
 * Pure functions for all dice rolling mechanics.
 */

/**
 * Roll a single die with `sides` faces.
 * @param {number} sides
 * @returns {{ value: number, sides: number, label: string }}
 */
export function roll(sides) {
  const value = Math.floor(Math.random() * sides) + 1;
  return { value, sides, label: `d${sides}` };
}

/**
 * Roll multiple dice of the same type.
 * @param {number} count
 * @param {number} sides
 * @param {number} [modifier=0]
 * @returns {{ rolls: Array, total: number, modifier: number, label: string }}
 */
export function rollMultiple(count, sides, modifier = 0) {
  const rolls = Array.from({ length: count }, () => roll(sides));
  const subtotal = rolls.reduce((sum, r) => sum + r.value, 0);
  const total = subtotal + modifier;
  const modStr = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '';
  return {
    rolls,
    subtotal,
    total,
    modifier,
    label: `${count}d${sides}${modStr}`,
  };
}

/**
 * Roll a d20 with advantage (roll twice, take highest).
 * @param {number} [modifier=0]
 * @returns {{ roll1: number, roll2: number, kept: number, total: number, type: string }}
 */
export function rollWithAdvantage(modifier = 0) {
  const r1 = roll(20).value;
  const r2 = roll(20).value;
  const kept = Math.max(r1, r2);
  return { roll1: r1, roll2: r2, kept, total: kept + modifier, type: 'advantage', modifier };
}

/**
 * Roll a d20 with disadvantage (roll twice, take lowest).
 * @param {number} [modifier=0]
 * @returns {{ roll1: number, roll2: number, kept: number, total: number, type: string }}
 */
export function rollWithDisadvantage(modifier = 0) {
  const r1 = roll(20).value;
  const r2 = roll(20).value;
  const kept = Math.min(r1, r2);
  return { roll1: r1, roll2: r2, kept, total: kept + modifier, type: 'disadvantage', modifier };
}

/**
 * Roll a standard d20 ability check / attack roll.
 * @param {number} [modifier=0]
 * @returns {{ value: number, modifier: number, total: number, isCrit: boolean, isFumble: boolean }}
 */
export function rollD20Check(modifier = 0) {
  const { value } = roll(20);
  return {
    value,
    modifier,
    total: value + modifier,
    isCrit:   value === 20,
    isFumble: value === 1,
  };
}

/**
 * Parse dice notation like "2d6+3", "d20", "1d4-1".
 * @param {string} notation
 * @returns {{ count: number, sides: number, modifier: number } | null}
 */
export function parseDiceNotation(notation) {
  const match = notation.trim().toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  return {
    count:    parseInt(match[1] || '1', 10),
    sides:    parseInt(match[2], 10),
    modifier: parseInt(match[3] || '0', 10),
  };
}

/**
 * Roll from a parsed dice notation string.
 * @param {string} notation
 * @returns {{ result: object, error: string|null }}
 */
export function rollNotation(notation) {
  const parsed = parseDiceNotation(notation);
  if (!parsed) return { result: null, error: `Invalid dice notation: "${notation}"` };
  if (parsed.sides < 2) return { result: null, error: 'Dice must have at least 2 sides.' };
  if (parsed.count < 1) return { result: null, error: 'Must roll at least 1 die.' };
  if (parsed.count > 100) return { result: null, error: 'Maximum 100 dice at once.' };
  return { result: rollMultiple(parsed.count, parsed.sides, parsed.modifier), error: null };
}

/** Die face Unicode characters for decoration */
export const DIE_UNICODE = {
  4:   '▲',
  6:   '⬡',
  8:   '◆',
  10:  '◈',
  12:  '⬠',
  20:  '⬡',
  100: '%',
};

export const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100];
