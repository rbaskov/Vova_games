// ============================================================
// touch.js — Mobile Touch Controls (Virtual Joystick + Buttons)
// ============================================================

let joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
let touchButtons = {};  // button name → pressed this frame
let touchHeld = {};     // button name → currently held
let isMobile = false;

const JOYSTICK_RADIUS = 50;
const DEAD_ZONE = 10;

// Button layout (positioned in initTouchControls)
const BUTTONS = [
  { id: 'attack', label: '⚔', key: 'Space' },
  { id: 'interact', label: 'E', key: 'KeyE' },
  { id: 'potion', label: '♥', key: 'KeyQ' },
  { id: 'inv', label: 'I', key: 'KeyI' },
  { id: 'ability1', label: '1', key: 'Digit1' },
  { id: 'ability2', label: '2', key: 'Digit2' },
  { id: 'ability3', label: '3', key: 'Digit3' },
];

let buttonAreas = []; // { id, x, y, r, key }
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

export function initTouchControls(canvas) {
  if (!isMobile) return;

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  updateLayout(canvas);
  window.addEventListener('resize', () => updateLayout(canvas));
}

function updateLayout(canvas) {
  canvasRect = canvas.getBoundingClientRect();
  scale = canvasRect.width / canvas.width;

  const w = canvas.width;
  const h = canvas.height;

  // Joystick on left side
  joystickArea = { x: 80, y: h - 90 };

  // Buttons on right side
  const bx = w - 60;
  const by = h - 70;
  const r = 22;

  buttonAreas = [
    { id: 'attack', x: bx, y: by, r: r + 4, key: 'Space' },           // Big attack button
    { id: 'interact', x: bx - 55, y: by, r: r, key: 'KeyE' },          // E interact
    { id: 'potion', x: bx, y: by - 55, r: r, key: 'KeyQ' },            // Potion
    { id: 'inv', x: bx - 55, y: by - 55, r: r - 4, key: 'KeyI' },      // Inventory
    { id: 'ability1', x: w / 2 - 50, y: h - 35, r: r - 4, key: 'Digit1' },
    { id: 'ability2', x: w / 2, y: h - 35, r: r - 4, key: 'Digit2' },
    { id: 'ability3', x: w / 2 + 50, y: h - 35, r: r - 4, key: 'Digit3' },
  ];
}

function toCanvasCoords(touch) {
  if (!canvasRect) return { x: 0, y: 0 };
  return {
    x: (touch.clientX - canvasRect.left) / scale,
    y: (touch.clientY - canvasRect.top) / scale,
  };
}

function handleTouchStart(e) {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const pos = toCanvasCoords(touch);

    // Check buttons first
    let hitButton = false;
    for (const btn of buttonAreas) {
      const dx = pos.x - btn.x;
      const dy = pos.y - btn.y;
      if (dx * dx + dy * dy < btn.r * btn.r * 1.5) {
        touchButtons[btn.key] = true;
        touchHeld[btn.key] = true;
        hitButton = true;
        break;
      }
    }

    // If no button hit and on left half, start joystick
    if (!hitButton && pos.x < 200) {
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
  // Release all held buttons (simple approach)
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

// Render touch controls overlay
export function renderTouchControls(ctx, width, height) {
  if (!isMobile) return;

  ctx.globalAlpha = 0.3;

  // Joystick base
  const jx = joystickArea.x;
  const jy = joystickArea.y;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(jx, jy, JOYSTICK_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Joystick knob
  const knobX = jx + joystick.dx * JOYSTICK_RADIUS;
  const knobY = jy + joystick.dy * JOYSTICK_RADIUS;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(knobX, knobY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Buttons
  for (const btn of buttonAreas) {
    ctx.fillStyle = touchHeld[btn.key] ? '#fff' : '#888';
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#000';
    ctx.font = `${btn.r * 0.8}px "Press Start 2P"`;
    ctx.textAlign = 'center';
    const label = BUTTONS.find(b => b.key === btn.key)?.label || '?';
    ctx.fillText(label, btn.x, btn.y + btn.r * 0.3);
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
