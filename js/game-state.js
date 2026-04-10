// ============================================================
// game-state.js — Global game state object and STATE enum
// ============================================================
// Вынесено из main.js в рамках pre-coop refactor (Task 2.1).
// Никакой логики — только объявления. Все ссылки на `game` через
// import { game } from './game-state.js' дают тот же объект.

export const STATE = {
  MENU: 'MENU',
  CLASS_SELECT: 'CLASS_SELECT',
  PLAY: 'PLAY',
  DIALOG: 'DIALOG',
  INVENTORY: 'INVENTORY',
  GAMEOVER: 'GAMEOVER',
  WIN: 'WIN',
};

export const game = {
  state: STATE.MENU,
  canvas: null,
  ctx: null,
  width: 640,
  height: 480,
  dt: 0,
  currentMap: null,
  camera: null,
  player: null,
  enemies: [],
  npcs: [],
  particles: [],
  projectiles: [],
  animFrame: 0,
  animTimer: 0,
  animSpeed: 0.15,
  totalTime: 0,
  boss: null,
  showHelp: false,
  portalCooldown: 0,
  currentMapName: null,
  checkpoint: null,
  sandbox: false,
  showQuestLog: false,
  arenaWave: 0,
  arenaTimer: 0,
  companions: [],
  selectedClass: 0,
  playerClass: null, // 'knight','archer','landsknecht','standard','gladiator'
  hasHorse: false,
  openWorld: false,
  chunkManager: null,
  worldGen: null,
  worldSeed: null,
  chunkEnemies: new Map(),
  chunkKills: new Map(),
  difficulty: 'normal',
  visitedChunks: new Set(),
  minimapRenderer: null,
  fastTravel: null,
  worldEventManager: null,
  // Pre-coop prep (Task 3 добавит полноценный массив игроков):
  players: [],
};
