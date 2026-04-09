// ============================================================
// enemies.js — Enemy System with AI Patterns
// ============================================================

import { drawSlime, drawWolf, drawSkeleton, drawGolem } from './sprites.js';
import { TILE_SIZE, isSolid } from './tilemap.js';

// --- Human enemy sprites (drawn inline) ---

function drawBandit(ctx, x, y, facing, frame, weapon) {
  const s = 2;
  ctx.save();
  ctx.translate(x, y);
  const mirror = facing === 'left';
  if (mirror) { ctx.scale(-1, 1); ctx.translate(-32, 0); }

  // Head (skin)
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(6*s, 1*s, 4*s, 5*s);
  // Bandana
  ctx.fillStyle = '#c62828';
  ctx.fillRect(5*s, 0, 6*s, 2*s);
  // Eyes
  ctx.fillStyle = '#222';
  ctx.fillRect(7*s, 3*s, 1*s, 1*s);
  ctx.fillRect(9*s, 3*s, 1*s, 1*s);
  // Body (dark leather)
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(5*s, 6*s, 6*s, 6*s);
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(6*s, 7*s, 4*s, 4*s);
  // Arms
  const armBob = frame % 2 === 0 ? 0 : s;
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(4*s, 7*s + armBob, 1*s, 4*s);
  ctx.fillRect(11*s, 7*s - armBob, 1*s, 4*s);
  // Legs
  ctx.fillStyle = '#333';
  ctx.fillRect(6*s, 12*s, 2*s, 4*s);
  ctx.fillRect(9*s, 12*s, 2*s, 4*s);
  // Boots
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(5*s, 15*s, 3*s, 2*s);
  ctx.fillRect(8*s, 15*s, 3*s, 2*s);

  // Weapon
  if (weapon === 'sword') {
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(12*s, 4*s - armBob, 1*s, 8*s);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(11.5*s, 11*s - armBob, 2*s, 2*s);
  } else if (weapon === 'spear') {
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(12*s, 0 - armBob, 1*s, 14*s);
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(11.5*s, -2*s - armBob, 2*s, 3*s);
  } else if (weapon === 'bow') {
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(12*s, 4*s, 1.5*s, 8*s);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(13*s, 4*s, 0.5*s, 8*s);
  } else if (weapon === 'axe') {
    // Axe handle
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(12*s, 2*s - armBob, 1*s, 10*s);
    // Axe head
    ctx.fillStyle = '#777';
    ctx.fillRect(11*s, 0 - armBob, 4*s, 3*s);
    ctx.fillStyle = '#999';
    ctx.fillRect(10.5*s, 0 - armBob, 1.5*s, 3*s);
  }

  ctx.restore();
}

function drawDarkArcher(ctx, x, y, facing, frame) {
  drawBandit(ctx, x, y, facing, frame, 'bow');
}

function drawDarkSwordsman(ctx, x, y, facing, frame) {
  drawBandit(ctx, x, y, facing, frame, 'sword');
}

function drawDarkSpearman(ctx, x, y, facing, frame) {
  drawBandit(ctx, x, y, facing, frame, 'spear');
}

function drawDarkAxeman(ctx, x, y, facing, frame) {
  drawBandit(ctx, x, y, facing, frame, 'axe');
}

