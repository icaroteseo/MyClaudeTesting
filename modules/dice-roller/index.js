/**
 * Dice Roller Module
 * Exports: mount(container), unmount()
 */

import { roll, rollMultiple, rollWithAdvantage, rollWithDisadvantage, rollNotation, STANDARD_DICE } from '../../shared/dice.js';
import { el, formatModifier } from '../../shared/utils.js';
import { showToast } from '../../shared/components.js';
import { store } from '../../shared/store.js';

// Module state
let history = [];
let modifier = 0;
let rollType = 'normal'; // 'normal' | 'advantage' | 'disadvantage'
let root = null;

function injectStyles() {
  if (!document.getElementById('styles-dice-roller')) {
    const link = document.createElement('link');
    link.id = 'styles-dice-roller';
    link.rel = 'stylesheet';
    link.href = './modules/dice-roller/dice-roller.css';
    document.head.appendChild(link);
  }
}

export function mount(container) {
  injectStyles();
  store.hydrate('rollHistory');
  history = store.get('rollHistory', []);
  root = el('div', { class: 'dice-roller' });
  root.appendChild(render());
  container.appendChild(root);
}

export function unmount() {
  // Nothing to teardown — no timers or global listeners
  root = null;
}

function render() {
  const frag = document.createDocumentFragment();

  // Quick roll buttons
  const quickRollSection = el('div', { class: 'panel dr-quick-roll' });
  quickRollSection.appendChild(el('h2', { class: 'panel-title' }, 'Quick Roll'));

  const diceRow = el('div', { class: 'dr-dice-row' });
  for (const sides of STANDARD_DICE) {
    const btn = el('button', { class: 'btn dr-die-btn', 'data-sides': sides },
      el('span', { class: 'dr-die-face' }, sides === 100 ? 'd%' : `d${sides}`),
    );
    btn.addEventListener('click', () => quickRoll(sides));
    diceRow.appendChild(btn);
  }
  quickRollSection.appendChild(diceRow);

  // Modifier row
  const modRow = el('div', { class: 'dr-mod-row' });
  modRow.appendChild(el('label', { class: 'field-label' }, 'Modifier'));
  const modInput = el('input', { type: 'number', class: 'input dr-mod-input', value: '0', min: '-20', max: '20' });
  modInput.addEventListener('input', e => { modifier = parseInt(e.target.value) || 0; });
  modRow.appendChild(modInput);

  // Advantage/Disadvantage toggle
  const advRow = el('div', { class: 'dr-adv-row' });
  const makeToggle = (label, value) => {
    const btn = el('button', { class: `btn btn-ghost dr-adv-btn${rollType === value ? ' active' : ''}`, 'data-type': value }, label);
    btn.addEventListener('click', () => {
      rollType = rollType === value ? 'normal' : value;
      root.querySelectorAll('.dr-adv-btn').forEach(b => b.classList.toggle('active', b.dataset.type === rollType));
    });
    return btn;
  };
  advRow.appendChild(makeToggle('Advantage', 'advantage'));
  advRow.appendChild(makeToggle('Disadvantage', 'disadvantage'));
  modRow.appendChild(advRow);
  quickRollSection.appendChild(modRow);
  frag.appendChild(quickRollSection);

  // Latest result showcase
  const resultPanel = el('div', { class: 'panel dr-result-panel' });
  resultPanel.appendChild(el('p', { class: 'dr-result-empty' }, 'Roll a die to tempt fate…'));
  frag.appendChild(resultPanel);

  // Custom notation roller
  const customSection = el('div', { class: 'panel dr-custom' });
  customSection.appendChild(el('h2', { class: 'panel-title' }, 'Custom Roll'));
  const customRow = el('div', { class: 'dr-custom-row' });
  const notationInput = el('input', { type: 'text', class: 'input', placeholder: '2d6+3', 'aria-label': 'Dice notation' });
  notationInput.addEventListener('keydown', e => { if (e.key === 'Enter') rollCustom(notationInput.value); });
  const rollBtn = el('button', { class: 'btn btn-primary' }, 'Roll');
  rollBtn.addEventListener('click', () => rollCustom(notationInput.value));
  customRow.appendChild(notationInput);
  customRow.appendChild(rollBtn);
  customSection.appendChild(customRow);
  frag.appendChild(customSection);

  // History
  const histSection = el('div', { class: 'panel dr-history-panel' });
  histSection.appendChild(el('h2', { class: 'panel-title' }, 'Roll History'));
  const clearBtn = el('button', { class: 'btn btn-ghost btn-sm dr-clear-btn' }, 'Clear');
  clearBtn.addEventListener('click', () => {
    history = [];
    store.set('rollHistory', history);
    renderHistory(histList);
  });
  histSection.querySelector('.panel-title').after(clearBtn);

  const histList = el('div', { class: 'dr-history-list' });
  renderHistory(histList);
  histSection.appendChild(histList);
  frag.appendChild(histSection);

  return frag;
}

