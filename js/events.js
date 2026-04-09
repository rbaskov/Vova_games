// ============================================================
// events.js — Random Event System
// ============================================================

import { TILE_SIZE } from './tilemap.js';
import { spawnEnemy } from './enemies.js';

// --- Event Table ---
const EVENT_TABLE = [
  { type: 'chest',    weight: 30, combat: true },
  { type: 'elite',    weight: 25, combat: true },
  { type: 'ambush',   weight: 15, combat: true, maps: ['forest', 'canyon', 'castle'] },
  { type: 'trader',   weight: 15, combat: false },
  { type: 'buff',     weight: 7,  combat: true },
  { type: 'portal',   weight: 3,  combat: true },
];

// Maps where events can spawn
const COMBAT_MAPS = ['forest', 'canyon', 'cave', 'castle', 'hellpit'];
const PEACEFUL_MAPS = ['village', 'kingdom'];

// --- Buff Types ---
export const BUFF_TYPES = [
  { id: 'rage',     name: 'Ярость',      effect: 'atkMul',   value: 2,   color: '#ff1744', glow: '#ff5252' },
  { id: 'godshield', name: 'Щит богов',   effect: 'invincible', value: 1, color: '#ffd54f', glow: '#ffecb3' },
  { id: 'wind',     name: 'Ветер',        effect: 'speedMul', value: 2,   color: '#29b6f6', glow: '#81d4fa' },
  { id: 'vampirism', name: 'Вампиризм',   effect: 'vampirism', value: 5,  color: '#66bb6a', glow: '#a5d6a7' },
];

// --- Chest Loot Tables ---
const WEAPON_TIERS = {
  forest: ['steel_sword', 'spear', 'iron_axe'],
  canyon: ['mithril_sword', 'fire_spear', 'crossbow', 'steel_axe'],
  cave: ['knight_spear', 'gladiator_axe', 'knight_axe'],
  castle: ['knight_greatsword', 'knight_axe', 'knight_spear'],
  hellpit: ['baldionid_greatsword'],
};

const NEXT_TIER_WEAPONS = {
  forest: ['mithril_sword', 'fire_spear', 'steel_axe'],
  canyon: ['knight_spear', 'gladiator_axe'],
  cave: ['knight_axe', 'knight_greatsword'],
  castle: ['baldionid_greatsword'],
  hellpit: ['baldionid_greatsword'],
};

// --- Trader Names ---
const TRADER_NAMES = ['Странник Морис', 'Торговка Зара', 'Бродяга Финн', 'Путница Эльза'];

// --- Trader Unique Items ---
const TRADER_UNIQUE = [
  { action: 'buy_trader_bigpot3',  text: 'Большое зелье x3 (60$)',    price: 60 },
  { action: 'buy_trader_teleport', text: 'Свиток телепорта (100$)',     price: 100 },
  { action: 'buy_trader_atkup',    text: 'Эликсир силы +2 ATK (150$)', price: 150 },
  { action: 'buy_trader_hpup',     text: 'Эликсир жизни +20 HP (150$)',price: 150 },
  { action: 'buy_trader_revive',   text: 'Камень воскрешения (200$)',   price: 200 },
];

// --- Elite Types ---
const ELITE_TYPES = [
  { id: 'furious',  name: 'Яростный', hpMul: 1,   atkMul: 2,   visual: 'aura' },
  { id: 'brute',    name: 'Громила',  hpMul: 2,   atkMul: 1,   visual: 'scale' },
  { id: 'chief',    name: 'Вождь',    hpMul: 1.5, atkMul: 1.5, visual: 'crown' },
];

