import { initInput, isKeyDown, isKeyPressed } from './input.js';
import { createTileMap, renderMap, isSolid, isPortal, TILE_SIZE } from './tilemap.js';
import { createCamera, updateCamera } from './camera.js';
import { villageMap } from './maps/village.js';
import { forestMap } from './maps/forest.js';
import { drawHero, drawNPC } from './sprites.js';
import { spawnEnemy, updateEnemies, renderEnemies } from './enemies.js';
import { playerAttackEnemies, enemyAttackPlayer, checkLevelUp } from './combat.js';
import { createParticle, updateParticles, renderParticles } from './particles.js';

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
  dt: 0,
  currentMap: null,
  camera: null,
  player: null,
  enemies: [],
  npcs: [],
  particles: [],
  projectiles: [],
  animFrame: 0,
  animTimer: 0,
  animSpeed: 0.15,
  totalTime: 0,
  boss: null,
  showHelp: false,
};

// --- Map Registry ---
const MAP_REGISTRY = {
  village: villageMap,
  forest: forestMap,
};

// --- Player Creation ---
function createPlayer(startX, startY) {
  return {
    x: startX * TILE_SIZE,
    y: startY * TILE_SIZE,
    hitW: 24,
    hitH: 28,
    facing: 'down',
    moving: false,
    attacking: false,
    attackTimer: 0,
    hp: 100,
    maxHp: 100,
    atk: 5,
    xp: 0,
    level: 1,
    coins: 0,
    potions: 3,
    artifacts: { earth: false, fire: false, water: false },
    cooldowns: { earth: 0, fire: 0, water: 0 },
    invincibleTimer: 0,
  };
}

// --- Load Map ---
function loadMap(mapKey, spawnX, spawnY) {
  const mapData = MAP_REGISTRY[mapKey];
  if (!mapData) return;

  const tileMap = createTileMap(mapData);
  game.currentMap = tileMap;

  // Create or reposition player
  const sx = spawnX !== undefined ? spawnX : tileMap.playerStart.x;
  const sy = spawnY !== undefined ? spawnY : tileMap.playerStart.y;

  if (game.player) {
    // Preserve stats, update position
    game.player.x = sx * TILE_SIZE;
    game.player.y = sy * TILE_SIZE;
  } else {
    game.player = createPlayer(sx, sy);
  }

  // Camera
  game.camera = createCamera(game.width, game.height);

  // NPCs from map data
  game.npcs = tileMap.npcs.map(n => ({
    ...n,
    x: n.col * TILE_SIZE,
    y: n.row * TILE_SIZE,
  }));

  // Enemies from spawns
  game.enemies = [];
  if (tileMap.spawns) {
    for (const s of tileMap.spawns) {
      const enemy = spawnEnemy(s.type, s.col, s.row);
      if (enemy) game.enemies.push(enemy);
    }
  }
}

// --- Collision ---
function collidesWithMap(x, y, w, h) {
  const map = game.currentMap;
  // Check all 4 corners
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + w - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + h - 1) / TILE_SIZE);

  return (
    isSolid(map, left, top) ||
    isSolid(map, right, top) ||
    isSolid(map, left, bottom) ||
    isSolid(map, right, bottom)
  );
}

// --- Check Portals ---
function checkPortals() {
  const p = game.player;
  const centerCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const centerRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
  const portal = isPortal(game.currentMap, centerCol, centerRow);
  if (portal) {
    loadMap(portal.target, portal.spawnX, portal.spawnY);
  }
}

// --- Update Player ---
const MOVE_SPEED = 120;

