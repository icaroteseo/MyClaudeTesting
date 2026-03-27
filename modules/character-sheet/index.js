/**
 * Character Sheet Module
 * Exports: mount(container), unmount()
 */

import { store } from '../../shared/store.js';
import { abilityModifier, formatModifier, proficiencyBonus, SKILLS, ABILITIES, el, debounce } from '../../shared/utils.js';
import { showToast } from '../../shared/components.js';

const STORE_KEY = 'character';

const DEFAULT_CHARACTER = {
  name: '', race: '', class: '', subclass: '', level: 1, background: '', alignment: '',
  experience: 0,
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  ac: 10, hp: 0, hpMax: 0, hpTemp: 0, speed: 30, initiative: 0,
  savingThrows: {}, skillProficiencies: {}, skillExpertise: {},
  hitDice: '1d8', hitDiceUsed: 0,
  inspiration: false,
  attacks: '',
  equipment: '',
  features: '',
  notes: '',
  spellcastingAbility: '',
  spellSaveDC: 0,
  spellAttackBonus: 0,
};

let root = null;
let char = null;
const unsubs = [];

function injectStyles() {
  if (!document.getElementById('styles-character-sheet')) {
    const link = document.createElement('link');
    link.id = 'styles-character-sheet';
    link.rel = 'stylesheet';
    link.href = './modules/character-sheet/character-sheet.css';
    document.head.appendChild(link);
  }
}

export function mount(container) {
  injectStyles();
  store.hydrate(STORE_KEY);
  char = { ...DEFAULT_CHARACTER, ...(store.get(STORE_KEY) ?? {}) };

  root = el('div', { class: 'character-sheet' });
  root.appendChild(buildSheet());
  container.appendChild(root);
}

export function unmount() {
  unsubs.forEach(fn => fn());
  unsubs.length = 0;
  root = null;
}

// Persist debounced to avoid thrashing storage on every keystroke
const saveChar = debounce(() => {
  store.set(STORE_KEY, char);
  showToast('Character saved', 'success', 1500);
}, 800);

function update(field, value) {
  char[field] = value;
  saveChar();
}

function buildSheet() {
  const frag = document.createDocumentFragment();
  frag.appendChild(buildIdentity());
  frag.appendChild(buildAbilityScores());
  frag.appendChild(buildCombatStats());
  frag.appendChild(buildSkills());
  frag.appendChild(buildNarrative());
  return frag;
}

// ---- Identity ----
function buildIdentity() {
  const section = el('details', { class: 'cs-section panel', open: '' });
  section.appendChild(el('summary', { class: 'cs-section-title' }, '⚔ Identity'));

  const grid = el('div', { class: 'grid-3 cs-identity-grid' });
  const fields = [
    ['name',       'Character Name', 'text',   ''],
    ['race',       'Race',           'text',   ''],
    ['class',      'Class',          'text',   ''],
    ['subclass',   'Subclass',       'text',   ''],
    ['level',      'Level',          'number', '1'],
    ['background', 'Background',     'text',   ''],
    ['alignment',  'Alignment',      'text',   ''],
    ['experience', 'Experience (XP)','number', '0'],
  ];
  for (const [field, label, type, placeholder] of fields) {
    const wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', { class: 'field-label' }, label));
    const input = el('input', { type, class: 'input', value: String(char[field] ?? ''), placeholder });
    input.addEventListener('input', e => update(field, type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value));
    wrap.appendChild(input);
    grid.appendChild(wrap);
  }
  section.appendChild(grid);
  return section;
}

// ---- Ability Scores ----
function buildAbilityScores() {
  const section = el('details', { class: 'cs-section panel', open: '' });
  section.appendChild(el('summary', { class: 'cs-section-title' }, '💪 Ability Scores'));

  const grid = el('div', { class: 'cs-abilities' });
  for (const ability of ABILITIES) {
    grid.appendChild(buildAbilityBlock(ability));
  }
  section.appendChild(grid);
  return section;
}

