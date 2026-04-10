/**
 * structures.js — Structure Templates & Placement Logic
 * Defines pre-designed tile templates that overlay onto procedurally generated chunks.
 * Structures contain NPCs, chests, enemies, and special tiles.
 */

import { TILE } from './sprites.js';
import { CHUNK_W, CHUNK_H } from './worldgen.js';

// ---------------------------------------------------------------------------
// Shorthand aliases
// ---------------------------------------------------------------------------

const _ = null;  // keep original terrain
const W = TILE.WALL;
const D = TILE.DIRT;
const DR = TILE.DOOR;
const CP = TILE.CHECKPOINT;
const P = TILE.PORTAL;
const L = TILE.LAVA;
const C = TILE.CARPET;
const SW = TILE.SWAMP_WATER;

// ---------------------------------------------------------------------------
// Structure Templates
// ---------------------------------------------------------------------------

export const STRUCTURE_TEMPLATES = {

  // =========================================================================
  // 1. NPC Village (8x6) — plains
  // Layout: 2 small buildings (3x2 each) with dirt paths, checkpoint center
  // =========================================================================
  npc_village: {
    id: 'npc_village',
    name: 'Деревня',
    width: 8,
    height: 6,
    biomes: ['plains'],
    rarity: 0.15,
    tiles: [
      // Row 0: top walls of left building + dirt + top walls of right building
      [W, W, W, D, D, W, W, W],
      // Row 1: left building interior + dirt + right building interior
      [W, D, W, D, D, W, D, W],
      // Row 2: bottom of buildings + dirt path
      [W, DR, W, D, D, W, DR, W],
      // Row 3: dirt path
      [D, D, D, D, D, D, D, D],
      // Row 4: checkpoint center + more dirt
      [D, D, D, CP, D, D, D, D],
      // Row 5: bottom edge dirt
      [D, D, D, D, D, D, D, D],
    ],
    npcs: [
      {
        id: 'wandering_merchant',
        localCol: 1,
        localRow: 5,
        name: 'Торговец',
        bodyColor: '#2e7d32',
        headDetail: '#a5d6a7',
      },
      {
        id: 'healer',
        localCol: 6,
        localRow: 5,
        name: 'Целитель',
        bodyColor: '#1565c0',
        headDetail: '#90caf9',
      },
    ],
    spawns: [],
    chests: [],
    hasCheckpoint: true,
  },

  // =========================================================================
  // 2. Bandit Camp (6x6) — forest, wasteland
  // L-shaped wall perimeter, campfire (LAVA) in center, bandits
  // =========================================================================
  bandit_camp: {
    id: 'bandit_camp',
    name: 'Лагерь бандитов',
    width: 6,
    height: 6,
    biomes: ['forest', 'wasteland'],
    rarity: 0.12,
    tiles: [
      // Row 0: top wall L-shape
      [W, W, W, W, W, W],
      // Row 1: left wall
      [W, D, D, D, D, _],
      // Row 2: left wall + campfire center
      [W, D, D, L, D, _],
      // Row 3: left wall
      [W, D, D, D, D, _],
      // Row 4: bottom of L-shape
      [W, D, D, D, D, _],
      // Row 5: open bottom
      [_, _, _, _, _, _],
    ],
    npcs: [],
    spawns: [
      { type: 'bandit_sword', localCol: 1, localRow: 1 },
      { type: 'bandit_archer', localCol: 4, localRow: 1 },
      { type: 'bandit_sword', localCol: 4, localRow: 4 },
      { type: 'bandit_spear', localCol: 1, localRow: 4 },
    ],
    chests: [
      { localCol: 3, localRow: 1 },
    ],
    hasCheckpoint: false,
  },

  // =========================================================================
  // 3. Cave Entrance (3x3) — mountains
  // Rock border, portal in center
  // =========================================================================
  cave_entrance: {
    id: 'cave_entrance',
    name: 'Вход в пещеру',
    width: 3,
    height: 3,
    biomes: ['mountains'],
    rarity: 0.08,
    tiles: [
      [W, W, W],
      [W, P, W],
      [W, DR, W],
    ],
    npcs: [],
    spawns: [],
    chests: [],
    hasCheckpoint: false,
  },

  // =========================================================================
  // 4. Ruins (8x8) — wasteland
  // Broken walls pattern, 2 chests at opposite corners, buff stone center
  // =========================================================================
  ruins: {
    id: 'ruins',
    name: 'Руины',
    width: 8,
    height: 8,
    biomes: ['wasteland'],
    rarity: 0.10,
    tiles: [
      // Broken walls pattern — gaps in perimeter
      [W, W, _, W, W, _, W, W],
      [W, D, D, D, D, D, D, W],
      [_, D, D, D, D, D, D, _],
      [W, D, D, D, D, D, D, W],
      [W, D, D, D, D, D, D, _],
      [_, D, D, D, D, D, D, W],
      [W, D, D, D, D, D, D, W],
      [W, _, W, W, _, W, _, W],
    ],
    npcs: [],
    spawns: [
      { type: 'skeleton', localCol: 2, localRow: 2 },
      { type: 'golem', localCol: 5, localRow: 2 },
      { type: 'skeleton', localCol: 2, localRow: 5 },
      { type: 'skeleton', localCol: 5, localRow: 5 },
    ],
    chests: [
      { localCol: 1, localRow: 1 },
      { localCol: 6, localRow: 6 },
    ],
    hasCheckpoint: false,
    hasBuffStone: true,
    buffStoneCol: 3,
    buffStoneRow: 3,
  },

  // =========================================================================
  // 5. Witch Hut (4x4) — swamp
  // Small building with door on south, swamp water moat on 2 sides
  // =========================================================================
  witch_hut: {
    id: 'witch_hut',
    name: 'Хижина ведьмы',
    width: 4,
    height: 4,
    biomes: ['swamp'],
    rarity: 0.10,
    tiles: [
      [SW, W, W, SW],
      [SW, D, D, W],
      [SW, D, D, W],
      [_, _, DR, _],
    ],
    npcs: [
      {
        id: 'witch',
        localCol: 1,
        localRow: 2,
        name: 'Ведьма',
        bodyColor: '#6a1b9a',
        headDetail: '#ce93d8',
      },
    ],
    spawns: [],
    chests: [],
    hasCheckpoint: false,
  },

  // =========================================================================
  // 6. Fortress (10x10) — snow
  // Walled compound, gate on south, carpet courtyard, 2 chests, mini-boss
  // =========================================================================
  fortress: {
    id: 'fortress',
    name: 'Крепость',
    width: 10,
    height: 10,
    biomes: ['snow'],
    rarity: 0.07,
    tiles: [
      // Row 0
      [W, W, W, W, W, W, W, W, W, W],
      // Row 1
      [W, C, C, C, C, C, C, C, C, W],
      // Row 2
      [W, C, D, D, D, D, D, D, C, W],
      // Row 3
      [W, C, D, C, C, C, C, D, C, W],
      // Row 4
      [W, C, D, C, C, C, C, D, C, W],
      // Row 5
      [W, C, D, C, C, C, C, D, C, W],
      // Row 6
      [W, C, D, D, D, D, D, D, C, W],
      // Row 7
      [W, C, C, C, C, C, C, C, C, W],
      // Row 8
      [W, W, W, W, DR, DR, W, W, W, W],
      // Row 9: outside, open
      [_, _, _, _, D, D, _, _, _, _],
    ],
    npcs: [],
    spawns: [
      { type: 'golem', localCol: 4, localRow: 4, isBoss: true },
      { type: 'skeleton', localCol: 2, localRow: 2 },
      { type: 'skeleton', localCol: 7, localRow: 2 },
    ],
    chests: [
      { localCol: 1, localRow: 1 },
      { localCol: 8, localRow: 1 },
    ],
    hasCheckpoint: false,
  },
};

