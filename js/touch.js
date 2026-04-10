// ============================================================
// touch.js — Mobile Touch Controls (Virtual Joystick + Buttons)
// ============================================================

import { vibrate, HAPTIC_TAP } from './haptics.js';

let joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
let touchButtons = {};  // button name → pressed this frame
let touchHeld = {};     // button name → currently held
let isMobile = false;
let tapAnywhereMode = false;

// Joystick flick detection for menu/dialog navigation
let lastFlickX = 0;
let lastFlickY = 0;
const FLICK_THRESHOLD = 0.5;

const JOYSTICK_RADIUS = 50;
const DEAD_ZONE = 8;

// Panel dimensions (set in updateLayout)
let leftPanelW = 0;
let rightPanelW = 0;
let gameAreaX = 0; // offset where game renders

let buttonAreas = [];
let menuButtonAreas = [];
let joystickArea = { x: 0, y: 0 };
let canvasRect = null;
let scaleX = 1;
let scaleY = 1;

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

// Returns the X offset for game rendering (left panel width)
export function getGameOffsetX() {
  return isMobile ? leftPanelW : 0;
}

// Returns total canvas width (game + panels)
export function getMobileCanvasWidth() {
  return isMobile ? (leftPanelW + 640 + rightPanelW) : 640;
}

export function initTouchControls(canvas) {
  if (!isMobile) return;

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  const doLayout = () => updateLayout(canvas);
  const doLayoutDelayed = () => {
    setTimeout(doLayout, 150);
    setTimeout(doLayout, 500);
  };
  doLayout();
  window.addEventListener('resize', doLayout);
  window.addEventListener('orientationchange', doLayoutDelayed);
  screen.orientation?.addEventListener('change', doLayoutDelayed);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', doLayout);
  }
}

function updateLayout(canvas) {
  canvasRect = canvas.getBoundingClientRect();
  if (canvasRect.width === 0) return;
  scaleX = canvasRect.width / canvas.width;
  scaleY = canvasRect.height / canvas.height;

  const w = canvas.width;
  const h = canvas.height;

  // Calculate panel sizes based on actual canvas dimensions
  // Game area is always 640 wide, panels fill the rest
  leftPanelW = Math.floor((w - 640) / 2);
  rightPanelW = w - 640 - leftPanelW;
  gameAreaX = leftPanelW;

  // Joystick centered in left panel
  const jx = leftPanelW / 2;
  const jy = h * 0.6;
  joystickArea = { x: jx, y: jy };

  // Right panel buttons — ergonomic layout for right thumb
  const rpCenter = 640 + leftPanelW + rightPanelW / 2;
  const R = 28;

  // Diamond layout for main actions (right thumb zone, lower area)
  const mainY = h * 0.6;
  buttonAreas = [
    // Main attack — big center button
    { id: 'attack', x: rpCenter, y: mainY, r: R + 8, key: 'Space', label: '⚔', color: '#e74c3c' },
    // Around the attack button
    { id: 'interact', x: rpCenter - 52, y: mainY, r: R - 2, key: 'KeyE', label: 'E', color: '#3498db' },
    { id: 'potion', x: rpCenter, y: mainY - 52, r: R - 2, key: 'KeyQ', label: '♥', color: '#2ecc71' },
    { id: 'inv', x: rpCenter + 52, y: mainY, r: R - 2, key: 'KeyI', label: 'I', color: '#9b59b6' },

    // Abilities row — top of right panel
    { id: 'ability1', x: rpCenter - 42, y: h * 0.18, r: R - 6, key: 'Digit1', label: '1', color: '#8d6e63' },
    { id: 'ability2', x: rpCenter, y: h * 0.18, r: R - 6, key: 'Digit2', label: '2', color: '#ef6c00' },
    { id: 'ability3', x: rpCenter + 42, y: h * 0.18, r: R - 6, key: 'Digit3', label: '3', color: '#0288d1' },

    // Quest log and Menu — top corners of right panel
    { id: 'quest', x: rpCenter + 42, y: h * 0.06, r: R - 8, key: 'KeyJ', label: 'J', color: '#f0c040' },
    { id: 'menu', x: rpCenter - 42, y: h * 0.06, r: R - 8, key: 'Escape', label: '☰', color: '#aaa' },
  ];

  // Left panel extra buttons
  // Music toggle — top of left panel
  buttonAreas.push(
    { id: 'music', x: leftPanelW / 2, y: h * 0.06, r: R - 8, key: 'KeyM', label: 'M', color: '#666' },
    { id: 'help', x: leftPanelW / 2, y: h * 0.18, r: R - 8, key: 'KeyH', label: '?', color: '#666' },
  );

  // Menu touch areas (centered in game area)
  const gameCenterX = gameAreaX + 320;
  menuButtonAreas = [
    { id: 'start',    x: gameCenterX, y: 290, r: 60, w: 260, h: 46, key: 'Enter', label: 'ИГРАТЬ'         },
    { id: 'continue', x: gameCenterX, y: 345, r: 60, w: 260, h: 38, key: 'KeyC',  label: 'ПРОДОЛЖИТЬ'     },
    { id: 'sandbox',  x: gameCenterX, y: 393, r: 60, w: 200, h: 34, key: 'KeyS',  label: 'ПЕСОЧНИЦА'      },
    { id: 'coop',     x: gameCenterX, y: 437, r: 60, w: 200, h: 34, key: 'KeyN',  label: 'КООП'           },
  ];
}

