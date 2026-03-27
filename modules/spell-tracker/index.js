/**
 * Spell Tracker Module
 * Exports: mount(container), unmount()
 */

import { store } from '../../shared/store.js';
import { el, fullCasterSpellSlots, SPELL_SCHOOLS } from '../../shared/utils.js';
import { showToast } from '../../shared/components.js';

const STORE_KEY = 'spells';

const DEFAULT_STATE = {
  slots: {
    1: { max: 2, used: 0 }, 2: { max: 0, used: 0 }, 3: { max: 0, used: 0 },
    4: { max: 0, used: 0 }, 5: { max: 0, used: 0 }, 6: { max: 0, used: 0 },
    7: { max: 0, used: 0 }, 8: { max: 0, used: 0 }, 9: { max: 0, used: 0 },
  },
  spells: [],
  concentrating: null,
};

let root = null;
let state = null;

function injectStyles() {
  if (!document.getElementById('styles-spell-tracker')) {
    const link = document.createElement('link');
    link.id = 'styles-spell-tracker';
    link.rel = 'stylesheet';
    link.href = './modules/spell-tracker/spell-tracker.css';
    document.head.appendChild(link);
  }
}

function save() { store.set(STORE_KEY, state); }

export function mount(container) {
  injectStyles();
  store.hydrate(STORE_KEY);
  state = deepMerge(DEFAULT_STATE, store.get(STORE_KEY) ?? {});

  root = el('div', { class: 'spell-tracker' });
  rebuild();
  container.appendChild(root);
}

export function unmount() {
  root = null;
}

function rebuild() {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(buildSlots());
  root.appendChild(buildConcentration());
  root.appendChild(buildSpellList());
  root.appendChild(buildAddSpell());
}

// ---- Spell Slots ----
function buildSlots() {
  const panel = el('div', { class: 'panel st-slots-panel' });
  const header = el('div', { class: 'st-slots-header' });
  header.appendChild(el('h2', { class: 'panel-title' }, '✨ Spell Slots'));

  // Sync from character level
  const char = store.get('character');
  const syncBtn = el('button', { class: 'btn btn-ghost btn-sm' }, 'Sync from Character');
  syncBtn.addEventListener('click', () => syncSlotsFromCharacter());
  header.appendChild(syncBtn);

  const restBtn = el('button', { class: 'btn btn-primary btn-sm' }, 'Long Rest');
  restBtn.addEventListener('click', () => {
    for (const level in state.slots) {
      state.slots[level].used = 0;
    }
    save();
    rebuild();
    showToast('All spell slots recovered!', 'success');
  });
  header.appendChild(restBtn);
  panel.appendChild(header);

  const slotGrid = el('div', { class: 'st-slot-grid' });
  for (let level = 1; level <= 9; level++) {
    slotGrid.appendChild(buildSlotRow(level));
  }
  panel.appendChild(slotGrid);
  return panel;
}

function buildSlotRow(level) {
  const slotData = state.slots[level];
  const row = el('div', { class: `st-slot-row${slotData.max === 0 ? ' st-slot-empty' : ''}` });
  row.appendChild(el('span', { class: 'st-slot-level' }, `${level}${ordinalSuffix(level)}`));

  const pips = el('div', { class: 'st-slot-pips' });
  const maxInput = el('input', { type: 'number', class: 'input st-slot-max-input', value: String(slotData.max), min: '0', max: '9', title: 'Max slots' });
  maxInput.addEventListener('change', e => {
    const val = parseInt(e.target.value) || 0;
    state.slots[level].max = val;
    state.slots[level].used = Math.min(state.slots[level].used, val);
    save();
    // Re-render just this row
    const newRow = buildSlotRow(level);
    row.replaceWith(newRow);
  });
  row.appendChild(maxInput);

  for (let i = 0; i < slotData.max; i++) {
    const pip = el('button', { class: `st-pip${i < slotData.used ? ' used' : ''}`, 'aria-label': i < slotData.used ? 'Used slot' : 'Available slot' });
    pip.addEventListener('click', () => {
      if (i < state.slots[level].used) {
        state.slots[level].used = Math.max(0, i);
      } else {
        state.slots[level].used = i + 1;
      }
      save();
      const newRow = buildSlotRow(level);
      row.replaceWith(newRow);
    });
    pips.appendChild(pip);
  }
  row.appendChild(pips);

  const label = el('span', { class: 'st-slot-count' },
    `${slotData.max - slotData.used}/${slotData.max}`);
  row.appendChild(label);
  return row;
}