function updatePlayer(dt) {
  const p = game.player;
  if (!p) return;

  // Attack timer
  if (p.attacking) {
    p.attackTimer -= dt;
    if (p.attackTimer <= 0) {
      p.attacking = false;
    }
  }

  // Invincibility timer
  if (p.invincibleTimer > 0) {
    p.invincibleTimer -= dt;
  }

  // Cooldowns
  for (const key of Object.keys(p.cooldowns)) {
    if (p.cooldowns[key] > 0) p.cooldowns[key] -= dt;
  }

  // Movement
  let dx = 0;
  let dy = 0;

  if (isKeyDown('KeyW') || isKeyDown('ArrowUp')) dy -= 1;
  if (isKeyDown('KeyS') || isKeyDown('ArrowDown')) dy += 1;
  if (isKeyDown('KeyA') || isKeyDown('ArrowLeft')) dx -= 1;
  if (isKeyDown('KeyD') || isKeyDown('ArrowRight')) dx += 1;

  // Diagonal normalization
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  p.moving = dx !== 0 || dy !== 0;

  // Facing direction
  if (dy < 0) p.facing = 'up';
  else if (dy > 0) p.facing = 'down';
  else if (dx < 0) p.facing = 'left';
  else if (dx > 0) p.facing = 'right';

  // Apply movement with collision
  const moveX = dx * MOVE_SPEED * dt;
  const moveY = dy * MOVE_SPEED * dt;

  // X axis
  const newX = p.x + moveX;
  if (!collidesWithMap(newX, p.y, p.hitW, p.hitH)) {
    p.x = newX;
  }

  // Y axis
  const newY = p.y + moveY;
  if (!collidesWithMap(p.x, newY, p.hitW, p.hitH)) {
    p.y = newY;
  }

  // Attack
  if (isKeyPressed('Space') && !p.attacking) {
    p.attacking = true;
    p.attackTimer = 0.3;
  }

  // Portal check
  checkPortals();

  // Update camera
  updateCamera(
    game.camera,
    p.x + p.hitW / 2,
    p.y + p.hitH / 2,
    game.currentMap.width,
    game.currentMap.height
  );
}

// --- Menu ---
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

function renderMenu(ctx, dt) {
  const { width, height } = game;

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // Stars
  for (const star of stars) {
    star.brightness += star.speed * dt;
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(star.brightness));
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  }

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

// --- HUD ---
function renderHUD(ctx) {
  const p = game.player;
  if (!p) return;

  // Top bar background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, game.width, 36);

  // HP bar
  const hpBarX = 8;
  const hpBarY = 8;
  const hpBarW = 120;
  const hpBarH = 12;

  ctx.fillStyle = '#333';
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  const hpRatio = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = hpRatio > 0.3 ? '#cc2222' : '#ff4444';
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

  // HP text
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText(`HP ${p.hp}/${p.maxHp}`, hpBarX, hpBarY + hpBarH + 12);

  // XP bar
  const xpBarX = 140;
  const xpNeeded = p.level * 50;
  ctx.fillStyle = '#333';
  ctx.fillRect(xpBarX, hpBarY, 80, hpBarH);
  const xpRatio = Math.min(1, p.xp / xpNeeded);
  ctx.fillStyle = '#8844cc';
  ctx.fillRect(xpBarX, hpBarY, 80 * xpRatio, hpBarH);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(xpBarX, hpBarY, 80, hpBarH);

  // Level
  ctx.fillStyle = '#f0c040';
  ctx.fillText(`LV ${p.level}`, xpBarX, hpBarY + hpBarH + 12);

  // Coins
  ctx.fillStyle = '#f0c040';
  ctx.textAlign = 'left';
  ctx.fillText(`$ ${p.coins}`, 240, hpBarY + 10);

  // Potions
  ctx.fillStyle = '#44cc44';
  ctx.fillText(`POT ${p.potions}`, 310, hpBarY + 10);

  // Map name
  ctx.textAlign = 'right';
  ctx.fillStyle = '#aaa';
  ctx.fillText(game.currentMap ? game.currentMap.name : '', game.width - 8, hpBarY + 10);

  // Reset textAlign
  ctx.textAlign = 'left';
}

