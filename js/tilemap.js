import { tileDrawers, SOLID_TILES } from './sprites.js';

export const TILE_SIZE = 32;

let cachedCanvas = null;
let cachedMapRef = null;

export function createTileMap(data) {
  return {
    width: data.width,
    height: data.height,
    tiles: data.tiles,
    spawns: data.spawns || [],
    npcs: data.npcs || [],
    portals: data.portals || [],
    playerStart: data.playerStart || { x: 5, y: 5 },
    name: data.name || 'Unknown',
  };
}

export function getTile(map, col, row) {
  if (row < 0 || row >= map.height || col < 0 || col >= map.width) return -1;
  return map.tiles[row][col];
}

export function isSolid(map, col, row) {
  const tile = getTile(map, col, row);
  return tile === -1 || SOLID_TILES.has(tile);
}

export function isPortal(map, col, row) {
  return map.portals.find(p => p.col === col && p.row === row) || null;
}

// Pre-render entire map to offscreen canvas (called once per map load)
function cacheMap(map) {
  const w = map.width * TILE_SIZE;
  const h = map.height * TILE_SIZE;
  cachedCanvas = document.createElement('canvas');
  cachedCanvas.width = w;
  cachedCanvas.height = h;
  const offCtx = cachedCanvas.getContext('2d');

  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const tileType = map.tiles[row][col];
      const drawFn = tileDrawers[tileType];
      if (drawFn) drawFn(offCtx, col * TILE_SIZE, row * TILE_SIZE);
    }
  }
  cachedMapRef = map;
}

export function renderMap(ctx, map, camera, animFrame) {
  // Cache map on first render or map change
  if (cachedMapRef !== map) {
    cacheMap(map);
  }

  // Blit only the visible portion from cached canvas
  const sx = Math.floor(camera.x);
  const sy = Math.floor(camera.y);
  const sw = Math.min(camera.width, cachedCanvas.width - sx);
  const sh = Math.min(camera.height, cachedCanvas.height - sy);

  if (sw > 0 && sh > 0) {
    ctx.drawImage(cachedCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  }
}
