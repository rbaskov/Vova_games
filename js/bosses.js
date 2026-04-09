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

  if (sx < -boss.width * 2 || sx > camera.width + boss.width * 2 ||
      sy < -boss.height * 2 || sy > camera.height + boss.height * 2) {
    return;
  }

  ctx.save();
  if (boss.hitTimer > 0) ctx.globalAlpha = 0.5;

  const f = animFrame % 4;
  const bob = (f === 1 || f === 3) ? 2 : 0;

  switch (boss.type) {
    case 'forest_guardian': drawForestGuardian(ctx, sx, sy, f, bob, boss); break;
    case 'fire_dragon':     drawFireDragon(ctx, sx, sy, f, bob, boss); break;
    case 'ice_lich':        drawIceLich(ctx, sx, sy, f, bob, boss); break;
    case 'dark_knight':     drawDarkKnight(ctx, sx, sy, f, bob, boss); break;
    case 'dark_mage':       drawDarkMage(ctx, sx, sy, f, bob, boss); break;
    default:
      ctx.fillStyle = boss.color1;
      ctx.fillRect(sx, sy, boss.width, boss.height);
  }

  // Charge indicator
  if (boss.charging) {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx - 3, sy - 3, boss.width + 6, boss.height + 6);
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(sx + 4, sy + boss.height - 2, boss.width - 8, 4);

  ctx.globalAlpha = 1;
  ctx.restore();
}

// === FOREST GUARDIAN — A massive tree ent ===
function drawForestGuardian(ctx, x, y, f, bob, boss) {
  // Trunk
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x + 14, y + 18, 20, 28);
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(x + 18, y + 22, 4, 20);
  ctx.fillRect(x + 28, y + 26, 3, 14);

  // Roots / legs
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x + 8, y + 40 + bob, 10, 8);
  ctx.fillRect(x + 30, y + 40 - bob, 10, 8);

  // Canopy (leafy head)
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(x + 4, y + 2, 40, 20);
  ctx.fillRect(x + 8, y - 2, 32, 8);
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(x + 10, y + 4, 28, 12);
  ctx.fillRect(x + 14, y, 20, 6);
  // Leaf highlights
  ctx.fillStyle = '#66bb6a';
  ctx.fillRect(x + 12, y + 2, 6, 4);
  ctx.fillRect(x + 26, y + 6, 8, 4);
  ctx.fillRect(x + 16, y + 10, 6, 4);

  // Eyes (glowing yellow in foliage)
  ctx.fillStyle = '#ffeb3b';
  ctx.fillRect(x + 14, y + 10, 6, 5);
  ctx.fillRect(x + 28, y + 10, 6, 5);
  ctx.fillStyle = '#f44336';
  ctx.fillRect(x + 16, y + 12, 3, 3);
  ctx.fillRect(x + 30, y + 12, 3, 3);

  // Branch arms
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x - 2, y + 14 + bob, 16, 4);
  ctx.fillRect(x + 34, y + 14 - bob, 16, 4);
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(x - 4, y + 10 + bob, 8, 6);
  ctx.fillRect(x + 42, y + 10 - bob, 8, 6);
}