function syncSlotsFromCharacter() {
  const char = store.get('character');
  if (!char?.level || !char?.class) {
    showToast('Set your class and level in the Character tab first.', 'danger');
    return;
  }
  const slotTable = fullCasterSpellSlots(char.level);
  for (let i = 1; i <= 9; i++) {
    state.slots[i].max = slotTable[i] ?? 0;
    state.slots[i].used = Math.min(state.slots[i].used, state.slots[i].max);
  }
  save();
  rebuild();
  showToast(`Synced to level ${char.level}`, 'success');
}

// ---- Concentration ----
function buildConcentration() {
  const panel = el('div', { class: `panel st-concentration${state.concentrating ? ' active' : ''}` });
  if (state.concentrating) {
    panel.appendChild(el('span', { class: 'st-conc-label' }, `Concentrating: `));
    panel.appendChild(el('strong', { class: 'st-conc-spell' }, state.concentrating));
    const clearBtn = el('button', { class: 'btn btn-ghost btn-sm' }, 'End Concentration');
    clearBtn.addEventListener('click', () => {
      state.concentrating = null;
      save();
      rebuild();
    });
    panel.appendChild(clearBtn);
  } else {
    panel.appendChild(el('span', { class: 'st-conc-label st-conc-empty' }, 'Not concentrating'));
  }
  return panel;
}

// ---- Spell List ----
function buildSpellList() {
  const panel = el('div', { class: 'panel st-spell-list-panel' });
  panel.appendChild(el('h2', { class: 'panel-title' }, '📖 Prepared Spells'));

  // Filter/search
  const filterRow = el('div', { class: 'st-filter-row' });
  const searchInput = el('input', { type: 'text', class: 'input', placeholder: 'Search spells...' });
  const levelFilter = el('select', { class: 'select st-level-select' });
  levelFilter.appendChild(el('option', { value: '' }, 'All Levels'));
  levelFilter.appendChild(el('option', { value: '0' }, 'Cantrips'));
  for (let i = 1; i <= 9; i++) {
    levelFilter.appendChild(el('option', { value: String(i) }, `Level ${i}`));
  }
  filterRow.appendChild(searchInput);
  filterRow.appendChild(levelFilter);
  panel.appendChild(filterRow);

  const list = el('div', { class: 'st-spell-list' });
  const renderList = () => {
    list.innerHTML = '';
    const query = searchInput.value.toLowerCase();
    const levelVal = levelFilter.value;
    const filtered = state.spells.filter(s =>
      (!query || s.name.toLowerCase().includes(query) || s.school?.toLowerCase().includes(query)) &&
      (!levelVal || String(s.level) === levelVal)
    );
    if (filtered.length === 0) {
      list.appendChild(el('p', { class: 'st-empty' }, 'No spells prepared. Add one below.'));
      return;
    }
    // Sort by level then name
    filtered.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    for (const spell of filtered) {
      list.appendChild(buildSpellRow(spell));
    }
  };
  searchInput.addEventListener('input', renderList);
  levelFilter.addEventListener('change', renderList);
  renderList();

  panel.appendChild(list);
  return panel;
}