// --- Find free tile on map ---
function findFreeTile(tileMap, enemies, npcs, avoid) {
  const attempts = 50;
  for (let i = 0; i < attempts; i++) {
    const col = 2 + Math.floor(Math.random() * (tileMap.width - 4));
    const row = 2 + Math.floor(Math.random() * (tileMap.height - 4));
    const tile = tileMap.tiles[row]?.[col];
    // Must be walkable (grass, dirt, castle floor, carpet)
    if (tile === undefined || tile === 2 || tile === 3 || tile === 4 || tile === 6) continue;
    // Not on portal or checkpoint
    if (tile === 5 || tile === 9) continue;
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    // Not too close to player spawn, enemies, NPCs, or other avoid positions
    let tooClose = false;
    for (const pos of avoid) {
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (dx * dx + dy * dy < 64 * 64) { tooClose = true; break; }
    }
    if (tooClose) continue;
    return { col, row, x, y };
  }
  return null;
}

// --- Pick weighted random event ---
function pickEvent(table) {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const evt of table) {
    r -= evt.weight;
    if (r <= 0) return evt;
  }
  return table[0];
}

// --- Generate Events for a map ---
export function generateEvents(game, mapName, tileMap) {
  // No events on peaceful maps, arena, or dungeons
  if (PEACEFUL_MAPS.includes(mapName) || mapName === 'arena' || mapName.startsWith('dungeon')) return;

  const isCombat = COMBAT_MAPS.includes(mapName);
  const availableEvents = EVENT_TABLE.filter(e => {
    if (e.combat && !isCombat) return false;
    if (e.maps && !e.maps.includes(mapName)) return false;
    return true;
  });

  // 1-3 events
  const count = 1 + Math.floor(Math.random() * 3);
  const usedTypes = new Set();
  const avoidPositions = [
    { x: game.player.x, y: game.player.y },
    ...game.enemies.map(e => ({ x: e.x, y: e.y })),
    ...game.npcs.map(n => ({ x: n.x, y: n.y })),
  ];

  for (let i = 0; i < count; i++) {
    const evt = pickEvent(availableEvents);
    if (usedTypes.has(evt.type) && evt.type !== 'chest') continue;
    usedTypes.add(evt.type);

    const pos = findFreeTile(tileMap, game.enemies, game.npcs, avoidPositions);
    if (!pos) continue;
    avoidPositions.push({ x: pos.x, y: pos.y });

    switch (evt.type) {
      case 'chest':
        spawnChest(game, pos);
        break;
      case 'elite':
        spawnElite(game, pos, mapName, tileMap);
        break;
      case 'ambush':
        scheduleAmbush(game, mapName);
        break;
      case 'trader':
        spawnTrader(game, pos, mapName);
        break;
      case 'buff':
        spawnBuff(game, pos);
        break;
      case 'portal':
        spawnSecretPortal(game, pos);
        break;
    }
  }
}

// --- Spawn Chest ---
function spawnChest(game, pos) {
  if (!game.chests) game.chests = [];
  // Determine rarity
  const roll = Math.random();
  let rarity = 'common';
  if (roll > 0.85) rarity = 'rare';
  else if (roll > 0.5) rarity = 'good';

  game.chests.push({
    x: pos.x, y: pos.y,
    col: pos.col, row: pos.row,
    rarity,
    opened: false,
  });
}

// --- Generate Chest Loot ---
export function openChest(chest, player, mapName) {
  if (chest.opened) return null;
  chest.opened = true;

  const loot = { coins: 0, potions: 0, weapon: null };

  if (chest.rarity === 'common') {
    loot.coins = 10 + Math.floor(Math.random() * 21);
    loot.potions = 1;
  } else if (chest.rarity === 'good') {
    loot.coins = 30 + Math.floor(Math.random() * 51);
    const weapons = WEAPON_TIERS[mapName] || WEAPON_TIERS.forest;
    loot.weapon = weapons[Math.floor(Math.random() * weapons.length)];
  } else { // rare
    loot.coins = 80 + Math.floor(Math.random() * 121);
    const weapons = NEXT_TIER_WEAPONS[mapName] || WEAPON_TIERS.forest;
    loot.weapon = weapons[Math.floor(Math.random() * weapons.length)];
  }

  return loot;
}

