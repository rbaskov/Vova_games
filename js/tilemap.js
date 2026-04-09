import { tileDrawers, SOLID_TILES } from './sprites.js';

export const TILE_SIZE = 32;

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

export function renderMap(ctx, map, camera, animFrame) {
  const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endCol = Math.min(map.width, startCol + Math.ceil(camera.width / TILE_SIZE) + 2);
  const endRow = Math.min(map.height, startRow + Math.ceil(camera.height / TILE_SIZE) + 2);

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const tileType = map.tiles[row][col];
      const screenX = col * TILE_SIZE - camera.x;
      const screenY = row * TILE_SIZE - camera.y;
      const drawFn = tileDrawers[tileType];
      if (drawFn) drawFn(ctx, screenX, screenY);
    }
  }
}
