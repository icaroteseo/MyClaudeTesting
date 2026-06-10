/**
 * Spell Tracker Module
 * Exports: mount(container), unmount()
 */

import { store } from '../../shared/store.js';
import { el, casterSpellSlots, maxSpellLevel, SPELL_SCHOOLS } from '../../shared/utils.js';
import { showToast } from '../../shared/components.js';
import { SPELL_COMPENDIUM, RACIAL_SPELLS, SPELLCASTING_CLASSES } from '../../shared/spell-compendium.js';

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

// Compendium filter state — module-level so it survives rebuild()
const compFilters = { query: '', cls: '', level: '', castable: false, initialized: false };

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
  root.appendChild(buildCompendium());
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
  store.hydrate('character');
  const char = store.get('character');
  if (!char?.level || !char?.class) {
    showToast('Set your class and level in the Character tab first.', 'danger');
    return;
  }
  const slotTable = casterSpellSlots(char.class, char.level);
  const hasSlots = slotTable.some(n => n > 0);
  for (let i = 1; i <= 9; i++) {
    state.slots[i].max = slotTable[i] ?? 0;
    state.slots[i].used = Math.min(state.slots[i].used, state.slots[i].max);
  }
  save();
  rebuild();
  showToast(hasSlots
    ? `Synced slots for ${char.class} level ${char.level}`
    : `${char.class} has no spell slots at level ${char.level}.`,
    hasSlots ? 'success' : 'info');
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
  if (spell.level === 0) {
    if (spell.concentration) {
      state.concentrating = spell.name;
      save();
      rebuild();
    }
    showToast(`Cast ${spell.name} (cantrip — no slot needed).`, 'info');
    return;
  }
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

// ---- Spell Compendium ----
function buildCompendium() {
  const panel = el('div', { class: 'panel st-compendium' });
  panel.appendChild(el('h2', { class: 'panel-title' }, '📜 Spell Compendium'));

  store.hydrate('character');
  const char = store.get('character') ?? {};
  const charClass = (char.class || '').trim();
  const charLevel = char.level || 1;
  const maxLvl = maxSpellLevel(charClass, charLevel);
  const matchedClass = SPELLCASTING_CLASSES.find(c => charClass.toLowerCase().includes(c.toLowerCase())) || '';

  // Racial innate spells available at the character's level
  const race = (char.race || '').toLowerCase();
  const racialNames = new Set();
  for (const r of RACIAL_SPELLS) {
    if (race.includes(r.match)) {
      for (const s of r.spells) if (charLevel >= s.minLevel) racialNames.add(s.name);
    }
  }

  // Default the class filter to the character's class once
  if (!compFilters.initialized) {
    compFilters.cls = matchedClass;
    compFilters.initialized = true;
  }

  // Context line: who you are and what you can cast
  const chips = el('div', { class: 'st-comp-chips' });
  if (matchedClass || racialNames.size) {
    if (charClass) chips.appendChild(el('span', { class: 'st-comp-chip' }, `${charClass} · Level ${charLevel}`));
    chips.appendChild(el('span', { class: 'st-comp-chip' },
      maxLvl > 0 ? `Casts up to level ${maxLvl} spells` : 'Cantrips only'));
    if (racialNames.size) {
      chips.appendChild(el('span', { class: 'st-comp-chip st-chip-racial' },
        `${char.race}: ${[...racialNames].join(', ')}`));
    }
  } else {
    chips.appendChild(el('span', { class: 'st-comp-chip st-chip-dim' },
      'Set your class & level in the Character tab to see what you can cast.'));
  }
  panel.appendChild(chips);

  // Filters
  const filterRow = el('div', { class: 'st-filter-row' });
  const searchInput = el('input', { type: 'text', class: 'input', placeholder: 'Search spells...', value: compFilters.query });
  const classSel = el('select', { class: 'select st-level-select' });
  classSel.appendChild(el('option', { value: '' }, 'All Classes'));
  for (const c of SPELLCASTING_CLASSES) classSel.appendChild(el('option', { value: c }, c));
  classSel.value = compFilters.cls;
  const levelSel = el('select', { class: 'select st-level-select' });
  levelSel.appendChild(el('option', { value: '' }, 'All Levels'));
  levelSel.appendChild(el('option', { value: '0' }, 'Cantrips'));
  for (let i = 1; i <= 9; i++) levelSel.appendChild(el('option', { value: String(i) }, `Level ${i}`));
  levelSel.value = compFilters.level;
  filterRow.append(searchInput, classSel, levelSel);
  panel.appendChild(filterRow);

  const castableWrap = el('label', { class: 'st-castable-toggle' });
  const castableCheck = el('input', { type: 'checkbox', class: 'cs-prof-check' });
  castableCheck.checked = compFilters.castable;
  castableWrap.append(castableCheck, ' Only spells I can cast now');
  panel.appendChild(castableWrap);

  // A spell is castable if the character's class (or race) grants it and
  // the character has slots of its level — racial spells skip the slot check.
  const canCast = (spell) => {
    const classOk = matchedClass && spell.classes.includes(matchedClass);
    const racialOk = racialNames.has(spell.name);
    if (!classOk && !racialOk) return false;
    if (spell.level === 0) return true;
    if (racialOk && !classOk) return true;
    return spell.level <= maxLvl;
  };

  const list = el('div', { class: 'st-spell-list st-comp-list' });
  const renderList = () => {
    list.innerHTML = '';
    const q = compFilters.query.toLowerCase();
    const filtered = SPELL_COMPENDIUM.filter(s =>
      (!q || s.name.toLowerCase().includes(q) || s.school.toLowerCase().includes(q)) &&
      (!compFilters.cls || s.classes.includes(compFilters.cls) || racialNames.has(s.name)) &&
      (compFilters.level === '' || String(s.level) === compFilters.level) &&
      (!compFilters.castable || canCast(s))
    );
    if (filtered.length === 0) {
      list.appendChild(el('p', { class: 'st-empty' }, 'No spells match these filters.'));
      return;
    }
    filtered.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    for (const spell of filtered) {
      list.appendChild(buildCompendiumRow(spell, canCast(spell), racialNames.has(spell.name)));
    }
  };
  searchInput.addEventListener('input', () => { compFilters.query = searchInput.value; renderList(); });
  classSel.addEventListener('change', () => { compFilters.cls = classSel.value; renderList(); });
  levelSel.addEventListener('change', () => { compFilters.level = levelSel.value; renderList(); });
  castableCheck.addEventListener('change', () => { compFilters.castable = castableCheck.checked; renderList(); });
  renderList();

  panel.appendChild(list);
  return panel;
}