function buildAbilityBlock(ability) {
  const block = el('div', { class: 'cs-ability', 'data-ability': ability });
  block.appendChild(el('span', { class: 'cs-ability-name' }, ability.toUpperCase()));

  const scoreInput = el('input', {
    type: 'number', class: 'input cs-ability-score',
    value: String(char[ability] ?? 10), min: '1', max: '30',
  });

  const modDisplay = el('span', { class: 'cs-ability-mod' }, formatModifier(abilityModifier(char[ability] ?? 10)));

  scoreInput.addEventListener('input', e => {
    const val = parseInt(e.target.value) || 10;
    update(ability, val);
    modDisplay.textContent = formatModifier(abilityModifier(val));
  });

  block.appendChild(scoreInput);
  block.appendChild(modDisplay);
  return block;
}

// ---- Combat Stats ----
function buildCombatStats() {
  const section = el('details', { class: 'cs-section panel', open: '' });
  section.appendChild(el('summary', { class: 'cs-section-title' }, '🛡 Combat Stats'));

  const grid = el('div', { class: 'grid-4' });
  const stats = [
    ['ac',      'Armor Class',  'number'],
    ['hpMax',   'HP Max',       'number'],
    ['hp',      'HP Current',   'number'],
    ['hpTemp',  'Temp HP',      'number'],
    ['speed',   'Speed (ft)',   'number'],
    ['hitDice', 'Hit Dice',     'text'],
    ['hitDiceUsed', 'Hit Dice Used', 'number'],
    ['initiative', 'Initiative', 'number'],
  ];
  for (const [field, label, type] of stats) {
    const wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', { class: 'field-label' }, label));
    const input = el('input', { type, class: 'input', value: String(char[field] ?? '0') });
    input.addEventListener('input', e => update(field, type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value));
    wrap.appendChild(input);
    grid.appendChild(wrap);
  }

  // HP tracker buttons
  const hpRow = el('div', { class: 'cs-hp-row' });
  const dmgInput = el('input', { type: 'number', class: 'input cs-hp-input', placeholder: 'Amount', min: '0' });
  const dmgBtn = el('button', { class: 'btn btn-danger btn-sm' }, 'Take Damage');
  const healBtn = el('button', { class: 'btn btn-success btn-sm' }, 'Heal');

  dmgBtn.addEventListener('click', () => {
    const amt = parseInt(dmgInput.value) || 0;
    const newHp = Math.max(0, char.hp - amt);
    char.hp = newHp;
    saveChar();
    dmgInput.value = '';
    refreshHpDisplay(section);
  });
  healBtn.addEventListener('click', () => {
    const amt = parseInt(dmgInput.value) || 0;
    const newHp = Math.min(char.hpMax, char.hp + amt);
    char.hp = newHp;
    saveChar();
    dmgInput.value = '';
    refreshHpDisplay(section);
  });

  hpRow.appendChild(dmgInput);
  hpRow.appendChild(dmgBtn);
  hpRow.appendChild(healBtn);

  section.appendChild(grid);
  section.appendChild(hpRow);
  return section;
}

function refreshHpDisplay(section) {
  const hpInput = section.querySelector('[data-field="hp"]') ??
    section.querySelectorAll('.input[type="number"]')[2];
  if (hpInput) hpInput.value = String(char.hp);
}

