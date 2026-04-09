// ============================================================
// dungeon.js — Procedural Dungeon Generator
// ============================================================
//
// Generates a random dungeon map with connected rooms, corridors,
// enemies, loot, and an exit portal. Each visit is unique.

import { TILE } from './sprites.js';

const W = TILE.WALL;
const F = TILE.CASTLE;  // floor
const D = TILE.DIRT;    // corridor floor
const P = TILE.PORTAL;
const K = TILE.CHECKPOINT;
const DR = TILE.DOOR;

const MAP_W = 40;
const MAP_H = 30;
const MIN_ROOM = 5;
const MAX_ROOM = 9;
const MAX_ROOMS = 10;
const MIN_ROOMS = 6;

// Enemy pools per dungeon depth
const ENEMY_POOLS = [
  // Depth 1 (easy)
  [
    { type: 'slime', weight: 4 },
    { type: 'wolf', weight: 2 },
  ],
  // Depth 2 (medium)
  [
    { type: 'wolf', weight: 2 },
    { type: 'skeleton', weight: 3 },
    { type: 'bandit_sword', weight: 3 },
    { type: 'bandit_spear', weight: 2 },
  ],
  // Depth 3+ (hard)
  [
    { type: 'skeleton', weight: 2 },
    { type: 'golem', weight: 2 },
    { type: 'bandit_sword', weight: 3 },
    { type: 'bandit_spear', weight: 2 },
    { type: 'bandit_archer', weight: 3 },
  ],
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick(pool) {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) return entry.type;
  }
  return pool[0].type;
}

// Generate a dungeon map data object
export function generateDungeon(depth) {
  const tiles = [];
  // Fill with walls
  for (let row = 0; row < MAP_H; row++) {
    tiles.push(new Array(MAP_W).fill(W));
  }

  const rooms = [];

  // Place rooms
  for (let attempt = 0; attempt < 100 && rooms.length < MAX_ROOMS; attempt++) {
    const w = rand(MIN_ROOM, MAX_ROOM);
    const h = rand(MIN_ROOM, MAX_ROOM);
    const x = rand(1, MAP_W - w - 1);
    const y = rand(1, MAP_H - h - 1);

    // Check overlap
    let overlap = false;
    for (const r of rooms) {
      if (x < r.x + r.w + 1 && x + w + 1 > r.x &&
          y < r.y + r.h + 1 && y + h + 1 > r.y) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    rooms.push({ x, y, w, h });

    // Carve room
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        tiles[ry][rx] = F;
      }
    }
  }

  if (rooms.length < MIN_ROOMS) {
    // Not enough rooms, retry recursively
    return generateDungeon(depth);
  }

  // Connect rooms with corridors (connect each room to the next)
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = roomCenter(rooms[i]);
    const b = roomCenter(rooms[i + 1]);
    carveCorridor(tiles, a.x, a.y, b.x, b.y);
  }

  // Also connect last to first for a loop
  const firstCenter = roomCenter(rooms[0]);
  const lastCenter = roomCenter(rooms[rooms.length - 1]);
  carveCorridor(tiles, lastCenter.x, lastCenter.y, firstCenter.x, firstCenter.y);

  // Place doors at corridor-room intersections
  placeDoors(tiles, rooms);

  // Entrance portal in first room
  const startRoom = rooms[0];
  const startX = startRoom.x + Math.floor(startRoom.w / 2);
  const startY = startRoom.y + Math.floor(startRoom.h / 2);
  tiles[startY][startX] = P;

  // Checkpoint in second room
  const checkRoom = rooms[1];
  tiles[checkRoom.y + 1][checkRoom.x + 1] = K;

  // Exit portal in last room
  const exitRoom = rooms[rooms.length - 1];
  const exitX = exitRoom.x + Math.floor(exitRoom.w / 2);
  const exitY = exitRoom.y + Math.floor(exitRoom.h / 2);
  tiles[exitY][exitX] = P;

  // Spawn enemies in rooms (skip first room = safe, skip last = exit)
  const spawns = [];
  const pool = ENEMY_POOLS[Math.min(depth - 1, ENEMY_POOLS.length - 1)];

  for (let i = 1; i < rooms.length - 1; i++) {
    const room = rooms[i];
    const enemyCount = rand(2, 4);
    for (let j = 0; j < enemyCount; j++) {
      const ex = rand(room.x + 1, room.x + room.w - 2);
      const ey = rand(room.y + 1, room.y + room.h - 2);
      spawns.push({ type: weightedPick(pool), col: ex, row: ey });
    }
  }

  // Boss in the room before exit (second to last)
  const bossRoom = rooms[rooms.length - 2];
  const bossTypes = ['forest_guardian', 'fire_dragon', 'ice_lich', 'dark_knight'];
  const bossType = bossTypes[rand(0, bossTypes.length - 1)];

  // Dungeon name
  const depthNames = ['Неглубокое', 'Тёмное', 'Глубокое', 'Бездонное', 'Проклятое'];
  const placeNames = ['подземелье', 'катакомбы', 'крипта', 'лабиринт'];
  const dungeonName = `${depthNames[Math.min(depth - 1, depthNames.length - 1)]} ${placeNames[rand(0, placeNames.length - 1)]} (ур.${depth})`;

  return {
    name: dungeonName,
    width: MAP_W,
    height: MAP_H,
    tiles,
    playerStart: { x: startRoom.x + 1, y: startRoom.y + 1 },
    portals: [
      // Entrance — back to village
      { col: startX, row: startY, target: 'village', spawnX: 14, spawnY: 12 },
      // Exit — goes deeper or back to village
      { col: exitX, row: exitY, target: '_dungeon_next', spawnX: 0, spawnY: 0 },
    ],
    npcs: [],
    spawns,
    boss: {
      type: bossType,
      col: bossRoom.x + Math.floor(bossRoom.w / 2),
      row: bossRoom.y + Math.floor(bossRoom.h / 2),
    },
    isDungeon: true,
    depth,
    _rooms: rooms,
  };
}