// === FIRE DRAGON — Wings, horns, tail ===
function drawFireDragon(ctx, x, y, f, bob, boss) {
  const wingFlap = (f % 2 === 0) ? -4 : 4;

  // Wings
  ctx.fillStyle = '#bf360c';
  // Left wing
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 16);
  ctx.lineTo(x - 10, y + 4 + wingFlap);
  ctx.lineTo(x - 6, y + 20 + wingFlap);
  ctx.lineTo(x + 6, y + 24);
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(x + 48, y + 16);
  ctx.lineTo(x + 66, y + 4 + wingFlap);
  ctx.lineTo(x + 62, y + 20 + wingFlap);
  ctx.lineTo(x + 50, y + 24);
  ctx.fill();

  // Wing membrane
  ctx.fillStyle = '#e65100';
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 18);
  ctx.lineTo(x - 4, y + 8 + wingFlap);
  ctx.lineTo(x + 2, y + 22);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 48, y + 18);
  ctx.lineTo(x + 60, y + 8 + wingFlap);
  ctx.lineTo(x + 54, y + 22);
  ctx.fill();

  // Body
  ctx.fillStyle = '#d84315';
  ctx.fillRect(x + 10, y + 12, 36, 26);
  ctx.fillStyle = '#ff5722';
  ctx.fillRect(x + 14, y + 16, 28, 18);

  // Belly scales
  ctx.fillStyle = '#ff8a65';
  ctx.fillRect(x + 18, y + 22, 20, 8);

  // Head
  ctx.fillStyle = '#d84315';
  ctx.fillRect(x + 16, y + 2, 24, 14);
  ctx.fillStyle = '#ff5722';
  ctx.fillRect(x + 18, y + 4, 20, 10);

  // Horns
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(x + 14, y - 4, 4, 8);
  ctx.fillRect(x + 38, y - 4, 4, 8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 15, y - 4, 2, 3);
  ctx.fillRect(x + 39, y - 4, 2, 3);

  // Eyes
  ctx.fillStyle = '#ffeb3b';
  ctx.fillRect(x + 20, y + 6, 6, 5);
  ctx.fillRect(x + 32, y + 6, 6, 5);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 23, y + 8, 3, 3);
  ctx.fillRect(x + 34, y + 8, 3, 3);

  // Snout / mouth
  ctx.fillStyle = '#bf360c';
  ctx.fillRect(x + 22, y + 12, 12, 4);
  // Fire breath hint (phase 2+)
  if (boss.phaseIndex >= 1 && f % 2 === 0) {
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(x + 24, y + 16, 8, 4);
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(x + 26, y + 18, 4, 4);
  }

  // Tail
  ctx.fillStyle = '#d84315';
  ctx.fillRect(x + 2, y + 30, 12, 4);
  ctx.fillRect(x - 2, y + 28, 6, 4);
  ctx.fillStyle = '#ff5722';
  ctx.fillRect(x - 6, y + 26, 6, 4);

  // Legs
  ctx.fillStyle = '#bf360c';
  ctx.fillRect(x + 14, y + 36 + bob, 8, 10);
  ctx.fillRect(x + 34, y + 36 - bob, 8, 10);
  // Claws
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(x + 12, y + 44 + bob, 4, 3);
  ctx.fillRect(x + 32, y + 44 - bob, 4, 3);
}

