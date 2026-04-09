import { TILE } from '../sprites.js';

const C = TILE.CASTLE;
const W = TILE.WALL;
const D = TILE.DIRT;
const P = TILE.PORTAL;

// 30x20 castle map — Замок Тёмного мага with dirt corridors forming a cross
const tiles = [
  // Row 0 — top border
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1 — entrance corridor from cave
  [W,C,C,C,C,C,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,C,C,C,C,C,C,W],
  // Row 2
  [W,C,C,C,C,C,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,C,C,C,C,C,C,W],
  // Row 3 — top-left room
  [W,C,C,C,C,W,W,W,C,C,C,C,C,D,D,D,D,C,C,C,C,W,W,W,C,C,C,C,C,W],
  // Row 4
  [W,C,C,C,C,W,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,W,C,C,C,C,C,W],
  // Row 5 — boss area (row 5)
  [W,C,C,C,C,W,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,W,C,C,C,C,C,W],
  // Row 6
  [W,C,C,C,C,W,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,W,C,C,C,C,C,W],
  // Row 7 — room dividers
  [W,C,C,C,C,W,W,W,C,C,C,C,C,D,D,D,D,C,C,C,C,W,W,W,C,C,C,C,C,W],
  // Row 8
  [W,C,C,C,C,C,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,C,C,C,C,C,C,W],
  // Row 9 — horizontal corridor
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 10
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 11
  [W,C,C,C,C,C,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,C,C,C,C,C,C,W],
  // Row 12 — bottom-left room
  [W,C,C,C,C,W,W,W,C,C,C,C,C,D,D,D,D,C,C,C,C,W,W,W,C,C,C,C,C,W],
  // Row 13
  [W,C,C,C,C,W,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,W,C,C,C,C,C,W],
  // Row 14
  [W,C,C,C,C,W,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,W,C,C,C,C,C,W],
  // Row 15
  [W,C,C,C,C,W,W,W,C,C,C,C,C,D,D,D,D,C,C,C,C,W,W,W,C,C,C,C,C,W],
  // Row 16
  [W,C,C,C,C,C,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,C,C,C,C,C,C,W],
  // Row 17 — player start row
  [W,C,C,C,C,C,C,C,C,C,C,C,C,D,D,D,D,C,C,C,C,C,C,C,C,C,C,C,C,W],
  // Row 18 — exit portal back to cave (col 14)
  [W,C,C,C,C,C,C,C,C,C,C,C,C,D,P,D,D,C,C,C,C,C,C,C,C,C,C,C,C,W],
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
    { type: 'skeleton', col: 27, row: 4 },
    { type: 'skeleton', col: 2, row: 14 },
    { type: 'skeleton', col: 27, row: 14 },
    // Golems
    { type: 'golem', col: 8, row: 9 },
    { type: 'golem', col: 22, row: 9 },
  ],
  boss: { type: 'dark_mage', col: 14, row: 5 },
};
