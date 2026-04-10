// ============================================================
// canvas-layout.js — Canvas bootstrap, sizing, resize listeners
// ============================================================
// Вынесено из main.js в рамках pre-coop refactor (Task 2.2).
// Ничего в логике не меняется — только перемещение кода.

import { isMobileDevice } from './touch.js';
import { game } from './game-state.js';

let canvas;

/**
 * Возвращает доступную область экрана с учётом safe-area insets.
 * На устройствах без чёлки env() возвращает 0 — поведение не меняется.
 */
function getAvailableScreenSize() {
  // Создаём временный элемент для чтения env() значений через getComputedStyle
  const probe = document.body || document.documentElement;
  const cs = window.getComputedStyle(probe);
  const padTop = parseInt(cs.paddingTop, 10) || 0;
  const padBottom = parseInt(cs.paddingBottom, 10) || 0;
  const padLeft = parseInt(cs.paddingLeft, 10) || 0;
  const padRight = parseInt(cs.paddingRight, 10) || 0;
  return {
    w: Math.max(320, window.innerWidth - padLeft - padRight),
    h: Math.max(240, window.innerHeight - padTop - padBottom),
  };
}

function resizeCanvas() {
  const { w: maxW, h: maxH } = getAvailableScreenSize();

  if (isMobileDevice()) {
    // Mobile: game area is 640x480, but canvas is wider to fit side panels
    // Scale based on screen height to keep game area proportional
    const screenRatio = maxW / maxH;
    // Canvas height = 480 always, width = enough for game + panels
    const totalW = Math.round(480 * screenRatio);
    canvas.width = totalW;
    canvas.height = 480;
    game.width = totalW;
    game.height = 480;
    // Fill screen
    canvas.style.width = maxW + 'px';
    canvas.style.height = maxH + 'px';
  } else {
    // Desktop: maintain aspect ratio
    const ratio = 640 / 480;
    let w, h;
    if (maxW / maxH > ratio) {
      h = maxH;
      w = h * ratio;
    } else {
      w = maxW;
      h = w / ratio;
    }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
}

/**
 * Инициализирует canvas, вешает resize-листенеры, записывает canvas/ctx в game.
 * @param {HTMLCanvasElement} canvasEl
 */
export function initCanvasLayout(canvasEl) {
  canvas = canvasEl;
  game.canvas = canvas;
  game.ctx = canvas.getContext('2d');
  game.width = canvas.width;
  game.height = canvas.height;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    // Delay to let browser finish orientation transition
    setTimeout(resizeCanvas, 150);
    setTimeout(resizeCanvas, 500);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeCanvas);
  }

  return canvas;
}

/** Возвращает текущий canvas-элемент (для передачи в initTouchControls и т.п.) */
export function getCanvas() {
  return canvas;
}

/** Экспорт на случай если кто-то захочет ручной ресайз (например, после изменения safe-area в Task 6) */
export { resizeCanvas };
