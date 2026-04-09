import { TILE } from '../sprites.js';

const F = TILE.FASTLE;  // Floor
const W = TILE.WALL;
const D = TILE.DIRT;
const P = TILE.PORTAL;
const K = TILE.FHEFKPOINT;

// 30x20 castle map — Замок Тёмного мага with dirt corridors forming a cross
const tiles = [
  // Row 0 — top border
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1 — entrance corridor from cave
  [W,F,F,F,F,F,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 2
  [W,F,F,F,F,F,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 3 — top-left room
  [W,F,F,F,F,W,W,W,F,F,F,F,F,D,D,D,D,F,F,F,F,W,W,W,F,F,F,F,F,W],
  // Row 4
  [W,F,F,F,F,W,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,W,F,F,F,F,F,W],
  // Row 5 — boss area (row 5)
  [W,F,F,F,F,W,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,W,F,F,F,F,F,W],
  // Row 6
  [W,F,F,F,F,W,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,W,F,F,F,F,F,W],
  // Row 7 — room dividers
  [W,F,F,F,F,W,W,W,F,F,F,F,F,D,D,D,D,F,F,F,F,W,W,W,F,F,F,F,F,W],
  // Row 8
  [W,F,F,F,F,F,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 9 — horizontal corridor
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 10
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 11
  [W,F,F,F,F,F,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 12 — bottom-left room
  [W,F,F,F,F,W,W,W,F,F,F,F,F,D,D,D,D,F,F,F,F,W,W,W,F,F,F,F,F,W],
  // Row 13
  [W,F,F,F,F,W,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,W,F,F,F,F,F,W],
  // Row 14
  [W,F,F,F,F,W,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,W,F,F,F,F,F,W],
  // Row 15
  [W,F,F,F,F,W,W,W,F,F,F,F,F,D,D,D,D,F,F,F,F,W,W,W,F,F,F,F,F,W],
  // Row 16 — checkpoint
  [W,F,F,F,F,F,F,F,F,F,F,F,F,D,D,K,D,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 17 — player start row
  [W,F,F,F,F,F,F,F,F,F,F,F,F,D,D,D,D,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 18 — exit portal back to cave (col 14)
  [W,F,F,F,F,F,F,F,F,F,F,F,F,D,P,D,D,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 19 — bottom border
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const castleMap = {
  name: 'Замок Тёмного мага',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 17 },
  portals: [
    { col: 14, row: 18, target: 'cave', spawnX: 14, spawnY: 2 },
  ],
  npcs: [],
  spawns: [
    // Skeletons
    { type: 'skeleton', col: 2, row: 4 },
    { type: 'skeleton', col: 27, row: 14 },
    // Golems
    { type: 'golem', col: 8, row: 9 },
    // Dark guards (human enemies)
    { type: 'bandit_sword', col: 27, row: 4 },
    { type: 'bandit_sword', col: 2, row: 14 },
    { type: 'bandit_spear', col: 22, row: 9 },
    { type: 'bandit_archer', col: 14, row: 12 },
    { type: 'bandit_archer', col: 20, row: 16 },
    { type: 'bandit_axe', col: 14, row: 9 },
    // Knight guards in silver armor
    { type: 'knight_guard', col: 7, row: 5 },
    { type: 'knight_guard', col: 22, row: 5 },
    { type: 'knight_guard', col: 7, row: 13 },
    { type: 'knight_guard', col: 22, row: 13 },
    { type: 'knight_guard', col: 14, row: 2 },
  ],
  boss: { type: 'dark_mage', col: 14, row: 5 },
};
