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
