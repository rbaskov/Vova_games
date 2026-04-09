// ============================================================
// enemies.js — Enemy System with AI Patterns
// ============================================================

import { drawSlime, drawWolf, drawSkeleton, drawGolem } from './sprites.js';
import { TILE_SIZE, isSolid } from './tilemap.js';

// --- Enemy Type Definitions ---
const ENEMY_TYPES = {
  slime:    { hp: 30, maxHp: 30, atk: 5,  speed: 40,  xp: 10, coins: 3,  width: 28, height: 26, draw: drawSlime,    ai: 'hop',        aggroRange: 150 },
  wolf:     { hp: 25, maxHp: 25, atk: 8,  speed: 100, xp: 15, coins: 5,  width: 36, height: 28, draw: drawWolf,     ai: 'chase',      aggroRange: 200 },
  skeleton: { hp: 40, maxHp: 40, atk: 10, speed: 50,  xp: 25, coins: 7,  width: 32, height: 40, draw: drawSkeleton, ai: 'patrol',     aggroRange: 160 },
  golem:    { hp: 80, maxHp: 80, atk: 18, speed: 25,  xp: 50, coins: 10, width: 32, height: 40, draw: drawGolem,    ai: 'slow_chase', aggroRange: 120 },
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
    if (e.type === 'wolf') {
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
