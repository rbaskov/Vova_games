// ============================================================
// map-loading.js — Map loading / open world / portals / checkpoints
// ============================================================
// Содержит всю логику загрузки карт, управления открытым миром,
// порталов и чекпоинтов. Вынесено из main.js в рамках pre-coop refactor
// (Task 2.4 + частично Task 2.3).
//
// Состав:
//   - Чистые helpers: collides*, unstickPlayer, awardLoot, getStructureChestRarity
//   - getOpenWorldSaveState — сериализация для save.js
//   - createOpenWorldMapProxy — proxy-map для enemies.js AI в открытом мире
//   - saveCheckpoint / checkCheckpoint / respawnAtCheckpoint — чекпоинты
//   - loadMap — загрузка handcrafted карт + подземелий
//   - enterOpenWorld / exitOpenWorld — вход/выход в процедурный открытый мир
//   - syncChunkEnemies — подгрузка врагов/NPC/сундуков для 3x3 чанков вокруг игрока
//   - checkPortals — проверка порталов и телепортация
//
// updatePlayer / updateCompanions пока остаются в main.js, будут вынесены
// в js/player-update.js в следующей фазе (Task 2.3 complete).

import { isSolid, TILE_SIZE, getTile, isPortal, createTileMap } from './tilemap.js';
import { OPEN_WORLD_SOLID_TILES, TILE } from './sprites.js';
import { game } from './game-state.js';
import { getDifficulty } from './difficulty.js';
import { createPlayer } from './player-update.js';
import { villageMap } from './maps/village.js';
import { forestMap } from './maps/forest.js';
import { canyonMap } from './maps/canyon.js';
import { caveMap } from './maps/cave.js';
import { castleMap } from './maps/castle.js';
import { kingdomMap } from './maps/kingdom.js';
import { hellpitMap } from './maps/hellpit.js';
import { arenaMap } from './maps/arena.js';
import { spawnEnemy } from './enemies.js';
import { createBoss } from './bosses.js';
import { createCamera } from './camera.js';
import { createWorldGen, CHUNK_W, CHUNK_H } from './worldgen.js';
import { createChunkManager } from './chunks.js';
import { createFastTravel } from './fasttravel.js';
import { createHazardManager } from './biome-hazards.js';
import { createMinimapRenderer } from './minimap.js';
import { createWorldEventManager } from './world-events.js';
import { saveGame } from './save.js';
import { generateDungeon } from './dungeon.js';
import { generateEvents } from './events.js';
import { updateVisitProgress } from './quests.js';
import { updateGenVisitProgress } from './questgen.js';
import { createParticle } from './particles.js';
import * as SFX from './audio.js';

// --- Map registry: handcrafted maps by key ---
const MAP_REGISTRY = {
  village: villageMap,
  forest: forestMap,
  canyon: canyonMap,
  cave: caveMap,
  castle: castleMap,
  kingdom: kingdomMap,
  hellpit: hellpitMap,
  arena: arenaMap,
};

// --- Dungeon depth state (mutable, used by loadMap for procedural dungeons) ---
let dungeonDepth = 0;

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

