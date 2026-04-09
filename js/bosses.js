// ============================================================
// bosses.js — Boss System with Multi-Phase AI
// ============================================================

import { TILE_SIZE } from './tilemap.js';
import { createProjectile } from './abilities.js';

// --- Boss Type Definitions ---
const BOSS_TYPES = {
  forest_guardian: {
    name: 'Лесной страж', hp: 200, maxHp: 200, atk: 12, speed: 35,
    width: 48, height: 48, xp: 100, coins: 30, artifact: 'earth',
    color1: '#2e7d32', color2: '#4caf50',
    phases: [
      { hpThreshold: 1.0, speed: 35, atk: 12, pattern: 'circle' },
      { hpThreshold: 0.5, speed: 55, atk: 15, pattern: 'charge' },
    ],
  },
  fire_dragon: {
    name: 'Огненный дракон', hp: 300, maxHp: 300, atk: 18, speed: 40,
    width: 56, height: 48, xp: 150, coins: 40, artifact: 'fire',
    color1: '#d84315', color2: '#ff5722',
    phases: [
      { hpThreshold: 1.0, speed: 40, atk: 18, pattern: 'ranged' },
      { hpThreshold: 0.6, speed: 60, atk: 22, pattern: 'charge' },
      { hpThreshold: 0.3, speed: 80, atk: 25, pattern: 'frenzy' },
    ],
  },
  ice_lich: {
    name: 'Ледяной лич', hp: 250, maxHp: 250, atk: 15, speed: 30,
    width: 48, height: 56, xp: 150, coins: 40, artifact: 'water',
    color1: '#0277bd', color2: '#29b6f6',
    phases: [
      { hpThreshold: 1.0, speed: 30, atk: 15, pattern: 'teleport' },
      { hpThreshold: 0.4, speed: 50, atk: 20, pattern: 'frenzy' },
    ],
  },
  dark_knight: {
    name: 'Тёмный рыцарь', hp: 200, maxHp: 200, atk: 20, speed: 50,
    width: 40, height: 48, xp: 100, coins: 30, artifact: null,
    color1: '#37474f', color2: '#607d8b',
    phases: [
      { hpThreshold: 1.0, speed: 50, atk: 20, pattern: 'charge' },
      { hpThreshold: 0.5, speed: 80, atk: 25, pattern: 'frenzy' },
    ],
  },
  dark_mage: {
    name: 'Тёмный маг', hp: 400, maxHp: 400, atk: 25, speed: 35,
    width: 48, height: 56, xp: 300, coins: 100, artifact: null,
    color1: '#4a148c', color2: '#7c4dff',
    phases: [
      { hpThreshold: 1.0, speed: 35, atk: 25, pattern: 'ranged' },
      { hpThreshold: 0.6, speed: 45, atk: 30, pattern: 'teleport' },
      { hpThreshold: 0.3, speed: 70, atk: 35, pattern: 'frenzy' },
    ],
  },
};

// --- Helper: distance ---
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Create Boss ---
export function createBoss(type, col, row) {
  const template = BOSS_TYPES[type];
  if (!template) {
    console.warn(`Unknown boss type: ${type}`);
    return null;
  }
  return {
    type,
    ...template,
    x: col * TILE_SIZE,
    y: row * TILE_SIZE,
    isBoss: true,
    alive: true,
    facing: 'down',
    hitTimer: 0,
    moveTimer: 0,
    phaseIndex: 0,
    actionTimer: 0,
    chargeDir: { x: 0, y: 0 },
    charging: false,
    chargeTimer: 0,
    teleportTimer: 0,
    shootTimer: 0,
  };
}

// --- Determine Current Phase ---
function getCurrentPhase(boss) {
  const hpRatio = boss.hp / boss.maxHp;
  let phase = boss.phases[0];
  let idx = 0;
  for (let i = boss.phases.length - 1; i >= 0; i--) {
    if (hpRatio <= boss.phases[i].hpThreshold) {
      phase = boss.phases[i];
      idx = i;
    }
  }
  return { phase, idx };
}