function buildCompendiumRow(spell, castable, racial) {
  const wrap = el('div', { class: 'st-comp-row-wrap' });
  const row = el('div', { class: `st-spell-row st-comp-row${castable ? '' : ' st-uncastable'}` });

  const info = el('div', { class: 'st-spell-info' });
  const nameBtn = el('button', { class: 'st-comp-name', title: 'Show details' }, spell.name);
  info.appendChild(nameBtn);
  info.appendChild(el('span', { class: 'st-spell-meta' },
    `${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} · ${spell.school} · ${spell.castingTime}`));
  if (spell.concentration) info.appendChild(el('span', { class: 'st-spell-tag' }, 'C'));
  if (spell.ritual) info.appendChild(el('span', { class: 'st-spell-tag' }, 'R'));
  if (racial) info.appendChild(el('span', { class: 'st-spell-tag st-tag-racial' }, 'Racial'));
  if (castable) info.appendChild(el('span', { class: 'st-spell-tag st-tag-castable' }, '✓'));
  row.appendChild(info);

  const actions = el('div', { class: 'st-spell-actions' });
  const known = state.spells.some(s => s.name === spell.name);
  const learnBtn = el('button', { class: 'btn btn-ghost btn-sm' }, known ? '✓ Known' : 'Learn');
  if (known) learnBtn.disabled = true;
  learnBtn.addEventListener('click', () => {
    state.spells.push({
      name: spell.name,
      level: spell.level,
      school: spell.school,
      castingTime: spell.castingTime,
      concentration: !!spell.concentration,
      ritual: !!spell.ritual,
      description: spell.description,
    });
    save();
    rebuild();
    showToast(`${spell.name} added to your spells.`, 'success');
  });
  actions.appendChild(learnBtn);

  if (castable) {
    const castBtn = el('button', { class: 'btn btn-primary btn-sm' }, 'Cast');
    castBtn.addEventListener('click', () => castSpell(spell));
    actions.appendChild(castBtn);
  }
  row.appendChild(actions);

  const desc = el('div', { class: 'st-comp-desc' },
    el('p', {}, spell.description),
    el('p', { class: 'st-comp-desc-meta' },
      `Range: ${spell.range} · Components: ${spell.components} · Duration: ${spell.duration} · Classes: ${spell.classes.join(', ')}`));
  desc.style.display = 'none';
  nameBtn.addEventListener('click', () => {
    desc.style.display = desc.style.display === 'none' ? 'block' : 'none';
  });

  wrap.append(row, desc);
  return wrap;
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
