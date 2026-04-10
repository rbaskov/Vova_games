/**
 * minimap.js — Enhanced Open World Minimap
 * Shows biome-colored terrain at chunk granularity with fog of war,
 * structure icons, points of interest, and pulsing player indicator.
 */

import { CHUNK_W, CHUNK_H } from './worldgen.js';
import { TILE_SIZE } from './tilemap.js';

// ---------------------------------------------------------------------------
// Biome colors for minimap rendering
// ---------------------------------------------------------------------------

const BIOME_COLORS = {
  plains:     '#4a8a4a',
  forest:     '#2a5a2a',
  mountains:  '#7a7a7a',
  wasteland:  '#b08040',
  swamp:      '#3a4a2a',
  snow:       '#d0d8e8',
};

const UNVISITED_COLOR = '#222';

// Structure icon colors and sizes  { color, size }
const STRUCTURE_ICONS = {
  npc_village:    { color: '#ffffff', size: 4 },
  bandit_camp:    { color: '#ff3333', size: 3 },
  cave_entrance:  { color: '#444444', size: 3 },
  ruins:          { color: '#dddd33', size: 3 },
  witch_hut:      { color: '#aa44cc', size: 3 },
  fortress:       { color: '#f0c040', size: 4 },
};

// How many chunks to show in each direction from center (total = RADIUS*2+1)
const RADIUS = 3; // 7x7 grid
const GRID = RADIUS * 2 + 1; // 7

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a minimap renderer bound to a world generator.
 *
 * @param {object} worldGen - Instance returned by createWorldGen()
 * @returns {{ update, render }}
 */