// --- Move boss toward target ---
function moveToward(boss, tx, ty, speed, dt) {
  const dx = tx - boss.x;
  const dy = ty - boss.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 2) return;

  const vx = (dx / d) * speed * dt;
  const vy = (dy / d) * speed * dt;
  boss.x += vx;
  boss.y += vy;

  if (Math.abs(dx) > Math.abs(dy)) {
    boss.facing = dx < 0 ? 'left' : 'right';
  } else {
    boss.facing = dy < 0 ? 'up' : 'down';
  }
}

// --- Pattern: Circle ---
function patternCircle(boss, player, dt) {
  const pcx = player.x + player.hitW / 2;
  const pcy = player.y + player.hitH / 2;
  const bcx = boss.x + boss.width / 2;
  const bcy = boss.y + boss.height / 2;
  const d = dist(bcx, bcy, pcx, pcy);
  const targetDist = 100;

  boss.actionTimer += dt;
  const angle = boss.actionTimer * 1.2;

  const tx = pcx + Math.cos(angle) * targetDist - boss.width / 2;
  const ty = pcy + Math.sin(angle) * targetDist - boss.height / 2;

  moveToward(boss, tx, ty, boss.phases[boss.phaseIndex].speed * 1.5, dt);
}

// --- Pattern: Chase ---
function patternChase(boss, player, speed, dt) {
  moveToward(boss, player.x, player.y, speed, dt);
}

// --- Pattern: Charge ---
function patternCharge(boss, player, phase, dt) {
  if (boss.charging) {
    // Dash in locked direction
    boss.x += boss.chargeDir.x * phase.speed * 3 * dt;
    boss.y += boss.chargeDir.y * phase.speed * 3 * dt;
    boss.chargeTimer -= dt;
    if (boss.chargeTimer <= 0) {
      boss.charging = false;
      boss.actionTimer = 0;
    }
  } else {
    // Wait phase — slowly approach
    boss.actionTimer += dt;
    moveToward(boss, player.x, player.y, phase.speed * 0.3, dt);

    if (boss.actionTimer >= 2) {
      // Lock direction and charge
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0) {
        boss.chargeDir = { x: dx / d, y: dy / d };
      }
      boss.charging = true;
      boss.chargeTimer = 0.5;
    }
  }
}

// --- Pattern: Ranged ---
function patternRanged(boss, player, phase, projectiles, dt) {
  const pcx = player.x + player.hitW / 2;
  const pcy = player.y + player.hitH / 2;
  const bcx = boss.x + boss.width / 2;
  const bcy = boss.y + boss.height / 2;
  const d = dist(bcx, bcy, pcx, pcy);

  // Keep distance 150-200px
  if (d < 150) {
    // Move away from player
    const dx = boss.x - player.x;
    const dy = boss.y - player.y;
    const dd = Math.sqrt(dx * dx + dy * dy) || 1;
    moveToward(boss, boss.x + (dx / dd) * 50, boss.y + (dy / dd) * 50, phase.speed, dt);
  } else if (d > 200) {
    moveToward(boss, player.x, player.y, phase.speed * 0.5, dt);
  }

  // Shoot every 1.5s
  boss.shootTimer += dt;
  if (boss.shootTimer >= 1.5) {
    boss.shootTimer = 0;
    const dx = pcx - bcx;
    const dy = pcy - bcy;
    const dd = Math.sqrt(dx * dx + dy * dy) || 1;
    const proj = createProjectile(
      bcx - 4, bcy - 4,
      dx / dd, dy / dd,
      phase.atk, boss.color2, 180
    );
    proj.fromBoss = true;
    projectiles.push(proj);
  }
}

// --- Pattern: Teleport ---
function patternTeleport(boss, player, phase, dt) {
  boss.teleportTimer += dt;

  // Slow chase between teleports
  moveToward(boss, player.x, player.y, phase.speed * 0.4, dt);

  if (boss.teleportTimer >= 3) {
    boss.teleportTimer = 0;
    // Teleport to random position ~100px from player
    const angle = Math.random() * Math.PI * 2;
    boss.x = player.x + Math.cos(angle) * 100 - boss.width / 2;
    boss.y = player.y + Math.sin(angle) * 100 - boss.height / 2;
  }
}

// --- Pattern: Frenzy ---
function patternFrenzy(boss, player, phase, dt) {
  moveToward(boss, player.x, player.y, phase.speed, dt);
}

