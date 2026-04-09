import { TILE } from '../sprites.js';

const D = TILE.DIRT;
const W = TILE.WALL;
const L = TILE.LAVA;
const P = TILE.PORTAL;
const C = TILE.CHECKPOINT;

// 30x20 canyon map — Огненное ущелье with lava pools and wall pillars
const tiles = [
  // Row 0 — top border
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1 — entrance from forest (portal at col 14)
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,P,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 2 — checkpoint
  [W,D,D,D,D,D,D,D,D,D,D,D,D,C,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 3 — lava pool left, wall pillar right
  [W,D,D,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,W],
  // Row 4
  [W,D,D,L,L,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,W],
  // Row 5
  [W,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 6 — lava pool center-right
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,L,D,D,D,D,D,D,D,D,W],
  // Row 7
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,L,D,D,D,D,D,D,D,D,W],
  // Row 8 — wall pillar left
  [W,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 9
  [W,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,D,D,W],
  // Row 10 — lava pool bottom-right
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,D,D,W],
  // Row 11
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 12 — lava pool center-left, wall pillar
  [W,D,D,D,D,D,D,D,L,L,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,W],
  // Row 13
  [W,D,D,D,D,D,D,D,L,L,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,W],
  // Row 14 — boss area
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 15 — lava border around boss
  [W,D,D,D,D,D,D,D,D,D,L,L,D,D,D,D,D,L,L,D,D,D,D,D,D,D,D,D,D,W],
  // Row 16
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 17
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 18 — exit portal to cave (col 14)
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,P,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 19 — bottom border
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const canyonMap = {
  name: 'Огненное ущелье',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 1 },
  portals: [
    { col: 14, row: 1, target: 'forest', spawnX: 14, spawnY: 17 },
    { col: 14, row: 18, target: 'cave', spawnX: 15, spawnY: 1 },
  ],
  npcs: [],
  spawns: [
    // Slimes
    { type: 'slime', col: 3, row: 6 },
    { type: 'slime', col: 24, row: 11 },
    // Skeletons
    { type: 'skeleton', col: 7, row: 3 },
    { type: 'skeleton', col: 22, row: 8 },
    { type: 'skeleton', col: 12, row: 16 },
    // Wolf
    { type: 'wolf', col: 16, row: 10 },
    // Bandits
    { type: 'bandit_sword', col: 20, row: 5 },
    { type: 'bandit_archer', col: 8, row: 13 },
    { type: 'bandit_axe', col: 14, row: 8 },
  ],
  boss: { type: 'fire_dragon', col: 14, row: 14 },
};
