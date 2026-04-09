// ============================================================
// touch.js — Mobile Touch Controls (Virtual Joystick + Buttons)
// ============================================================

let joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
let touchButtons = {};  // button name → pressed this frame
let touchHeld = {};     // button name → currently held
let isMobile = false;
let tapAnywhereMode = false; // When true, any touch = Space press

// Joystick flick detection for menu/dialog navigation
let lastFlickX = 0; // -1, 0, 1
let lastFlickY = 0;
const FLICK_THRESHOLD = 0.5;

const JOYSTICK_RADIUS = 60;
const DEAD_ZONE = 8;

let buttonAreas = []; // { id, x, y, r, key, label, color }
let menuButtonAreas = []; // menu-specific buttons
let joystickArea = { x: 0, y: 0 }; // center of joystick zone
let canvasRect = null;
let scale = 1;

export function detectMobile() {
  isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  return isMobile;
}

export function isMobileDevice() {
  return isMobile;
}

export function setTapAnywhereMode(enabled) {
  tapAnywhereMode = enabled;
}

export function initTouchControls(canvas) {
  if (!isMobile) return;

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  updateLayout(canvas);
  window.addEventListener('resize', () => updateLayout(canvas));
  // Also update on orientation change
  screen.orientation?.addEventListener('change', () => {
    setTimeout(() => updateLayout(canvas), 100);
  });
}

function updateLayout(canvas) {
  canvasRect = canvas.getBoundingClientRect();
  scale = canvasRect.width / canvas.width;

  const w = canvas.width;
  const h = canvas.height;

  // Joystick on left side, higher up to avoid edge
  joystickArea = { x: 90, y: h - 100 };

  // Main action buttons - right side, large and spaced
  const R = 30; // base button radius — bigger for thumbs
  const bx = w - 70;
  const by = h - 90;

  buttonAreas = [
    { id: 'attack', x: bx, y: by, r: R + 6, key: 'Space', label: '⚔', color: '#e74c3c' },
    { id: 'interact', x: bx - 70, y: by + 10, r: R, key: 'KeyE', label: 'E', color: '#3498db' },
    { id: 'potion', x: bx + 10, y: by - 70, r: R, key: 'KeyQ', label: '♥', color: '#2ecc71' },
    { id: 'inv', x: bx - 60, y: by - 60, r: R - 4, key: 'KeyI', label: 'I', color: '#9b59b6' },
    // Abilities bottom center
    { id: 'ability1', x: w / 2 - 55, y: h - 38, r: R - 4, key: 'Digit1', label: '1', color: '#8d6e63' },
    { id: 'ability2', x: w / 2, y: h - 38, r: R - 4, key: 'Digit2', label: '2', color: '#ef6c00' },
    { id: 'ability3', x: w / 2 + 55, y: h - 38, r: R - 4, key: 'Digit3', label: '3', color: '#0288d1' },
    // Quest log — top right area
    { id: 'quest', x: w - 30, y: 52, r: R - 6, key: 'KeyJ', label: 'J', color: '#f0c040' },
  ];

  // Menu-specific touch areas
  menuButtonAreas = [
    { id: 'start', x: w / 2, y: 310, r: 60, w: 280, h: 50, key: 'Enter', label: 'ИГРАТЬ' },
    { id: 'continue', x: w / 2, y: 370, r: 60, w: 280, h: 40, key: 'KeyC', label: 'ПРОДОЛЖИТЬ' },
    { id: 'sandbox', x: w / 2, y: 420, r: 60, w: 200, h: 36, key: 'KeyS', label: 'ПЕСОЧНИЦА' },
  ];
}

function toCanvasCoords(touch) {
  if (!canvasRect) return { x: 0, y: 0 };
  return {
    x: (touch.clientX - canvasRect.left) / scale,
    y: (touch.clientY - canvasRect.top) / scale,
  };
}

// Check if touch hits a rectangular menu button
function hitMenuButton(pos, btn) {
  const halfW = btn.w / 2;
  const halfH = btn.h / 2;
  return pos.x >= btn.x - halfW && pos.x <= btn.x + halfW &&
         pos.y >= btn.y - halfH && pos.y <= btn.y + halfH;
}

