// ============================================================
// combat.js — Combat System: Damage, XP, Leveling
// ============================================================

export function calcDamage(atk, defense) {
  return Math.max(1, atk - defense);
}

export function calcXpToLevel(level) {
  return level * 50;
}

export function checkLevelUp(player) {
  if (player.level >= 10) return false;
  const needed = calcXpToLevel(player.level);
  if (player.xp >= needed) {
    player.xp -= needed;
    player.level++;
    player.maxHp += 10;
    player.hp = player.maxHp; // full heal on level up
    player.atk += 2;
    return true;
  }
  return false;
}

// --- Helper: distance between two points ---
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Player attacks enemies in facing direction ---
export function playerAttackEnemies(player, enemies) {
  const killed = [];
  if (!player.attacking) return killed;

  // Determine hitbox center based on facing direction (range 48px = 1.5 tiles)
  const cx = player.x + player.hitW / 2;
  const cy = player.y + player.hitH / 2;
  let hx = cx;
  let hy = cy;
  const range = 48;

  switch (player.facing) {
    case 'up':    hy -= range / 2; break;
    case 'down':  hy += range / 2; break;
    case 'left':  hx -= range / 2; break;
    case 'right': hx += range / 2; break;
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    const d = dist(hx, hy, ex, ey);

    if (d < range) {
      const dmg = calcDamage(player.atk, 0);
      enemy.hp -= dmg;
      enemy.hitTimer = 0.3;

      // Knockback 20px away from player
      const angle = Math.atan2(ey - cy, ex - cx);
      enemy.x += Math.cos(angle) * 20;
      enemy.y += Math.sin(angle) * 20;

      if (enemy.hp <= 0) {
        enemy.alive = false;
        killed.push(enemy);
      }
    }
  }

  return killed;
}

// --- Enemy attacks player ---
export function enemyAttackPlayer(enemies, player, dt) {
  if (player.invincibleTimer > 0) {
    return 0;
  }

  let totalDamage = 0;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const px = player.x + player.hitW / 2;
    const py = player.y + player.hitH / 2;
    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    const d = dist(px, py, ex, ey);

    if (d < 30) {
      const dmg = calcDamage(enemy.atk, 0);
      player.hp -= dmg;
      totalDamage += dmg;
      player.invincibleTimer = 0.5;

      // Knockback player 30px away from enemy
      const angle = Math.atan2(py - ey, px - ex);
      player.x += Math.cos(angle) * 30;
      player.y += Math.sin(angle) * 30;

      break; // Only one hit per frame
    }
  }

  return totalDamage;
}
