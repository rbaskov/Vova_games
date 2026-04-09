// ============================================================
// abilities.js — Elemental Abilities: Earth Shield, Fireball, Ice Wave
// ============================================================

// --- Speed lookup for restoring after slow wears off ---
const BASE_SPEEDS = { slime: 40, wolf: 100, skeleton: 50, golem: 25 };

// --- Projectile Factory ---
export function createProjectile(x, y, dirX, dirY, damage, color, speed) {
  return {
    x, y, dirX, dirY, damage, color,
    speed: speed || 200,
    life: 2,
    width: 8,
    height: 8,
  };
}

// --- Facing direction to unit vector ---
function facingToDir(facing) {
  switch (facing) {
    case 'up':    return { x: 0, y: -1 };
    case 'down':  return { x: 0, y: 1 };
    case 'left':  return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
    default:      return { x: 0, y: 1 };
  }
}

// --- Use Ability ---
// Returns { used, killed } where killed is array of enemies killed by this ability
export function useAbility(type, player, projectiles, enemies) {
  if (!player.artifacts[type]) return false;
  if (player.cooldowns[type] > 0) return false;

  const cx = player.x + player.hitW / 2;
  const cy = player.y + player.hitH / 2;

  switch (type) {
    case 'earth':
      player.invincibleTimer = 2;
      player.cooldowns.earth = 8;
      return true;

    case 'fire': {
      const dir = facingToDir(player.facing);
      const proj = createProjectile(
        cx - 4, cy - 4,
        dir.x, dir.y,
        15, '#ff5722', 250
      );
      projectiles.push(proj);
      player.cooldowns.fire = 5;
      return true;
    }

    case 'water': {
      for (const e of enemies) {
        if (!e.alive) continue;
        const ex = e.x + (e.width || 16) / 2;
        const ey = e.y + (e.height || 16) / 2;
        const dx = cx - ex;
        const dy = cy - ey;
        if (Math.sqrt(dx * dx + dy * dy) <= 120) {
          e.speed *= 0.3;
          e.slowTimer = 3;
        }
      }
      player.cooldowns.water = 10;
      return true;
    }

    default:
      return false;
  }
}

// --- Helper: distance ---
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Update Projectiles ---
// Returns array of killed enemies for XP/coin/particle handling
export function updateProjectiles(projectiles, enemies, dt) {
  const killed = [];

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    // Move
    p.x += p.dirX * p.speed * dt;
    p.y += p.dirY * p.speed * dt;
    p.life -= dt;

    if (p.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    // Boss projectiles don't hit enemies
    if (p.fromBoss) continue;

    // Check collision with enemies
    const pcx = p.x + p.width / 2;
    const pcy = p.y + p.height / 2;
    let hit = false;

    for (const e of enemies) {
      if (!e.alive) continue;
      const ecx = e.x + (e.width || 16) / 2;
      const ecy = e.y + (e.height || 16) / 2;
      if (dist(pcx, pcy, ecx, ecy) < 20) {
        e.hp -= p.damage;
        e.hitTimer = 0.15;
        if (e.hp <= 0) {
          e.alive = false;
          killed.push(e);
        }
        hit = true;
        break;
      }
    }

    if (hit) {
      projectiles.splice(i, 1);
    }
  }

  return killed;
}

// --- Update Cooldowns ---
export function updateCooldowns(player, dt) {
  for (const key of Object.keys(player.cooldowns)) {
    if (player.cooldowns[key] > 0) {
      player.cooldowns[key] = Math.max(0, player.cooldowns[key] - dt);
    }
  }
}

// --- Update Slow Timers ---
export function updateSlowTimers(enemies, dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) {
        e.slowTimer = 0;
        // Restore original speed
        const base = BASE_SPEEDS[e.type];
        if (base !== undefined) {
          e.speed = base;
        }
      }
    }
  }
}

// --- Render Projectiles ---
export function renderProjectiles(ctx, projectiles, camera) {
  for (const p of projectiles) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    ctx.fillStyle = p.color;
    ctx.fillRect(sx, sy, p.width, p.height);
    // White center
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 2, sy + 2, 4, 4);
  }
}

// --- Render Ability Bar ---
export function renderAbilityBar(ctx, player, width, height) {
  const slots = [
    { key: 'earth', label: '1', icon: '\u{1F6E1}', color: '#4caf50', maxCd: 8 },
    { key: 'fire',  label: '2', icon: '\u{1F525}', color: '#ff9800', maxCd: 5 },
    { key: 'water', label: '3', icon: '\u{2744}',  color: '#2196f3', maxCd: 10 },
  ];

  const slotSize = 40;
  const gap = 6;
  const totalW = slots.length * slotSize + (slots.length - 1) * gap;
  const startX = (width - totalW) / 2;
  const startY = height - slotSize - 10;

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const x = startX + i * (slotSize + gap);
    const y = startY;
    const unlocked = player.artifacts[s.key];
    const cd = player.cooldowns[s.key];

    ctx.save();
    if (!unlocked) ctx.globalAlpha = 0.3;

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, slotSize, slotSize);

    // Border
    ctx.strokeStyle = unlocked ? s.color : '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, slotSize, slotSize);

    // Icon
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.icon, x + slotSize / 2, y + slotSize / 2);

    // Key label in top-left corner
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#aaa';
    ctx.fillText(s.label, x + 3, y + 3);

    // Cooldown overlay
    if (unlocked && cd > 0) {
      const ratio = cd / s.maxCd;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x, y, slotSize, slotSize * ratio);

      // Cooldown number
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(Math.ceil(cd).toString(), x + slotSize / 2, y + slotSize / 2);
    }

    ctx.restore();
  }

  // Reset
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
