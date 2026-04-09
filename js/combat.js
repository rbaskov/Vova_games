// ============================================================
// combat.js — Combat System: Damage, XP, Leveling
// ============================================================

import { isSolid, TILE_SIZE } from './tilemap.js';
import { getTotalAtk, getWeaponRange, getKnockback, getWeapon } from './weapons.js';
import { getTotalDef } from './armor.js';

// Safe knockback: only apply if target won't end up inside a wall
function safeKnockback(entity, dx, dy, w, h, map) {
  const newX = entity.x + dx;
  const newY = entity.y + dy;

  const left = Math.floor(newX / TILE_SIZE);
  const right = Math.floor((newX + w - 1) / TILE_SIZE);
  const top = Math.floor(newY / TILE_SIZE);
  const bottom = Math.floor((newY + h - 1) / TILE_SIZE);

  const blocked =
    isSolid(map, left, top) ||
    isSolid(map, right, top) ||
    isSolid(map, left, bottom) ||
    isSolid(map, right, bottom);

  if (!blocked) {
    entity.x = newX;
    entity.y = newY;
  }
}

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

  // Bow weapons don't do melee — damage is via projectiles
  const weapon = getWeapon(player.weapon);
  if (weapon.type === 'bow') return killed;

  // Determine hitbox center based on facing direction
  const cx = player.x + player.hitW / 2;
  const cy = player.y + player.hitH / 2;
  let hx = cx;
  let hy = cy;
  const range = getWeaponRange(player);

  switch (player.facing) {
    case 'up':    hy -= range / 2; break;
    case 'down':  hy += range / 2; break;
    case 'left':  hx -= range / 2; break;
    case 'right': hx += range / 2; break;
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (enemy.hitTimer > 0) continue; // already hit this swing

    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    const d = dist(hx, hy, ex, ey);

    if (d < range) {
      const dmg = calcDamage(getTotalAtk(player), 0);
      enemy.hp -= dmg;
      enemy.hitTimer = 0.3;

      // Knockback away from player (with collision check)
      const kb = getKnockback(player);
      const angle = Math.atan2(ey - cy, ex - cx);
      safeKnockback(enemy, Math.cos(angle) * kb, Math.sin(angle) * kb, enemy.width, enemy.height || 26, player._map);

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
      const dmg = calcDamage(enemy.atk, getTotalDef(player));
      player.hp -= dmg;
      totalDamage += dmg;
      player.invincibleTimer = 0.5;

      // Knockback player 30px away from enemy (with collision check)
      const angle = Math.atan2(py - ey, px - ex);
      safeKnockback(player, Math.cos(angle) * 30, Math.sin(angle) * 30, player.hitW, player.hitH, player._map);

      break; // Only one hit per frame
    }
  }

  return totalDamage;
}