// --- Load handcrafted map (village/forest/etc) or generate dungeon ---
export function loadMap(mapKey, spawnX, spawnY) {
  let mapData;

  if (mapKey === 'dungeon') {
    // Generate new dungeon level 1
    dungeonDepth = 1;
    mapData = generateDungeon(dungeonDepth);
    MAP_REGISTRY._currentDungeon = mapData;
    // Force using playerStart from generated map
    spawnX = undefined;
    spawnY = undefined;
  } else if (mapKey === '_dungeon_next') {
    // Go deeper into dungeon
    dungeonDepth++;
    mapData = generateDungeon(dungeonDepth);
    MAP_REGISTRY._currentDungeon = mapData;
    mapKey = 'dungeon_' + dungeonDepth;
    spawnX = undefined;
    spawnY = undefined;
  } else {
    mapData = MAP_REGISTRY[mapKey];
  }

  if (!mapData) return;

  const tileMap = createTileMap(mapData);
  game.currentMap = tileMap;
  game.currentMapName = mapKey;

  // Quest: visit map progress
  if (game.player) {
    const visitDone = updateVisitProgress(game.player, mapKey);
    const genVisitDone = updateGenVisitProgress(game.player, mapKey);
    for (const q of [...visitDone, ...genVisitDone]) {
      game.particles.push(createParticle(game.player.x, game.player.y - 32, `Квест: ${q.name}!`, '#4caf50', 2));
    }
  }

  // Create or reposition player
  const sx = spawnX !== undefined ? spawnX : tileMap.playerStart.x;
  const sy = spawnY !== undefined ? spawnY : tileMap.playerStart.y;

  if (game.player) {
    // Preserve stats, update position
    game.player.x = sx * TILE_SIZE;
    game.player.y = sy * TILE_SIZE;
  } else {
    game.player = createPlayer(sx, sy);
  }

  // Give player a reference to current map for collision checks (knockback)
  game.player._map = tileMap;

  // Make sure player isn't stuck inside a wall
  unstickPlayer();

  // Camera
  game.camera = createCamera(640, 480);

  // NPCs from map data
  game.npcs = tileMap.npcs.map(n => ({
    ...n,
    x: n.col * TILE_SIZE,
    y: n.row * TILE_SIZE,
  }));

  // Enemies from spawns
  game.enemies = [];
  if (tileMap.spawns) {
    for (const s of tileMap.spawns) {
      const enemy = spawnEnemy(s.type, s.col, s.row);
      if (enemy) game.enemies.push(enemy);
    }
  }

  // Boss from map data (skip if already defeated)
  game.boss = null;
  if (mapData.boss && !game.player.defeatedBosses.includes(mapData.boss.type)) {
    game.boss = createBoss(mapData.boss.type, mapData.boss.col, mapData.boss.row);
  }

  // Arena reset
  if (mapData.arena) {
    game.arenaWave = 0;
    game.arenaTimer = 1.5;
    game.arenaWaiting = true;
  }

  // Random events
  game.chests = [];
  game.buffStones = [];
  game.secretPortals = [];
  game._ambush = null;
  game.activeBuff = null;
  generateEvents(game, mapKey, tileMap);

  // Teleport companions to player
  for (let i = 0; i < game.companions.length; i++) {
    game.companions[i].x = game.player.x + (i + 1) * 20;
    game.companions[i].y = game.player.y + 30;
  }
}

