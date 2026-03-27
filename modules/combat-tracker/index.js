/**
 * Combat Tracker Module
 * Exports: mount(container), unmount()
 */

import { store } from '../../shared/store.js';
import { roll } from '../../shared/dice.js';
import { el, abilityModifier, formatModifier, CONDITIONS } from '../../shared/utils.js';
import { showToast } from '../../shared/components.js';

const STORE_KEY = 'combat';

const DEFAULT_STATE = {
  combatants: [],
  round: 0,
  activeTurn: 0,
  isActive: false,
};

let root = null;
let state = null;

function injectStyles() {
  if (!document.getElementById('styles-combat-tracker')) {
    const link = document.createElement('link');
    link.id = 'styles-combat-tracker';
    link.rel = 'stylesheet';
    link.href = './modules/combat-tracker/combat-tracker.css';
    document.head.appendChild(link);
  }
}

function save() { store.set(STORE_KEY, state); }

export function mount(container) {
  injectStyles();
  store.hydrate(STORE_KEY);
  state = { ...DEFAULT_STATE, ...(store.get(STORE_KEY) ?? {}) };

  root = el('div', { class: 'combat-tracker' });
  rebuild();
  container.appendChild(root);
}

export function unmount() {
  root = null;
}

function rebuild() {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(buildHeader());
  if (!state.isActive) {
    root.appendChild(buildSetup());
  } else {
    root.appendChild(buildCombatView());
  }
}

// ---- Header ----
function buildHeader() {
  const header = el('div', { class: 'ct-header' });

  const title = el('h2', { class: 'ct-title' },
    state.isActive ? `⚔ Combat — Round ${state.round}` : '⚔ Combat Tracker'
  );
  header.appendChild(title);

  if (state.isActive) {
    const endBtn = el('button', { class: 'btn btn-danger btn-sm' }, 'End Combat');
    endBtn.addEventListener('click', () => {
      state.isActive = false;
      state.round = 0;
      state.activeTurn = 0;
      save();
      rebuild();
      showToast('Combat ended.', 'info');
    });
    header.appendChild(endBtn);
  } else if (state.combatants.length > 0) {
    const clearBtn = el('button', { class: 'btn btn-ghost btn-sm' }, 'Clear All');
    clearBtn.addEventListener('click', () => {
      state.combatants = [];
      save();
      rebuild();
    });
    header.appendChild(clearBtn);

    const sortBtn = el('button', { class: 'btn btn-ghost btn-sm' }, 'Sort by Initiative');
    sortBtn.addEventListener('click', () => sortCombatants());
    header.appendChild(sortBtn);

    const startBtn = el('button', { class: 'btn btn-primary' }, 'Start Combat');
    startBtn.addEventListener('click', () => {
      sortCombatants();
      state.isActive = true;
      state.round = 1;
      state.activeTurn = 0;
      save();
      rebuild();
    });
    header.appendChild(startBtn);
  }

  return header;
}

function sortCombatants() {
  state.combatants.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return (b.dexMod ?? 0) - (a.dexMod ?? 0);
  });
  save();
  rebuild();
}

// ---- Setup: combatant list + add form ----
function buildSetup() {
  const frag = document.createDocumentFragment();

  // Current combatants
  if (state.combatants.length > 0) {
    const panel = el('div', { class: 'panel ct-combatant-list-panel' });
    panel.appendChild(el('h3', { class: 'panel-title' }, 'Combatants'));
    const list = el('div', { class: 'ct-setup-list' });
    for (let i = 0; i < state.combatants.length; i++) {
      list.appendChild(buildSetupRow(i));
    }
    panel.appendChild(list);
    frag.appendChild(panel);
  }

  // Add combatant form
  frag.appendChild(buildAddForm());

  // Import from character sheet button
  const char = store.get('character');
  if (char?.name) {
    const importPanel = el('div', { class: 'panel ct-import-panel' });
    importPanel.appendChild(el('p', { class: 'ct-import-label' }, `Import "${char.name}" from Character Sheet`));
    const importBtn = el('button', { class: 'btn btn-ghost' }, 'Add to Combat');
    importBtn.addEventListener('click', () => importCharacter(char));
    importPanel.appendChild(importBtn);
    frag.appendChild(importPanel);
  }

  return frag;
}