function toCanvasCoords(touch) {
  if (!canvasRect) return { x: 0, y: 0 };
  return {
    x: (touch.clientX - canvasRect.left) / scaleX,
    y: (touch.clientY - canvasRect.top) / scaleY,
  };
}

function hitMenuButton(pos, btn) {
  const halfW = btn.w / 2;
  const halfH = btn.h / 2;
  return pos.x >= btn.x - halfW && pos.x <= btn.x + halfW &&
         pos.y >= btn.y - halfH && pos.y <= btn.y + halfH;
}

function handleTouchStart(e) {
  e.preventDefault();

  if (tapAnywhereMode) {
    touchButtons['Space'] = true;
    return;
  }

  for (const touch of e.changedTouches) {
    const pos = toCanvasCoords(touch);

    // Check menu buttons first
    for (const btn of menuButtonAreas) {
      if (hitMenuButton(pos, btn)) {
        touchButtons[btn.key] = true;
        touchHeld[btn.key] = true;
        vibrate(HAPTIC_TAP);
        return;
      }
    }

    // Check game buttons
    let hitButton = false;
    for (const btn of buttonAreas) {
      const dx = pos.x - btn.x;
      const dy = pos.y - btn.y;
      // Минимальный hit-radius 20px — гарантирует, что на узких экранах
      // (Galaxy S20, iPhone SE) мелкие кнопки всё равно остаются тапабельными
      const effR = Math.max(btn.r, 20);
      if (dx * dx + dy * dy < effR * effR * 3.0) {
        touchButtons[btn.key] = true;
        touchHeld[btn.key] = true;
        hitButton = true;
        vibrate(HAPTIC_TAP);
        break;
      }
    }

    // If no button hit and in left panel area, start joystick
    if (!hitButton && pos.x < leftPanelW + 40) {
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
  touchHeld = {};
}

// Called by input.js
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

export function getJoystickFlick() {
  let flickX = 0, flickY = 0;
  const curX = joystick.dx > FLICK_THRESHOLD ? 1 : (joystick.dx < -FLICK_THRESHOLD ? -1 : 0);
  const curY = joystick.dy > FLICK_THRESHOLD ? 1 : (joystick.dy < -FLICK_THRESHOLD ? -1 : 0);
  if (curX !== 0 && lastFlickX === 0) flickX = curX;
  if (curY !== 0 && lastFlickY === 0) flickY = curY;
  lastFlickX = curX;
  lastFlickY = curY;
  return { dx: flickX, dy: flickY };
}

// --- Render ---

// Render side panels background
export function renderMobilePanels(ctx, width, height) {
  if (!isMobile || leftPanelW <= 0) return;

  // Left panel — dark background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, leftPanelW, height);

  // Right panel
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(leftPanelW + 640, 0, rightPanelW, height);

  // Subtle border lines
  ctx.fillStyle = '#222';
  ctx.fillRect(leftPanelW - 1, 0, 2, height);
  ctx.fillRect(leftPanelW + 640, 0, 2, height);
}

// Render gameplay touch controls (on panels)
export function renderTouchControls(ctx, width, height) {
  if (!isMobile) return;

  // Joystick
  const jx = joystickArea.x;
  const jy = joystickArea.y;

  // Joystick base
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(jx, jy, JOYSTICK_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#556';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(jx, jy, JOYSTICK_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Joystick knob
  const knobX = jx + joystick.dx * JOYSTICK_RADIUS;
  const knobY = jy + joystick.dy * JOYSTICK_RADIUS;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#aab';
  ctx.beginPath();
  ctx.arc(knobX, knobY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Action buttons
  for (const btn of buttonAreas) {
    const held = touchHeld[btn.key];

    ctx.globalAlpha = held ? 0.7 : 0.35;
    ctx.fillStyle = btn.color;
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#556';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(9, btn.r * 0.55)}px "Press Start 2P"`;
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
  const start = menuButtonAreas[0];
  drawMenuButton(ctx, start.x, start.y, start.w, start.h, start.label, '#f0c040', '#000');

  if (hasSaveData) {
    const cont = menuButtonAreas[1];
    drawMenuButton(ctx, cont.x, cont.y, cont.w, cont.h, cont.label, '#3498db', '#fff');
  }

  const sandbox = menuButtonAreas[2];
  drawMenuButton(ctx, sandbox.x, sandbox.y, sandbox.w, sandbox.h, sandbox.label, '#b388ff', '#000');

  const coop = menuButtonAreas[3];
  drawMenuButton(ctx, coop.x, coop.y, coop.w, coop.h, coop.label, '#1a6aaa', '#fff');

  ctx.globalAlpha = 1;
}

function drawMenuButton(ctx, x, y, w, h, label, bgColor, textColor) {
  const halfW = w / 2;
  const halfH = h / 2;

  ctx.fillStyle = bgColor;
  ctx.globalAlpha = 0.85;
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

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = textColor;
  ctx.font = `${Math.min(13, h * 0.4)}px "Press Start 2P"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
