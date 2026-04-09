import { TILE } from '../sprites.js';

const I = TILE.ICE;
const W = TILE.WALL;
const A = TILE.WATER;
const P = TILE.PORTAL;
const C = TILE.CHECKPOINT;

// 30x20 cave map — Ледяная пещера with ice floor and water pools
const tiles = [
  // Row 0 — top border
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1 — entrance from canyon (portal at col 14)
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,P,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 2 — checkpoint
  [W,I,I,I,I,I,I,I,I,I,I,I,I,C,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 3 — water pool top-left corner
  [W,I,A,A,A,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 4
  [W,I,A,A,A,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,A,A,A,I,I,W],
  // Row 5 — water pool top-right corner
  [W,I,I,I,I,I,I,I,I,W,W,I,I,I,I,I,I,I,I,I,I,I,I,I,A,A,A,I,I,W],
  // Row 6
  [W,I,I,I,I,I,I,I,I,W,W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 7 — wall pillar center
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W,W,I,I,I,I,I,I,I,I,I,W],
  // Row 8
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W,W,I,I,I,I,I,I,I,I,I,W],
  // Row 9
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 10 — wall pillars
  [W,I,I,I,W,W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W,W,I,I,I,W],
  // Row 11
  [W,I,I,I,W,W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W,W,I,I,I,W],
  // Row 12
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 13
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 14 — boss area
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 15 — water pools bottom corners
  [W,I,A,A,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,A,A,I,W],
  // Row 16
  [W,I,A,A,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,A,A,I,W],
  // Row 17
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 18 — exit portal to castle (col 14)
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,P,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  // Row 19 — bottom border
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const caveMap = {
  name: 'Ледяная пещера',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 1 },
  portals: [
    { col: 14, row: 1, target: 'canyon', spawnX: 14, spawnY: 17 },
    { col: 14, row: 18, target: 'castle', spawnX: 15, spawnY: 1 },
  ],
  npcs: [],
  spawns: [
    // Skeletons
    { type: 'skeleton', col: 7, row: 4 },
    { type: 'skeleton', col: 22, row: 6 },
    { type: 'skeleton', col: 12, row: 12 },
    // Golems
    { type: 'golem', col: 6, row: 9 },
    { type: 'golem', col: 20, row: 9 },
    { type: 'golem', col: 14, row: 16 },
    // Bandits
    { type: 'bandit_spear', col: 18, row: 5 },
    { type: 'bandit_sword', col: 4, row: 14 },
    { type: 'bandit_archer', col: 24, row: 14 },
  ],
  boss: { type: 'ice_lich', col: 14, row: 14 },
};