function buildSetupRow(index) {
  const c = state.combatants[index];
  const row = el('div', { class: 'ct-setup-row' });
  row.appendChild(el('span', { class: 'ct-setup-init' }, String(c.initiative)));
  row.appendChild(el('span', { class: 'ct-setup-name' }, c.name));
  row.appendChild(el('span', { class: 'ct-setup-hp' }, `HP: ${c.hp}/${c.hpMax}`));
  row.appendChild(el('span', { class: 'ct-setup-ac' }, `AC: ${c.ac}`));

  const removeBtn = el('button', { class: 'btn btn-ghost btn-sm' }, '✕');
  removeBtn.addEventListener('click', () => {
    state.combatants.splice(index, 1);
    save();
    rebuild();
  });
  row.appendChild(removeBtn);
  return row;
}

function buildAddForm() {
  const panel = el('div', { class: 'panel ct-add-panel' });
  panel.appendChild(el('h3', { class: 'panel-title' }, '+ Add Combatant'));

  const form = el('div', { class: 'ct-add-form' });
  const nameInput = el('input', { type: 'text',   class: 'input', placeholder: 'Name' });
  const initInput = el('input', { type: 'number', class: 'input', placeholder: 'Initiative', value: '10' });
  const hpInput   = el('input', { type: 'number', class: 'input', placeholder: 'Max HP', value: '10', min: '1' });
  const acInput   = el('input', { type: 'number', class: 'input', placeholder: 'AC', value: '10' });
  const dexInput  = el('input', { type: 'number', class: 'input', placeholder: 'DEX score', value: '10' });

  const rollInitBtn = el('button', { class: 'btn btn-ghost btn-sm' }, '🎲 Roll Initiative');
  rollInitBtn.addEventListener('click', () => {
    const dex = parseInt(dexInput.value) || 10;
    const mod = abilityModifier(dex);
    const result = roll(20).value + mod;
    initInput.value = String(result);
    showToast(`Rolled ${result} initiative`, 'info', 1500);
  });

  const addBtn = el('button', { class: 'btn btn-primary' }, 'Add');
  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { showToast('Name is required.', 'danger'); return; }
    const dex = parseInt(dexInput.value) || 10;
    const hpMax = parseInt(hpInput.value) || 1;
    state.combatants.push({
      id: Date.now(),
      name,
      initiative: parseInt(initInput.value) || 0,
      hp: hpMax,
      hpMax,
      ac: parseInt(acInput.value) || 10,
      dexMod: abilityModifier(dex),
      conditions: [],
      isPlayer: false,
    });
    save();
    rebuild();
    nameInput.value = '';
    initInput.value = '10';
    hpInput.value = '10';
    acInput.value = '10';
    dexInput.value = '10';
  });

  const row1 = el('div', { class: 'ct-form-row' });
  row1.append(nameInput, initInput, rollInitBtn);
  const row2 = el('div', { class: 'ct-form-row' });
  row2.append(hpInput, acInput, dexInput);

  form.append(row1, row2, addBtn);
  panel.appendChild(form);
  return panel;
}

function importCharacter(char) {
  const dex = char.dex ?? 10;
  const hpMax = char.hpMax || char.hp || 1;
  const existing = state.combatants.find(c => c.name === char.name && c.isPlayer);
  if (existing) { showToast(`${char.name} is already in combat.`, 'danger'); return; }
  state.combatants.push({
    id: Date.now(),
    name: char.name,
    initiative: roll(20).value + abilityModifier(dex),
    hp: char.hp ?? hpMax,
    hpMax,
    ac: char.ac ?? 10,
    dexMod: abilityModifier(dex),
    conditions: [],
    isPlayer: true,
  });
  save();
  rebuild();
  showToast(`${char.name} added to combat!`, 'success');
}

// ---- Active Combat View ----
function buildCombatView() {
  const panel = el('div', { class: 'panel ct-combat-panel' });
  panel.appendChild(el('h3', { class: 'panel-title' }, `Round ${state.round} — Initiative Order`));

  const list = el('div', { class: 'ct-combat-list' });
  for (let i = 0; i < state.combatants.length; i++) {
    list.appendChild(buildCombatRow(i));
  }
  panel.appendChild(list);

  const nextBtn = el('button', { class: 'btn btn-primary ct-next-btn' }, 'Next Turn ▶');
  nextBtn.addEventListener('click', () => {
    state.activeTurn = (state.activeTurn + 1) % state.combatants.length;
    if (state.activeTurn === 0) {
      state.round++;
      showToast(`Round ${state.round} begins!`, 'info');
    }
    save();
    rebuild();
  });
  panel.appendChild(nextBtn);
  return panel;
}

