const keys = {};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
}

export function isKeyDown(code) {
  return !!keys[code];
}

export function isKeyPressed(code) {
  if (keys[code]) {
    keys[code] = false;
    return true;
  }
  return false;
}
