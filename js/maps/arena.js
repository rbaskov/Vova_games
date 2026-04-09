import { TILE } from '../sprites.js';

const W = TILE.WALL;
const D = TILE.DIRT;
const G = TILE.GRASS;
const P = TILE.PORTAL;
const C = TILE.CHECKPOINT;

// 20x20 arena map — circular fighting pit
const tiles = [
  // Row 0
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1
  [W,W,W,W,W,W,D,D,D,D,D,D,D,D,W,W,W,W,W,W],
  // Row 2
  [W,W,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,W,W],
  // Row 3
  [W,W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W,W],
  // Row 4
  [W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W],
  // Row 5
  [W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W],
  // Row 6
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 7
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 8
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 9 — center
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 10
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 11
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 12
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 13
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 14
  [W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W],
  // Row 15
  [W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W],
  // Row 16
  [W,W,W,D,D,D,D,D,D,C,D,D,D,D,D,D,D,W,W,W],
  // Row 17
  [W,W,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,W,W],
  // Row 18 — portal out
  [W,W,W,W,W,W,D,D,D,P,D,D,D,D,W,W,W,W,W,W],
  // Row 19
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const arenaMap = {
  name: 'Арена',
  width: 20,
  height: 20,
  tiles,
  playerStart: { x: 9, y: 16 },
  portals: [
    { col: 9, row: 18, target: 'village', spawnX: 14, spawnY: 10 },
  ],
  npcs: [],
  spawns: [],
  arena: true, // flag for arena wave system
};
