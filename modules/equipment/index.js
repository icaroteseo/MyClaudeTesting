/**
 * Equipment & Inventory Module
 * Purse (gp/sp/cp), starting equipment by class & background (or rolled
 * starting gold instead), inventory, and an SRD item shop.
 * Exports: mount(container), unmount()
 */

import { store } from '../../shared/store.js';
import { el } from '../../shared/utils.js';
import { showToast } from '../../shared/components.js';
import { rollMultiple, parseDiceNotation } from '../../shared/dice.js';
import { logRoll } from '../../shared/roll-log.js';
import {
  ITEM_COMPENDIUM, ITEM_CATEGORIES, CLASS_STARTING, BACKGROUND_STARTING,
  costToCp, formatCost, formatCp,
} from '../../shared/item-compendium.js';

const STORE_KEY = 'inventory';

const DEFAULT_STATE = {
  coins: { gp: 0, sp: 0, cp: 0 },
  items: [],
  startingClaimed: false,
};

let root = null;
let state = null;
const shopFilters = { query: '', category: '' };

function injectStyles() {
  if (!document.getElementById('styles-equipment')) {
    const link = document.createElement('link');
    link.id = 'styles-equipment';
    link.rel = 'stylesheet';
    link.href = './modules/equipment/equipment.css';
    document.head.appendChild(link);
  }
}

function save() { store.set(STORE_KEY, state); }

export function mount(container) {
  injectStyles();
  store.hydrate(STORE_KEY);
  store.hydrate('character');
  const saved = store.get(STORE_KEY) ?? {};
  state = {
    ...structuredClone(DEFAULT_STATE),
    ...saved,
    coins: { ...DEFAULT_STATE.coins, ...(saved.coins ?? {}) },
  };

  root = el('div', { class: 'equipment' });
  rebuild();
  container.appendChild(root);
}

export function unmount() {
  root = null;
}

function rebuild() {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(buildPurse());
  root.appendChild(buildStarting());
  root.appendChild(buildInventory());
  root.appendChild(buildShop());
}

// ---- Money helpers ----
function totalCp() {
  return state.coins.gp * 100 + state.coins.sp * 10 + state.coins.cp;
}

/** Spend an amount in copper. Returns false if the purse can't cover it. */
function spendCp(amount) {
  const total = totalCp();
  if (amount > total) return false;
  const rest = total - amount;
  state.coins = {
    gp: Math.floor(rest / 100),
    sp: Math.floor((rest % 100) / 10),
    cp: rest % 10,
  };
  return true;
}

function gainCp(amount) {
  const total = totalCp() + amount;
  state.coins = {
    gp: Math.floor(total / 100),
    sp: Math.floor((total % 100) / 10),
    cp: total % 10,
  };
}

// ---- Purse ----
function buildPurse() {
  const panel = el('div', { class: 'panel eq-purse' });
  panel.appendChild(el('h2', { class: 'panel-title' }, '💰 Purse'));

  const row = el('div', { class: 'eq-coin-row' });
  for (const unit of ['gp', 'sp', 'cp']) {
    const field = el('div', { class: `eq-coin eq-coin-${unit}` });
    field.appendChild(el('span', { class: 'eq-coin-label' }, unit.toUpperCase()));
    const input = el('input', { type: 'number', class: 'input eq-coin-input', value: String(state.coins[unit]), min: '0' });
    input.addEventListener('change', e => {
      state.coins[unit] = Math.max(0, parseInt(e.target.value) || 0);
      save();
      rebuild();
    });
    field.appendChild(input);
    row.appendChild(field);
  }
  panel.appendChild(row);

  panel.appendChild(el('p', { class: 'eq-purse-total' }, `Total value: ${formatCp(totalCp())}`));

  // Quick add/spend
  const quickRow = el('div', { class: 'eq-quick-row' });
  const amtInput = el('input', { type: 'number', class: 'input eq-quick-amt', placeholder: '0', min: '0' });
  const unitSel = el('select', { class: 'select eq-quick-unit' });
  for (const u of ['gp', 'sp', 'cp']) unitSel.appendChild(el('option', { value: u }, u));
  const addBtn = el('button', { class: 'btn btn-success btn-sm' }, '+ Gain');
  const spendBtn = el('button', { class: 'btn btn-danger btn-sm' }, '− Spend');
  addBtn.addEventListener('click', () => {
    const amt = parseInt(amtInput.value) || 0;
    if (amt <= 0) return;
    gainCp(costToCp({ amount: amt, unit: unitSel.value }));
    save();
    rebuild();
  });
  spendBtn.addEventListener('click', () => {
    const amt = parseInt(amtInput.value) || 0;
    if (amt <= 0) return;
    if (!spendCp(costToCp({ amount: amt, unit: unitSel.value }))) {
      showToast('Not enough coin in your purse.', 'danger');
      return;
    }
    save();
    rebuild();
  });
  quickRow.append(amtInput, unitSel, addBtn, spendBtn);
  panel.appendChild(quickRow);

  return panel;
}