export function createMinimapRenderer(worldGen) {
  // Offscreen canvas for cached terrain
  let terrainCanvas = null;
  let terrainCtx = null;
  let cachedCenterCX = null;
  let cachedCenterCY = null;
  let cachedW = 0;
  let cachedH = 0;

  /**
   * Regenerate the cached terrain canvas when the player enters a new chunk.
   *
   * @param {number} playerCX - Player's current chunk X
   * @param {number} playerCY - Player's current chunk Y
   * @param {Set<string>} visitedChunks - Set of "cx,cy" strings
   * @param {number} w - Minimap pixel width
   * @param {number} h - Minimap pixel height
   */
  function update(playerCX, playerCY, visitedChunks, w, h) {
    if (playerCX === cachedCenterCX && playerCY === cachedCenterCY &&
        w === cachedW && h === cachedH) {
      return;
    }

    cachedCenterCX = playerCX;
    cachedCenterCY = playerCY;
    cachedW = w;
    cachedH = h;

    if (!terrainCanvas) {
      terrainCanvas = document.createElement('canvas');
      terrainCtx = terrainCanvas.getContext('2d');
    }
    terrainCanvas.width = w;
    terrainCanvas.height = h;

    const cellW = w / GRID;
    const cellH = h / GRID;

    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        const cx = playerCX + dx;
        const cy = playerCY + dy;
        const key = `${cx},${cy}`;

        const gx = (dx + RADIUS) * cellW;
        const gy = (dy + RADIUS) * cellH;

        if (visitedChunks.has(key)) {
          // Get biome at chunk center tile
          const centerCol = cx * CHUNK_W + Math.floor(CHUNK_W / 2);
          const centerRow = cy * CHUNK_H + Math.floor(CHUNK_H / 2);
          const biome = worldGen.getBiomeAt(centerCol, centerRow);
          terrainCtx.fillStyle = BIOME_COLORS[biome] || UNVISITED_COLOR;
        } else {
          terrainCtx.fillStyle = UNVISITED_COLOR;
        }

        terrainCtx.fillRect(Math.floor(gx), Math.floor(gy),
                            Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  }

  /**
   * Force terrain regeneration (e.g. after loading visited chunks).
   */
  function invalidate() {
    cachedCenterCX = null;
    cachedCenterCY = null;
  }

  /**
   * Render the minimap onto the main canvas context.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Top-left X on canvas
   * @param {number} y - Top-left Y on canvas
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {object} player - Player object with x, y
   * @param {Array} enemies - Array of enemy objects
   * @param {object} chunkManager - Chunk manager with getChunk, pixelToChunk
   * @param {Set<string>} visitedChunks
   * @param {number} totalTime - Game total time for animation
   */
  function render(ctx, x, y, w, h, player, enemies, chunkManager, visitedChunks, totalTime) {
    if (!terrainCanvas || !chunkManager) return;

    const { cx: playerCX, cy: playerCY } = chunkManager.pixelToChunk(
      player.x + (player.hitW || 0) / 2,
      player.y + (player.hitH || 0) / 2
    );

    // Regenerate terrain if chunk changed
    update(playerCX, playerCY, visitedChunks, w, h);

    const cellW = w / GRID;
    const cellH = h / GRID;

    // Border
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

    // Draw cached terrain
    ctx.drawImage(terrainCanvas, x, y, w, h);

    // --- Structure icons on visited chunks ---
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        const cx = playerCX + dx;
        const cy = playerCY + dy;
        const key = `${cx},${cy}`;

        const cellX = x + (dx + RADIUS) * cellW;
        const cellY = y + (dy + RADIUS) * cellH;

        if (visitedChunks.has(key)) {
          // Check for structure
          const chunk = chunkManager.getChunk(cx, cy);
          if (chunk && chunk.structure) {
            const icon = STRUCTURE_ICONS[chunk.structure.id];
            if (icon) {
              const half = icon.size / 2;
              ctx.fillStyle = icon.color;
              ctx.fillRect(
                Math.floor(cellX + cellW / 2 - half),
                Math.floor(cellY + cellH / 2 - half),
                icon.size, icon.size
              );
            }
          }
        } else {
          // "?" on unvisited chunks adjacent to visited ones
          let adjacentToVisited = false;
          for (let ay = -1; ay <= 1; ay++) {
            for (let ax = -1; ax <= 1; ax++) {
              if (ax === 0 && ay === 0) continue;
              if (visitedChunks.has(`${cx + ax},${cy + ay}`)) {
                adjacentToVisited = true;
                break;
              }
            }
            if (adjacentToVisited) break;
          }

          if (adjacentToVisited) {
            ctx.fillStyle = '#ffff00';
            ctx.font = `${Math.max(7, Math.floor(cellH * 0.55))}px "Press Start 2P"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?',
              Math.floor(cellX + cellW / 2),
              Math.floor(cellY + cellH / 2)
            );
          }
        }
      }
    }

    // --- Enemy dots ---
    ctx.fillStyle = '#ff3333';
    for (const e of enemies) {
      if (!e.alive) continue;
      const { cx: ecx, cy: ecy } = chunkManager.pixelToChunk(e.x, e.y);
      const edx = ecx - playerCX;
      const edy = ecy - playerCY;
      if (Math.abs(edx) > RADIUS || Math.abs(edy) > RADIUS) continue;

      // Sub-chunk position within the cell
      const fracX = ((e.x / TILE_SIZE) % CHUNK_W + CHUNK_W) % CHUNK_W / CHUNK_W;
      const fracY = ((e.y / TILE_SIZE) % CHUNK_H + CHUNK_H) % CHUNK_H / CHUNK_H;

      const ex = x + (edx + RADIUS + fracX) * cellW;
      const ey = y + (edy + RADIUS + fracY) * cellH;

      ctx.fillRect(Math.floor(ex) - 1, Math.floor(ey) - 1, 2, 2);
    }

    // --- Player dot (pulsing cyan/white) ---
    const pulse = Math.floor(totalTime / 0.5) % 2 === 0;
    ctx.fillStyle = pulse ? '#00ffff' : '#ffffff';

    const pFracX = ((player.x / TILE_SIZE) % CHUNK_W + CHUNK_W) % CHUNK_W / CHUNK_W;
    const pFracY = ((player.y / TILE_SIZE) % CHUNK_H + CHUNK_H) % CHUNK_H / CHUNK_H;

    const px = x + (0 + RADIUS + pFracX) * cellW;  // dx=0 for player's own chunk
    const py = y + (0 + RADIUS + pFracY) * cellH;

    ctx.fillRect(Math.floor(px) - 2, Math.floor(py) - 2, 4, 4);

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  return { update, render, invalidate };
}
