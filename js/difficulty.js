// ============================================================
// difficulty.js — Difficulty Settings
// ============================================================

export const DIFFICULTY_PRESETS = {
  easy:     { name: 'Легко',     hpMul: 0.7, atkMul: 0.7, countMul: 0.8, lootMul: 1.2 },
  normal:   { name: 'Нормально', hpMul: 1,   atkMul: 1,   countMul: 1,   lootMul: 1   },
  hardcore: { name: 'Хардкор',   hpMul: 1.5, atkMul: 1.5, countMul: 1.3, lootMul: 1.5 },
};

export const DIFFICULTY_ORDER = ['easy', 'normal', 'hardcore'];

export function getDifficulty(id) {
  return DIFFICULTY_PRESETS[id] || DIFFICULTY_PRESETS.normal;
}

/** Cycle to the next difficulty preset */
export function cycleDifficulty(current) {
  const idx = DIFFICULTY_ORDER.indexOf(current);
  return DIFFICULTY_ORDER[(idx + 1) % DIFFICULTY_ORDER.length];
}

/** Colors for difficulty display */
export const DIFFICULTY_COLORS = {
  easy:     '#66bb6a',
  normal:   '#ffd54f',
  hardcore: '#ef5350',
};