// === ICE LICH — Floating robed skeleton with ice crown ===
function drawIceLich(ctx, x, y, f, bob, boss) {
  const float = Math.sin(f * 1.5) * 3;

  // Robe (flowing shape)
  ctx.fillStyle = '#1a237e';
  ctx.fillRect(x + 8, y + 20 + float, 32, 30);
  ctx.fillRect(x + 4, y + 36 + float, 40, 16);
  ctx.fillStyle = '#283593';
  ctx.fillRect(x + 12, y + 24 + float, 24, 22);

  // Robe trim
  ctx.fillStyle = '#42a5f5';
  ctx.fillRect(x + 8, y + 48 + float, 32, 3);

  // Skeletal hands
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x + 2, y + 26 + float - bob, 8, 4);
  ctx.fillRect(x + 38, y + 26 + float + bob, 8, 4);
  // Ice orbs in hands
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(x - 2, y + 24 + float - bob, 6, 6);
  ctx.fillRect(x + 44, y + 24 + float + bob, 6, 6);
  ctx.fillStyle = '#e1f5fe';
  ctx.fillRect(x, y + 25 + float - bob, 2, 2);
  ctx.fillRect(x + 46, y + 25 + float + bob, 2, 2);

  // Skull
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x + 14, y + 4 + float, 20, 18);
  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(x + 16, y + 6 + float, 16, 12);

  // Eye sockets (glowing blue)
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 17, y + 8 + float, 6, 7);
  ctx.fillRect(x + 27, y + 8 + float, 6, 7);
  ctx.fillStyle = '#29b6f6';
  ctx.fillRect(x + 18, y + 9 + float, 4, 4);
  ctx.fillRect(x + 28, y + 9 + float, 4, 4);
  // Eye glow pulse
  if (f % 2 === 0) {
    ctx.fillStyle = '#e1f5fe';
    ctx.fillRect(x + 19, y + 10 + float, 2, 2);
    ctx.fillRect(x + 29, y + 10 + float, 2, 2);
  }

  // Jaw
  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(x + 18, y + 16 + float, 12, 4);
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(x + 20, y + 18 + float, 8, 3);

  // Ice crown
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(x + 14, y + 2 + float, 4, 6);
  ctx.fillRect(x + 22, y - 2 + float, 4, 8);
  ctx.fillRect(x + 30, y + 2 + float, 4, 6);
  ctx.fillStyle = '#e1f5fe';
  ctx.fillRect(x + 15, y + float, 2, 3);
  ctx.fillRect(x + 23, y - 2 + float, 2, 3);
  ctx.fillRect(x + 31, y + float, 2, 3);
}

// === DARK KNIGHT — Heavy armored warrior ===
function drawDarkKnight(ctx, x, y, f, bob, boss) {
  // Legs
  ctx.fillStyle = '#263238';
  ctx.fillRect(x + 10, y + 34 + bob, 8, 12);
  ctx.fillRect(x + 24, y + 34 - bob, 8, 12);
  // Boots
  ctx.fillStyle = '#37474f';
  ctx.fillRect(x + 8, y + 42 + bob, 10, 6);
  ctx.fillRect(x + 22, y + 42 - bob, 10, 6);

  // Body armor
  ctx.fillStyle = '#37474f';
  ctx.fillRect(x + 6, y + 14, 28, 22);
  ctx.fillStyle = '#455a64';
  ctx.fillRect(x + 10, y + 16, 20, 16);
  // Chest emblem (red)
  ctx.fillStyle = '#c62828';
  ctx.fillRect(x + 17, y + 20, 6, 8);
  ctx.fillRect(x + 14, y + 22, 12, 4);

  // Shoulder pauldrons
  ctx.fillStyle = '#37474f';
  ctx.fillRect(x + 2, y + 12, 10, 8);
  ctx.fillRect(x + 28, y + 12, 10, 8);
  ctx.fillStyle = '#546e7a';
  ctx.fillRect(x + 4, y + 14, 6, 4);
  ctx.fillRect(x + 30, y + 14, 6, 4);

  // Arms
  ctx.fillStyle = '#455a64';
  ctx.fillRect(x + 2, y + 20 + bob, 6, 14);
  ctx.fillRect(x + 32, y + 20 - bob, 6, 14);

  // Shield (left hand)
  ctx.fillStyle = '#263238';
  ctx.fillRect(x - 4, y + 22 + bob, 10, 14);
  ctx.fillStyle = '#c62828';
  ctx.fillRect(x - 2, y + 26 + bob, 6, 6);

  // Sword (right hand)
  ctx.fillStyle = '#90a4ae';
  ctx.fillRect(x + 36, y + 10 - bob, 3, 22);
  ctx.fillStyle = '#cfd8dc';
  ctx.fillRect(x + 36, y + 8 - bob, 3, 6);
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x + 34, y + 30 - bob, 7, 3);

  // Helmet
  ctx.fillStyle = '#37474f';
  ctx.fillRect(x + 8, y + 2, 24, 14);
  ctx.fillStyle = '#455a64';
  ctx.fillRect(x + 12, y + 4, 16, 8);
  // Visor slit (glowing red eyes)
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 12, y + 8, 16, 4);
  ctx.fillStyle = '#f44336';
  ctx.fillRect(x + 14, y + 9, 4, 2);
  ctx.fillRect(x + 22, y + 9, 4, 2);
  // Helmet crest
  ctx.fillStyle = '#c62828';
  ctx.fillRect(x + 18, y - 2, 4, 6);
}