function roomCenter(room) {
  return {
    x: room.x + Math.floor(room.w / 2),
    y: room.y + Math.floor(room.h / 2),
  };
}

function carveCorridor(tiles, x1, y1, x2, y2) {
  let x = x1, y = y1;

  // Horizontal first, then vertical (or random choice)
  if (Math.random() < 0.5) {
    // Horizontal then vertical
    while (x !== x2) {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
        tiles[y][x] = D;
        // Widen corridor
        if (y + 1 < MAP_H) tiles[y + 1][x] = D;
      }
      x += x < x2 ? 1 : -1;
    }
    while (y !== y2) {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
        tiles[y][x] = D;
        if (x + 1 < MAP_W) tiles[y][x + 1] = D;
      }
      y += y < y2 ? 1 : -1;
    }
  } else {
    // Vertical then horizontal
    while (y !== y2) {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
        tiles[y][x] = D;
        if (x + 1 < MAP_W) tiles[y][x + 1] = D;
      }
      y += y < y2 ? 1 : -1;
    }
    while (x !== x2) {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
        tiles[y][x] = D;
        if (y + 1 < MAP_H) tiles[y + 1][x] = D;
      }
      x += x < x2 ? 1 : -1;
    }
  }
}

function placeDoors(tiles, rooms) {
  // Place doors at room edges where corridors connect
  for (const room of rooms) {
    // Check each edge tile
    for (let rx = room.x; rx < room.x + room.w; rx++) {
      // Top edge
      if (room.y > 0 && tiles[room.y - 1][rx] === D && tiles[room.y][rx] === F) {
        tiles[room.y][rx] = DR;
      }
      // Bottom edge
      const by = room.y + room.h - 1;
      if (by + 1 < MAP_H && tiles[by + 1][rx] === D && tiles[by][rx] === F) {
        tiles[by][rx] = DR;
      }
    }
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      // Left edge
      if (room.x > 0 && tiles[ry][room.x - 1] === D && tiles[ry][room.x] === F) {
        tiles[ry][room.x] = DR;
      }
      // Right edge
      const bx = room.x + room.w - 1;
      if (bx + 1 < MAP_W && tiles[ry][bx + 1] === D && tiles[ry][bx] === F) {
        tiles[ry][bx] = DR;
      }
    }
  }
}