// --- Enemy Type Definitions ---
const ENEMY_TYPES = {
  slime:    { hp: 30, maxHp: 30, atk: 5,  speed: 40,  xp: 10, coins: 3,  width: 28, height: 26, draw: drawSlime,    ai: 'hop',        aggroRange: 150 },
  wolf:     { hp: 25, maxHp: 25, atk: 8,  speed: 100, xp: 15, coins: 5,  width: 36, height: 28, draw: drawWolf,     ai: 'chase',      aggroRange: 200 },
  skeleton: { hp: 40, maxHp: 40, atk: 10, speed: 50,  xp: 25, coins: 7,  width: 32, height: 40, draw: drawSkeleton, ai: 'patrol',     aggroRange: 160, loot: { weaponId: 'skeleton_sword', dropChance: 0.4 } },
  golem:    { hp: 80, maxHp: 80, atk: 18, speed: 25,  xp: 50, coins: 10, width: 32, height: 40, draw: drawGolem,    ai: 'slow_chase', aggroRange: 120 },

  // Human enemies
  bandit_sword: {
    hp: 45, maxHp: 45, atk: 12, speed: 65, xp: 30, coins: 12,
    width: 32, height: 34,
    draw: (ctx, x, y, f) => drawDarkSwordsman(ctx, x, y, 'right', f),
    drawFacing: drawDarkSwordsman,
    ai: 'swordsman', aggroRange: 170,
    weapon: 'sword', blockChance: 0.2,
    loot: { weaponId: 'bandit_sword', dropChance: 1.0 },
  },
  bandit_spear: {
    hp: 35, maxHp: 35, atk: 14, speed: 55, xp: 35, coins: 14,
    width: 32, height: 34,
    draw: (ctx, x, y, f) => drawDarkSpearman(ctx, x, y, 'right', f),
    drawFacing: drawDarkSpearman,
    ai: 'spearman', aggroRange: 180,
    weapon: 'spear', blockChance: 0.1,
    loot: { weaponId: 'bandit_spear', dropChance: 1.0 },
  },
  bandit_archer: {
    hp: 30, maxHp: 30, atk: 10, speed: 50, xp: 35, coins: 15,
    width: 32, height: 34,
    draw: (ctx, x, y, f) => drawDarkArcher(ctx, x, y, 'right', f),
    drawFacing: drawDarkArcher,
    ai: 'archer', aggroRange: 220,
    weapon: 'bow', shootInterval: 2.0,
    loot: { weaponId: 'bandit_bow', dropChance: 1.0 },
  },
  bandit_axe: {
    hp: 55, maxHp: 55, atk: 16, speed: 45, xp: 40, coins: 18,
    width: 32, height: 34,
    draw: (ctx, x, y, f) => drawDarkAxeman(ctx, x, y, 'right', f),
    drawFacing: drawDarkAxeman,
    ai: 'swordsman', aggroRange: 160,
    weapon: 'axe', blockChance: 0.15,
    loot: { weaponId: 'bandit_axe', dropChance: 1.0 },
  },
};

// --- Spawn Enemy Instance ---
export function spawnEnemy(type, col, row) {
  const template = ENEMY_TYPES[type];
  if (!template) {
    console.warn(`Unknown enemy type: ${type}`);
    return null;
  }
  return {
    type,
    ...template,
    x: col * TILE_SIZE,
    y: row * TILE_SIZE,
    originX: col * TILE_SIZE,
    originY: row * TILE_SIZE,
    facing: 'left',
    alive: true,
    hitTimer: 0,
    moveTimer: 0,
    patrolDir: 1,
    patrolDist: 0,
    slowTimer: 0,
    // Human enemy extras
    attackTimer: 0,
    attacking: false,
    shootTimer: template.shootInterval || 0,
    blocked: false,
  };
}

// --- Helper: distance between two points ---
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Helper: check if enemy can move to position ---
function canMoveTo(x, y, w, h, map) {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + w - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + h - 1) / TILE_SIZE);
  return (
    !isSolid(map, left, top) &&
    !isSolid(map, right, top) &&
    !isSolid(map, left, bottom) &&
    !isSolid(map, right, bottom)
  );
}

// --- Move enemy toward target with collision ---
function moveToward(enemy, tx, ty, speed, map, dt) {
  const dx = tx - enemy.x;
  const dy = ty - enemy.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 2) return;

  const vx = (dx / d) * speed * dt;
  const vy = (dy / d) * speed * dt;

  // X axis
  const newX = enemy.x + vx;
  if (canMoveTo(newX, enemy.y, enemy.width, enemy.height, map)) {
    enemy.x = newX;
  }
  // Y axis
  const newY = enemy.y + vy;
  if (canMoveTo(enemy.x, newY, enemy.width, enemy.height, map)) {
    enemy.y = newY;
  }

  // Facing
  if (dx < 0) enemy.facing = 'left';
  else if (dx > 0) enemy.facing = 'right';
}