function buildSpellRow(spell) {
  const row = el('div', { class: `st-spell-row${spell.prepared === false ? ' unprepared' : ''}` });

  const info = el('div', { class: 'st-spell-info' });
  info.appendChild(el('span', { class: 'st-spell-name' }, spell.name));
  info.appendChild(el('span', { class: 'st-spell-meta' },
    `${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} ${spell.school ? `· ${spell.school}` : ''} ${spell.castingTime ? `· ${spell.castingTime}` : ''}`
  ));
  if (spell.concentration) info.appendChild(el('span', { class: 'st-spell-tag' }, 'C'));
  if (spell.ritual) info.appendChild(el('span', { class: 'st-spell-tag' }, 'R'));
  row.appendChild(info);

  const actions = el('div', { class: 'st-spell-actions' });

  if (spell.level > 0) {
    const castBtn = el('button', { class: 'btn btn-primary btn-sm' }, 'Cast');
    castBtn.addEventListener('click', () => castSpell(spell));
    actions.appendChild(castBtn);
  }

  if (spell.concentration) {
    const concBtn = el('button', { class: 'btn btn-ghost btn-sm' }, 'Concentrate');
    concBtn.addEventListener('click', () => {
      state.concentrating = spell.name;
      save();
      rebuild();
    });
    actions.appendChild(concBtn);
  }

  const delBtn = el('button', { class: 'btn btn-ghost btn-sm st-del-btn' }, '✕');
  delBtn.addEventListener('click', () => {
    state.spells = state.spells.filter(s => s !== spell);
    save();
    rebuild();
  });
  actions.appendChild(delBtn);
  row.appendChild(actions);
  return row;
}

function castSpell(spell) {
  // Find lowest available slot at or above spell level
  for (let lvl = spell.level; lvl <= 9; lvl++) {
    const slot = state.slots[lvl];
    if (slot.max > 0 && slot.used < slot.max) {
      slot.used++;
      save();
      if (spell.concentration) {
        state.concentrating = spell.name;
        save();
      }
      rebuild();
      showToast(`Cast ${spell.name} using a level ${lvl} slot.`, 'info');
      return;
    }
  }
  showToast(`No spell slots available for level ${spell.level}+.`, 'danger');
}

// ---- Add Spell Form ----
function buildAddSpell() {
  const panel = el('div', { class: 'panel st-add-spell' });
  panel.appendChild(el('h2', { class: 'panel-title' }, '+ Add Spell'));

  const form = el('div', { class: 'st-add-form' });
  const nameInput   = el('input', { type: 'text',   class: 'input', placeholder: 'Spell name' });
  const levelInput  = el('input', { type: 'number', class: 'input', placeholder: 'Level (0=cantrip)', min: '0', max: '9', value: '1' });
  const schoolSel   = el('select', { class: 'select' });
  schoolSel.appendChild(el('option', { value: '' }, 'School'));
  for (const school of SPELL_SCHOOLS) {
    schoolSel.appendChild(el('option', { value: school }, school));
  }
  const ctInput     = el('input', { type: 'text',     class: 'input', placeholder: 'Casting time (e.g. 1 action)' });
  const concCheck   = el('input', { type: 'checkbox', class: 'cs-prof-check', id: 'conc-check' });
  const concLabel   = el('label', { for: 'conc-check', class: 'field-label' }, 'Concentration');
  const ritualCheck = el('input', { type: 'checkbox', class: 'cs-prof-check', id: 'ritual-check' });
  const ritualLabel = el('label', { for: 'ritual-check', class: 'field-label' }, 'Ritual');
  const descArea    = el('textarea', { class: 'textarea', rows: '3', placeholder: 'Description (optional)' });

  const addBtn = el('button', { class: 'btn btn-primary' }, 'Add Spell');
  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { showToast('Spell name is required.', 'danger'); return; }
    state.spells.push({
      name,
      level:         parseInt(levelInput.value) || 0,
      school:        schoolSel.value,
      castingTime:   ctInput.value.trim(),
      concentration: concCheck.checked,
      ritual:        ritualCheck.checked,
      description:   descArea.value.trim(),
    });
    save();
    rebuild();
    showToast(`${name} added!`, 'success');
  });

  const checkRow = el('div', { class: 'st-check-row' });
  checkRow.append(concCheck, concLabel, ritualCheck, ritualLabel);

  form.append(nameInput, levelInput, schoolSel, ctInput, checkRow, descArea, addBtn);
  panel.appendChild(form);
  return panel;
}

// ---- Helpers ----
function ordinalSuffix(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function deepMerge(defaults, overrides) {
  const result = structuredClone(defaults);
  for (const [key, val] of Object.entries(overrides ?? {})) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && key in result) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