// --- Spawn Elite Enemy ---
function spawnElite(game, pos, mapName, tileMap) {
  // Pick a base enemy type from the map's spawns
  const baseTypes = (tileMap.spawns || []).map(s => s.type).filter(t => t !== undefined);
  if (baseTypes.length === 0) return;
  const baseType = baseTypes[Math.floor(Math.random() * baseTypes.length)];

  const enemy = spawnEnemy(baseType, pos.col, pos.row);
  if (!enemy) return;

  // Apply elite modifier
  const elite = ELITE_TYPES[Math.floor(Math.random() * ELITE_TYPES.length)];
  enemy.hp = Math.floor(enemy.hp * elite.hpMul);
  enemy.maxHp = enemy.hp;
  enemy.atk = Math.floor(enemy.atk * elite.atkMul);
  enemy.xp *= 3;
  enemy.coins *= 3;
  enemy._elite = elite;

  // Chief guarantees drop
  if (elite.id === 'chief') {
    enemy._chiefDrop = true;
  }

  game.enemies.push(enemy);
}

// --- Schedule Ambush ---
function scheduleAmbush(game, mapName) {
  // Ambush triggers after 5-15 seconds of being on the map
  game._ambush = {
    timer: 5 + Math.random() * 10,
    triggered: false,
    mapName,
  };
}

// --- Trigger Ambush (called from main.js) ---
export function updateAmbush(game, dt, createParticle, spawnEnemyFn) {
  if (!game._ambush || game._ambush.triggered) return;
  game._ambush.timer -= dt;
  if (game._ambush.timer > 0) return;

  game._ambush.triggered = true;
  const p = game.player;

  // Spawn 4 bandits around player
  const types = ['bandit_sword', 'bandit_spear', 'bandit_archer', 'bandit_axe'];
  const offsets = [[-3, 0], [3, 0], [0, -3], [0, 3]];

  for (let i = 0; i < 4; i++) {
    const col = Math.floor(p.x / TILE_SIZE) + offsets[i][0];
    const row = Math.floor(p.y / TILE_SIZE) + offsets[i][1];
    const enemy = spawnEnemyFn(types[i], Math.max(1, col), Math.max(1, row));
    if (enemy) {
      enemy.coins *= 2;
      enemy.xp *= 2;
      game.enemies.push(enemy);
    }
  }

  // Warning particle
  if (createParticle) {
    game.particles.push(createParticle(p.x, p.y - 30, 'ЗАСАДА!', '#ff1744', 2.5));
  }
}

// --- Spawn Trader NPC ---
function spawnTrader(game, pos, mapName) {
  const name = TRADER_NAMES[Math.floor(Math.random() * TRADER_NAMES.length)];
  game.npcs.push({
    id: '_trader',
    col: pos.col,
    row: pos.row,
    x: pos.x,
    y: pos.y,
    name: name,
    bodyColor: '#2e7d32',
    headDetail: '#a5d6a7',
    _isTrader: true,
    _mapName: mapName,
  });
}

// --- Get Trader Dialog ---
export function getTraderDialog(mapName) {
  // Pick 2 unique items + 1-2 next-tier weapons
  const items = [...TRADER_UNIQUE];
  // Shuffle and pick 2
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const choices = items.slice(0, 2).map(it => ({
    text: it.text, action: it.action, next: 0,
  }));

  // Add next-tier weapon
  const nextWeapons = NEXT_TIER_WEAPONS[mapName] || [];
  if (nextWeapons.length > 0) {
    const wid = nextWeapons[Math.floor(Math.random() * nextWeapons.length)];
    choices.push({ text: `Оружие след. тира`, action: `buy_${wid}`, next: 0 });
  }

  choices.push({ text: 'Уйти', next: null });

  return [
    {
      text: 'У меня есть редкие товары, каких не найдёшь в обычном магазине! Взгляни...',
      choices,
    },
  ];
}

// --- Spawn Buff Stone ---
function spawnBuff(game, pos) {
  if (!game.buffStones) game.buffStones = [];
  const buff = BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)];
  game.buffStones.push({
    x: pos.x, y: pos.y,
    buff,
    picked: false,
  });
}

// --- Apply Buff ---
export function applyBuff(game, buff) {
  game.activeBuff = {
    ...buff,
    timer: 30, // 30 seconds
  };
}