// ---- Skills ----
function buildSkills() {
  const section = el('details', { class: 'cs-section panel' });
  section.appendChild(el('summary', { class: 'cs-section-title' }, '🎯 Skills & Saving Throws'));

  const pb = proficiencyBonus(char.level || 1);
  const pbDisplay = el('p', { class: 'cs-pb-display' }, `Proficiency Bonus: ${formatModifier(pb)}`);
  section.appendChild(pbDisplay);

  const cols = el('div', { class: 'cs-skills-cols' });

  // Saving throws
  const savesCol = el('div', { class: 'cs-saves' });
  savesCol.appendChild(el('h3', { class: 'cs-sub-title' }, 'Saving Throws'));
  for (const ability of ABILITIES) {
    savesCol.appendChild(buildSaveRow(ability, pb));
  }
  cols.appendChild(savesCol);

  // Skills
  const skillsCol = el('div', { class: 'cs-skills' });
  skillsCol.appendChild(el('h3', { class: 'cs-sub-title' }, 'Skills'));
  for (const skill of SKILLS) {
    skillsCol.appendChild(buildSkillRow(skill, pb));
  }
  cols.appendChild(skillsCol);

  section.appendChild(cols);
  return section;
}

function buildSaveRow(ability, pb) {
  const profKey = `save_${ability}`;
  const isProficient = !!char.savingThrows[ability];
  const mod = abilityModifier(char[ability] ?? 10) + (isProficient ? pb : 0);

  const row = el('div', { class: 'cs-skill-row' });
  const checkbox = el('input', { type: 'checkbox', class: 'cs-prof-check', title: 'Proficient' });
  checkbox.checked = isProficient;
  checkbox.addEventListener('change', e => {
    char.savingThrows[ability] = e.target.checked;
    saveChar();
    modSpan.textContent = formatModifier(abilityModifier(char[ability] ?? 10) + (e.target.checked ? pb : 0));
  });

  const modSpan = el('span', { class: 'cs-skill-mod' }, formatModifier(mod));
  const nameSpan = el('span', { class: 'cs-skill-name' }, ability.toUpperCase());

  row.append(checkbox, modSpan, nameSpan);
  return row;
}

function buildSkillRow(skill, pb) {
  const ability = skill.ability;
  const isProficient = !!char.skillProficiencies[skill.name];
  const isExpert = !!char.skillExpertise[skill.name];
  const bonus = abilityModifier(char[ability] ?? 10) + (isExpert ? pb * 2 : isProficient ? pb : 0);

  const row = el('div', { class: 'cs-skill-row' });
  const checkbox = el('input', { type: 'checkbox', class: 'cs-prof-check', title: 'Proficient' });
  checkbox.checked = isProficient || isExpert;

  const modSpan = el('span', { class: 'cs-skill-mod' }, formatModifier(bonus));

  checkbox.addEventListener('change', e => {
    if (!e.target.checked) {
      delete char.skillProficiencies[skill.name];
      delete char.skillExpertise[skill.name];
    } else {
      char.skillProficiencies[skill.name] = true;
    }
    saveChar();
    const newBonus = abilityModifier(char[ability] ?? 10) + (char.skillProficiencies[skill.name] ? pb : 0);
    modSpan.textContent = formatModifier(newBonus);
  });

  const nameSpan = el('span', { class: 'cs-skill-name' }, skill.name);
  const abilityTag = el('span', { class: 'cs-skill-ability' }, `(${ability.toUpperCase()})`);

  row.append(checkbox, modSpan, nameSpan, abilityTag);
  return row;
}

// ---- Narrative fields ----
function buildNarrative() {
  const section = el('details', { class: 'cs-section panel' });
  section.appendChild(el('summary', { class: 'cs-section-title' }, '📝 Notes & Features' ));

  const areas = [
    ['attacks',  'Attacks & Spellcasting', 4],
    ['equipment','Equipment',              4],
    ['features', 'Features & Traits',     6],
    ['notes',    'Notes',                 4],
  ];
  for (const [field, label, rows] of areas) {
    const wrap = el('div', { class: 'field cs-textarea-field' });
    wrap.appendChild(el('label', { class: 'field-label' }, label));
    const ta = el('textarea', { class: 'textarea', rows: String(rows), placeholder: label });
    ta.value = char[field] ?? '';
    ta.addEventListener('input', e => update(field, e.target.value));
    wrap.appendChild(ta);
    section.appendChild(wrap);
  }
  return section;
}
