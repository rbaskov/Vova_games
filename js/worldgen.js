/**
 * worldgen.js — Procedural World Generation
 * Uses Simplex noise to determine biomes and tile placement for an open world.
 */

import { createNoise } from './simplex.js';
import { TILE } from './sprites.js';
import { getStructureForChunk, applyStructure, computeBossLairPositions } from './structures.js';

// ---------------------------------------------------------------------------
// Chunk dimensions
// ---------------------------------------------------------------------------

export const CHUNK_W = 30; // tiles per chunk width
export const CHUNK_H = 20; // tiles per chunk height

// ---------------------------------------------------------------------------
// Biome identifiers
// ---------------------------------------------------------------------------

export const BIOME = {
  PLAINS:     'plains',
  FOREST:     'forest',
  MOUNTAINS:  'mountains',
  WASTELAND:  'wasteland',
  SWAMP:      'swamp',
  SNOW:       'snow',
};

// ---------------------------------------------------------------------------
// Per-biome tile palette
// ---------------------------------------------------------------------------

const BIOME_PALETTE = {
  [BIOME.PLAINS]:    { base: TILE.GRASS,  path: TILE.DIRT, obstacle: TILE.TREE,      water: TILE.WATER       },
  [BIOME.FOREST]:    { base: TILE.GRASS,  path: TILE.DIRT, obstacle: TILE.TREE,      water: TILE.WATER       },
  [BIOME.MOUNTAINS]: { base: TILE.DIRT,   path: TILE.DIRT, obstacle: TILE.ROCK,      water: TILE.WATER       },
  [BIOME.WASTELAND]: { base: TILE.SAND,   path: TILE.DIRT, obstacle: TILE.DEAD_TREE, water: TILE.LAVA        },
  [BIOME.SWAMP]:     { base: TILE.MUD,    path: TILE.DIRT, obstacle: TILE.DEAD_TREE, water: TILE.SWAMP_WATER },
  [BIOME.SNOW]:      { base: TILE.SNOW,   path: TILE.DIRT, obstacle: TILE.SNOW_TREE, water: TILE.ICE         },
};

// ---------------------------------------------------------------------------
// Per-biome obstacle density
// ---------------------------------------------------------------------------

const OBSTACLE_DENSITY = {
  [BIOME.PLAINS]:    0.03,
  [BIOME.FOREST]:    0.18,
  [BIOME.MOUNTAINS]: 0.12,
  [BIOME.WASTELAND]: 0.05,
  [BIOME.SWAMP]:     0.08,
  [BIOME.SNOW]:      0.06,
};

// ---------------------------------------------------------------------------
// Per-biome enemy pool
// ---------------------------------------------------------------------------