// --- Open world: sync enemies/NPCs/chests for 3x3 chunks around player ---
export function syncChunkEnemies() {
  const cm = game.chunkManager;
  const newEnemies = [];
  const newNpcs = [];
  const newChests = [];
  const newBuffStones = [];
  const diff = getDifficulty(game.difficulty);

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = cm.centerCX + dx;
      const cy = cm.centerCY + dy;
      const k = `${cx},${cy}`;

      // Track visited chunks (for fast travel)
      if (game.visitedChunks) game.visitedChunks.add(k);

      if (!game.chunkEnemies.has(k)) {
        const chunk = cm.getChunk(cx, cy);
        const kills = game.chunkKills.get(k) || new Set();
        const enemies = [];

        // --- Terrain enemy spawns ---
        chunk.spawns.forEach((s, i) => {
          if (kills.has(i)) return;
          // Apply countMul: for easy (<1) skip some; for hardcore (>1) allow more
          if (diff.countMul < 1 && Math.random() > diff.countMul) return;
          if (diff.countMul > 1 && Math.random() > 1 / diff.countMul) {
            // duplicate will be handled naturally; we simply don't skip
          }
          const enemy = spawnEnemy(s.type, s.col, s.row);
          if (enemy) {
            enemy.x = (cx * CHUNK_W + s.col) * TILE_SIZE;
            enemy.y = (cy * CHUNK_H + s.row) * TILE_SIZE;
            enemy.originX = enemy.x;
            enemy.originY = enemy.y;
            enemy.hp = Math.floor(enemy.hp * s.tier * diff.hpMul);
            enemy.maxHp = enemy.hp;
            enemy.atk = Math.floor(enemy.atk * s.tier * diff.atkMul);
            enemy._chunkKey = k;
            enemy._spawnIndex = i;
            enemies.push(enemy);
          }
        });

        // --- Structure enemy spawns ---
        if (chunk.structure) {
          const st = chunk.structure;
          const structKills = game.chunkKills.get(k) || new Set();
          st.spawns.forEach((s, i) => {
            if (structKills.has('s' + i)) return;
            const enemy = spawnEnemy(s.type, s.col, s.row);
            if (enemy) {
              enemy.x = s.worldCol * TILE_SIZE;
              enemy.y = s.worldRow * TILE_SIZE;
              enemy.originX = enemy.x;
              enemy.originY = enemy.y;
              const tier = s.tier || 1;
              const bossMul = s.isBoss ? 3 : 1;
              enemy.hp = Math.floor(enemy.hp * tier * bossMul * diff.hpMul);
              enemy.maxHp = enemy.hp;
              enemy.atk = Math.floor(enemy.atk * tier * (s.isBoss ? 2 : 1) * diff.atkMul);
              if (s.isBoss) {
                enemy.xp = (enemy.xp || 10) * 5;
                enemy.coins = (enemy.coins || 5) * 5;
              }
              enemy._chunkKey = k;
              enemy._spawnIndex = 's' + i; // structure spawn index prefixed with 's'
              enemy._isStructureSpawn = true;
              enemies.push(enemy);
            }
          });
        }

        game.chunkEnemies.set(k, enemies);
      }

      newEnemies.push(...game.chunkEnemies.get(k));

      // --- Structure NPCs, chests, buff stones ---
      const chunk = cm.getChunk(cx, cy);
      if (chunk.structure) {
        const st = chunk.structure;
        const openedChests = game._openedStructChests || new Set();

        // NPCs
        for (const npc of st.npcs) {
          newNpcs.push({
            id: npc.id,
            col: npc.col,
            row: npc.row,
            x: npc.col * TILE_SIZE,
            y: npc.row * TILE_SIZE,
            name: npc.name,
            bodyColor: npc.bodyColor,
            headDetail: npc.headDetail,
            _chunkKey: k,
            _structureNpc: true,
          });
        }

        // Chests
        for (const chest of st.chests) {
          const chestKey = `${chest.col},${chest.row}`;
          const isOpened = openedChests.has(chestKey);
          newChests.push({
            x: chest.col * TILE_SIZE,
            y: chest.row * TILE_SIZE,
            col: chest.col,
            row: chest.row,
            rarity: getStructureChestRarity(cx, cy),
            opened: isOpened,
            _chunkKey: k,
            _structureChest: true,
            _chestKey: chestKey,
          });
        }

        // Buff stones (ruins)
        if (st.hasBuffStone && st.buffStoneCol !== null) {
          const bsKey = `bs_${st.buffStoneCol},${st.buffStoneRow}`;
          const picked = (game._pickedBuffStones || new Set()).has(bsKey);
          if (!picked) {
            const BUFF_TYPES_LOCAL = [
              { id: 'rage', name: 'Ярость', effect: 'atkMul', value: 2, color: '#ff1744', glow: '#ff5252' },
              { id: 'godshield', name: 'Щит богов', effect: 'invincible', value: 1, color: '#ffd54f', glow: '#ffecb3' },
              { id: 'wind', name: 'Ветер', effect: 'speedMul', value: 2, color: '#29b6f6', glow: '#81d4fa' },
              { id: 'vampirism', name: 'Вампиризм', effect: 'vampirism', value: 5, color: '#66bb6a', glow: '#a5d6a7' },
            ];
            // Deterministic buff from chunk coords
            const buffIdx = Math.abs((cx * 7 + cy * 13) % BUFF_TYPES_LOCAL.length);
            newBuffStones.push({
              x: st.buffStoneCol * TILE_SIZE,
              y: st.buffStoneRow * TILE_SIZE,
              buff: BUFF_TYPES_LOCAL[buffIdx],
              picked: false,
              _bsKey: bsKey,
              _structureBuff: true,
            });
          }
        }
      }
    }
  }

  // --- Boss lair: spawn real boss in current chunk ---
  const currentChunk = cm.getChunk(cm.centerCX, cm.centerCY);
  if (currentChunk && currentChunk.structure && currentChunk.structure.bossType) {
    const bossType = currentChunk.structure.bossType;
    const killedBosses = game._killedOpenWorldBosses || new Set();
    if (!killedBosses.has(bossType)) {
      // Only spawn if not already active
      if (!game.boss || !game.boss.alive || game.boss.type !== bossType) {
        const st = currentChunk.structure;
        const bossCenterCol = cm.centerCX * CHUNK_W + st.col + Math.floor(st.width / 2);
        const bossCenterRow = cm.centerCY * CHUNK_H + st.row + Math.floor(st.height / 2);
        game.boss = createBoss(bossType, bossCenterCol, bossCenterRow);
        if (game.boss) {
          // Scale boss stats by difficulty setting
          const bDiff = getDifficulty(game.difficulty);
          game.boss.hp = Math.floor(game.boss.hp * bDiff.hpMul);
          game.boss.maxHp = game.boss.hp;
          for (const phase of game.boss.phases) {
            phase.atk = Math.floor(phase.atk * bDiff.atkMul);
          }
          game.boss._openWorldBoss = true;
          game.boss._dialogShown = false;
        }
      }
    }
  } else if (game.boss && game.boss._openWorldBoss) {
    // Player left the boss chunk — despawn boss (unless mid-fight)
    const bx = game.boss.x + game.boss.width / 2;
    const by = game.boss.y + game.boss.height / 2;
    const px = game.player.x + game.player.hitW / 2;
    const py = game.player.y + game.player.hitH / 2;
    const distToBoss = Math.sqrt((bx - px) ** 2 + (by - py) ** 2);
    if (distToBoss > 600) {
      game.boss = null;
    }
  }

  // Unload distant chunk enemies
  for (const [k] of game.chunkEnemies) {
    const [ecx, ecy] = k.split(',').map(Number);
    if (Math.abs(ecx - cm.centerCX) > 1 || Math.abs(ecy - cm.centerCY) > 1) {
      game.chunkEnemies.delete(k);
    }
  }

  game.enemies = newEnemies;
  game.npcs = newNpcs;
  game.chests = newChests;
  if (newBuffStones.length > 0) {
    // Merge structure buff stones with any existing non-structure ones
    game.buffStones = [
      ...(game.buffStones || []).filter(b => !b._structureBuff),
      ...newBuffStones,
    ];
  }
}