// --- Update Active Buff ---
export function updateBuff(game, dt) {
  if (!game.activeBuff) return;
  game.activeBuff.timer -= dt;
  if (game.activeBuff.timer <= 0) {
    game.activeBuff = null;
  }
}

// --- Get Buff Multipliers ---
export function getBuffAtkMultiplier(game) {
  if (!game.activeBuff) return 1;
  if (game.activeBuff.effect === 'atkMul') return game.activeBuff.value;
  return 1;
}

export function getBuffSpeedMultiplier(game) {
  if (!game.activeBuff) return 1;
  if (game.activeBuff.effect === 'speedMul') return game.activeBuff.value;
  return 1;
}

export function isBuffInvincible(game) {
  return game.activeBuff && game.activeBuff.effect === 'invincible';
}

export function getBuffVampirism(game) {
  if (!game.activeBuff) return 0;
  if (game.activeBuff.effect === 'vampirism') return game.activeBuff.value;
  return 0;
}

// --- Spawn Secret Portal ---
function spawnSecretPortal(game, pos) {
  if (!game.secretPortals) game.secretPortals = [];
  game.secretPortals.push({
    x: pos.x, y: pos.y,
    col: pos.col, row: pos.row,
    used: false,
  });
}

// --- Render: Chest ---
export function drawChest(ctx, x, y, opened) {
  if (opened) {
    // Open chest
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x + 4, y + 12, 24, 14);
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x + 4, y + 6, 24, 8);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x + 6, y + 14, 20, 10);
  } else {
    // Closed chest
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(x + 4, y + 8, 24, 18);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x + 6, y + 10, 20, 14);
    // Lid
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x + 3, y + 6, 26, 6);
    // Gold clasp
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x + 13, y + 8, 6, 4);
    ctx.fillStyle = '#ffab00';
    ctx.fillRect(x + 14, y + 9, 4, 2);
  }
}

// --- Render: Buff Stone ---
export function drawBuffStone(ctx, x, y, buff, time) {
  if (!buff) return;
  const pulse = Math.sin(time * 4) * 0.3 + 0.7;
  // Glow
  ctx.globalAlpha = 0.3 * pulse;
  ctx.fillStyle = buff.glow;
  ctx.fillRect(x + 4, y + 8, 24, 20);
  // Stone
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 10, y + 14, 12, 12);
  ctx.fillStyle = buff.color;
  ctx.fillRect(x + 12, y + 16, 8, 8);
  ctx.fillStyle = buff.glow;
  ctx.fillRect(x + 13, y + 17, 6, 6);
  ctx.globalAlpha = 1;
}

// --- Render: Secret Portal ---
export function drawSecretPortal(ctx, x, y, time) {
  const pulse = Math.sin(time * 3) * 0.2 + 0.8;
  ctx.globalAlpha = 0.6 * pulse;
  ctx.fillStyle = '#7c4dff';
  ctx.fillRect(x + 4, y + 2, 24, 28);
  ctx.fillStyle = '#b388ff';
  ctx.fillRect(x + 8, y + 4, 16, 24);
  ctx.fillStyle = '#e8daef';
  ctx.fillRect(x + 12, y + 8, 8, 16);
  ctx.globalAlpha = 1;
}

// --- Render: Elite Aura/Crown ---
export function drawEliteIndicator(ctx, x, y, w, h, elite, time) {
  if (!elite) return;

  if (elite.visual === 'aura') {
    // Pulsing red aura
    const pulse = Math.sin(time * 5) * 0.15 + 0.25;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.globalAlpha = 1;
  } else if (elite.visual === 'crown') {
    // Gold crown above head
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x + w / 2 - 8, y - 10, 16, 6);
    ctx.fillStyle = '#ffab00';
    ctx.fillRect(x + w / 2 - 6, y - 12, 3, 4);
    ctx.fillRect(x + w / 2 - 1, y - 14, 3, 4);
    ctx.fillRect(x + w / 2 + 4, y - 12, 3, 4);
  }
  // 'scale' type is handled by rendering at 1.5x in enemies.js
}
