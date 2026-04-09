import { TILE } from '../sprites.js';

const F = TILE.CASTLE;  // Floor
const W = TILE.WALL;
const D = TILE.DIRT;
const P = TILE.PORTAL;
const R = TILE.CARPET;  // Red carpet
const O = TILE.DOOR;    // Door
const K = TILE.CHECKPOINT;

// 30x25 — Royal Castle (larger map for a grand feel)
const tiles = [
  // Row 0 — top wall
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1 — throne room back wall
  [W,F,F,F,F,W,F,F,F,F,F,W,F,R,R,R,R,F,W,F,F,F,F,F,W,F,F,F,F,W],
  // Row 2 — throne area
  [W,F,F,F,F,W,F,F,F,F,F,W,F,R,R,R,R,F,W,F,F,F,F,F,W,F,F,F,F,W],
  // Row 3 — king's throne
  [W,F,F,F,F,W,F,F,F,F,F,W,F,R,R,R,R,F,W,F,F,F,F,F,W,F,F,F,F,W],
  // Row 4 — throne room walls with doors
  [W,F,F,F,F,W,W,W,O,W,W,W,F,R,R,R,R,F,W,W,W,O,W,W,W,F,F,F,F,W],
  // Row 5 — main hall
  [W,F,F,F,F,F,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 6
  [W,F,F,F,F,F,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 7 — side rooms wall
  [W,W,W,O,W,W,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,W,W,O,W,W,W],
  // Row 8 — left guard room / right merchant room
  [W,F,F,F,F,W,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,W,F,F,F,F,W],
  // Row 9
  [W,F,F,F,F,W,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,W,F,F,F,F,W],
  // Row 10
  [W,F,F,F,F,W,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,W,F,F,F,F,W],
  // Row 11 — side rooms wall
  [W,W,W,O,W,W,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,W,W,O,W,W,W],
  // Row 12 — courtyard
  [W,F,F,F,F,F,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 13 — checkpoint
  [W,F,F,F,F,F,F,F,F,F,F,F,F,R,K,R,R,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 14
  [W,F,F,F,F,F,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 15 — lower guard posts
  [W,F,F,F,F,W,W,W,F,F,F,F,F,R,R,R,R,F,F,F,F,F,W,W,W,F,F,F,F,W],
  // Row 16
  [W,F,F,F,F,W,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,W,F,F,F,F,W],
  // Row 17
  [W,F,F,F,F,W,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,W,F,F,F,F,W],
  // Row 18
  [W,F,F,F,F,W,W,W,F,F,F,F,F,R,R,R,R,F,F,F,F,F,W,W,W,F,F,F,F,W],
  // Row 19 — courtyard lower
  [W,F,F,F,F,F,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 20
  [W,F,F,F,F,F,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 21
  [W,F,F,F,F,F,F,F,F,F,F,F,F,R,R,R,R,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 22 — gate area
  [W,W,W,W,W,W,W,W,W,W,W,W,F,D,D,D,D,F,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 23 — entrance
  [W,F,F,F,F,F,F,F,F,F,F,F,F,D,P,D,D,F,F,F,F,F,F,F,F,F,F,F,F,W],
  // Row 24 — bottom wall
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const kingdomMap = {
  name: 'Королевский замок',
  width: 30,
  height: 25,
  tiles,
  playerStart: { x: 14, y: 22 },
  portals: [
    { col: 14, row: 23, target: 'village', spawnX: 1, spawnY: 9 },
  ],
  npcs: [
    // King in the throne room
    { id: 'king', col: 15, row: 3, name: 'Король Альдрик', bodyColor: '#4a148c', headDetail: '#ffd54f' },
    // Royal merchant (left wing)
    { id: 'royal_merchant', col: 2, row: 9, name: 'Придворный торговец', bodyColor: '#1b5e20', headDetail: '#ffd54f' },
    // Armorer (right wing)
    { id: 'royal_armorer', col: 27, row: 9, name: 'Королевский оружейник', bodyColor: '#4e342e', headDetail: '#ff6f00' },
    // Knights
    { id: 'knight1', col: 10, row: 5, name: 'Рыцарь Гарет', bodyColor: '#37474f', headDetail: '#78909c' },
    { id: 'knight2', col: 20, row: 5, name: 'Рыцарь Элара', bodyColor: '#37474f', headDetail: '#78909c' },
    { id: 'knight3', col: 7, row: 16, name: 'Рыцарь Борин', bodyColor: '#37474f', headDetail: '#78909c' },
    { id: 'knight4', col: 23, row: 16, name: 'Рыцарь Лира', bodyColor: '#37474f', headDetail: '#78909c' },
    // Mercenaries for hire
    { id: 'merc_sword', col: 8, row: 12, name: 'Мечник Дарен', bodyColor: '#607d8b', headDetail: '#90a4ae' },
    { id: 'merc_spear', col: 14, row: 19, name: 'Копейщик Рольф', bodyColor: '#607d8b', headDetail: '#90a4ae' },
    { id: 'merc_bow', col: 20, row: 12, name: 'Лучник Ивар', bodyColor: '#607d8b', headDetail: '#90a4ae' },
  ],
  spawns: [],
};