// --- AI: Hop (slime) ---
function aiHop(enemy, player, map, dt) {
  const d = dist(enemy.x, enemy.y, player.x, player.y);
  if (d > enemy.aggroRange) return;

  enemy.moveTimer -= dt;
  if (enemy.moveTimer <= 0) {
    enemy.moveTimer = 1.5;
    // Jump toward player in a burst
    moveToward(enemy, player.x, player.y, enemy.speed * 8, map, 0.08);
  }
}

// --- AI: Chase (wolf) ---
function aiChase(enemy, player, map, dt) {
  const d = dist(enemy.x, enemy.y, player.x, player.y);
  if (d > enemy.aggroRange) return;
  moveToward(enemy, player.x, player.y, enemy.speed, map, dt);
}

// --- AI: Slow Chase (golem) ---
function aiSlowChase(enemy, player, map, dt) {
  const d = dist(enemy.x, enemy.y, player.x, player.y);
  if (d > enemy.aggroRange) return;
  moveToward(enemy, player.x, player.y, enemy.speed, map, dt);
}

// --- AI: Patrol (skeleton) ---
function aiPatrol(enemy, player, map, dt) {
  const d = dist(enemy.x, enemy.y, player.x, player.y);

  if (d <= enemy.aggroRange) {
    // Switch to chase when player in range
    moveToward(enemy, player.x, player.y, enemy.speed * 1.5, map, dt);
    return;
  }

  // Patrol back and forth horizontally
  const patrolSpeed = enemy.speed * 0.5;
  const step = patrolSpeed * dt * enemy.patrolDir;
  const newX = enemy.x + step;

  if (canMoveTo(newX, enemy.y, enemy.width, enemy.height, map)) {
    enemy.x = newX;
    enemy.patrolDist += Math.abs(step);
  } else {
    enemy.patrolDir *= -1;
    enemy.patrolDist = 0;
  }

  // Reverse direction after ~3 tiles
  if (enemy.patrolDist > TILE_SIZE * 3) {
    enemy.patrolDir *= -1;
    enemy.patrolDist = 0;
  }

  enemy.facing = enemy.patrolDir > 0 ? 'right' : 'left';
}

// --- AI: Swordsman (approach, swing, retreat) ---
function aiSwordsman(enemy, player, map, dt) {
  const d = dist(enemy.x, enemy.y, player.x, player.y);
  if (d > enemy.aggroRange) {
    aiPatrol(enemy, player, map, dt);
    return;
  }

  // Attack cooldown
  if (enemy.attackTimer > 0) {
    enemy.attackTimer -= dt;
    // Brief retreat after attacking
    if (enemy.attackTimer > 0.2) {
      moveToward(enemy, enemy.x - (player.x - enemy.x) * 0.5, enemy.y - (player.y - enemy.y) * 0.5, enemy.speed * 0.5, map, dt);
    }
    return;
  }

  if (d < 40) {
    // In melee range — attack!
    enemy.attacking = true;
    enemy.attackTimer = 1.2; // cooldown
    setTimeout(() => { enemy.attacking = false; }, 300);
  } else {
    // Approach with circling
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const circleOffset = Math.sin(Date.now() * 0.003) * 30;
    const tx = player.x + Math.cos(angle + Math.PI/2) * circleOffset;
    const ty = player.y + Math.sin(angle + Math.PI/2) * circleOffset;
    moveToward(enemy, tx, ty, enemy.speed, map, dt);
  }
}

// --- AI: Spearman (keep distance, lunge) ---
function aiSpearman(enemy, player, map, dt) {
  const d = dist(enemy.x, enemy.y, player.x, player.y);
  if (d > enemy.aggroRange) {
    aiPatrol(enemy, player, map, dt);
    return;
  }

  if (enemy.attackTimer > 0) {
    enemy.attackTimer -= dt;
    return;
  }

  if (d < 55 && d > 20) {
    // Lunge attack!
    enemy.attacking = true;
    enemy.attackTimer = 1.5;
    // Quick thrust forward
    moveToward(enemy, player.x, player.y, enemy.speed * 4, map, 0.05);
    setTimeout(() => { enemy.attacking = false; }, 400);
  } else if (d >= 55) {
    // Approach carefully
    moveToward(enemy, player.x, player.y, enemy.speed * 0.8, map, dt);
  } else {
    // Too close — back off
    const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    moveToward(enemy, enemy.x + Math.cos(angle) * 60, enemy.y + Math.sin(angle) * 60, enemy.speed, map, dt);
  }
}