// --- Update Boss ---
export function updateBoss(boss, player, projectiles, dt) {
  if (!boss || !boss.alive) return;

  // Hit flash timer
  if (boss.hitTimer > 0) boss.hitTimer -= dt;

  // Determine phase
  const { phase, idx } = getCurrentPhase(boss);
  if (idx !== boss.phaseIndex) {
    boss.phaseIndex = idx;
    boss.actionTimer = 0;
    boss.charging = false;
    boss.teleportTimer = 0;
    boss.shootTimer = 0;
  }

  // Execute pattern
  switch (phase.pattern) {
    case 'circle':
      patternCircle(boss, player, dt);
      break;
    case 'chase':
      patternChase(boss, player, phase.speed, dt);
      break;
    case 'charge':
      patternCharge(boss, player, phase, dt);
      break;
    case 'ranged':
      patternRanged(boss, player, phase, projectiles, dt);
      break;
    case 'teleport':
      patternTeleport(boss, player, phase, dt);
      break;
    case 'frenzy':
      patternFrenzy(boss, player, phase, dt);
      break;
  }
}

// --- Render Boss ---
export function renderBoss(ctx, boss, camera, animFrame) {
  if (!boss || !boss.alive) return;

  const sx = boss.x - camera.x;
  const sy = boss.y - camera.y;

  // Off-screen culling
  if (sx < -boss.width * 2 || sx > camera.width + boss.width * 2 ||
      sy < -boss.height * 2 || sy > camera.height + boss.height * 2) {
    return;
  }

  ctx.save();

  // Hit flash
  if (boss.hitTimer > 0) {
    ctx.globalAlpha = 0.5;
  }

  // Outer rectangle (body)
  ctx.fillStyle = boss.color1;
  ctx.fillRect(sx, sy, boss.width, boss.height);

  // Inner rectangle
  const inset = 6;
  ctx.fillStyle = boss.color2;
  ctx.fillRect(sx + inset, sy + inset, boss.width - inset * 2, boss.height - inset * 2);

  // Eyes — white with red pupils
  const eyeY = sy + 12;
  const eyeSize = 6;
  const pupilSize = 3;
  const leftEyeX = sx + boss.width * 0.3;
  const rightEyeX = sx + boss.width * 0.7 - eyeSize;

  // White sclera
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(leftEyeX, eyeY, eyeSize, eyeSize);
  ctx.fillRect(rightEyeX, eyeY, eyeSize, eyeSize);

  // Red pupils
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(leftEyeX + 1.5, eyeY + 1.5, pupilSize, pupilSize);
  ctx.fillRect(rightEyeX + 1.5, eyeY + 1.5, pupilSize, pupilSize);

  // Charge indicator — flashing border when charging
  if (boss.charging) {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx - 2, sy - 2, boss.width + 4, boss.height + 4);
  }

  ctx.globalAlpha = 1.0;
  ctx.restore();
}

// --- Render Boss HP Bar (top of screen) ---
export function renderBossHPBar(ctx, boss, screenWidth) {
  if (!boss || !boss.alive) return;

  const barW = 300;
  const barH = 16;
  const barX = (screenWidth - barW) / 2;
  const barY = 44;

  const hpRatio = Math.max(0, boss.hp / boss.maxHp);

  // Boss name above bar
  ctx.font = '10px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0c040';
  ctx.fillText(boss.name, screenWidth / 2, barY - 6);

  // Bar background
  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barW, barH);

  // HP fill
  const hpColor = hpRatio > 0.5 ? '#cc2222' : hpRatio > 0.25 ? '#ff6600' : '#ff0000';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // Gold border
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);

  // Phase dots below bar
  const dotY = barY + barH + 6;
  const dotSpacing = 12;
  const totalDotsW = (boss.phases.length - 1) * dotSpacing;
  const dotStartX = screenWidth / 2 - totalDotsW / 2;

  for (let i = 0; i < boss.phases.length; i++) {
    const dx = dotStartX + i * dotSpacing;
    ctx.fillStyle = i <= boss.phaseIndex ? '#f0c040' : '#555';
    ctx.beginPath();
    ctx.arc(dx, dotY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'left';
  ctx.lineWidth = 1;
}