// --- Enter procedural open world with given seed ---
export function enterOpenWorld(seed, playerWorldX, playerWorldY) {
  game.openWorld = true;
  game.worldSeed = seed || Math.floor(Math.random() * 2147483647);
  game.worldGen = createWorldGen(game.worldSeed);
  game.chunkManager = createChunkManager(game.worldGen);
  game.chunkEnemies = new Map();
  game.chunkKills = new Map();
  game.currentMap = createOpenWorldMapProxy();
  game.currentMapName = 'openworld';
  game.boss = null;
  game.npcs = [];
  game.chests = [];
  game.buffStones = [];
  game.secretPortals = [];
  game._ambush = null;
  game.activeBuff = null;
  game._openedStructChests = game._openedStructChests || new Set();
  game._pickedBuffStones = game._pickedBuffStones || new Set();
  game._killedOpenWorldBosses = game._killedOpenWorldBosses || new Set();
  game.visitedChunks = game.visitedChunks instanceof Set ? game.visitedChunks : new Set();
  game.fastTravel = createFastTravel();
  game.hazardManager = createHazardManager();

  const px = playerWorldX !== undefined ? playerWorldX : 15 * TILE_SIZE;
  const py = playerWorldY !== undefined ? playerWorldY : 10 * TILE_SIZE;

  if (!game.player) {
    game.player = createPlayer(0, 0);
  }
  game.player.x = px;
  game.player.y = py;

  game.player._map = game.currentMap;
  game.camera = createCamera(640, 480);

  const { cx, cy } = game.chunkManager.pixelToChunk(px, py);
  game.chunkManager.updateCenter(cx, cy);
  game.visitedChunks.add(`${cx},${cy}`);
  game.minimapRenderer = createMinimapRenderer(game.worldGen);
  game.worldEventManager = createWorldEventManager(game.worldGen);
  syncChunkEnemies();

  // Защита от спавна внутри стены после возврата из подземелья или fast travel
  unstickPlayer();

  // Teleport companions
  for (let i = 0; i < game.companions.length; i++) {
    game.companions[i].x = game.player.x + (i + 1) * 20;
    game.companions[i].y = game.player.y + 30;
  }
}

