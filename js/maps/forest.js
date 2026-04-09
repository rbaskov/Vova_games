import { TILE } from '../sprites.js';

const G = TILE.GRASS;
const D = TILE.DIRT;
const T = TILE.TREE;
const P = TILE.PORTAL;
const C = TILE.CHECKPOINT;

// 30x20 forest map — Scattered trees with dirt path through center
const tiles = [
  // Row 0 — top border (portal back to village at col 14)
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,P,D,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
  // Row 1 — entrance from village
  [T,G,G,G,T,G,G,G,G,T,G,G,G,G,D,D,G,G,G,G,T,G,G,G,G,T,G,G,G,T],
  // Row 2 — checkpoint
  [T,G,G,G,G,G,T,G,G,G,G,G,G,C,D,D,G,G,G,G,G,G,G,T,G,G,G,G,G,T],
  // Row 3
  [T,G,T,G,G,G,G,G,G,G,T,G,G,G,D,D,G,G,T,G,G,G,G,G,G,G,T,G,G,T],
  // Row 4
  [T,G,G,G,G,T,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,T,G,G,G,G,G,G,G,T],
  // Row 5
  [T,G,G,G,G,G,G,G,T,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,T,G,G,G,G,T],
  // Row 6
  [T,T,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,T,G,T],
  // Row 7
  [T,G,G,G,T,G,G,G,G,G,G,G,G,G,D,D,G,G,T,G,G,G,G,G,G,G,G,G,G,T],
  // Row 8
  [T,G,G,G,G,G,G,G,G,T,G,G,G,G,D,D,G,G,G,G,G,G,T,G,G,G,G,G,G,T],
  // Row 9 — horizontal path crossing
  [T,G,G,T,G,G,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,G,G,T,G,G,T],
  // Row 10
  [T,G,G,G,G,G,G,G,G,G,G,T,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 11
  [T,G,T,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,T,G,G,G,G,G,G,T,G,T],
  // Row 12
  [T,G,G,G,G,G,G,T,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,T,G,G,G,G,T],
  // Row 13
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,T,G,G,G,G,G,G,G,G,G,T],
  // Row 14 — boss area
  [T,G,G,G,T,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,T,G,G,T],
  // Row 15
  [T,G,G,G,G,G,G,G,G,G,T,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 16
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,T,G,G,G,G,T,G,G,G,G,G,T],
  // Row 17
  [T,G,G,G,G,G,T,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 18 — exit portal row
  [T,G,G,G,G,G,G,G,G,T,G,G,G,G,D,D,P,G,G,G,T,G,G,G,G,G,G,G,G,T],
  // Row 19 — bottom border
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

export const forestMap = {
  name: 'Тёмный лес',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 1 },
  portals: [
    { col: 14, row: 0, target: 'village', spawnX: 14, spawnY: 17 },
    { col: 16, row: 18, target: 'canyon', spawnX: 15, spawnY: 1 },
  ],
  npcs: [],
  spawns: [
    // Slimes
    { type: 'slime', col: 4, row: 5 },
    { type: 'slime', col: 22, row: 3 },
    { type: 'slime', col: 8, row: 12 },
    { type: 'slime', col: 25, row: 15 },
    // Wolves
    { type: 'wolf', col: 10, row: 7 },
    { type: 'wolf', col: 20, row: 11 },
    { type: 'wolf', col: 6, row: 16 },
    // Bandits
    { type: 'bandit_sword', col: 24, row: 8 },
  ],
  boss: { type: 'forest_guardian', col: 14, row: 14 },
};