// --- Render Play State ---
function renderPlay(ctx) {
  const cam = game.camera;
  const map = game.currentMap;
  if (!map || !cam) return;

  // Clear
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, game.width, game.height);

  // Map tiles
  renderMap(ctx, map, cam, game.animFrame);

  // NPCs
  for (const npc of game.npcs) {
    const sx = npc.x - cam.x;
    const sy = npc.y - cam.y;
    // Only render if on screen
    if (sx > -TILE_SIZE && sx < game.width + TILE_SIZE &&
        sy > -TILE_SIZE && sy < game.height + TILE_SIZE) {
      drawNPC(ctx, sx, sy, npc.bodyColor, npc.headDetail);
      // Name label
      ctx.font = '8px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(npc.name, sx + TILE_SIZE / 2, sy - 4);
      ctx.textAlign = 'left';
    }
  }

  // Enemies
  renderEnemies(ctx, game.enemies, cam, game.animFrame);

  // Player
  const p = game.player;
  if (p) {
    const px = p.x - cam.x;
    const py = p.y - cam.y;
    // Blink when invincible
    const visible = p.invincibleTimer <= 0 || Math.floor(p.invincibleTimer * 10) % 2 === 0;
    if (visible) {
      drawHero(ctx, px, py, p.facing, p.moving ? game.animFrame : 0, p.attacking);
    }
  }

  // Particles
  renderParticles(ctx, game.particles, game.camera);

  // HUD on top
  renderHUD(ctx);
}

// --- Game Loop ---
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  game.dt = dt;
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
        loadMap('village');
      }
      break;

    case STATE.PLAY:
      updatePlayer(dt);
      updateEnemies(game.enemies, game.player, game.currentMap, dt);

      // --- Combat: player attacks ---
      {
        const killed = playerAttackEnemies(game.player, game.enemies);
        for (const enemy of killed) {
          game.player.xp += enemy.xp;
          game.player.coins += enemy.coins;
          game.particles.push(createParticle(enemy.x, enemy.y - 8, `+${enemy.xp} XP`, '#cc66ff'));
          game.particles.push(createParticle(enemy.x, enemy.y - 20, `+${enemy.coins} $`, '#f0c040'));
          // 20% potion drop
          if (Math.random() < 0.2) {
            game.player.potions++;
            game.particles.push(createParticle(enemy.x, enemy.y - 32, '+1 POT', '#44cc44'));
          }
          // Check level up
          if (checkLevelUp(game.player)) {
            game.particles.push(createParticle(
              game.player.x, game.player.y - 20,
              'LEVEL UP!', '#f0c040', 1.5
            ));
          }
        }
      }

      // --- Combat: enemy attacks player ---
      {
        const dmgTaken = enemyAttackPlayer(game.enemies, game.player, dt);
        if (dmgTaken > 0) {
          game.particles.push(createParticle(
            game.player.x, game.player.y - 8,
            `-${dmgTaken}`, '#ff4444'
          ));
          if (game.player.hp <= 0) {
            game.player.hp = 0;
            game.state = STATE.GAMEOVER;
          }
        }
      }

      // --- Potion use: KeyQ ---
      if (isKeyPressed('KeyQ') && game.player.potions > 0) {
        game.player.potions--;
        const heal = Math.min(30, game.player.maxHp - game.player.hp);
        game.player.hp += heal;
        game.particles.push(createParticle(
          game.player.x, game.player.y - 8,
          `+${heal} HP`, '#44cc44'
        ));
      }

      // --- Update particles ---
      updateParticles(game.particles, dt);

      renderPlay(ctx);
      break;

    case STATE.DIALOG:
    case STATE.INVENTORY:
      // Placeholders for future tasks
      break;

    case STATE.GAMEOVER:
      // Keep rendering the play scene underneath
      renderPlay(ctx);
      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, game.width, game.height);
      // GAME OVER text
      ctx.font = '24px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cc2222';
      ctx.fillText('GAME OVER', game.width / 2, game.height / 2 - 20);
      // Prompt
      {
        const blink = Math.sin(game.totalTime * 3) > 0;
        if (blink) {
          ctx.font = '12px "Press Start 2P"';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('НАЖМИ ENTER', game.width / 2, game.height / 2 + 30);
        }
      }
      ctx.textAlign = 'left';
      // Return to menu on Enter
      if (isKeyPressed('Enter')) {
        game.state = STATE.MENU;
        game.player = null;
        game.enemies = [];
        game.particles = [];
      }
      break;

    case STATE.WIN:
      // Placeholder for future tasks
      break;
  }

  requestAnimationFrame(gameLoop);
}

// --- Start Game ---
function startGame() {
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

startGame();