// === DARK MAGE — Robed sorcerer with staff and dark magic ===
function drawDarkMage(ctx, x, y, f, bob, boss) {
  const pulse = Math.sin(f * 2) * 2;

  // Robe
  ctx.fillStyle = '#1a0033';
  ctx.fillRect(x + 8, y + 16, 32, 34);
  ctx.fillRect(x + 4, y + 36, 40, 16);
  ctx.fillStyle = '#2a0050';
  ctx.fillRect(x + 12, y + 20, 24, 26);

  // Robe trim (purple glow)
  ctx.fillStyle = '#7c4dff';
  ctx.fillRect(x + 8, y + 48, 32, 3);
  ctx.fillRect(x + 8, y + 16, 2, 32);
  ctx.fillRect(x + 38, y + 16, 2, 32);

  // Hood
  ctx.fillStyle = '#1a0033';
  ctx.fillRect(x + 10, y + 2, 28, 18);
  ctx.fillRect(x + 8, y + 6, 32, 12);
  ctx.fillStyle = '#2a0050';
  ctx.fillRect(x + 14, y + 6, 20, 12);

  // Face in shadow (only eyes visible)
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 14, y + 8, 20, 8);
  // Glowing purple eyes
  ctx.fillStyle = '#e040fb';
  ctx.fillRect(x + 16, y + 10, 5, 4);
  ctx.fillRect(x + 27, y + 10, 5, 4);
  ctx.fillStyle = '#ea80fc';
  ctx.fillRect(x + 17, y + 11, 3, 2);
  ctx.fillRect(x + 28, y + 11, 3, 2);

  // Staff (left hand)
  ctx.fillStyle = '#4a148c';
  ctx.fillRect(x, y + 4 + bob, 4, 44);
  ctx.fillStyle = '#6a1b9a';
  ctx.fillRect(x + 1, y + 6 + bob, 2, 38);
  // Staff orb
  ctx.fillStyle = '#e040fb';
  ctx.fillRect(x - 4, y - 2 + bob + pulse, 12, 10);
  ctx.fillStyle = '#ea80fc';
  ctx.fillRect(x - 2, y + bob + pulse, 8, 6);
  ctx.fillStyle = '#f8bbd0';
  ctx.fillRect(x, y + 1 + bob + pulse, 4, 3);

  // Dark magic hand (right, casting)
  ctx.fillStyle = '#e0d0ff';
  ctx.fillRect(x + 40, y + 22 - bob, 6, 4);
  // Magic particles
  if (f % 2 === 0) {
    ctx.fillStyle = '#7c4dff';
    ctx.fillRect(x + 44, y + 18 - bob, 4, 4);
    ctx.fillRect(x + 38, y + 16 - bob, 3, 3);
    ctx.fillStyle = '#e040fb';
    ctx.fillRect(x + 46, y + 22 - bob, 3, 3);
  }

  // Floating dark orbs around mage (phase 2+)
  if (boss.phaseIndex >= 1) {
    const orbAngle = (f * 0.8);
    for (let i = 0; i < 3; i++) {
      const a = orbAngle + i * (Math.PI * 2 / 3);
      const ox = x + 24 + Math.cos(a) * 26;
      const oy = y + 28 + Math.sin(a) * 18;
      ctx.fillStyle = '#7c4dff';
      ctx.fillRect(ox - 3, oy - 3, 6, 6);
      ctx.fillStyle = '#b388ff';
      ctx.fillRect(ox - 1, oy - 1, 3, 3);
    }
  }
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
