import { initInput, isKeyDown, isKeyPressed } from './input.js';
import { createTileMap, renderMap, isSolid, isPortal, TILE_SIZE } from './tilemap.js';
import { createCamera, updateCamera } from './camera.js';
import { villageMap } from './maps/village.js';
import { forestMap } from './maps/forest.js';
import { drawHero, drawNPC } from './sprites.js';
import { spawnEnemy, updateEnemies, renderEnemies } from './enemies.js';
import { playerAttackEnemies, enemyAttackPlayer, checkLevelUp } from './combat.js';
import { createParticle, updateParticles, renderParticles } from './particles.js';
import { getNearbyNPC } from './npc.js';
import { openDialog, isDialogOpen, dialogInput, renderDialog, closeDialog } from './dialog.js';
import { useAbility, updateProjectiles, updateCooldowns, updateSlowTimers, renderProjectiles, renderAbilityBar } from './abilities.js';
import { createBoss, updateBoss, renderBoss, renderBossHPBar } from './bosses.js';

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

  // Boss from map data
  game.boss = null;
  if (mapData.boss) {
    game.boss = createBoss(mapData.boss.type, mapData.boss.col, mapData.boss.row);
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

// --- Dialog Actions ---
function handleDialogAction(action) {
  const p = game.player;
  if (!p) return;

  if (action === 'buy_potion') {
    if (p.coins >= 10) {
      p.coins -= 10;
      p.potions++;
      game.particles.push(createParticle(p.x, p.y - 8, '+1 зелье', '#44cc44'));
    } else {
      game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
    }
  } else if (action === 'buy_big_potion') {
    if (p.coins >= 25) {
      p.coins -= 25;
      const heal = Math.min(60, p.maxHp - p.hp);
      p.hp += heal;
      game.particles.push(createParticle(p.x, p.y - 8, '+60 HP', '#44cc44'));
    } else {
      game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
    }
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

  // Boss
  if (game.boss && game.boss.alive) {
    renderBoss(ctx, game.boss, cam, game.animFrame);
  }

  // Projectiles
  renderProjectiles(ctx, game.projectiles, cam);

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

  // Ability bar
  renderAbilityBar(ctx, game.player, game.width, game.height);

  // Boss HP bar (on top of HUD)
  if (game.boss && game.boss.alive) {
    renderBossHPBar(ctx, game.boss, game.width);
  }
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

      // --- Abilities ---
      if (isKeyPressed('Digit1')) useAbility('earth', game.player, game.projectiles, game.enemies);
      if (isKeyPressed('Digit2')) useAbility('fire', game.player, game.projectiles, game.enemies);
      if (isKeyPressed('Digit3')) useAbility('water', game.player, game.projectiles, game.enemies);
      {
        const projKilled = updateProjectiles(game.projectiles, game.enemies, dt);
        for (const enemy of projKilled) {
          game.player.xp += enemy.xp;
          game.player.coins += enemy.coins;
          game.particles.push(createParticle(enemy.x, enemy.y - 8, `+${enemy.xp} XP`, '#cc66ff'));
          game.particles.push(createParticle(enemy.x, enemy.y - 20, `+${enemy.coins} $`, '#f0c040'));
          if (Math.random() < 0.2) {
            game.player.potions++;
            game.particles.push(createParticle(enemy.x, enemy.y - 32, '+1 POT', '#44cc44'));
          }
          if (checkLevelUp(game.player)) {
            game.particles.push(createParticle(
              game.player.x, game.player.y - 20,
              'LEVEL UP!', '#f0c040', 1.5
            ));
          }
        }
      }
      updateCooldowns(game.player, dt);
      updateSlowTimers(game.enemies, dt);

      // --- Boss ---
      if (game.boss && game.boss.alive) {
        updateBoss(game.boss, game.player, game.projectiles, dt);

        // Boss melee damage to player
        if (game.player.invincibleTimer <= 0) {
          const bx = game.boss.x + game.boss.width / 2;
          const by = game.boss.y + game.boss.height / 2;
          const px = game.player.x + game.player.hitW / 2;
          const py = game.player.y + game.player.hitH / 2;
          const d = Math.sqrt((px - bx) ** 2 + (py - by) ** 2);
          if (d < 40) {
            const phase = game.boss.phases[game.boss.phaseIndex];
            const dmg = phase.atk;
            game.player.hp -= dmg;
            game.player.invincibleTimer = 0.5;
            // Knockback
            const angle = Math.atan2(py - by, px - bx);
            game.player.x += Math.cos(angle) * 30;
            game.player.y += Math.sin(angle) * 30;
            game.particles.push(createParticle(game.player.x, game.player.y - 8, `-${dmg}`, '#ff4444'));
            if (game.player.hp <= 0) {
              game.player.hp = 0;
              game.state = STATE.GAMEOVER;
            }
          }
        }

        // Player sword hits boss
        if (game.player.attacking) {
          const cx = game.player.x + game.player.hitW / 2;
          const cy = game.player.y + game.player.hitH / 2;
          let hx = cx, hy = cy;
          const range = 48;
          switch (game.player.facing) {
            case 'up':    hy -= range / 2; break;
            case 'down':  hy += range / 2; break;
            case 'left':  hx -= range / 2; break;
            case 'right': hx += range / 2; break;
          }
          const bx = game.boss.x + game.boss.width / 2;
          const by = game.boss.y + game.boss.height / 2;
          const d = Math.sqrt((hx - bx) ** 2 + (hy - by) ** 2);
          if (d < range + 20) {
            game.boss.hp -= game.player.atk;
            game.boss.hitTimer = 0.3;
            game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `-${game.player.atk}`, '#ffffff'));
            if (game.boss.hp <= 0) {
              game.boss.alive = false;
              // Rewards
              game.player.xp += game.boss.xp;
              game.player.coins += game.boss.coins;
              game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `+${game.boss.xp} XP`, '#cc66ff'));
              game.particles.push(createParticle(game.boss.x, game.boss.y - 20, `+${game.boss.coins} $`, '#f0c040'));
              // Grant artifact
              if (game.boss.artifact) {
                game.player.artifacts[game.boss.artifact] = true;
                game.particles.push(createParticle(game.boss.x, game.boss.y - 32, `${game.boss.artifact.toUpperCase()}!`, '#f0c040', 2));
              }
              if (checkLevelUp(game.player)) {
                game.particles.push(createParticle(game.player.x, game.player.y - 20, 'LEVEL UP!', '#f0c040', 1.5));
              }
              // Win condition
              if (game.boss.type === 'dark_mage') {
                game.state = STATE.WIN;
              }
            }
          }
        }

        // Boss projectiles hit player
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
          const proj = game.projectiles[i];
          if (!proj.fromBoss) continue;
          const px = game.player.x + game.player.hitW / 2;
          const py = game.player.y + game.player.hitH / 2;
          const prx = proj.x + proj.width / 2;
          const pry = proj.y + proj.height / 2;
          const d = Math.sqrt((px - prx) ** 2 + (py - pry) ** 2);
          if (d < 24 && game.player.invincibleTimer <= 0) {
            game.player.hp -= proj.damage;
            game.player.invincibleTimer = 0.5;
            game.particles.push(createParticle(game.player.x, game.player.y - 8, `-${proj.damage}`, '#ff4444'));
            game.projectiles.splice(i, 1);
            if (game.player.hp <= 0) {
              game.player.hp = 0;
              game.state = STATE.GAMEOVER;
            }
          }
        }
      }

      // --- NPC interaction ---
      if (isKeyPressed('KeyE')) {
        const nearNPC = getNearbyNPC(game.npcs, game.player.x, game.player.y);
        if (nearNPC) {
          if (openDialog(nearNPC.id, nearNPC.name, handleDialogAction)) {
            game.state = STATE.DIALOG;
          }
        }
      }

      // --- Update particles ---
      updateParticles(game.particles, dt);

      renderPlay(ctx);

      // --- NPC proximity prompt ---
      {
        const nearNPC = getNearbyNPC(game.npcs, game.player.x, game.player.y);
        if (nearNPC) {
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd54f';
          ctx.fillText('[E] Говорить', game.width / 2, game.height - 20);
          ctx.textAlign = 'left';
        }
      }
      break;

    case STATE.DIALOG:
      // Dialog input handling
      if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) dialogInput('up');
      if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) dialogInput('down');
      if (isKeyPressed('Enter') || isKeyPressed('Space') || isKeyPressed('KeyE')) dialogInput('confirm');

      // Return to play if dialog closed
      if (!isDialogOpen()) {
        game.state = STATE.PLAY;
      }

      // Render play scene underneath + dialog overlay
      updateParticles(game.particles, dt);
      renderPlay(ctx);
      renderDialog(ctx, game.width, game.height);
      break;

    case STATE.INVENTORY:
      // Placeholder for future tasks
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
      renderPlay(ctx);
      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, game.width, game.height);
      // Victory text
      ctx.font = '24px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0c040';
      ctx.fillText('ПОБЕДА!', game.width / 2, game.height / 2 - 50);
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Тёмный маг повержен!', game.width / 2, game.height / 2);
      ctx.fillText('Эльдория спасена!', game.width / 2, game.height / 2 + 24);
      // Blinking prompt
      {
        const blink = Math.sin(game.totalTime * 3) > 0;
        if (blink) {
          ctx.font = '12px "Press Start 2P"';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('НАЖМИ ENTER', game.width / 2, game.height / 2 + 70);
        }
      }
      ctx.textAlign = 'left';
      if (isKeyPressed('Enter')) {
        game.state = STATE.MENU;
        game.player = null;
        game.enemies = [];
        game.particles = [];
        game.projectiles = [];
        game.boss = null;
      }
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
