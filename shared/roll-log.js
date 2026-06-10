/**
 * Shared roll logging — lets any module roll a d20 check and feed the
 * result into the Dice Roller's persisted history.
 */

import { store } from './store.js';
import { roll } from './dice.js';
import { formatModifier } from './utils.js';
import { showToast } from './components.js';

const HISTORY_KEY = 'rollHistory';
const HISTORY_MAX = 50;

/**
 * Append an entry to the shared roll history (shown in the Dice Roller).
 * @param {{ label: string, detail: string, total: number, isCrit?: boolean, isFumble?: boolean }} entry
 */
export function logRoll(entry) {
  store.hydrate(HISTORY_KEY);
  const history = store.get(HISTORY_KEY, []);
  history.unshift({ ...entry, time: new Date().toLocaleTimeString() });
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  store.set(HISTORY_KEY, history);
}

/**
 * Roll a d20 check with a modifier, toast the result, and log it.
 * @param {string} label  e.g. "Stealth", "STR save"
 * @param {number} modifier
 * @returns {{ value: number, total: number, isCrit: boolean, isFumble: boolean }}
 */
export function rollCheck(label, modifier = 0) {
  const value = roll(20).value;
  const total = value + modifier;
  const isCrit = value === 20;
  const isFumble = value === 1;
  const modStr = modifier !== 0 ? ` ${formatModifier(modifier)}` : '';

  logRoll({
    label: `${label}${modStr}`,
    detail: `d20: ${value}${modStr}${modifier !== 0 ? ` = ${total}` : ''}`,
    total,
    isCrit,
    isFumble,
  });

  const flair = isCrit ? ' — Critical!' : isFumble ? ' — Fumble!' : '';
  showToast(`${label}: ${total} (d20 → ${value}${modStr})${flair}`,
    isCrit ? 'success' : isFumble ? 'danger' : 'info');

  return { value, total, isCrit, isFumble };
}