// --- Exit open world back to village ---
export function exitOpenWorld() {
  game.openWorld = false;
  game.chunkManager = null;
  game.worldGen = null;
  game.chunkEnemies = null;
  game.chunkKills = null;
  game.minimapRenderer = null;
  game.hazardManager = null;
  game.worldEventManager = null;
  loadMap('village', 14, 10);
}

// --- Check if player is standing on a portal tile, handle teleport ---
// --- Sticky-tile helpers ---
// После телепорта игрок спавнится на destination-тайле. Чтобы избежать
// мгновенного повторного срабатывания (игрок продолжает держать движение
// в сторону, где теперь находится обратный портал), запоминаем тайл
// спавна и не триггерим порталы пока игрок не сойдёт с него.
// Это надёжнее чем только portalCooldown таймер: работает независимо
// от скорости игрока (конь + buff ветра могут "проскочить" cooldown).
function _playerTileColRow() {
  const p = game.player;
  return {
    col: Math.floor((p.x + p.hitW / 2) / TILE_SIZE),
    row: Math.floor((p.y + p.hitH / 2) / TILE_SIZE),
  };
}

function _setTeleportAnchor() {
  game._teleportAnchor = _playerTileColRow();
}

export function checkPortals() {
  // Grace period after teleport to prevent instant re-teleport
  if (game.portalCooldown > 0) return;

  // Sticky-tile guard: не триггерим порталы пока игрок стоит на тайле,
  // на котором заспавнился после последнего телепорта. Как только сошёл
  // на другой тайл — очищаем якорь и порталы снова активны.
  if (game._teleportAnchor) {
    const cur = _playerTileColRow();
    if (cur.col === game._teleportAnchor.col && cur.row === game._teleportAnchor.row) return;
    game._teleportAnchor = null;
  }

  // Open world: check for structure portal tiles (cave entrances, village portal)
  if (game.openWorld) {
    const p = game.player;
    const centerCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
    const centerRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
    const tile = game.chunkManager.getTileAtWorld(centerCol, centerRow);
    if (tile === TILE.PORTAL) {
      // Check if this is the village portal at chunk (0,0)
      const { cx, cy } = game.chunkManager.pixelToChunk(p.x, p.y);
      if (cx === 0 && cy === 0) {
        // Return to village map
        saveGame(game.player, 'openworld', getOpenWorldSaveState());
        exitOpenWorld();
        game.portalCooldown = 0.5;
        _setTeleportAnchor();
        SFX.playPortal();
        return;
      }
      // Save return position
      game._openWorldReturn = { x: p.x, y: p.y + TILE_SIZE * 2 };
      // Enter a procedural dungeon
      game.player._companions = game.companions.map(c => c.type);
      game.player._playerClass = game.playerClass;
      game.player._hasHorse = game.hasHorse;
      // Use chunk coords as dungeon seed for consistency (cx, cy уже объявлены выше)
      const owDungeonDepth = Math.max(1, Math.floor(Math.sqrt(cx * cx + cy * cy) / 3));
      const dungeonMapData = generateDungeon(owDungeonDepth);
      if (dungeonMapData) {
        saveGame(game.player, 'openworld', getOpenWorldSaveState());
        game.openWorld = false;
        game.currentMapName = 'dungeon_ow';
        const tileMap = createTileMap(dungeonMapData);
        game.currentMap = tileMap;
        game.player.x = (dungeonMapData.playerStart ? dungeonMapData.playerStart.x : 2) * TILE_SIZE;
        game.player.y = (dungeonMapData.playerStart ? dungeonMapData.playerStart.y : 2) * TILE_SIZE;
        game.player._map = tileMap;
        game.npcs = tileMap.npcs ? tileMap.npcs.map(n => ({ ...n, x: n.col * TILE_SIZE, y: n.row * TILE_SIZE })) : [];
        game.enemies = [];
        if (tileMap.spawns) {
          for (const s of tileMap.spawns) {
            const enemy = spawnEnemy(s.type, s.col, s.row);
            if (enemy) game.enemies.push(enemy);
          }
        }
        game.boss = null;
        if (dungeonMapData.boss) {
          game.boss = createBoss(dungeonMapData.boss.type, dungeonMapData.boss.col, dungeonMapData.boss.row);
        }
        game.chests = [];
        game.buffStones = [];
        game.camera = createCamera(640, 480);
        game.portalCooldown = 0.5;
        _setTeleportAnchor();
        SFX.playPortal();
      }
    }
    return;
  }

  const p = game.player;
  const centerCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const centerRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
  const portal = isPortal(game.currentMap, centerCol, centerRow);
  if (portal) {
    game.player._companions = game.companions.map(c => c.type);
    game.player._playerClass = game.playerClass;
    game.player._hasHorse = game.hasHorse;

    if (portal.target === 'openworld') {
      enterOpenWorld(game.worldSeed);
      saveGame(game.player, 'openworld', getOpenWorldSaveState());
      game.portalCooldown = 0.5;
      _setTeleportAnchor();
      SFX.playPortal();
      return;
    }

    // Return from open-world dungeon to open world
    if (game.currentMapName === 'dungeon_ow' && portal.target === 'village') {
      const ret = game._openWorldReturn || { x: 15 * TILE_SIZE, y: 10 * TILE_SIZE };
      enterOpenWorld(game.worldSeed, ret.x, ret.y);
      saveGame(game.player, 'openworld', getOpenWorldSaveState());
      game.portalCooldown = 0.5;
      _setTeleportAnchor();
      SFX.playPortal();
      return;
    }

    saveGame(game.player, portal.target);
    loadMap(portal.target, portal.spawnX, portal.spawnY);
    game.portalCooldown = 0.5;
    _setTeleportAnchor();
    SFX.playPortal();
    SFX.playMusic(SFX.getMusicTheme(game.currentMapName));
  }
}

