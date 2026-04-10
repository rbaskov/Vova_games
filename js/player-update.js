// ============================================================
// player-update.js — Factory для player / companion
// ============================================================
// Вынесено из main.js в рамках pre-coop refactor (Task 2.3, фаза factories).
//
// Сейчас в этом модуле живут только "чистые" factory-функции:
//   - createPlayer(startX, startY) — создаёт объект игрока
//   - createCompanion(type, x, y)  — создаёт наёмника
//   - COMPANION_TYPES              — каталог типов наёмников
//
// updatePlayer / updateCompanions / moveCompanionToward пока остаются
// в main.js, потому что у них есть обратные вызовы в checkPortals,
// checkCheckpoint, syncChunkEnemies, которые ещё не вынесены в map-loading.js.
// Они переедут сюда в следующей фазе рефакторинга (Task 2.3 complete),
// после того как map-loading.js получит свой кластер.

import { TILE_SIZE } from './tilemap.js';

export function createPlayer(startX, startY) {
  return {
    x: startX * TILE_SIZE,
    y: startY * TILE_SIZE,
    hitW: 24,
    hitH: 28,
    facing: 'down',
    moving: false,
    attacking: false,
    attackTimer: 0,
    hp: 100,
    maxHp: 100,
    atk: 5,
    xp: 0,
    level: 1,
    coins: 0,
    potions: 3,
    artifacts: { earth: false, fire: false, water: false },
    cooldowns: { earth: 0, fire: 0, water: 0 },
    invincibleTimer: 0,
    facingAngle: Math.PI / 2,  // start facing down (π/2)
    targetAngle: Math.PI / 2,
    turnSpeed: 12,             // radians per second
    defeatedBosses: [],
    weapon: 'iron_sword',
    ownedWeapons: ['iron_sword'],
    equippedArmor: { helmet: null, chest: null, legs: null, shield: null },
    ownedArmor: [],
    quests: {},
    // UI state per player (вынесено из module-level в inventory.js/dialog.js).
    // В коопе у гостя будет свой player с собственным ui — инвентарь/диалоги
    // не конфликтуют между хостом и гостем.
    ui: { inventorySlot: 0, dialogOption: 0, settingsTab: 0 },
  };
}

// --- Companion System ---
export const COMPANION_TYPES = {
  merc_sword:  { name: 'Дарен',   weapon: 'sword', atk: 15, range: 40,  attackSpeed: 0.5, speed: 90, hp: 120, maxHp: 120, color: '#607d8b' },
  merc_spear:  { name: 'Рольф',   weapon: 'spear', atk: 18, range: 56,  attackSpeed: 0.6, speed: 80, hp: 100, maxHp: 100, color: '#607d8b' },
  merc_bow:    { name: 'Ивар',    weapon: 'bow',   atk: 12, range: 180, attackSpeed: 1.2, speed: 70, hp: 80,  maxHp: 80,  color: '#607d8b' },
  merc_axe:    { name: 'Гром',    weapon: 'axe',   atk: 22, range: 38,  attackSpeed: 0.7, speed: 75, hp: 150, maxHp: 150, color: '#5d4037' },
  merc_tank:   { name: 'Бронк',   weapon: 'sword', atk: 10, range: 36,  attackSpeed: 0.6, speed: 60, hp: 250, maxHp: 250, color: '#455a64' },
  merc_fast:   { name: 'Зефир',   weapon: 'sword', atk: 20, range: 42,  attackSpeed: 0.3, speed: 120,hp: 70,  maxHp: 70,  color: '#1565c0' },
  merc_healer: { name: 'Лиана',   weapon: 'heal',  atk: 0,  range: 100, attackSpeed: 2.0, speed: 85, hp: 60,  maxHp: 60,  color: '#2e7d32' },
  merc_mage:   { name: 'Аркан',   weapon: 'magic', atk: 25, range: 160, attackSpeed: 1.5, speed: 65, hp: 65,  maxHp: 65,  color: '#6a1b9a' },
};

export function createCompanion(type, x, y) {
  const t = COMPANION_TYPES[type];
  return {
    type,
    name: t.name,
    weapon: t.weapon,
    atk: t.atk,
    range: t.range,
    attackSpeed: t.attackSpeed,
    speed: t.speed,
    color: t.color,
    x, y,
    hp: t.hp,
    maxHp: t.maxHp,
    alive: true,
    invincibleTimer: 0,
    facing: 'down',
    moving: false,
    attackTimer: 0,
    attacking: false,
    hitW: 24,
    hitH: 28,
    shootTimer: 0,
  };
}
