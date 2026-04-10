import { getTouchJoystick, isTouchButtonPressed, isTouchButtonHeld, isMobileDevice } from './touch.js';

const keysDown = {};
const keysJustPressed = {};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (!e.repeat) {
      keysJustPressed[e.code] = true;
    }
    keysDown[e.code] = true;
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keysDown[e.code] = false;
  });
}

// Returns true if key is currently held down (for movement)
export function isKeyDown(code) {
  if (keysDown[code]) return true;
  // Mobile: check touch held
  if (isMobileDevice() && isTouchButtonHeld(code)) return true;
  return false;
}

// Returns true once per physical key press (ignores repeat)
export function isKeyPressed(code) {
  if (keysJustPressed[code]) {
    keysJustPressed[code] = false;
    return true;
  }
  // Mobile: check touch button press
  if (isMobileDevice() && isTouchButtonPressed(code)) return true;
  return false;
}

// Get movement direction (keyboard + touch joystick combined)
export function getMovementInput() {
  let dx = 0, dy = 0;

  // Keyboard
  if (keysDown['KeyW'] || keysDown['ArrowUp']) dy -= 1;
  if (keysDown['KeyS'] || keysDown['ArrowDown']) dy += 1;
  if (keysDown['KeyA'] || keysDown['ArrowLeft']) dx -= 1;
  if (keysDown['KeyD'] || keysDown['ArrowRight']) dx += 1;

  // Touch joystick
  if (isMobileDevice()) {
    const joy = getTouchJoystick();
    if (joy.dx !== 0 || joy.dy !== 0) {
      dx = joy.dx;
      dy = joy.dy;
    }
  }

  return { dx, dy };
}

// ---------------------------------------------------------------
// Task 4 — Input queue для кооп-готовности
// ---------------------------------------------------------------
// captureLocalInput(player) заполняет player.input (held) и player.inputEdges
// (triggered) из физических устройств (клавиатура + тач). Вызывается в начале
// PLAY-case update-фазы gameLoop'а. Для кооп-гостя аналогичную функцию будет
// вызывать сетевой слой (network.js), принимая пакет вместо физических кнопок.
//
// ВАЖНО: edge-поля ВЫСТАВЛЯЮТСЯ только когда isKeyPressed вернул true (а это
// "один раз на нажатие" благодаря keysJustPressed в listener'е). Сбрасывает
// их потребитель через consumeEdge(). Если игровая логика не прочитала edge
// в этом кадре — он останется true до следующего consume. Это сознательно:
// гарантирует, что быстрое нажатие между кадрами не будет потеряно.
//
// Если в этом кадре игрок не нажал клавишу — edge-поле НЕ переписывается в
// false (сохраняем "буферизованный" клик до consume). Единственный способ
// сбросить его — вызвать consumeEdge().

/**
 * Заполняет player.input и player.inputEdges из физического ввода.
 * OR-семантика для edges: если поле уже true (не consumed) — оставляем.
 */
export function captureLocalInput(player) {
  if (!player) return;

  // Held: movement vector (keyboard normalized, touch joystick already normalized)
  const move = getMovementInput();
  player.input.dx = move.dx;
  player.input.dy = move.dy;

  // Edges: OR-merge — буферизуем клики до consume
  const e = player.inputEdges;
  if (isKeyPressed('Space')) e.attack = true;
  if (isKeyPressed('KeyE')) e.interact = true;
  if (isKeyPressed('KeyQ')) e.potion = true;
  if (isKeyPressed('Digit1')) e.ability1 = true;
  if (isKeyPressed('Digit2')) e.ability2 = true;
  if (isKeyPressed('Digit3')) e.ability3 = true;
  if (isKeyPressed('KeyI') || isKeyPressed('Tab')) e.inventoryToggle = true;
  if (isKeyPressed('Escape')) e.menuToggle = true;
  if (isKeyPressed('KeyJ')) e.questsToggle = true;
}

/**
 * Возвращает true и сбрасывает edge. Если флаг был false — возвращает false.
 * Это единственный способ "потребить" edge — обычное чтение player.inputEdges.x
 * не сбрасывает его (используй consumeEdge, иначе будет повторно срабатывать).
 */
export function consumeEdge(player, name) {
  if (!player || !player.inputEdges) return false;
  if (player.inputEdges[name]) {
    player.inputEdges[name] = false;
    return true;
  }
  return false;
}
