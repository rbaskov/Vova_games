// ============================================================
// map-loading.js — Helpers для map/collision/open-world state
// ============================================================
// Вынесено из main.js в рамках pre-coop refactor (Task 2.4, частичная экстракция).
//
// В этом модуле живут "чистые" helpers без глубоких зависимостей:
//   - Коллизии игрока с картой / открытым миром
//   - Unstick-логика (выталкивание из стен)
//   - Сохранение состояния открытого мира для save.js
//   - Мелкие утилиты (rarity сундуков, лут-бонус по сложности)
//   - Open world map proxy (routes isSolid/getTile через chunkManager)
//   - saveCheckpoint (чистый snapshot player state)
//
// Функции с глубокими зависимостями на createPlayer/loadMap/enemies/chunks
// (syncChunkEnemies, enterOpenWorld, exitOpenWorld, loadMap, checkPortals,
//  checkCheckpoint, respawnAtCheckpoint) пока остаются в main.js.
// Они будут вынесены после Task 2.3 (createPlayer → player-update.js),
// чтобы избежать циклического импорта.

import { isSolid, TILE_SIZE } from './tilemap.js';
import { OPEN_WORLD_SOLID_TILES } from './sprites.js';
import { game } from './game-state.js';
import { getDifficulty } from './difficulty.js';

// --- Chest rarity по расстоянию от центра мира ---
export function getStructureChestRarity(cx, cy) {
  const dist = Math.sqrt(cx * cx + cy * cy);
  if (dist < 4) return 'common';
  if (dist < 8) return 'good';
  return 'rare';
}

// --- Сериализация состояния открытого мира для сохранения ---
export function getOpenWorldSaveState() {
  if (!game.openWorld) return null;
  const kills = {};
  for (const [k, v] of game.chunkKills) kills[k] = [...v];
  return {
    seed: game.worldSeed,
    playerX: game.player.x,
    playerY: game.player.y,
    changes: game.chunkManager.serializeChanges(),
    kills,
    openedChests: game._openedStructChests ? [...game._openedStructChests] : [],
    pickedBuffStones: game._pickedBuffStones ? [...game._pickedBuffStones] : [],
    difficulty: game.difficulty,
    visitedChunks: game.visitedChunks ? [...game.visitedChunks] : [],
    killedBosses: game._killedOpenWorldBosses ? [...game._killedOpenWorldBosses] : [],
  };
}

// --- Коллизия с handcrafted картой (village, castle, dungeons) ---
export function collidesWithMap(x, y, w, h) {
  const map = game.currentMap;
  // Check all 4 corners
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + w - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + h - 1) / TILE_SIZE);

  return (
    isSolid(map, left, top) ||
    isSolid(map, right, top) ||
    isSolid(map, left, bottom) ||
    isSolid(map, right, bottom)
  );
}

// --- Коллизия в открытом мире (деревья проходимы, см. OPEN_WORLD_SOLID_TILES) ---
export function collidesWithOpenWorld(x, y, w, h) {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + w - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + h - 1) / TILE_SIZE);
  const cm = game.chunkManager;
  return (
    OPEN_WORLD_SOLID_TILES.has(cm.getTileAtWorld(left, top)) ||
    OPEN_WORLD_SOLID_TILES.has(cm.getTileAtWorld(right, top)) ||
    OPEN_WORLD_SOLID_TILES.has(cm.getTileAtWorld(left, bottom)) ||
    OPEN_WORLD_SOLID_TILES.has(cm.getTileAtWorld(right, bottom))
  );
}

// --- Универсальная коллизия: разветвление по режиму мира ---
export function collides(x, y, w, h) {
  if (game.openWorld) return collidesWithOpenWorld(x, y, w, h);
  return collidesWithMap(x, y, w, h);
}

// --- Unstick: выталкивает игрока из стены если он там оказался ---
export function unstickPlayer() {
  const p = game.player;
  if (!p) return;
  if (!collides(p.x, p.y, p.hitW, p.hitH)) return;

  // Try nudging in 4 directions (1px increments up to 32px)
  for (let dist = 1; dist <= TILE_SIZE; dist++) {
    const offsets = [
      [dist, 0], [-dist, 0], [0, dist], [0, -dist],
      [dist, dist], [-dist, -dist], [dist, -dist], [-dist, dist],
    ];
    for (const [dx, dy] of offsets) {
      if (!collides(p.x + dx, p.y + dy, p.hitW, p.hitH)) {
        p.x += dx;
        p.y += dy;
        return;
      }
    }
  }
}

// --- Loot scaling helper (применяет difficulty lootMul в открытом мире) ---
export function awardLoot(xp, coins) {
  let mul = 1;
  if (game.openWorld) {
    const diff = getDifficulty(game.difficulty);
    mul = diff.lootMul || 1;
  }
  game.player.xp += Math.floor(xp * mul);
  game.player.coins += Math.floor(coins * mul);
}

// --- Open world map proxy ---
// Фейковый map-объект для открытого мира. Нужен потому что enemies.js AI
// вызывает isSolid(map, col, row), а в открытом мире нет реального map.tiles —
// тайлы берутся из chunkManager. Этот proxy перенаправляет getTileAt в chunks.
// Флаг isOpenWorld=true заставляет isSolid() использовать OPEN_WORLD_SOLID_TILES
// (деревья проходимы, см. sprites.js).
export function createOpenWorldMapProxy() {
  return {
    width: 999999,
    height: 999999,
    tiles: null,
    portals: [],
    isOpenWorld: true,
    getTileAt(col, row) {
      return game.chunkManager ? game.chunkManager.getTileAtWorld(col, row) : 0;
    },
  };
}

// --- Checkpoint: snapshot player + world state ---
// Вызывается при попадании игрока на CHECKPOINT тайл (checkCheckpoint),
// при смерти босса в открытом мире, и при смене крупных зон.
// Данные лежат в game.checkpoint и используются respawnAtCheckpoint.
export function saveCheckpoint() {
  const p = game.player;
  game.checkpoint = {
    mapName: game.currentMapName,
    x: p.x,
    y: p.y,
    hp: p.hp,
    maxHp: p.maxHp,
    atk: p.atk,
    xp: p.xp,
    level: p.level,
    coins: p.coins,
    potions: p.potions,
    artifacts: { ...p.artifacts },
    weapon: p.weapon,
    ownedWeapons: [...p.ownedWeapons],
    equippedArmor: { ...p.equippedArmor },
    ownedArmor: [...(p.ownedArmor || [])],
    quests: p.quests ? JSON.parse(JSON.stringify(p.quests)) : {},
    defeatedBosses: [...p.defeatedBosses],
    // Open world state: allows respawn in the open world at this structure
    openWorld: game.openWorld ? {
      seed: game.worldSeed,
      difficulty: game.difficulty,
    } : null,
  };
}