const BIOME_ENEMIES = {
  [BIOME.PLAINS]:    ['slime', 'wolf'],
  [BIOME.FOREST]:    ['wolf', 'bandit_sword', 'bandit_archer'],
  [BIOME.MOUNTAINS]: ['skeleton', 'golem'],
  [BIOME.WASTELAND]: ['skeleton', 'bandit_spear', 'bandit_axe'],
  [BIOME.SWAMP]:     ['slime', 'slime'],
  [BIOME.SNOW]:      ['golem', 'skeleton'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determine biome from height and moisture noise values */
function biomeFromNoise(height, moisture) {
  if (height > 0.5) {
    if (moisture > 0.3)  return BIOME.SNOW;
    if (moisture > -0.2) return BIOME.WASTELAND;
    return BIOME.MOUNTAINS;
  }
  if (height > 0.0) {
    if (moisture > 0.3)  return BIOME.FOREST;
    if (moisture > -0.3) return BIOME.WASTELAND;
    return BIOME.MOUNTAINS;
  }
  // height <= 0
  if (moisture > 0.5)  return BIOME.SWAMP;
  if (moisture > 0.1)  return BIOME.FOREST;
  return BIOME.PLAINS;
}

/** Distance-based difficulty tier */
function difficultyTier(cx, cy) {
  const dist = Math.sqrt(cx * cx + cy * cy);
  if (dist < 3)  return 1;
  if (dist < 6)  return 1.5;
  if (dist < 9)  return 2;
  if (dist < 13) return 3;
  return 5;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

/**
 * Create a world generator bound to a given seed.
 *
 * @param {number} seed - Integer seed for deterministic generation
 * @returns {{ seed: number, getBiomeAt: Function, generateChunk: Function }}
 */
export function createWorldGen(seed) {
  const heightNoise   = createNoise(seed);
  const moistureNoise = createNoise(seed + 31337);
  const detailNoise   = createNoise(seed + 77777);
  const spawnNoise    = createNoise(seed + 99991);
  const structNoise   = createNoise(seed + 55555);

  /**
   * Return the biome at a world tile coordinate.
   * @param {number} worldCol
   * @param {number} worldRow
   * @returns {string} BIOME constant
   */
  function getBiomeAt(worldCol, worldRow) {
    const height   = heightNoise(worldCol * 0.03, worldRow * 0.03);
    const moisture = moistureNoise(worldCol * 0.04, worldRow * 0.04);
    return biomeFromNoise(height, moisture);
  }

  // Compute boss lair positions once (deterministic from seed)
  const bossLairMap = computeBossLairPositions(getBiomeAt, seed);

  /**
   * Generate a chunk at chunk coordinates (cx, cy).
   *
   * @param {number} cx - Chunk column index
   * @param {number} cy - Chunk row index
   * @returns {{ cx, cy, tiles: number[][], biomeMap: string[][], spawns: object[], width: number, height: number }}
   */
  function generateChunk(cx, cy) {
    const tiles    = [];
    const biomeMap = [];
    const spawns   = [];
    const tier     = difficultyTier(cx, cy);

    for (let row = 0; row < CHUNK_H; row++) {
      tiles[row]    = [];
      biomeMap[row] = [];

      for (let col = 0; col < CHUNK_W; col++) {
        const worldCol = cx * CHUNK_W + col;
        const worldRow = cy * CHUNK_H + row;

        const biome   = getBiomeAt(worldCol, worldRow);
        biomeMap[row][col] = biome;

        const palette        = BIOME_PALETTE[biome];
        const obstacleChance = OBSTACLE_DENSITY[biome];

        const detail  = detailNoise(worldCol * 0.15, worldRow * 0.15);
        const detail2 = detailNoise(worldCol * 0.08, worldRow * 0.08);

        let tile;
        if (detail < -0.6) {
          tile = palette.water;
        } else if (detail > (1 - obstacleChance * 10)) {
          tile = palette.obstacle;
        } else if (Math.abs(detail2) < 0.05) {
          tile = palette.path;
        } else {
          tile = palette.base;
        }

        tiles[row][col] = tile;

        // ---- Enemy spawns ------------------------------------------------
        // Only interior tiles (skip border rows/cols), only walkable base tiles
        const isBorder = row === 0 || row === CHUNK_H - 1 || col === 0 || col === CHUNK_W - 1;
        if (!isBorder && tile === palette.base) {
          const spawnVal = spawnNoise(worldCol * 0.5, worldRow * 0.5);
          if (spawnVal > 0.85) {
            const enemyPool = BIOME_ENEMIES[biome];
            const enemyType = enemyPool[Math.floor(Math.abs(spawnVal * 1000)) % enemyPool.length];
            spawns.push({
              col,
              row,
              worldCol,
              worldRow,
              type: enemyType,
              biome,
              tier,
            });
          }
        }
      }
    }

    // ----- Structure placement -----------------------------------------------
    // Sample structure noise at chunk center (low frequency for sparse placement)
    const centerWorldCol = cx * CHUNK_W + Math.floor(CHUNK_W / 2);
    const centerWorldRow = cy * CHUNK_H + Math.floor(CHUNK_H / 2);
    const sNoise = structNoise(cx * 1.7, cy * 1.7);
    const dominantBiome = getBiomeAt(centerWorldCol, centerWorldRow);

    const structureResult = getStructureForChunk(cx, cy, dominantBiome, sNoise, bossLairMap);
    let structure = null;

    if (structureResult) {
      const { template, col: sCol, row: sRow } = structureResult;

      // Apply structure tiles onto the chunk
      applyStructure(structureResult, tiles, sCol, sRow);

      // Remove any terrain spawns that overlap the structure footprint
      for (let i = spawns.length - 1; i >= 0; i--) {
        const s = spawns[i];
        if (s.col >= sCol && s.col < sCol + template.width &&
            s.row >= sRow && s.row < sRow + template.height) {
          spawns.splice(i, 1);
        }
      }

      // Build structure info with world coordinates
      const structNpcs = template.npcs.map(n => ({
        ...n,
        col: cx * CHUNK_W + sCol + n.localCol,
        row: cy * CHUNK_H + sRow + n.localRow,
      }));

      const structChests = template.chests.map(c => ({
        localCol: c.localCol,
        localRow: c.localRow,
        col: cx * CHUNK_W + sCol + c.localCol,
        row: cy * CHUNK_H + sRow + c.localRow,
      }));

      const structSpawns = template.spawns.map(s => ({
        type: s.type,
        isBoss: s.isBoss || false,
        col: sCol + s.localCol,
        row: sRow + s.localRow,
        worldCol: cx * CHUNK_W + sCol + s.localCol,
        worldRow: cy * CHUNK_H + sRow + s.localRow,
        biome: dominantBiome,
        tier,
      }));

      structure = {
        id: template.id,
        name: template.name,
        col: sCol,
        row: sRow,
        width: template.width,
        height: template.height,
        npcs: structNpcs,
        chests: structChests,
        spawns: structSpawns,
        hasCheckpoint: template.hasCheckpoint || false,
        hasBuffStone: template.hasBuffStone || false,
        buffStoneCol: template.buffStoneCol !== undefined ? cx * CHUNK_W + sCol + template.buffStoneCol : null,
        buffStoneRow: template.buffStoneRow !== undefined ? cy * CHUNK_H + sRow + template.buffStoneRow : null,
        bossType: template.bossType || null,
        isVillagePortal: template.id === 'village_portal',
      };
    }

    return {
      cx,
      cy,
      tiles,
      biomeMap,
      spawns,
      width:  CHUNK_W,
      height: CHUNK_H,
      structure,
    };
  }

  return {
    seed,
    getBiomeAt,
    generateChunk,
    bossLairMap,
  };
}