// ---- Starting equipment ----
function matchKey(map, text) {
  const t = (text || '').toLowerCase();
  return Object.keys(map).find(k => t.includes(k.toLowerCase())) || null;
}

function buildStarting() {
  const panel = el('div', { class: 'panel eq-starting' });
  panel.appendChild(el('h2', { class: 'panel-title' }, '🎁 Starting Equipment'));

  const char = store.get('character') ?? {};
  const classKey = matchKey(CLASS_STARTING, char.class);
  const bgKey = matchKey(BACKGROUND_STARTING, char.background);

  const chips = el('div', { class: 'eq-chips' });
  chips.appendChild(el('span', { class: `eq-chip${classKey ? '' : ' eq-chip-dim'}` },
    classKey ? `Class: ${classKey}` : 'No class set — fill in the Character tab'));
  chips.appendChild(el('span', { class: `eq-chip${bgKey ? '' : ' eq-chip-dim'}` },
    bgKey ? `Background: ${bgKey}` : 'No matching background'));
  panel.appendChild(chips);

  if (state.startingClaimed) {
    const doneRow = el('div', { class: 'eq-claimed-row' });
    doneRow.appendChild(el('span', { class: 'eq-claimed-msg' }, '✓ Starting equipment claimed.'));
    const resetBtn = el('button', { class: 'btn btn-ghost btn-sm' }, 'Reset choice');
    resetBtn.addEventListener('click', () => {
      state.startingClaimed = false;
      save();
      rebuild();
    });
    doneRow.appendChild(resetBtn);
    panel.appendChild(doneRow);
    return panel;
  }

  // Option A: take the package
  const pkgItems = [];
  if (classKey) pkgItems.push(...CLASS_STARTING[classKey].items);
  if (bgKey) pkgItems.push(...BACKGROUND_STARTING[bgKey].items);
  const bgGold = bgKey ? BACKGROUND_STARTING[bgKey].goldGp : 0;

  const optA = el('div', { class: 'eq-option' });
  optA.appendChild(el('h3', { class: 'eq-option-title' }, 'Take the equipment package'));
  optA.appendChild(el('p', { class: 'eq-option-desc' }, classKey
    ? `${pkgItems.map(([n, q]) => q > 1 ? `${n} ×${q}` : n).join(', ')}${bgGold ? ` — plus ${bgGold} gp from your background` : ''}`
    : 'Set your class in the Character tab to see your package.'));
  const takeBtn = el('button', { class: 'btn btn-primary' }, 'Take Equipment');
  takeBtn.disabled = !classKey;
  takeBtn.addEventListener('click', () => {
    for (const [name, qty] of pkgItems) addItemByName(name, qty);
    if (bgGold) gainCp(bgGold * 100);
    state.startingClaimed = true;
    save();
    rebuild();
    showToast(`Added ${pkgItems.length} item types${bgGold ? ` and ${bgGold} gp` : ''}.`, 'success');
  });
  optA.appendChild(takeBtn);
  panel.appendChild(optA);

  // Option B: roll gold instead
  const gold = classKey ? CLASS_STARTING[classKey].gold : null;
  const goldDesc = gold ? `${gold.dice}${gold.times10 === false ? '' : ' × 10'} gp` : '';
  const optB = el('div', { class: 'eq-option' });
  optB.appendChild(el('h3', { class: 'eq-option-title' }, 'Or roll starting gold and buy your own'));
  optB.appendChild(el('p', { class: 'eq-option-desc' }, classKey
    ? `Forgo the package and roll ${goldDesc} to spend in the shop below.`
    : 'Set your class in the Character tab to see your gold roll.'));
  const rollBtn = el('button', { class: 'btn btn-ghost' }, classKey ? `Roll ${goldDesc}` : 'Roll Gold');
  rollBtn.disabled = !classKey;
  rollBtn.addEventListener('click', () => {
    const parsed = parseDiceNotation(gold.dice);
    const result = rollMultiple(parsed.count, parsed.sides);
    const mult = gold.times10 === false ? 1 : 10;
    const goldTotal = result.total * mult;
    gainCp(goldTotal * 100);
    state.startingClaimed = true;
    save();
    logRoll({
      label: 'Starting gold',
      detail: `${gold.dice}${mult > 1 ? ' × 10' : ''}: [${result.rolls.map(r => r.value).join(' + ')}]${mult > 1 ? ' × 10' : ''} = ${goldTotal} gp`,
      total: goldTotal,
    });
    rebuild();
    showToast(`You start with ${goldTotal} gp. Spend it wisely!`, 'success');
  });
  optB.appendChild(rollBtn);
  panel.appendChild(optB);

  return panel;
}