// ---------------------------------------------------------------------------
// Placement Logic
// ---------------------------------------------------------------------------

/**
 * Determine if a chunk should have a structure and which one.
 *
 * @param {number} cx - Chunk X index
 * @param {number} cy - Chunk Y index
 * @param {string} dominantBiome - Biome at chunk center
 * @param {number} structNoise - Noise value sampled at chunk center (range roughly -1..1)
 * @returns {{ template: object, col: number, row: number } | null}
 */
export function getStructureForChunk(cx, cy, dominantBiome, structNoise) {
  // Skip spawn chunk
  if (cx === 0 && cy === 0) return null;

  // Normalize noise to 0..1 range
  const noiseVal = (structNoise + 1) / 2;

  // Find matching structures for this biome, sorted by rarity (rarest first)
  const candidates = Object.values(STRUCTURE_TEMPLATES)
    .filter(t => t.biomes.includes(dominantBiome));

  if (candidates.length === 0) return null;

  // Sort rarest first so rare structures get priority when noise is high
  candidates.sort((a, b) => a.rarity - b.rarity);

  for (const template of candidates) {
    if (noiseVal > (1 - template.rarity)) {
      // Center the structure in the chunk
      const col = Math.floor((CHUNK_W - template.width) / 2);
      const row = Math.floor((CHUNK_H - template.height) / 2);
      return { template, col, row };
    }
  }

  return null;
}

/**
 * Apply structure tiles to a chunk's tile array.
 * Null tiles in the template preserve the original terrain.
 *
 * @param {{ template: object, col: number, row: number }} structure
 * @param {number[][]} tiles - The chunk tile array (mutated in place)
 * @param {number} startCol - Starting column in chunk
 * @param {number} startRow - Starting row in chunk
 */
export function applyStructure(structure, tiles, startCol, startRow) {
  const { template } = structure;

  for (let r = 0; r < template.height; r++) {
    for (let c = 0; c < template.width; c++) {
      const tileVal = template.tiles[r][c];
      if (tileVal !== null) {
        const targetRow = startRow + r;
        const targetCol = startCol + c;
        if (tiles[targetRow] && targetCol >= 0 && targetCol < CHUNK_W) {
          tiles[targetRow][targetCol] = tileVal;
        }
      }
    }
  }
}
