import { TILE } from '../sprites.js';

const G = TILE.GRASS;
const D = TILE.DIRT;
const W = TILE.WALL;
const T = TILE.TREE;
const A = TILE.WATER;
const P = TILE.PORTAL;
const C = TILE.CHECKPOINT;

// 30x20 village map
const tiles = [
  // Row 0 — top border
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
  // Row 1
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 2
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 3
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,W,W,W,G,G,G,G,G,G,G,G,T],
  // Row 4 — blacksmith stands here
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,W,G,W,G,G,G,G,G,G,G,G,T],
  // Row 5
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,W,W,W,G,G,G,G,G,G,G,G,T],
  // Row 6
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 7
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 8
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 9 — horizontal dirt path, elder stands here
  [T,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,T],
  // Row 10 — checkpoint crystal
  [T,G,G,G,G,G,G,G,G,G,G,G,C,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 11
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 12
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 13 — pond area
  [T,G,G,A,A,A,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 14
  [T,G,G,A,A,A,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 15
  [T,G,G,A,A,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 16
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 17
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 18 — portal row
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,D,P,G,G,G,G,G,G,G,G,G,G,G,T],
  // Row 19 — bottom border
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

export const villageMap = {
  name: 'Деревня Брайтхолл',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 10 },
  portals: [
    { col: 17, row: 18, target: 'forest', spawnX: 15, spawnY: 1 },
  ],
  npcs: [
    { id: 'blacksmith', col: 4, row: 4, name: 'Кузнец', bodyColor: '#884422', headDetail: '#aa3311' },
    { id: 'elder', col: 9, row: 9, name: 'Старейшина', bodyColor: '#335588', headDetail: '#eeeeee' },
    { id: 'merchant', col: 18, row: 9, name: 'Торговец', bodyColor: '#228844', headDetail: '#cc8800' },
  ],
  spawns: [],
};
