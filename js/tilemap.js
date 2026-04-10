import { tileDrawers, SOLID_TILES, OPEN_WORLD_SOLID_TILES, drawPortalTile } from './sprites.js';

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
    arena: data.arena || false,
  };
}

export function getTile(map, col, row) {
  // Open world proxy: delegate to custom lookup
  if (map && map.getTileAt) return map.getTileAt(col, row);
  if (row < 0 || row >= map.height || col < 0 || col >= map.width) return -1;
  return map.tiles[row][col];
}

export function isSolid(map, col, row) {
  const tile = getTile(map, col, row);
  if (tile === -1) return true;
  // В открытом мире деревья не блокируют движение — только замедляют.
  // Это решает проблему застревания в процедурных лесах/пущах.
  if (map && map.isOpenWorld) return OPEN_WORLD_SOLID_TILES.has(tile);
  return SOLID_TILES.has(tile);
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

  // Runtime portal layer — рисуем поверх кешированной карты.
  // Здесь у нас есть animFrame (для пульсации) и target (для типизации).
  if (map.portals && map.portals.length > 0) {
    for (const p of map.portals) {
      const px = p.col * TILE_SIZE - camera.x;
      const py = p.row * TILE_SIZE - camera.y;
      // Skip если портал за пределами экрана
      if (px < -TILE_SIZE || px >= camera.width ||
          py < -TILE_SIZE || py >= camera.height) continue;
      drawPortalTile(ctx, px, py, animFrame, p.target);
    }
  }
}


export function renderOpenWorld(ctx, chunkManager, camera) {
  const chunks = chunkManager.getLoadedChunks();

  for (const chunk of chunks) {
    // Chunk pixel bounds in world space
    const chunkLeft = chunk.worldX;
    const chunkTop = chunk.worldY;
    const chunkRight = chunkLeft + chunk.canvas.width;
    const chunkBottom = chunkTop + chunk.canvas.height;

    // Camera bounds in world space
    const camLeft = camera.x;
    const camTop = camera.y;
    const camRight = camera.x + camera.width;
    const camBottom = camera.y + camera.height;

    // Skip if chunk is entirely off-screen
    if (chunkRight <= camLeft || chunkLeft >= camRight ||
        chunkBottom <= camTop || chunkTop >= camBottom) continue;

    // Source rect (portion of chunk canvas to draw)
    const sx = Math.max(0, camLeft - chunkLeft);
    const sy = Math.max(0, camTop - chunkTop);
    const sx2 = Math.min(chunk.canvas.width, camRight - chunkLeft);
    const sy2 = Math.min(chunk.canvas.height, camBottom - chunkTop);
    const sw = sx2 - sx;
    const sh = sy2 - sy;

    // Dest rect (where on screen)
    const dx = Math.max(0, chunkLeft - camLeft);
    const dy = Math.max(0, chunkTop - camTop);

    if (sw > 0 && sh > 0) {
      ctx.drawImage(chunk.canvas,
        Math.floor(sx), Math.floor(sy), Math.floor(sw), Math.floor(sh),
        Math.floor(dx), Math.floor(dy), Math.floor(sw), Math.floor(sh));
    }
  }
}
