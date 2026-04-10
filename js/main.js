// main.js — тонкий entry-point
// После Task 2.5 (pre-coop refactor) вся логика вынесена в модули:
//   - game-state.js      — объект game + STATE enum
//   - canvas-layout.js   — canvas init + resize
//   - rendering.js       — все render/draw функции (CLASSES тоже там)
//   - game-loop.js       — gameLoop, handleDialogAction, BOSS_DIALOGS, startGame
//   - map-loading.js, player-update.js, остальные модули — см. импорты в game-loop.js
//
// Здесь остаются только: re-export game/STATE (на случай если что-то снаружи
// ожидает этот API) и вызов startGame().

import { game, STATE } from './game-state.js';
import { startGame } from './game-loop.js';

// Re-export для обратной совместимости
export { game, STATE };

startGame();
