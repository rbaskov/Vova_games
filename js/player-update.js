// ============================================================
// player-update.js — Player / companion factories + update loop
// ============================================================
// Вынесено из main.js в рамках pre-coop refactor (Task 2.3 complete).
//
// Содержит:
//   - createPlayer(startX, startY) — создаёт объект игрока
//   - createCompanion(type, x, y)  — создаёт наёмника
//   - COMPANION_TYPES              — каталог типов наёмников
//   - MOVE_SPEED                   — базовая скорость игрока (px/s)
//   - updatePlayer(dt)             — основной update игрока (движение, атака,
//                                    порталы, чекпоинты, камера)
//   - updateCompanions(dt)         — AI наёмников (бой, следование за игроком)
//   - moveCompanionToward(...)     — helper для движения наёмника к точке

import { TILE_SIZE, getTile } from './tilemap.js';
import { SLOW_TILES, SLOW_TILE_SPEED_MULT } from './sprites.js';
import { game } from './game-state.js';
import { consumeEdge } from './input.js';
import { updateCamera, updateCameraOpenWorld } from './camera.js';
import { getBuffAtkMultiplier, getBuffSpeedMultiplier } from './events.js';
import { getAttackSpeed, getWeapon, createArrow } from './weapons.js';
import { createParticle } from './particles.js';
import { collides, checkPortals, checkCheckpoint, syncChunkEnemies } from './map-loading.js';
import * as SFX from './audio.js';

export const MOVE_SPEED = 120;

export function createPlayer(startX, startY) {
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
    facingAngle: Math.PI / 2,  // start facing down (π/2)
    targetAngle: Math.PI / 2,
    turnSpeed: 12,             // radians per second
    defeatedBosses: [],
    weapon: 'iron_sword',
    ownedWeapons: ['iron_sword'],
    equippedArmor: { helmet: null, chest: null, legs: null, shield: null },
    ownedArmor: [],
    quests: {},
    // UI state per player (вынесено из module-level в inventory.js/dialog.js).
    // В коопе у гостя будет свой player с собственным ui — инвентарь/диалоги
    // не конфликтуют между хостом и гостем.
    ui: { inventorySlot: 0, dialogOption: 0, settingsTab: 0 },
    // Ввод разделён на две структуры (Task 4, pre-coop refactor):
    //   input      — непрерывный ввод (движение). Заполняется каждый кадр
    //                из captureLocalInput(), updatePlayer читает dx/dy отсюда.
    //   inputEdges — одноразовые триггеры (клик, а не hold). Заполняются
    //                в captureLocalInput() по edge-события клавиатуры/тача,
    //                сбрасываются в false через consumeEdge(player, name).
    // Для кооп'а гость получит идентичную структуру, заполняемую из сетевого
    // пакета вместо captureLocalInput(). updatePlayer читает ТОЛЬКО эти два
    // поля — никаких глобальных isKeyDown/isKeyPressed внутри.
    input: { dx: 0, dy: 0 },
    inputEdges: {
      attack: false,
      interact: false,
      potion: false,
      ability1: false,
      ability2: false,
      ability3: false,
      inventoryToggle: false,
      menuToggle: false,
      questsToggle: false,
    },
  };
}

// --- Companion System ---
export const COMPANION_TYPES = {
  merc_sword:  { name: 'Дарен',   weapon: 'sword', atk: 15, range: 40,  attackSpeed: 0.5, speed: 90, hp: 120, maxHp: 120, color: '#607d8b' },
  merc_spear:  { name: 'Рольф',   weapon: 'spear', atk: 18, range: 56,  attackSpeed: 0.6, speed: 80, hp: 100, maxHp: 100, color: '#607d8b' },
  merc_bow:    { name: 'Ивар',    weapon: 'bow',   atk: 12, range: 180, attackSpeed: 1.2, speed: 70, hp: 80,  maxHp: 80,  color: '#607d8b' },
  merc_axe:    { name: 'Гром',    weapon: 'axe',   atk: 22, range: 38,  attackSpeed: 0.7, speed: 75, hp: 150, maxHp: 150, color: '#5d4037' },
  merc_tank:   { name: 'Бронк',   weapon: 'sword', atk: 10, range: 36,  attackSpeed: 0.6, speed: 60, hp: 250, maxHp: 250, color: '#455a64' },
  merc_fast:   { name: 'Зефир',   weapon: 'sword', atk: 20, range: 42,  attackSpeed: 0.3, speed: 120,hp: 70,  maxHp: 70,  color: '#1565c0' },
  merc_healer: { name: 'Лиана',   weapon: 'heal',  atk: 0,  range: 100, attackSpeed: 2.0, speed: 85, hp: 60,  maxHp: 60,  color: '#2e7d32' },
  merc_mage:   { name: 'Аркан',   weapon: 'magic', atk: 25, range: 160, attackSpeed: 1.5, speed: 65, hp: 65,  maxHp: 65,  color: '#6a1b9a' },
};

