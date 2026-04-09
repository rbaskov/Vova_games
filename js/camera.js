import { TILE_SIZE } from './tilemap.js';

export function createCamera(width, height) {
  return { x: 0, y: 0, width, height };
}

export function updateCamera(camera, targetX, targetY, mapWidth, mapHeight) {
  camera.x = targetX - camera.width / 2;
  camera.y = targetY - camera.height / 2;
  const maxX = mapWidth * TILE_SIZE - camera.width;
  const maxY = mapHeight * TILE_SIZE - camera.height;
  camera.x = Math.max(0, Math.min(camera.x, maxX));
  camera.y = Math.max(0, Math.min(camera.y, maxY));
}
