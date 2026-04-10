// ============================================================
// haptics.js — Тактильная отдача на мобильных устройствах
// ============================================================
// Wrapper над navigator.vibrate с предустановленными паттернами.
// На десктопе и iOS Safari API недоступен — graceful no-op.
// Требует HTTPS на некоторых браузерах.
//
// Паттерны:
//   HAPTIC_TAP      — лёгкий тап (кнопки touch)
//   HAPTIC_HIT      — попадание по врагу
//   HAPTIC_HURT     — игрок получил урон
//   HAPTIC_LEVELUP  — повышение уровня
//   HAPTIC_DEATH    — смерть игрока

export const HAPTIC_TAP     = 10;
export const HAPTIC_HIT     = 20;
export const HAPTIC_HURT    = [30, 40, 30];
export const HAPTIC_LEVELUP = [40, 30, 40, 30, 60];
export const HAPTIC_DEATH   = [100, 50, 100, 50, 200];

// Глобальный флаг (переключается из настроек в будущем).
// TODO: связать с game.settings.haptics когда появится меню настроек.
let enabled = true;

// Rate limit: не более одной вибрации на 80 мс, чтобы не спамить
// аккумулятор при частых попаданиях (например, стрельба из лука).
let lastVibrateAt = 0;

export function setHapticsEnabled(on) {
  enabled = !!on;
}

export function isHapticsSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Вызов вибрации с паттерном.
 * @param {number|number[]} pattern — длительность в мс или массив [вкл,выкл,вкл,...]
 */
export function vibrate(pattern) {
  if (!enabled) return;
  if (!isHapticsSupported()) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastVibrateAt < 80) return; // rate limit
  lastVibrateAt = now;
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    // Некоторые браузеры бросают SecurityError без user-gesture
  }
}