export function createCompanion(type, x, y) {
  const t = COMPANION_TYPES[type];
  return {
    type,
    name: t.name,
    weapon: t.weapon,
    atk: t.atk,
    range: t.range,
    attackSpeed: t.attackSpeed,
    speed: t.speed,
    color: t.color,
    x, y,
    hp: t.hp,
    maxHp: t.maxHp,
    alive: true,
    invincibleTimer: 0,
    facing: 'down',
    moving: false,
    attackTimer: 0,
    attacking: false,
    hitW: 24,
    hitH: 28,
    shootTimer: 0,
  };
}

// --- Companion movement helper (collision-aware steering) ---
export function moveCompanionToward(c, tx, ty, speed, dt) {
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 4) return;
  const vx = (dx / d) * speed * dt;
  const vy = (dy / d) * speed * dt;
  // Simple collision check
  const nx = c.x + vx;
  const ny = c.y + vy;
  if (!collides(nx, ny, c.hitW, c.hitH)) {
    c.x = nx;
    c.y = ny;
  } else if (!collides(nx, c.y, c.hitW, c.hitH)) {
    c.x = nx;
  } else if (!collides(c.x, ny, c.hitW, c.hitH)) {
    c.y = ny;
  }
}

// --- Companion AI / update loop ---
export function updateCompanions(dt) {
  const p = game.player;
  if (!p) return;

  // Remove dead companions
  game.companions = game.companions.filter(c => c.alive);

  for (const c of game.companions) {
    // Invincibility timer
    if (c.invincibleTimer > 0) c.invincibleTimer -= dt;

    // Enemies damage companions
    for (const e of game.enemies) {
      if (!e.alive || c.invincibleTimer > 0) continue;
      const dx = c.x - e.x;
      const dy = c.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 35) {
        const dmg = Math.max(1, (e.atk || 5) - 5); // companions have ~5 DEF
        c.hp -= dmg;
        c.invincibleTimer = 0.5;
        game.particles.push(createParticle(c.x, c.y - 8, `-${dmg}`, '#ff8888'));
        if (c.hp <= 0) {
          c.alive = false;
          game.particles.push(createParticle(c.x, c.y - 16, `${c.name} погиб!`, '#ff4444', 2));
        }
      }
    }
    // Boss damages companions
    if (game.boss && game.boss.alive && c.invincibleTimer <= 0) {
      const dx = c.x - game.boss.x;
      const dy = c.y - game.boss.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 45) {
        const phase = game.boss.phases[game.boss.phaseIndex || 0];
        const dmg = phase ? phase.atk : game.boss.atk;
        c.hp -= dmg;
        c.invincibleTimer = 0.5;
        game.particles.push(createParticle(c.x, c.y - 8, `-${dmg}`, '#ff8888'));
        if (c.hp <= 0) {
          c.alive = false;
          game.particles.push(createParticle(c.x, c.y - 16, `${c.name} погиб!`, '#ff4444', 2));
        }
      }
    }

    if (!c.alive) continue;

    // Find nearest enemy
    let nearestEnemy = null;
    let nearestDist = Infinity;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const d = Math.sqrt((c.x - e.x) ** 2 + (c.y - e.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
    }
    // Also check boss
    if (game.boss && game.boss.alive) {
      const d = Math.sqrt((c.x - game.boss.x) ** 2 + (c.y - game.boss.y) ** 2);
      if (d < nearestDist) { nearestDist = d; nearestEnemy = game.boss; }
    }

    // Follow player if no enemy nearby, or if too far from player
    const distToPlayer = Math.sqrt((c.x - p.x) ** 2 + (c.y - p.y) ** 2);
    let targetX, targetY;
    c.moving = false;
    c.attacking = false;

    // Healer always follows player and heals periodically
    if (c.weapon === 'heal') {
      if (distToPlayer > 60) {
        moveCompanionToward(c, p.x, p.y, c.speed, dt);
        c.moving = true;
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        if (Math.abs(dx) > Math.abs(dy)) c.facing = dx > 0 ? 'right' : 'left';
        else c.facing = dy > 0 ? 'down' : 'up';
      }
      c.attackTimer -= dt;
      if (c.attackTimer <= 0) {
        c.attackTimer = c.attackSpeed;
        let healed = false;
        if (p.hp < p.maxHp) {
          const heal = 15;
          p.hp = Math.min(p.maxHp, p.hp + heal);
          game.particles.push(createParticle(p.x, p.y - 16, `+${heal} HP`, '#44cc44'));
          healed = true;
        }
        for (const ally of game.companions) {
          if (ally !== c && ally.alive && ally.hp < ally.maxHp) {
            const heal = 10;
            ally.hp = Math.min(ally.maxHp, ally.hp + heal);
            game.particles.push(createParticle(ally.x, ally.y - 16, `+${heal}`, '#44cc44'));
            healed = true;
          }
        }
        if (healed) c.attacking = true;
      }
      continue;
    }

    if (nearestEnemy && nearestDist < 200) {
      // Attack mode
      if (nearestDist > c.range * 0.7) {
        // Move toward enemy
        targetX = nearestEnemy.x;
        targetY = nearestEnemy.y;
        moveCompanionToward(c, targetX, targetY, c.speed, dt);
        c.moving = true;
      }

      // Attack if in range
      if (nearestDist < c.range) {
        c.attackTimer -= dt;
        if (c.attackTimer <= 0) {
          c.attacking = true;
          c.attackTimer = c.attackSpeed;

          if (c.weapon === 'bow' || c.weapon === 'magic') {
            // Ranged projectile
            const dx = nearestEnemy.x - c.x;
            const dy = nearestEnemy.y - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const spd = c.weapon === 'magic' ? 160 : 200;
            const proj = {
              x: c.x + 12, y: c.y + 12,
              vx: (dx / dist) * spd, vy: (dy / dist) * spd,
              damage: c.atk, isArrow: true, lifetime: 2,
              isMagic: c.weapon === 'magic',
            };
            game.projectiles.push(proj);
            if (c.weapon === 'magic') {
              game.particles.push(createParticle(c.x, c.y - 8, '✦', '#b388ff', 0.5));
            }
          } else {
            // Melee hit (sword, spear, axe)
            if (nearestEnemy.isBoss) {
              if (nearestEnemy.hitTimer <= 0) {
                nearestEnemy.hp -= c.atk;
                nearestEnemy.hitTimer = 0.3;
                game.particles.push(createParticle(nearestEnemy.x, nearestEnemy.y - 8, `-${c.atk}`, '#90caf9'));
              }
            } else {
              if (nearestEnemy.hitTimer <= 0) {
                nearestEnemy.hp -= c.atk;
                nearestEnemy.hitTimer = 0.3;
                game.particles.push(createParticle(nearestEnemy.x, nearestEnemy.y - 8, `-${c.atk}`, '#90caf9'));
                if (nearestEnemy.hp <= 0) {
                  nearestEnemy.alive = false;
                  if (game.openWorld && nearestEnemy._chunkKey !== undefined) {
                    if (!game.chunkKills.has(nearestEnemy._chunkKey)) game.chunkKills.set(nearestEnemy._chunkKey, new Set());
                    game.chunkKills.get(nearestEnemy._chunkKey).add(nearestEnemy._spawnIndex);
                  }
                  p.xp += nearestEnemy.xp;
                  p.coins += nearestEnemy.coins;
                  game.particles.push(createParticle(nearestEnemy.x, nearestEnemy.y - 8, `+${nearestEnemy.xp} XP`, '#cc66ff'));
                  game.particles.push(createParticle(nearestEnemy.x, nearestEnemy.y - 20, `+${nearestEnemy.coins} $`, '#f0c040'));
                }
              }
            }
          }
        }
      }

      // Face enemy
      const dx = nearestEnemy.x - c.x;
      const dy = nearestEnemy.y - c.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        c.facing = dx > 0 ? 'right' : 'left';
      } else {
        c.facing = dy > 0 ? 'down' : 'up';
      }
    } else {
      // Follow player — stay 40-60 px behind
      if (distToPlayer > 60) {
        moveCompanionToward(c, p.x, p.y, c.speed, dt);
        c.moving = true;
        // Face movement direction
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          c.facing = dx > 0 ? 'right' : 'left';
        } else {
          c.facing = dy > 0 ? 'down' : 'up';
        }
      }
    }
  }
}