function quickRoll(sides) {
  let result;
  if (sides === 20 && rollType !== 'normal') {
    result = rollType === 'advantage'
      ? rollWithAdvantage(modifier)
      : rollWithDisadvantage(modifier);
    const rolls = `(${result.roll1}, ${result.roll2})`;
    const kept = result.kept;
    const total = result.total;
    const modStr = modifier !== 0 ? ` ${formatModifier(modifier)}` : '';
    addToHistory({
      label: `d20 [${rollType}]${modStr}`,
      detail: `Rolls: ${rolls} → kept ${kept}${modStr} = ${total}`,
      total,
      isCrit:   kept === 20,
      isFumble: kept === 1,
    });
  } else {
    result = rollMultiple(1, sides, modifier);
    addToHistory({
      label: result.label,
      detail: `${result.rolls[0].value}${modifier !== 0 ? ` ${formatModifier(modifier)} = ${result.total}` : ''}`,
      total: result.total,
      isCrit:   sides === 20 && result.rolls[0].value === 20,
      isFumble: sides === 20 && result.rolls[0].value === 1,
    });
  }
  refreshHistory();
}

function rollCustom(notation) {
  const { result, error } = rollNotation(notation);
  if (error) { showToast(error, 'danger'); return; }
  const breakdown = result.rolls.map(r => r.value).join(' + ');
  const modStr = result.modifier !== 0 ? ` ${formatModifier(result.modifier)}` : '';
  addToHistory({
    label: result.label,
    detail: result.rolls.length > 1
      ? `[${breakdown}]${modStr} = ${result.total}`
      : `${result.rolls[0].value}${modStr}${result.modifier !== 0 ? ` = ${result.total}` : ''}`,
    total: result.total,
    isCrit: false,
    isFumble: false,
  });
  refreshHistory();
}

function addToHistory(entry) {
  history.unshift({ ...entry, time: new Date().toLocaleTimeString() });
  if (history.length > 50) history.pop();
  store.set('rollHistory', history);
  showResult(entry);
}

function showResult(entry) {
  const panel = root?.querySelector('.dr-result-panel');
  if (!panel) return;
  panel.innerHTML = '';

  const wrap = el('div', { class: `dr-result${entry.isCrit ? ' crit' : ''}${entry.isFumble ? ' fumble' : ''}` });
  wrap.appendChild(el('div', { class: 'dr-result-total' }, String(entry.total)));

  const meta = el('div', { class: 'dr-result-meta' });
  meta.appendChild(el('div', { class: 'dr-result-label' }, entry.label));
  meta.appendChild(el('div', { class: 'dr-result-detail' }, entry.detail));
  if (entry.isCrit)   meta.appendChild(el('div', { class: 'dr-result-flag crit' }, '★ Critical!'));
  if (entry.isFumble) meta.appendChild(el('div', { class: 'dr-result-flag fumble' }, '☠ Fumble'));
  wrap.appendChild(meta);

  panel.appendChild(wrap);
}

function renderHistory(container) {
  container.innerHTML = '';
  if (history.length === 0) {
    container.appendChild(el('p', { class: 'dr-history-empty' }, 'No rolls yet. Roll some dice!'));
    return;
  }
  for (const item of history) {
    const row = el('div', { class: `dr-history-row${item.isCrit ? ' crit' : ''}${item.isFumble ? ' fumble' : ''}` });
    row.appendChild(el('span', { class: 'dr-hist-label' }, item.label));
    row.appendChild(el('span', { class: 'dr-hist-detail' }, item.detail));
    row.appendChild(el('span', { class: 'dr-hist-total' }, String(item.total)));
    row.appendChild(el('span', { class: 'dr-hist-time' }, item.time));
    container.appendChild(row);
  }
}

function refreshHistory() {
  if (!root) return;
  const histList = root.querySelector('.dr-history-list');
  if (histList) renderHistory(histList);
}