// --- Check if player is standing on checkpoint tile; save + heal if so ---
export function checkCheckpoint() {
  const p = game.player;
  const col = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const row = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);

  // In open world, check via chunkManager; otherwise use map tiles
  let tile;
  if (game.openWorld) {
    tile = game.chunkManager.getTileAtWorld(col, row);
  } else {
    tile = getTile(game.currentMap, col, row);
  }
  if (tile === TILE.CHECKPOINT) {
    // Only save if this is a new checkpoint position
    if (!game.checkpoint || game.checkpoint.mapName !== game.currentMapName ||
        Math.abs(game.checkpoint.x - p.x) > TILE_SIZE || Math.abs(game.checkpoint.y - p.y) > TILE_SIZE) {
      saveCheckpoint();
      // Heal a bit at checkpoint
      p.hp = Math.min(p.maxHp, p.hp + 20);
      SFX.playCheckpoint();
      game.particles.push(createParticle(p.x, p.y - 16, 'ЧЕКПОИНТ!', '#b388ff', 1.2));
      game.particles.push(createParticle(p.x, p.y - 4, '+20 HP', '#44cc44'));
    }
  }
}

// --- Respawn at last checkpoint (after death) ---
export function respawnAtCheckpoint() {
  const cp = game.checkpoint;
  if (!cp) return false;

  // Load the checkpoint map — or re-enter open world if checkpoint was there
  if (cp.openWorld && cp.mapName === 'openworld') {
    enterOpenWorld(cp.openWorld.seed, cp.x, cp.y);
    if (cp.openWorld.difficulty) game.difficulty = cp.openWorld.difficulty;
  } else {
    loadMap(cp.mapName);
  }

  // Restore player stats from checkpoint
  const p = game.player;
  p.x = cp.x;
  p.y = cp.y;
  p.hp = cp.maxHp;  // full heal on respawn
  p.maxHp = cp.maxHp;
  p.atk = cp.atk;
  p.xp = cp.xp;
  p.level = cp.level;
  p.coins = cp.coins;
  p.potions = cp.potions;
  p.artifacts = { ...cp.artifacts };
  p.weapon = cp.weapon;
  p.ownedWeapons = [...cp.ownedWeapons];
  p.equippedArmor = { ...cp.equippedArmor };
  p.ownedArmor = [...(cp.ownedArmor || [])];
  p.quests = cp.quests ? JSON.parse(JSON.stringify(cp.quests)) : {};
  p.defeatedBosses = [...cp.defeatedBosses];
  p.invincibleTimer = 1.5; // brief invincibility after respawn
  p.attacking = false;
  p.attackTimer = 0;
  p._map = game.currentMap;

  game.portalCooldown = 0.5;
  _setTeleportAnchor(); // защита от мгновенной активации соседнего портала после respawn
  return true;
}
