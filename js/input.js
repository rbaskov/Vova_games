const keysDown = {};    // currently held
const keysJustPressed = {};  // pressed this frame (consumed on read)

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
  return !!keysDown[code];
}

// Returns true once per physical key press (ignores repeat)
export function isKeyPressed(code) {
  if (keysJustPressed[code]) {
    keysJustPressed[code] = false;
    return true;
  }
  return false;
}