function handleTouchStart(e) {
  e.preventDefault();

  // In "tap anywhere" mode, any touch = Space
  if (tapAnywhereMode) {
    touchButtons['Space'] = true;
    return;
  }

  for (const touch of e.changedTouches) {
    const pos = toCanvasCoords(touch);

    // Check menu buttons
    for (const btn of menuButtonAreas) {
      if (hitMenuButton(pos, btn)) {
        touchButtons[btn.key] = true;
        touchHeld[btn.key] = true;
        return;
      }
    }

    // Check game buttons
    let hitButton = false;
    for (const btn of buttonAreas) {
      const dx = pos.x - btn.x;
      const dy = pos.y - btn.y;
      // Generous hit area (1.8x radius) for easier tapping
      if (dx * dx + dy * dy < btn.r * btn.r * 3.2) {
        touchButtons[btn.key] = true;
        touchHeld[btn.key] = true;
        hitButton = true;
        break;
      }
    }

    // If no button hit and on left side, start joystick
    if (!hitButton && pos.x < 220) {
      joystick.active = true;
      joystick.touchId = touch.identifier;
      joystick.startX = pos.x;
      joystick.startY = pos.y;
      joystick.dx = 0;
      joystick.dy = 0;
    }
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (joystick.active && touch.identifier === joystick.touchId) {
      const pos = toCanvasCoords(touch);
      let dx = pos.x - joystick.startX;
      let dy = pos.y - joystick.startY;

      // Clamp to radius
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > JOYSTICK_RADIUS) {
        dx = (dx / dist) * JOYSTICK_RADIUS;
        dy = (dy / dist) * JOYSTICK_RADIUS;
      }

      joystick.dx = Math.abs(dx) > DEAD_ZONE ? dx / JOYSTICK_RADIUS : 0;
      joystick.dy = Math.abs(dy) > DEAD_ZONE ? dy / JOYSTICK_RADIUS : 0;
    }
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (joystick.active && touch.identifier === joystick.touchId) {
      joystick.active = false;
      joystick.dx = 0;
      joystick.dy = 0;
    }
  }
  // Release held buttons for ended touches only
  // Simple approach: release all when any touch ends
  // More precise: track which touch held which button
  touchHeld = {};
}

// Called by input.js to merge touch state
export function getTouchJoystick() {
  return { dx: joystick.dx, dy: joystick.dy };
}

export function isTouchButtonPressed(key) {
  if (touchButtons[key]) {
    touchButtons[key] = false;
    return true;
  }
  return false;
}

export function isTouchButtonHeld(key) {
  return !!touchHeld[key];
}

// Returns a one-shot directional flick from joystick (for dialog/inventory navigation)
export function getJoystickFlick() {
  let flickX = 0, flickY = 0;

  const curX = joystick.dx > FLICK_THRESHOLD ? 1 : (joystick.dx < -FLICK_THRESHOLD ? -1 : 0);
  const curY = joystick.dy > FLICK_THRESHOLD ? 1 : (joystick.dy < -FLICK_THRESHOLD ? -1 : 0);

  // Trigger only on transition from 0 to non-zero
  if (curX !== 0 && lastFlickX === 0) flickX = curX;
  if (curY !== 0 && lastFlickY === 0) flickY = curY;

  lastFlickX = curX;
  lastFlickY = curY;

  return { dx: flickX, dy: flickY };
}

// Render touch controls overlay — gameplay
export function renderTouchControls(ctx, width, height) {
  if (!isMobile) return;

  // Joystick
  const jx = joystickArea.x;
  const jy = joystickArea.y;

  // Joystick base
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(jx, jy, JOYSTICK_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(jx, jy, JOYSTICK_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Joystick knob
  const knobX = jx + joystick.dx * JOYSTICK_RADIUS;
  const knobY = jy + joystick.dy * JOYSTICK_RADIUS;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
  ctx.fill();

  // Action buttons
  for (const btn of buttonAreas) {
    const held = touchHeld[btn.key];

    // Button circle
    ctx.globalAlpha = held ? 0.6 : 0.3;
    ctx.fillStyle = btn.color;
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(10, btn.r * 0.65)}px "Press Start 2P"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x, btn.y + 1);
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Render menu touch buttons
export function renderMenuTouchControls(ctx, width, height, hasSaveData) {
  if (!isMobile) return;

  ctx.globalAlpha = 0.9;

  // "ИГРАТЬ" button
  const start = menuButtonAreas[0];
  drawMenuButton(ctx, start.x, start.y, start.w, start.h, start.label, '#f0c040', '#000');

  // "ПРОДОЛЖИТЬ" button (only if save exists)
  if (hasSaveData) {
    const cont = menuButtonAreas[1];
    drawMenuButton(ctx, cont.x, cont.y, cont.w, cont.h, cont.label, '#3498db', '#fff');
  }

  // "ПЕСОЧНИЦА" button
  const sandbox = menuButtonAreas[2];
  drawMenuButton(ctx, sandbox.x, sandbox.y, sandbox.w, sandbox.h, sandbox.label, '#b388ff', '#000');

  ctx.globalAlpha = 1;
}

function drawMenuButton(ctx, x, y, w, h, label, bgColor, textColor) {
  const halfW = w / 2;
  const halfH = h / 2;

  // Background
  ctx.fillStyle = bgColor;
  ctx.globalAlpha = 0.85;
  // Rounded rect
  const r = 8;
  ctx.beginPath();
  ctx.moveTo(x - halfW + r, y - halfH);
  ctx.lineTo(x + halfW - r, y - halfH);
  ctx.quadraticCurveTo(x + halfW, y - halfH, x + halfW, y - halfH + r);
  ctx.lineTo(x + halfW, y + halfH - r);
  ctx.quadraticCurveTo(x + halfW, y + halfH, x + halfW - r, y + halfH);
  ctx.lineTo(x - halfW + r, y + halfH);
  ctx.quadraticCurveTo(x - halfW, y + halfH, x - halfW, y + halfH - r);
  ctx.lineTo(x - halfW, y - halfH + r);
  ctx.quadraticCurveTo(x - halfW, y - halfH, x - halfW + r, y - halfH);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.stroke();

  // Text
  ctx.globalAlpha = 1;
  ctx.fillStyle = textColor;
  ctx.font = `${Math.min(14, h * 0.4)}px "Press Start 2P"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