// --- AI: Archer (keep far, shoot arrows) ---
// Arrows are added to game.projectiles via a callback
let projectileCallback = null;
export function setProjectileCallback(fn) { projectileCallback = fn; }

function aiArcher(enemy, player, map, dt) {
  const d = dist(enemy.x, enemy.y, player.x, player.y);
  if (d > enemy.aggroRange) {
    aiPatrol(enemy, player, map, dt);
    return;
  }

  enemy.shootTimer -= dt;

  // Keep distance (ideal ~150px)
  if (d < 100) {
    // Too close — flee
    const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    moveToward(enemy, enemy.x + Math.cos(angle) * 80, enemy.y + Math.sin(angle) * 80, enemy.speed * 1.2, map, dt);
  } else if (d > 180) {
    // Too far — approach
    moveToward(enemy, player.x, player.y, enemy.speed * 0.6, map, dt);
  }

  // Shoot
  if (enemy.shootTimer <= 0 && d < 200) {
    enemy.shootTimer = enemy.shootInterval || 2.0;
    enemy.attacking = true;
    setTimeout(() => { enemy.attacking = false; }, 300);

    // Fire arrow projectile
    if (projectileCallback) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dd = Math.sqrt(dx*dx + dy*dy) || 1;
      projectileCallback({
        x: enemy.x + enemy.width/2,
        y: enemy.y + enemy.height/2,
        dirX: dx/dd, dirY: dy/dd,
        damage: enemy.atk,
        color: '#8d6e63',
        speed: 180,
        life: 2,
        width: 6, height: 6,
        fromBoss: true, // uses same hit logic as boss projectiles (shield can block)
        isEnemyArrow: true,
      });
    }
  }
}

// --- Update All Enemies ---
export function updateEnemies(enemies, player, map, dt) {
  for (const e of enemies) {
    if (!e.alive) continue;

    // Reduce hit flash timer
    if (e.hitTimer > 0) e.hitTimer -= dt;

    switch (e.ai) {
      case 'hop':        aiHop(e, player, map, dt);       break;
      case 'chase':      aiChase(e, player, map, dt);     break;
      case 'slow_chase': aiSlowChase(e, player, map, dt); break;
      case 'patrol':     aiPatrol(e, player, map, dt);    break;
      case 'swordsman':  aiSwordsman(e, player, map, dt); break;
      case 'spearman':   aiSpearman(e, player, map, dt);  break;
      case 'archer':     aiArcher(e, player, map, dt);    break;
    }
  }
}

// --- Render All Enemies ---
export function renderEnemies(ctx, enemies, camera, animFrame) {
  for (const e of enemies) {
    if (!e.alive) continue;

    const sx = e.x - camera.x;
    const sy = e.y - camera.y;

    // Off-screen culling
    if (sx < -TILE_SIZE * 2 || sx > camera.width + TILE_SIZE * 2 ||
        sy < -TILE_SIZE * 2 || sy > camera.height + TILE_SIZE * 2) {
      continue;
    }

    ctx.save();

    // Hit flash effect
    if (e.hitTimer > 0) {
      ctx.globalAlpha = 0.5;
    }

    // Draw enemy sprite
    if (e.drawFacing) {
      e.drawFacing(ctx, sx, sy, e.facing, animFrame);
    } else if (e.type === 'wolf') {
      e.draw(ctx, sx, sy, e.facing, animFrame);
    } else {
      e.draw(ctx, sx, sy, animFrame);
    }

    ctx.globalAlpha = 1.0;

    // HP bar above enemy
    const barWidth = e.width;
    const barHeight = 4;
    const barX = sx + (TILE_SIZE - barWidth) / 2;
    const barY = sy - 8;
    const hpRatio = Math.max(0, e.hp / e.maxHp);

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // HP fill
    ctx.fillStyle = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.25 ? '#cccc44' : '#cc2222';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.restore();
  }
}