// ---- Inventory ----
function findItem(name) {
  return ITEM_COMPENDIUM.find(i => i.name === name);
}

function addItemByName(name, qty = 1) {
  const existing = state.items.find(i => i.name === name);
  if (existing) {
    existing.qty += qty;
    return;
  }
  const def = findItem(name);
  state.items.push({
    name,
    qty,
    category: def?.category ?? '',
    cost: def?.cost ?? { amount: 0, unit: 'cp' },
    weight: def?.weight ?? 0,
    meta: def?.meta ?? '',
  });
}

function buildInventory() {
  const panel = el('div', { class: 'panel eq-inventory' });
  panel.appendChild(el('h2', { class: 'panel-title' }, '🎒 Inventory'));

  if (state.items.length === 0) {
    panel.appendChild(el('p', { class: 'eq-empty' }, 'Your pack is empty. Claim starting equipment or visit the shop below.'));
    return panel;
  }

  const list = el('div', { class: 'eq-item-list' });
  const sorted = [...state.items].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  for (const item of sorted) {
    list.appendChild(buildInventoryRow(item));
  }
  panel.appendChild(list);

  const totalWeight = state.items.reduce((sum, i) => sum + i.qty * (i.weight || 0), 0);
  const totalValue = state.items.reduce((sum, i) => sum + i.qty * costToCp(i.cost), 0);
  panel.appendChild(el('p', { class: 'eq-inv-totals' },
    `${state.items.reduce((n, i) => n + i.qty, 0)} items · ${totalWeight} lb · worth ~${formatCp(totalValue)}`));

  return panel;
}

function buildInventoryRow(item) {
  const row = el('div', { class: 'eq-item-row' });

  const info = el('div', { class: 'eq-item-info' });
  info.appendChild(el('span', { class: 'eq-item-name' }, item.name));
  const metaBits = [item.category, item.meta, item.weight ? `${item.weight} lb` : '']
    .filter(Boolean).join(' · ');
  if (metaBits) info.appendChild(el('span', { class: 'eq-item-meta' }, metaBits));
  row.appendChild(info);

  // Quantity stepper
  const qtyWrap = el('div', { class: 'eq-qty' });
  const minusBtn = el('button', { class: 'btn btn-ghost btn-sm eq-qty-btn', title: 'Remove one' }, '−');
  const qtySpan = el('span', { class: 'eq-qty-num' }, `×${item.qty}`);
  const plusBtn = el('button', { class: 'btn btn-ghost btn-sm eq-qty-btn', title: 'Add one' }, '+');
  minusBtn.addEventListener('click', () => {
    item.qty -= 1;
    if (item.qty <= 0) state.items = state.items.filter(i => i !== item);
    save();
    rebuild();
  });
  plusBtn.addEventListener('click', () => {
    item.qty += 1;
    save();
    rebuild();
  });
  qtyWrap.append(minusBtn, qtySpan, plusBtn);
  row.appendChild(qtyWrap);

  // Sell one at half price (5e convention for used gear)
  const halfCp = Math.floor(costToCp(item.cost) / 2);
  const sellBtn = el('button', { class: 'btn btn-ghost btn-sm', title: `Sell one for ${formatCp(halfCp)} (half price)` }, `Sell (${formatCp(halfCp)})`);
  sellBtn.addEventListener('click', () => {
    gainCp(halfCp);
    item.qty -= 1;
    if (item.qty <= 0) state.items = state.items.filter(i => i !== item);
    save();
    rebuild();
    showToast(`Sold ${item.name} for ${formatCp(halfCp)}.`, 'info');
  });
  row.appendChild(sellBtn);

  const delBtn = el('button', { class: 'btn btn-ghost btn-sm eq-del-btn', title: 'Discard all' }, '✕');
  delBtn.addEventListener('click', () => {
    state.items = state.items.filter(i => i !== item);
    save();
    rebuild();
  });
  row.appendChild(delBtn);

  return row;
}

