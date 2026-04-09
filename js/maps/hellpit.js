import { TILE } from '../sprites.js';

const W = TILE.WALL;
const D = TILE.DIRT;
const G = TILE.GRASS;
const P = TILE.PORTAL;
const C = TILE.CHECKPOINT;
const L = TILE.LAVA;

// 30x20 hellpit map — demonic arena surrounded by walls and lava
const tiles = [
  // Row 0
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1 — entrance from village
  [W,D,D,D,D,D,W,L,L,L,L,L,L,L,D,P,L,L,L,L,L,L,L,W,D,D,D,D,D,W],
  // Row 2
  [W,D,D,D,D,D,W,L,L,L,L,L,L,L,D,D,L,L,L,L,L,L,L,W,D,D,D,D,D,W],
  // Row 3
  [W,D,D,C,D,D,W,L,L,L,L,L,L,L,D,D,L,L,L,L,L,L,L,W,D,D,D,D,D,W],
  // Row 4
  [W,D,D,D,D,D,W,W,W,W,D,D,D,D,D,D,D,D,D,D,W,W,W,W,D,D,D,D,D,W],
  // Row 5
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 6
  [W,W,W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W,W,W],
  // Row 7
  [W,L,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,L,W],
  // Row 8
  [W,L,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,L,W],
  // Row 9 — boss arena center
  [W,L,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,L,W],
  // Row 10
  [W,L,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,L,W],
  // Row 11
  [W,L,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,L,W],
  // Row 12
  [W,L,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,L,W],
  // Row 13
  [W,W,W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W,W,W],
  // Row 14
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 15
  [W,D,D,D,D,D,W,W,W,W,D,D,D,D,D,D,D,D,D,D,W,W,W,W,D,D,D,D,D,W],
  // Row 16
  [W,D,D,D,D,D,W,L,L,L,L,L,L,L,D,D,L,L,L,L,L,L,L,W,D,D,D,D,D,W],
  // Row 17
  [W,D,D,D,D,D,W,L,L,L,L,L,L,L,D,D,L,L,L,L,L,L,L,W,D,D,D,D,D,W],
  // Row 18
  [W,D,D,D,D,D,W,L,L,L,L,L,L,L,D,D,L,L,L,L,L,L,L,W,D,D,D,D,D,W],
  // Row 19
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const hellpitMap = {
  name: 'Адская яма',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 2 },
  portals: [
    { col: 15, row: 1, target: 'village', spawnX: 14, spawnY: 10 },
  ],
  npcs: [],
  spawns: [],
  boss: { type: 'rock_demon', col: 14, row: 10 },
};
