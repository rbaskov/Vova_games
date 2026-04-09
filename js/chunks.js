/**
 * chunks.js — Chunk Manager
 * Manages a 3x3 grid of chunks around the player with caching,
 * cross-chunk tile lookups, and persistent change tracking.
 */

import { CHUNK_W, CHUNK_H } from './worldgen.js';
import { TILE_SIZE } from './tilemap.js';
import { tileDrawers } from './sprites.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * @param {object} worldGen - Instance returned by createWorldGen()
 * @returns {object} Chunk manager API
 */
export function createChunkManager(worldGen) {
  /** @type {Map<string, object>}  "cx,cy" → chunk data */
  const cache = new Map();

  /** @type {Map<string, HTMLCanvasElement>} "cx,cy" → offscreen canvas */
  const canvasCache = new Map();

  /** @type {Map<string, Array<{col,row,tile}>>} "cx,cy" → array of changes */
  const changes = new Map();

  let centerCX = null;
  let centerCY = null;

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function key(cx, cy) {
    return `${cx},${cy}`;
  }

  /**
   * Load a chunk into cache (if not already cached).
   * Applies any stored changes on top.
   */
  function loadChunk(cx, cy) {
    const k = key(cx, cy);
    if (cache.has(k)) return cache.get(k);

    const chunk = worldGen.generateChunk(cx, cy);

    // Apply persistent changes
    const chunkChanges = changes.get(k);
    if (chunkChanges) {
      for (const { col, row, tile } of chunkChanges) {
        if (chunk.tiles[row]) chunk.tiles[row][col] = tile;
      }
    }

    cache.set(k, chunk);
    return chunk;
  }

  /**
   * Pre-render a chunk to an offscreen canvas and cache it.
   * Returns the cached canvas if already rendered.
   */
  function getChunkCanvas(cx, cy) {
    const k = key(cx, cy);
    if (canvasCache.has(k)) return canvasCache.get(k);

    const chunk = loadChunk(cx, cy);
    const canvas = document.createElement('canvas');
    canvas.width  = CHUNK_W * TILE_SIZE;
    canvas.height = CHUNK_H * TILE_SIZE;
    const ctx = canvas.getContext('2d');

    for (let row = 0; row < CHUNK_H; row++) {
      for (let col = 0; col < CHUNK_W; col++) {
        const tileType = chunk.tiles[row][col];
        const drawFn = tileDrawers[tileType];
        if (drawFn) drawFn(ctx, col * TILE_SIZE, row * TILE_SIZE);
      }
    }

    canvasCache.set(k, canvas);
    return canvas;
  }

  /**
   * Unload chunks that are outside a 5x5 buffer around the current center.
   * This prevents thrashing when the player moves along chunk borders.
   */
  function evictDistantChunks(cx, cy) {
    for (const [k, _chunk] of cache) {
      const [kcx, kcy] = k.split(',').map(Number);
      if (Math.abs(kcx - cx) > 2 || Math.abs(kcy - cy) > 2) {
        cache.delete(k);
        canvasCache.delete(k);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Update which chunk the player is in.
   * Loads the 3x3 neighbourhood; evicts chunks outside the 5x5 buffer.
   *
   * @param {number} cx
   * @param {number} cy
   * @returns {boolean} true if the center actually changed
   */
  function updateCenter(cx, cy) {
    if (cx === centerCX && cy === centerCY) return false;

    centerCX = cx;
    centerCY = cy;

    // Pre-load the 3x3 neighbourhood
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        loadChunk(cx + dx, cy + dy);
      }
    }

    evictDistantChunks(cx, cy);
    return true;
  }

  /**
   * Convert world tile coordinates to chunk + local coordinates.
   * Handles negative values correctly.
   */
  function worldToChunkLocal(worldCol, worldRow) {
    const cx = Math.floor(worldCol / CHUNK_W);
    const cy = Math.floor(worldRow / CHUNK_H);
    const localCol = ((worldCol % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const localRow = ((worldRow % CHUNK_H) + CHUNK_H) % CHUNK_H;
    return { cx, cy, localCol, localRow };
  }

  /**
   * Get tile ID at world tile coordinates.
   * Loads the chunk on demand if needed.
   *
   * @param {number} worldCol
   * @param {number} worldRow
   * @returns {number} tile ID, or -1 on error
   */
  function getTileAtWorld(worldCol, worldRow) {
    const { cx, cy, localCol, localRow } = worldToChunkLocal(worldCol, worldRow);
    const chunk = loadChunk(cx, cy);
    if (!chunk || !chunk.tiles[localRow]) return -1;
    return chunk.tiles[localRow][localCol];
  }

  /**
   * Get biome string at world tile coordinates.
   *
   * @param {number} worldCol
   * @param {number} worldRow
   * @returns {string} biome name, or '' on error
   */
  function getBiomeAtWorld(worldCol, worldRow) {
    const { cx, cy, localCol, localRow } = worldToChunkLocal(worldCol, worldRow);
    const chunk = loadChunk(cx, cy);
    if (!chunk || !chunk.biomeMap[localRow]) return '';
    return chunk.biomeMap[localRow][localCol];
  }

  /**
   * Returns array of 9 chunk descriptors for the renderer.
   * Each entry: { cx, cy, canvas, worldX, worldY }
   *
   * @returns {Array<{cx,cy,canvas:HTMLCanvasElement,worldX:number,worldY:number}>}
   */
  function getLoadedChunks() {
    if (centerCX === null) return [];
    const result = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = centerCX + dx;
        const cy = centerCY + dy;
        const canvas = getChunkCanvas(cx, cy);
        result.push({
          cx,
          cy,
          canvas,
          worldX: cx * CHUNK_W * TILE_SIZE,
          worldY: cy * CHUNK_H * TILE_SIZE,
        });
      }
    }
    return result;
  }

  /**
   * Convert a pixel position to chunk coordinates.
   *
   * @param {number} px - Pixel X
   * @param {number} py - Pixel Y
   * @returns {{cx:number, cy:number}}
   */
  function pixelToChunk(px, py) {
    return {
      cx: Math.floor(px / (CHUNK_W * TILE_SIZE)),
      cy: Math.floor(py / (CHUNK_H * TILE_SIZE)),
    };
  }

  /**
   * Record a persistent tile change (e.g., opened chest).
   * Updates the live chunk if loaded, then invalidates its canvas cache.
   *
   * @param {number} worldCol
   * @param {number} worldRow
   * @param {number} tile
   */
  function recordChange(worldCol, worldRow, tile) {
    const { cx, cy, localCol, localRow } = worldToChunkLocal(worldCol, worldRow);
    const k = key(cx, cy);

    // Persist the change
    if (!changes.has(k)) changes.set(k, []);
    const chunkChanges = changes.get(k);

    // Replace existing change for same cell, or push new entry
    const existing = chunkChanges.findIndex(c => c.col === localCol && c.row === localRow);
    if (existing !== -1) {
      chunkChanges[existing].tile = tile;
    } else {
      chunkChanges.push({ col: localCol, row: localRow, tile });
    }

    // Update live chunk if loaded
    const chunk = cache.get(k);
    if (chunk && chunk.tiles[localRow]) {
      chunk.tiles[localRow][localCol] = tile;
    }

    // Invalidate canvas so it gets re-rendered on next getLoadedChunks()
    canvasCache.delete(k);
  }

  /**
   * Serialize all recorded changes to a plain object (for saving).
   *
   * @returns {object}
   */
  function serializeChanges() {
    const obj = {};
    for (const [k, arr] of changes) {
      obj[k] = arr.slice(); // shallow copy of each change array
    }
    return obj;
  }

  /**
   * Restore changes from saved data and clear all caches so
   * chunks will be regenerated with changes applied.
   *
   * @param {object} obj - Plain object returned by serializeChanges()
   */
  function loadChanges(obj) {
    changes.clear();
    for (const k of Object.keys(obj)) {
      changes.set(k, obj[k].slice());
    }
    // Clear caches so all chunks are re-generated with changes applied
    cache.clear();
    canvasCache.clear();
  }

  // ---------------------------------------------------------------------------
  // Expose public interface
  // ---------------------------------------------------------------------------

  return {
    updateCenter,
    getTileAtWorld,
    getBiomeAtWorld,
    getLoadedChunks,
    pixelToChunk,
    recordChange,
    serializeChanges,
    loadChanges,
    // expose internal state for debugging / testing
    get cache()       { return cache; },
    get canvasCache() { return canvasCache; },
    get changes()     { return changes; },
    get centerCX()    { return centerCX; },
    get centerCY()    { return centerCY; },
  };
}