// --- Player update (movement, attack, portal/checkpoint tick, camera) ---
export function updatePlayer(dt) {
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

  // Horse + buff bonuses for combat
  p._atkMultiplier = (game.hasHorse ? 1.5 : 1) * getBuffAtkMultiplier(game);

  // Cooldowns handled by updateCooldowns() in game loop

  // Movement blocked when fast travel is open
  if (game.fastTravel && game.fastTravel.active) return;

  // Movement — читается из player.input (заполнен captureLocalInput или сетью)
  let dx = p.input.dx;
  let dy = p.input.dy;

  // Normalize if from keyboard (values are -1/0/1; touch joystick уже нормализован)
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }

  p.moving = dx !== 0 || dy !== 0;

  // Smooth facing rotation
  if (p.moving) {
    // Target angle from movement direction
    p.targetAngle = Math.atan2(dy, dx);

    // Interpolate current angle toward target (shortest path)
    let diff = p.targetAngle - p.facingAngle;
    // Normalize to [-π, π]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const step = p.turnSpeed * dt;
    if (Math.abs(diff) < step) {
      p.facingAngle = p.targetAngle;
    } else {
      p.facingAngle += Math.sign(diff) * step;
    }

    // Normalize facingAngle to [0, 2π)
    while (p.facingAngle < 0) p.facingAngle += Math.PI * 2;
    while (p.facingAngle >= Math.PI * 2) p.facingAngle -= Math.PI * 2;

    // Snap sprite facing based on angle quadrant
    const a = p.facingAngle;
    if (a > Math.PI * 0.25 && a <= Math.PI * 0.75) p.facing = 'down';
    else if (a > Math.PI * 0.75 && a <= Math.PI * 1.25) p.facing = 'left';
    else if (a > Math.PI * 1.25 && a <= Math.PI * 1.75) p.facing = 'up';
    else p.facing = 'right';
  }

  // Apply movement with collision
  // Замедление при стоянии на дереве (SLOW_TILES) — позволяет "продираться" через лес
  let slowTileMul = 1;
  const centerCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const centerRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
  const tileUnder = game.openWorld
    ? (game.chunkManager ? game.chunkManager.getTileAtWorld(centerCol, centerRow) : -1)
    : (game.currentMap ? getTile(game.currentMap, centerCol, centerRow) : -1);
  if (SLOW_TILES.has(tileUnder)) slowTileMul = SLOW_TILE_SPEED_MULT;

  const actualSpeed = (game.hasHorse ? MOVE_SPEED * 1.6 : MOVE_SPEED) * getBuffSpeedMultiplier(game) * (game.hazardManager ? game.hazardManager.getSpeedMultiplier() : 1) * slowTileMul;
  const moveX = dx * actualSpeed * dt;
  const moveY = dy * actualSpeed * dt;

  // X axis
  const newX = p.x + moveX;
  if (!collides(newX, p.y, p.hitW, p.hitH)) {
    p.x = newX;
  }

  // Y axis
  const newY = p.y + moveY;
  if (!collides(p.x, newY, p.hitW, p.hitH)) {
    p.y = newY;
  }

  // Attack — edge-триггер через consumeEdge (заполнен captureLocalInput или сетью)
  if (consumeEdge(p, 'attack') && !p.attacking) {
    p.attacking = true;
    p.attackTimer = getAttackSpeed(p);
    // Bow fires a projectile
    const arrow = createArrow(p);
    if (arrow) {
      game.projectiles.push(arrow);
      SFX.playBowShot();
    } else {
      const wType = getWeapon(p.weapon).type;
      if (wType === 'spear') SFX.playSpearThrust();
      else if (wType === 'axe') { SFX.playSwordSwing(); SFX.playHitEnemy(); }
      else SFX.playSwordSwing();
    }
  }

  // Portal cooldown & check
  if (game.portalCooldown > 0) game.portalCooldown -= dt;
  checkPortals();
  checkCheckpoint();

  // Biome hazards (open world only)
  if (game.openWorld && game.hazardManager) {
    game.hazardManager.update(p, game.chunkManager, dt, game.totalTime, game.particles);
  }

  // Update camera
  if (game.openWorld) {
    const { cx, cy } = game.chunkManager.pixelToChunk(
      p.x + p.hitW / 2,
      p.y + p.hitH / 2
    );
    if (game.chunkManager.updateCenter(cx, cy)) {
      syncChunkEnemies();
    }
    game.visitedChunks.add(`${cx},${cy}`);
    updateCameraOpenWorld(game.camera, p.x + p.hitW / 2, p.y + p.hitH / 2);
  } else {
    updateCamera(
      game.camera,
      p.x + p.hitW / 2,
      p.y + p.hitH / 2,
      game.currentMap.width,
      game.currentMap.height
    );
  }
}
