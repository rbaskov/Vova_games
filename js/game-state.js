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
  // game.player — accessor property, определённый ниже через Object.defineProperty.
  // Читает/пишет players[0]. Подробности — см. блок после export.
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
  // Подтверждение выхода в меню — модальный оверлей поверх PLAY.
  // Когда true: update пропускается (игра на паузе), input ловится напрямую,
  // рендер добавляет confirm-оверлей поверх обычного игрового кадра.
  showExitConfirm: false,
  // Массив игроков. players[0] — локальный (он же game.player через геттер).
  // players[1..] — место под будущих кооп-гостей (Task coop-session1).
  players: [],
};

// game.player — accessor proxy to players[0]. Введено в Task 3.1 (pre-coop refactor).
//
// Зачем: существующий код делает `game.player = createPlayer(...)`,
// `game.player.hp -= dmg`, `if (!game.player)` и т.д. — 217 обращений в 5 файлах.
// Геттер/сеттер делает эти обращения прозрачным фасадом над players[0], чтобы
// миграция на массив игроков не требовала переписывания call-site'ов.
//
// Семантика:
//   game.player           → game.players[0]   (undefined если массив пуст)
//   game.player = x       → game.players[0] = x (создаёт slot 0 если нужно)
//   game.player = null    → game.players[0] = null (length остаётся 1)
//
// configurable: true — на случай если тесты захотят переопределить для моков.
// enumerable: true — чтобы for..in и Object.keys видели поле как раньше.
Object.defineProperty(game, 'player', {
  get() { return this.players[0]; },
  set(v) { this.players[0] = v; },
  enumerable: true,
  configurable: true,
});