// ---- Shop ----
function buildShop() {
  const panel = el('div', { class: 'panel eq-shop' });
  panel.appendChild(el('h2', { class: 'panel-title' }, '🏪 Item Shop'));

  panel.appendChild(el('p', { class: 'eq-shop-purse' }, `In your purse: ${formatCp(totalCp())}`));

  const filterRow = el('div', { class: 'eq-filter-row' });
  const searchInput = el('input', { type: 'text', class: 'input', placeholder: 'Search items...', value: shopFilters.query });
  const catSel = el('select', { class: 'select eq-cat-select' });
  catSel.appendChild(el('option', { value: '' }, 'All Categories'));
  for (const c of ITEM_CATEGORIES) catSel.appendChild(el('option', { value: c }, c));
  catSel.value = shopFilters.category;
  filterRow.append(searchInput, catSel);
  panel.appendChild(filterRow);

  const list = el('div', { class: 'eq-item-list eq-shop-list' });
  const renderList = () => {
    list.innerHTML = '';
    const q = shopFilters.query.toLowerCase();
    const filtered = ITEM_COMPENDIUM.filter(i =>
      (!q || i.name.toLowerCase().includes(q) || (i.meta || '').toLowerCase().includes(q)) &&
      (!shopFilters.category || i.category === shopFilters.category)
    );
    if (filtered.length === 0) {
      list.appendChild(el('p', { class: 'eq-empty' }, 'No items match.'));
      return;
    }
    for (const item of filtered) list.appendChild(buildShopRow(item));
  };
  searchInput.addEventListener('input', () => { shopFilters.query = searchInput.value; renderList(); });
  catSel.addEventListener('change', () => { shopFilters.category = catSel.value; renderList(); });
  renderList();

  panel.appendChild(list);
  return panel;
}

function buildShopRow(item) {
  const priceCp = costToCp(item.cost);
  const affordable = priceCp <= totalCp();
  const row = el('div', { class: `eq-item-row${affordable ? '' : ' eq-unaffordable'}` });

  const info = el('div', { class: 'eq-item-info' });
  info.appendChild(el('span', { class: 'eq-item-name' }, item.name));
  const metaBits = [item.category, item.meta, item.weight ? `${item.weight} lb` : '']
    .filter(Boolean).join(' · ');
  info.appendChild(el('span', { class: 'eq-item-meta' }, metaBits));
  row.appendChild(info);

  row.appendChild(el('span', { class: 'eq-item-price' }, formatCost(item.cost)));

  const buyBtn = el('button', { class: 'btn btn-primary btn-sm' }, 'Buy');
  buyBtn.addEventListener('click', () => {
    if (!spendCp(priceCp)) {
      showToast(`You can't afford ${item.name} (${formatCost(item.cost)}).`, 'danger');
      return;
    }
    addItemByName(item.name, 1);
    save();
    rebuild();
    showToast(`Bought ${item.name} for ${formatCost(item.cost)}.`, 'success');
  });
  row.appendChild(buyBtn);

  const freeBtn = el('button', { class: 'btn btn-ghost btn-sm', title: 'Add without paying (granted item)' }, '+');
  freeBtn.addEventListener('click', () => {
    addItemByName(item.name, 1);
    save();
    rebuild();
    showToast(`${item.name} added to inventory.`, 'info');
  });
  row.appendChild(freeBtn);

  return row;
}
