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
//
// Функции с глубокими зависимостями на createPlayer/loadMap/enemies/chunks
// (syncChunkEnemies, enterOpenWorld, exitOpenWorld, loadMap, checkPortals,
//  checkCheckpoint, saveCheckpoint, respawnAtCheckpoint) пока остаются в main.js.
// Они будут вынесены в следующей сессии с smoke-тестами между шагами.

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