function buildCombatRow(index) {
  const c = state.combatants[index];
  const isActive = index === state.activeTurn;
  const row = el('div', { class: `ct-combat-row${isActive ? ' active' : ''}${c.hp <= 0 ? ' defeated' : ''}` });

  // Turn marker
  row.appendChild(el('span', { class: 'ct-turn-marker' }, isActive ? '▶' : ''));

  // Initiative
  row.appendChild(el('span', { class: 'ct-ci-init' }, String(c.initiative)));

  // Name
  const nameEl = el('span', { class: `ct-ci-name${c.isPlayer ? ' player' : ''}` }, c.name);
  row.appendChild(nameEl);

  // HP display / edit
  const hpWrap = el('div', { class: 'ct-hp-wrap' });
  const hpDisplay = el('span', { class: 'ct-hp-display', title: 'Click to edit HP' },
    `${c.hp}/${c.hpMax}`);

  hpDisplay.addEventListener('click', () => {
    hpDisplay.style.display = 'none';
    hpEdit.style.display = '';
    hpEdit.focus();
    hpEdit.select();
  });

  const hpEdit = el('input', {
    type: 'number', class: 'input ct-hp-input', value: String(c.hp),
    style: { display: 'none' },
  });
  hpEdit.addEventListener('blur', () => commitHp(index, parseInt(hpEdit.value) || 0, hpDisplay, hpEdit));
  hpEdit.addEventListener('keydown', e => {
    if (e.key === 'Enter') hpEdit.blur();
    if (e.key === 'Escape') {
      hpEdit.value = String(c.hp);
      hpEdit.blur();
    }
  });

  hpWrap.append(hpDisplay, hpEdit);
  row.appendChild(hpWrap);

  // AC
  row.appendChild(el('span', { class: 'ct-ci-ac' }, `AC ${c.ac}`));

  // Conditions
  row.appendChild(buildConditionBadges(index));

  // Quick damage/heal
  if (isActive) {
    row.appendChild(buildQuickHpButtons(index));
  }

  return row;
}

function commitHp(index, value, display, input) {
  const c = state.combatants[index];
  c.hp = Math.max(0, Math.min(c.hpMax * 2, value)); // allow temp HP up to 2x max
  save();
  display.textContent = `${c.hp}/${c.hpMax}`;
  display.style.display = '';
  input.style.display = 'none';
}

function buildConditionBadges(index) {
  const c = state.combatants[index];
  const wrap = el('div', { class: 'ct-conditions' });

  // Active condition badges
  for (const cond of (c.conditions ?? [])) {
    const badge = el('span', { class: 'ct-condition-badge', title: `Remove ${cond}` }, cond.slice(0, 4));
    badge.addEventListener('click', () => {
      c.conditions = c.conditions.filter(x => x !== cond);
      save();
      rebuild();
    });
    wrap.appendChild(badge);
  }

  // Add condition picker (compact select)
  const picker = el('select', { class: 'select ct-cond-picker', title: 'Add condition' });
  picker.appendChild(el('option', { value: '' }, '+'));
  for (const cond of CONDITIONS) {
    if (!c.conditions?.includes(cond)) {
      picker.appendChild(el('option', { value: cond }, cond));
    }
  }
  picker.addEventListener('change', e => {
    if (!e.target.value) return;
    c.conditions = [...(c.conditions ?? []), e.target.value];
    save();
    rebuild();
  });
  wrap.appendChild(picker);
  return wrap;
}

function buildQuickHpButtons(index) {
  const c = state.combatants[index];
  const wrap = el('div', { class: 'ct-quick-hp' });
  const input = el('input', { type: 'number', class: 'input ct-quick-input', placeholder: '#', min: '1' });
  const dmgBtn = el('button', { class: 'btn btn-danger btn-sm' }, 'Dmg');
  const healBtn = el('button', { class: 'btn btn-success btn-sm' }, 'Heal');

  dmgBtn.addEventListener('click', () => {
    const amt = parseInt(input.value) || 0;
    c.hp = Math.max(0, c.hp - amt);
    input.value = '';
    save();
    rebuild();
  });
  healBtn.addEventListener('click', () => {
    const amt = parseInt(input.value) || 0;
    c.hp = Math.min(c.hpMax, c.hp + amt);
    input.value = '';
    save();
    rebuild();
  });

  wrap.append(input, dmgBtn, healBtn);
  return wrap;
}
