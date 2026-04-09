import { initInput, isKeyPressed } from './input.js';

// --- Game States ---
export const STATE = {
  MENU: 'MENU',
  PLAY: 'PLAY',
  DIALOG: 'DIALOG',
  INVENTORY: 'INVENTORY',
  GAMEOVER: 'GAMEOVER',
  WIN: 'WIN',
};

export const game = {
  state: STATE.MENU,
  canvas: null,
  ctx: null,
  width: 640,
  height: 480,
  animFrame: 0,
  animTimer: 0,
  animSpeed: 0.15,
  totalTime: 0,
};

// --- Menu Data ---
const stars = [];
const NUM_STARS = 80;

function initStars() {
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random() * game.width,
      y: Math.random() * game.height * 0.6,
      size: Math.random() * 2 + 1,
      brightness: Math.random(),
      speed: 0.3 + Math.random() * 0.7,
    });
  }
}

// --- Mountain Silhouette ---
function drawMountains(ctx) {
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(0, 350);
  ctx.lineTo(60, 280);
  ctx.lineTo(120, 320);
  ctx.lineTo(200, 250);
  ctx.lineTo(260, 300);
  ctx.lineTo(320, 220);
  ctx.lineTo(380, 270);
  ctx.lineTo(440, 230);
  ctx.lineTo(500, 280);
  ctx.lineTo(560, 260);
  ctx.lineTo(640, 310);
  ctx.lineTo(640, 480);
  ctx.lineTo(0, 480);
  ctx.closePath();
  ctx.fill();

  // Darker foreground mountains
  ctx.fillStyle = '#0f0f23';
  ctx.beginPath();
  ctx.moveTo(0, 380);
  ctx.lineTo(80, 340);
  ctx.lineTo(150, 370);
  ctx.lineTo(240, 310);
  ctx.lineTo(310, 360);
  ctx.lineTo(400, 330);
  ctx.lineTo(480, 360);
  ctx.lineTo(550, 340);
  ctx.lineTo(640, 370);
  ctx.lineTo(640, 480);
  ctx.lineTo(0, 480);
  ctx.closePath();
  ctx.fill();
}

// --- Menu Render ---
function renderMenu(ctx, dt) {
  const { width, height } = game;

  // Background
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // Stars
  for (const star of stars) {
    star.brightness += star.speed * dt;
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(star.brightness));
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  }

  // Mountains
  drawMountains(ctx);

  // Title shadow
  ctx.font = '24px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2a1a00';
  ctx.fillText('ХРОНИКИ', width / 2 + 2, 122);
  ctx.fillText('ЭЛЬДОРИИ', width / 2 + 2, 162);

  // Title
  ctx.fillStyle = '#f0c040';
  ctx.fillText('ХРОНИКИ', width / 2, 120);
  ctx.fillText('ЭЛЬДОРИИ', width / 2, 160);

  // Blinking prompt
  const blink = Math.sin(game.totalTime * 3) > 0;
  if (blink) {
    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('НАЖМИ ENTER', width / 2, 340);
  }

  // Footer
  ctx.font = '10px "Press Start 2P"';
  ctx.fillStyle = '#555';
  ctx.fillText('VOVA GAMES 2026', width / 2, 460);
}

// --- Game Loop ---
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  game.totalTime += dt;

  // Animation frame counter
  game.animTimer += dt;
  if (game.animTimer >= game.animSpeed) {
    game.animTimer -= game.animSpeed;
    game.animFrame = (game.animFrame + 1) % 4;
  }

  const { ctx } = game;

  switch (game.state) {
    case STATE.MENU:
      renderMenu(ctx, dt);
      if (isKeyPressed('Enter')) {
        game.state = STATE.PLAY;
      }
      break;

    case STATE.PLAY:
      // Placeholder — will be implemented in later tasks
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.font = '14px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0c040';
      ctx.fillText('ИГРА ЗАГРУЖАЕТСЯ...', game.width / 2, game.height / 2);
      break;

    case STATE.DIALOG:
    case STATE.INVENTORY:
    case STATE.GAMEOVER:
    case STATE.WIN:
      // Placeholders for future tasks
      break;
  }

  requestAnimationFrame(gameLoop);
}

// --- Init ---
function init() {
  game.canvas = document.getElementById('game');
  game.ctx = game.canvas.getContext('2d');
  game.width = game.canvas.width;
  game.height = game.canvas.height;

  initInput();
  initStars();

  requestAnimationFrame((timestamp) => {
    lastTime = timestamp;
    gameLoop(timestamp);
  });
}

init();
