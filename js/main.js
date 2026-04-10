import { initInput, isKeyDown, isKeyPressed, getMovementInput } from './input.js';
import { detectMobile, initTouchControls, renderTouchControls, renderMenuTouchControls, renderMobilePanels, isMobileDevice, setTapAnywhereMode, getJoystickFlick, getGameOffsetX, getMobileCanvasWidth } from './touch.js';
import { createTileMap, renderMap, renderOpenWorld, isSolid, isPortal, getTile, TILE_SIZE } from './tilemap.js';
import { createCamera, updateCamera, updateCameraOpenWorld } from './camera.js';
import { villageMap } from './maps/village.js';
import { forestMap } from './maps/forest.js';
import { canyonMap } from './maps/canyon.js';
import { caveMap } from './maps/cave.js';
import { castleMap } from './maps/castle.js';
import { kingdomMap } from './maps/kingdom.js';
import { hellpitMap } from './maps/hellpit.js';
import { arenaMap } from './maps/arena.js';
import { drawHero, drawNPC, TILE, SOLID_TILES, OPEN_WORLD_SOLID_TILES, SLOW_TILES, SLOW_TILE_SPEED_MULT } from './sprites.js';
import { spawnEnemy, updateEnemies, renderEnemies, setProjectileCallback } from './enemies.js';
import { playerAttackEnemies, enemyAttackPlayer, checkLevelUp } from './combat.js';
import { createParticle, updateParticles, renderParticles } from './particles.js';
import { getNearbyNPC } from './npc.js';
import { openDialog, isDialogOpen, dialogInput, renderDialog, closeDialog } from './dialog.js';
import { useAbility, updateProjectiles, updateCooldowns, updateSlowTimers, renderProjectiles, renderAbilityBar } from './abilities.js';
import { createBoss, updateBoss, renderBoss, renderBossHPBar } from './bosses.js';
import { saveGame, loadGame, hasSave, deleteSave } from './save.js';
import { renderInventory, inventoryInput, resetInventorySelection } from './inventory.js';
import { WEAPONS, getWeapon, getTotalAtk, getWeaponRange, getAttackSpeed, getKnockback, createArrow, drawWeaponAttack, drawWeaponRest } from './weapons.js';
import { ARMOR, getArmor, getTotalDef, getArmorBonusHp, drawArmorOnHero, tryBlockProjectile } from './armor.js';
import { generateDungeon } from './dungeon.js';
import { QUESTS, getQuestState, acceptQuest, updateKillProgress, updateBossProgress, updateVisitProgress, claimReward, getNpcQuests, renderQuestTracker, renderQuestLog } from './quests.js';
import { generateEvents, openChest, updateAmbush, updateBuff, getBuffAtkMultiplier, getBuffSpeedMultiplier, isBuffInvincible, getBuffVampirism, applyBuff, getTraderDialog, drawChest, drawBuffStone, drawSecretPortal, drawEliteIndicator } from './events.js';
import { generateQuest, hasActiveGenQuest, getCompletedGenQuest, acceptGenQuest, claimGenReward, updateGenKillProgress, updateGenBossProgress, updateGenVisitProgress, updateGenArenaProgress, getActiveGenQuests } from './questgen.js';
import * as SFX from './audio.js';
import { createWorldGen, CHUNK_W, CHUNK_H } from './worldgen.js';
import { createChunkManager } from './chunks.js';
import { createFastTravel } from './fasttravel.js';
import { getDifficulty, cycleDifficulty, DIFFICULTY_COLORS } from './difficulty.js';
import { createMinimapRenderer } from './minimap.js';
import { createHazardManager } from './biome-hazards.js';
import { createWorldEventManager } from './world-events.js';
import { game, STATE } from './game-state.js';
import { initCanvasLayout } from './canvas-layout.js';
import {
  collides, collidesWithMap, collidesWithOpenWorld,
  unstickPlayer, awardLoot,
  getStructureChestRarity, getOpenWorldSaveState,
} from './map-loading.js';
import { vibrate, HAPTIC_LEVELUP, HAPTIC_DEATH } from './haptics.js';
import * as FPS from './debug-fps.js';

// Re-export для обратной совместимости на случай если кто-то импортирует из main.js
export { game, STATE };

// --- Class Definitions ---
const CLASSES = [
  {
    id: 'knight', name: 'Рыцарь',
    desc: 'Тяжёлая броня и топор. Может купить коня!',
    weapon: 'knight_axe',
    ownedWeapons: ['knight_axe'],
    armor: { helmet: 'knight_helmet', chest: null, legs: null, shield: 'iron_shield' },
    ownedArmor: ['knight_helmet', 'iron_shield'],
    coins: 0, potions: 2, hp: 120, atk: 7,
    color: '#b0bec5',
  },
  {
    id: 'archer', name: 'Лучник',
    desc: 'Быстрый, стреляет издалека.',
    weapon: 'bow',
    ownedWeapons: ['bow'],
    armor: { helmet: 'leather_helmet', chest: 'leather_chest', legs: null, shield: null },
    ownedArmor: ['leather_helmet', 'leather_chest'],
    coins: 0, potions: 3, hp: 80, atk: 4,
    color: '#8d6e63',
  },
  {
    id: 'landsknecht', name: 'Ландскнехт',
    desc: 'Копейщик в кольчуге. Дальний удар.',
    weapon: 'spear',
    ownedWeapons: ['spear'],
    armor: { helmet: 'iron_helmet', chest: 'chain_chest', legs: 'leather_legs', shield: null },
    ownedArmor: ['iron_helmet', 'chain_chest', 'leather_legs'],
    coins: 0, potions: 2, hp: 100, atk: 5,
    color: '#78909c',
  },
  {
    id: 'standard', name: 'Стандарт',
    desc: 'Меч и мешок монет. Классика.',
    weapon: 'iron_sword',
    ownedWeapons: ['iron_sword'],
    armor: { helmet: null, chest: null, legs: null, shield: null },
    ownedArmor: [],
    coins: 50, potions: 3, hp: 100, atk: 5,
    color: '#f0c040',
  },
  {
    id: 'gladiator', name: 'Гладиатор',
    desc: 'Боец арены. Стальной меч и щит.',
    weapon: 'steel_sword',
    ownedWeapons: ['steel_sword'],
    armor: { helmet: 'gladiator_helmet', chest: 'gladiator_chest', legs: 'gladiator_legs', shield: 'wooden_shield' },
    ownedArmor: ['gladiator_helmet', 'gladiator_chest', 'gladiator_legs', 'wooden_shield'],
    coins: 0, potions: 2, hp: 110, atk: 6,
    color: '#cd7f32',
  },
];

// --- Map Registry ---
const MAP_REGISTRY = {
  village: villageMap,
  forest: forestMap,
  canyon: canyonMap,
  cave: caveMap,
  castle: castleMap,
  kingdom: kingdomMap,
  hellpit: hellpitMap,
  arena: arenaMap,
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
  };
}

// --- Companion System ---
const COMPANION_TYPES = {
  merc_sword:  { name: 'Дарен',   weapon: 'sword', atk: 15, range: 40,  attackSpeed: 0.5, speed: 90, hp: 120, maxHp: 120, color: '#607d8b' },
  merc_spear:  { name: 'Рольф',   weapon: 'spear', atk: 18, range: 56,  attackSpeed: 0.6, speed: 80, hp: 100, maxHp: 100, color: '#607d8b' },
  merc_bow:    { name: 'Ивар',    weapon: 'bow',   atk: 12, range: 180, attackSpeed: 1.2, speed: 70, hp: 80,  maxHp: 80,  color: '#607d8b' },
  merc_axe:    { name: 'Гром',    weapon: 'axe',   atk: 22, range: 38,  attackSpeed: 0.7, speed: 75, hp: 150, maxHp: 150, color: '#5d4037' },
  merc_tank:   { name: 'Бронк',   weapon: 'sword', atk: 10, range: 36,  attackSpeed: 0.6, speed: 60, hp: 250, maxHp: 250, color: '#455a64' },
  merc_fast:   { name: 'Зефир',   weapon: 'sword', atk: 20, range: 42,  attackSpeed: 0.3, speed: 120,hp: 70,  maxHp: 70,  color: '#1565c0' },
  merc_healer: { name: 'Лиана',   weapon: 'heal',  atk: 0,  range: 100, attackSpeed: 2.0, speed: 85, hp: 60,  maxHp: 60,  color: '#2e7d32' },
  merc_mage:   { name: 'Аркан',   weapon: 'magic', atk: 25, range: 160, attackSpeed: 1.5, speed: 65, hp: 65,  maxHp: 65,  color: '#6a1b9a' },
};

function createCompanion(type, x, y) {
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

function updateCompanions(dt) {
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

function moveCompanionToward(c, tx, ty, speed, dt) {
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

function renderCompanions(ctx, cam) {
  for (const c of game.companions) {
    if (!c.alive) continue;
    const sx = c.x - cam.x;
    const sy = c.y - cam.y;
    if (sx < -40 || sx > game.width + 40 || sy < -40 || sy > game.height + 40) continue;

    // Flash when hit
    if (c.invincibleTimer > 0 && Math.floor(c.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const s = 2;
    ctx.save();
    ctx.translate(sx, sy);
    const mirror = c.facing === 'left';
    if (mirror) { ctx.scale(-1, 1); ctx.translate(-32, 0); }

    const f = c.moving ? game.animFrame : 0;
    const armBob = f % 2 === 0 ? 0 : s;

    // Helmet (colored per companion)
    const cc = c.color;
    ctx.fillStyle = cc;
    ctx.fillRect(5*s, 0, 6*s, 4*s);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(6*s, 0, 4*s, 2*s);
    ctx.fillStyle = '#222';
    ctx.fillRect(6*s, 2.5*s, 4*s, 1*s);

    // Body armor
    ctx.fillStyle = cc;
    ctx.fillRect(5*s, 4*s, 6*s, 7*s);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(6*s, 5*s, 4*s, 5*s);

    // Arms
    ctx.fillStyle = cc;
    ctx.fillRect(3*s, 5*s + armBob, 2*s, 5*s);
    ctx.fillRect(11*s, 5*s - armBob, 2*s, 5*s);

    // Legs
    ctx.fillStyle = cc;
    ctx.fillRect(6*s, 11*s, 2*s, 4*s);
    ctx.fillRect(9*s, 11*s, 2*s, 4*s);
    ctx.fillStyle = '#333';
    ctx.fillRect(5*s, 14*s, 3*s, 2*s);
    ctx.fillRect(8*s, 14*s, 3*s, 2*s);

    // Shield (left hand, not for healer/mage)
    if (c.weapon !== 'heal' && c.weapon !== 'magic') {
      ctx.fillStyle = '#607d8b';
      ctx.fillRect(1*s, 5*s + armBob, 3*s, 5*s);
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(1.5*s, 6*s + armBob, 2*s, 3*s);
      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(2.2*s, 6*s + armBob, 0.6*s, 5*s);
    }

    // Weapon (right hand)
    if (c.weapon === 'sword') {
      ctx.fillStyle = '#bdbdbd';
      ctx.fillRect(12*s, 2*s - armBob, 1.5*s, 9*s);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(11.5*s, 10*s - armBob, 2.5*s, 2*s);
    } else if (c.weapon === 'spear') {
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(12*s, -1*s - armBob, 1*s, 14*s);
      ctx.fillStyle = '#bdbdbd';
      ctx.fillRect(11.5*s, -3*s - armBob, 2*s, 3*s);
    } else if (c.weapon === 'bow') {
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(12*s, 3*s, 1.5*s, 8*s);
      ctx.fillStyle = '#ddd';
      ctx.fillRect(13*s, 3*s, 0.5*s, 8*s);
    } else if (c.weapon === 'axe') {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(12*s, 1*s - armBob, 1*s, 10*s);
      ctx.fillStyle = '#999';
      ctx.fillRect(10.5*s, -1*s - armBob, 4*s, 3*s);
      ctx.fillStyle = '#bbb';
      ctx.fillRect(10*s, -1*s - armBob, 1.5*s, 3*s);
    } else if (c.weapon === 'heal') {
      // Staff with green orb
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(12*s, 0 - armBob, 1*s, 12*s);
      ctx.fillStyle = '#44cc44';
      ctx.fillRect(11*s, -2*s - armBob, 3*s, 3*s);
      ctx.fillStyle = '#66ff66';
      ctx.fillRect(11.5*s, -1.5*s - armBob, 2*s, 2*s);
    } else if (c.weapon === 'magic') {
      // Staff with purple orb
      ctx.fillStyle = '#4a148c';
      ctx.fillRect(12*s, 0 - armBob, 1*s, 12*s);
      ctx.fillStyle = '#e040fb';
      ctx.fillRect(10.5*s, -3*s - armBob, 4*s, 4*s);
      ctx.fillStyle = '#ea80fc';
      ctx.fillRect(11*s, -2.5*s - armBob, 3*s, 3*s);
      ctx.fillStyle = '#f8bbd0';
      ctx.fillRect(11.5*s, -2*s - armBob, 2*s, 2*s);
    }

    ctx.restore();
    ctx.globalAlpha = 1;

    // HP bar above companion
    const hpW = 28;
    const hpH = 3;
    const hpX = sx + 2;
    const hpY = sy - 12;
    ctx.fillStyle = '#333';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    const hpRatio = Math.max(0, c.hp / c.maxHp);
    ctx.fillStyle = hpRatio > 0.3 ? '#44cc44' : '#ff4444';
    ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);

    // Name label
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#90caf9';
    ctx.fillText(c.name, sx + 16, sy - 14);
    ctx.textAlign = 'left';
  }
}

// --- Dungeon state ---
let dungeonDepth = 0;

// --- Load Map ---
function loadMap(mapKey, spawnX, spawnY) {
  let mapData;

  if (mapKey === 'dungeon') {
    // Generate new dungeon level 1
    dungeonDepth = 1;
    mapData = generateDungeon(dungeonDepth);
    MAP_REGISTRY._currentDungeon = mapData;
    // Force using playerStart from generated map
    spawnX = undefined;
    spawnY = undefined;
  } else if (mapKey === '_dungeon_next') {
    // Go deeper into dungeon
    dungeonDepth++;
    mapData = generateDungeon(dungeonDepth);
    MAP_REGISTRY._currentDungeon = mapData;
    mapKey = 'dungeon_' + dungeonDepth;
    spawnX = undefined;
    spawnY = undefined;
  } else {
    mapData = MAP_REGISTRY[mapKey];
  }

  if (!mapData) return;

  const tileMap = createTileMap(mapData);
  game.currentMap = tileMap;
  game.currentMapName = mapKey;

  // Quest: visit map progress
  if (game.player) {
    const visitDone = updateVisitProgress(game.player, mapKey);
    const genVisitDone = updateGenVisitProgress(game.player, mapKey);
    for (const q of [...visitDone, ...genVisitDone]) {
      game.particles.push(createParticle(game.player.x, game.player.y - 32, `Квест: ${q.name}!`, '#4caf50', 2));
    }
  }

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

  // Give player a reference to current map for collision checks (knockback)
  game.player._map = tileMap;

  // Make sure player isn't stuck inside a wall
  unstickPlayer();

  // Camera
  game.camera = createCamera(640, 480);

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

  // Boss from map data (skip if already defeated)
  game.boss = null;
  if (mapData.boss && !game.player.defeatedBosses.includes(mapData.boss.type)) {
    game.boss = createBoss(mapData.boss.type, mapData.boss.col, mapData.boss.row);
  }

  // Arena reset
  if (mapData.arena) {
    game.arenaWave = 0;
    game.arenaTimer = 1.5;
    game.arenaWaiting = true;
  }

  // Random events
  game.chests = [];
  game.buffStones = [];
  game.secretPortals = [];
  game._ambush = null;
  game.activeBuff = null;
  generateEvents(game, mapKey, tileMap);

  // Teleport companions to player
  for (let i = 0; i < game.companions.length; i++) {
    game.companions[i].x = game.player.x + (i + 1) * 20;
    game.companions[i].y = game.player.y + 30;
  }
}

// --- Open World ---
function syncChunkEnemies() {
  const cm = game.chunkManager;
  const newEnemies = [];
  const newNpcs = [];
  const newChests = [];
  const newBuffStones = [];
  const diff = getDifficulty(game.difficulty);

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = cm.centerCX + dx;
      const cy = cm.centerCY + dy;
      const k = `${cx},${cy}`;

      // Track visited chunks (for fast travel)
      if (game.visitedChunks) game.visitedChunks.add(k);

      if (!game.chunkEnemies.has(k)) {
        const chunk = cm.getChunk(cx, cy);
        const kills = game.chunkKills.get(k) || new Set();
        const enemies = [];

        // --- Terrain enemy spawns ---
        chunk.spawns.forEach((s, i) => {
          if (kills.has(i)) return;
          // Apply countMul: for easy (<1) skip some; for hardcore (>1) allow more
          if (diff.countMul < 1 && Math.random() > diff.countMul) return;
          if (diff.countMul > 1 && Math.random() > 1 / diff.countMul) {
            // duplicate will be handled naturally; we simply don't skip
          }
          const enemy = spawnEnemy(s.type, s.col, s.row);
          if (enemy) {
            enemy.x = (cx * CHUNK_W + s.col) * TILE_SIZE;
            enemy.y = (cy * CHUNK_H + s.row) * TILE_SIZE;
            enemy.originX = enemy.x;
            enemy.originY = enemy.y;
            enemy.hp = Math.floor(enemy.hp * s.tier * diff.hpMul);
            enemy.maxHp = enemy.hp;
            enemy.atk = Math.floor(enemy.atk * s.tier * diff.atkMul);
            enemy._chunkKey = k;
            enemy._spawnIndex = i;
            enemies.push(enemy);
          }
        });

        // --- Structure enemy spawns ---
        if (chunk.structure) {
          const st = chunk.structure;
          const structKills = game.chunkKills.get(k) || new Set();
          st.spawns.forEach((s, i) => {
            if (structKills.has('s' + i)) return;
            const enemy = spawnEnemy(s.type, s.col, s.row);
            if (enemy) {
              enemy.x = s.worldCol * TILE_SIZE;
              enemy.y = s.worldRow * TILE_SIZE;
              enemy.originX = enemy.x;
              enemy.originY = enemy.y;
              const tier = s.tier || 1;
              const bossMul = s.isBoss ? 3 : 1;
              enemy.hp = Math.floor(enemy.hp * tier * bossMul * diff.hpMul);
              enemy.maxHp = enemy.hp;
              enemy.atk = Math.floor(enemy.atk * tier * (s.isBoss ? 2 : 1) * diff.atkMul);
              if (s.isBoss) {
                enemy.xp = (enemy.xp || 10) * 5;
                enemy.coins = (enemy.coins || 5) * 5;
              }
              enemy._chunkKey = k;
              enemy._spawnIndex = 's' + i; // structure spawn index prefixed with 's'
              enemy._isStructureSpawn = true;
              enemies.push(enemy);
            }
          });
        }

        game.chunkEnemies.set(k, enemies);
      }

      newEnemies.push(...game.chunkEnemies.get(k));

      // --- Structure NPCs, chests, buff stones ---
      const chunk = cm.getChunk(cx, cy);
      if (chunk.structure) {
        const st = chunk.structure;
        const openedChests = game._openedStructChests || new Set();

        // NPCs
        for (const npc of st.npcs) {
          newNpcs.push({
            id: npc.id,
            col: npc.col,
            row: npc.row,
            x: npc.col * TILE_SIZE,
            y: npc.row * TILE_SIZE,
            name: npc.name,
            bodyColor: npc.bodyColor,
            headDetail: npc.headDetail,
            _chunkKey: k,
            _structureNpc: true,
          });
        }

        // Chests
        for (const chest of st.chests) {
          const chestKey = `${chest.col},${chest.row}`;
          const isOpened = openedChests.has(chestKey);
          newChests.push({
            x: chest.col * TILE_SIZE,
            y: chest.row * TILE_SIZE,
            col: chest.col,
            row: chest.row,
            rarity: getStructureChestRarity(cx, cy),
            opened: isOpened,
            _chunkKey: k,
            _structureChest: true,
            _chestKey: chestKey,
          });
        }

        // Buff stones (ruins)
        if (st.hasBuffStone && st.buffStoneCol !== null) {
          const bsKey = `bs_${st.buffStoneCol},${st.buffStoneRow}`;
          const picked = (game._pickedBuffStones || new Set()).has(bsKey);
          if (!picked) {
            const BUFF_TYPES_LOCAL = [
              { id: 'rage', name: 'Ярость', effect: 'atkMul', value: 2, color: '#ff1744', glow: '#ff5252' },
              { id: 'godshield', name: 'Щит богов', effect: 'invincible', value: 1, color: '#ffd54f', glow: '#ffecb3' },
              { id: 'wind', name: 'Ветер', effect: 'speedMul', value: 2, color: '#29b6f6', glow: '#81d4fa' },
              { id: 'vampirism', name: 'Вампиризм', effect: 'vampirism', value: 5, color: '#66bb6a', glow: '#a5d6a7' },
            ];
            // Deterministic buff from chunk coords
            const buffIdx = Math.abs((cx * 7 + cy * 13) % BUFF_TYPES_LOCAL.length);
            newBuffStones.push({
              x: st.buffStoneCol * TILE_SIZE,
              y: st.buffStoneRow * TILE_SIZE,
              buff: BUFF_TYPES_LOCAL[buffIdx],
              picked: false,
              _bsKey: bsKey,
              _structureBuff: true,
            });
          }
        }
      }
    }
  }

  // --- Boss lair: spawn real boss in current chunk ---
  const currentChunk = cm.getChunk(cm.centerCX, cm.centerCY);
  if (currentChunk && currentChunk.structure && currentChunk.structure.bossType) {
    const bossType = currentChunk.structure.bossType;
    const killedBosses = game._killedOpenWorldBosses || new Set();
    if (!killedBosses.has(bossType)) {
      // Only spawn if not already active
      if (!game.boss || !game.boss.alive || game.boss.type !== bossType) {
        const st = currentChunk.structure;
        const bossCenterCol = cm.centerCX * CHUNK_W + st.col + Math.floor(st.width / 2);
        const bossCenterRow = cm.centerCY * CHUNK_H + st.row + Math.floor(st.height / 2);
        game.boss = createBoss(bossType, bossCenterCol, bossCenterRow);
        if (game.boss) {
          // Scale boss stats by difficulty setting
          const bDiff = getDifficulty(game.difficulty);
          game.boss.hp = Math.floor(game.boss.hp * bDiff.hpMul);
          game.boss.maxHp = game.boss.hp;
          for (const phase of game.boss.phases) {
            phase.atk = Math.floor(phase.atk * bDiff.atkMul);
          }
          game.boss._openWorldBoss = true;
          game.boss._dialogShown = false;
        }
      }
    }
  } else if (game.boss && game.boss._openWorldBoss) {
    // Player left the boss chunk — despawn boss (unless mid-fight)
    const bx = game.boss.x + game.boss.width / 2;
    const by = game.boss.y + game.boss.height / 2;
    const px = game.player.x + game.player.hitW / 2;
    const py = game.player.y + game.player.hitH / 2;
    const distToBoss = Math.sqrt((bx - px) ** 2 + (by - py) ** 2);
    if (distToBoss > 600) {
      game.boss = null;
    }
  }

  // Unload distant chunk enemies
  for (const [k] of game.chunkEnemies) {
    const [ecx, ecy] = k.split(',').map(Number);
    if (Math.abs(ecx - cm.centerCX) > 1 || Math.abs(ecy - cm.centerCY) > 1) {
      game.chunkEnemies.delete(k);
    }
  }

  game.enemies = newEnemies;
  game.npcs = newNpcs;
  game.chests = newChests;
  if (newBuffStones.length > 0) {
    // Merge structure buff stones with any existing non-structure ones
    game.buffStones = [
      ...(game.buffStones || []).filter(b => !b._structureBuff),
      ...newBuffStones,
    ];
  }
}

/** Determine chest rarity based on distance from origin */
function createOpenWorldMapProxy() {
  // A proxy map object that routes isSolid/getTile calls to chunkManager
  // This allows enemies.js AI to use map-based collision in open world
  return {
    width: 999999,
    height: 999999,
    tiles: null,
    portals: [],
    isOpenWorld: true, // isSolid() использует OPEN_WORLD_SOLID_TILES для этого map
    getTileAt(col, row) {
      return game.chunkManager ? game.chunkManager.getTileAtWorld(col, row) : 0;
    },
  };
}

function enterOpenWorld(seed, playerWorldX, playerWorldY) {
  game.openWorld = true;
  game.worldSeed = seed || Math.floor(Math.random() * 2147483647);
  game.worldGen = createWorldGen(game.worldSeed);
  game.chunkManager = createChunkManager(game.worldGen);
  game.chunkEnemies = new Map();
  game.chunkKills = new Map();
  game.currentMap = createOpenWorldMapProxy();
  game.currentMapName = 'openworld';
  game.boss = null;
  game.npcs = [];
  game.chests = [];
  game.buffStones = [];
  game.secretPortals = [];
  game._ambush = null;
  game.activeBuff = null;
  game._openedStructChests = game._openedStructChests || new Set();
  game._pickedBuffStones = game._pickedBuffStones || new Set();
  game._killedOpenWorldBosses = game._killedOpenWorldBosses || new Set();
  game.visitedChunks = game.visitedChunks instanceof Set ? game.visitedChunks : new Set();
  game.fastTravel = createFastTravel();
  game.hazardManager = createHazardManager();

  const px = playerWorldX !== undefined ? playerWorldX : 15 * TILE_SIZE;
  const py = playerWorldY !== undefined ? playerWorldY : 10 * TILE_SIZE;

  if (!game.player) {
    game.player = createPlayer(0, 0);
  }
  game.player.x = px;
  game.player.y = py;

  game.player._map = game.currentMap;
  game.camera = createCamera(640, 480);

  const { cx, cy } = game.chunkManager.pixelToChunk(px, py);
  game.chunkManager.updateCenter(cx, cy);
  game.visitedChunks.add(`${cx},${cy}`);
  game.minimapRenderer = createMinimapRenderer(game.worldGen);
  game.worldEventManager = createWorldEventManager(game.worldGen);
  syncChunkEnemies();

  // Защита от спавна внутри стены после возврата из подземелья или fast travel
  unstickPlayer();

  // Teleport companions
  for (let i = 0; i < game.companions.length; i++) {
    game.companions[i].x = game.player.x + (i + 1) * 20;
    game.companions[i].y = game.player.y + 30;
  }
}

function exitOpenWorld() {
  game.openWorld = false;
  game.chunkManager = null;
  game.worldGen = null;
  game.chunkEnemies = null;
  game.chunkKills = null;
  game.minimapRenderer = null;
  game.hazardManager = null;
  game.worldEventManager = null;
  loadMap('village', 14, 10);
}

// getOpenWorldSaveState, collidesWithMap, collidesWithOpenWorld, collides,
// unstickPlayer, getStructureChestRarity, awardLoot вынесены в map-loading.js
// (Task 2.4 частичная экстракция). Остальные функции (loadMap, enterOpenWorld,
// exitOpenWorld, checkPortals, syncChunkEnemies, checkpoint) пока в main.js.

// --- Check Portals ---
function checkPortals() {
  // Grace period after teleport to prevent instant re-teleport
  if (game.portalCooldown > 0) return;

  // Open world: check for structure portal tiles (cave entrances, village portal)
  if (game.openWorld) {
    const p = game.player;
    const centerCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
    const centerRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
    const tile = game.chunkManager.getTileAtWorld(centerCol, centerRow);
    if (tile === TILE.PORTAL) {
      // Check if this is the village portal at chunk (0,0)
      const { cx, cy } = game.chunkManager.pixelToChunk(p.x, p.y);
      if (cx === 0 && cy === 0) {
        // Return to village map
        saveGame(game.player, 'openworld', getOpenWorldSaveState());
        exitOpenWorld();
        game.portalCooldown = 0.5;
        SFX.playPortal();
        return;
      }
      // Save return position
      game._openWorldReturn = { x: p.x, y: p.y + TILE_SIZE * 2 };
      // Enter a procedural dungeon
      game.player._companions = game.companions.map(c => c.type);
      game.player._playerClass = game.playerClass;
      game.player._hasHorse = game.hasHorse;
      // Use chunk coords as dungeon seed for consistency (cx, cy уже объявлены выше)
      const owDungeonDepth = Math.max(1, Math.floor(Math.sqrt(cx * cx + cy * cy) / 3));
      const dungeonMapData = generateDungeon(owDungeonDepth);
      if (dungeonMapData) {
        saveGame(game.player, 'openworld', getOpenWorldSaveState());
        game.openWorld = false;
        game.currentMapName = 'dungeon_ow';
        const tileMap = createTileMap(dungeonMapData);
        game.currentMap = tileMap;
        game.player.x = (dungeonMapData.playerStart ? dungeonMapData.playerStart.x : 2) * TILE_SIZE;
        game.player.y = (dungeonMapData.playerStart ? dungeonMapData.playerStart.y : 2) * TILE_SIZE;
        game.player._map = tileMap;
        game.npcs = tileMap.npcs ? tileMap.npcs.map(n => ({ ...n, x: n.col * TILE_SIZE, y: n.row * TILE_SIZE })) : [];
        game.enemies = [];
        if (tileMap.spawns) {
          for (const s of tileMap.spawns) {
            const enemy = spawnEnemy(s.type, s.col, s.row);
            if (enemy) game.enemies.push(enemy);
          }
        }
        game.boss = null;
        if (dungeonMapData.boss) {
          game.boss = createBoss(dungeonMapData.boss.type, dungeonMapData.boss.col, dungeonMapData.boss.row);
        }
        game.chests = [];
        game.buffStones = [];
        game.camera = createCamera(640, 480);
        game.portalCooldown = 0.5;
        SFX.playPortal();
      }
    }
    return;
  }

  const p = game.player;
  const centerCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const centerRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
  const portal = isPortal(game.currentMap, centerCol, centerRow);
  if (portal) {
    game.player._companions = game.companions.map(c => c.type);
    game.player._playerClass = game.playerClass;
    game.player._hasHorse = game.hasHorse;

    if (portal.target === 'openworld') {
      enterOpenWorld(game.worldSeed);
      saveGame(game.player, 'openworld', getOpenWorldSaveState());
      game.portalCooldown = 0.5;
      SFX.playPortal();
      return;
    }

    // Return from open-world dungeon to open world
    if (game.currentMapName === 'dungeon_ow' && portal.target === 'village') {
      const ret = game._openWorldReturn || { x: 15 * TILE_SIZE, y: 10 * TILE_SIZE };
      enterOpenWorld(game.worldSeed, ret.x, ret.y);
      saveGame(game.player, 'openworld', getOpenWorldSaveState());
      game.portalCooldown = 0.5;
      SFX.playPortal();
      return;
    }

    saveGame(game.player, portal.target);
    loadMap(portal.target, portal.spawnX, portal.spawnY);
    game.portalCooldown = 0.5;
    SFX.playPortal();
    SFX.playMusic(SFX.getMusicTheme(game.currentMapName));
  }
}

// awardLoot вынесен в map-loading.js

// --- Checkpoint System ---
function saveCheckpoint() {
  const p = game.player;
  game.checkpoint = {
    mapName: game.currentMapName,
    x: p.x,
    y: p.y,
    hp: p.hp,
    maxHp: p.maxHp,
    atk: p.atk,
    xp: p.xp,
    level: p.level,
    coins: p.coins,
    potions: p.potions,
    artifacts: { ...p.artifacts },
    weapon: p.weapon,
    ownedWeapons: [...p.ownedWeapons],
    equippedArmor: { ...p.equippedArmor },
    ownedArmor: [...(p.ownedArmor || [])],
    quests: p.quests ? JSON.parse(JSON.stringify(p.quests)) : {},
    defeatedBosses: [...p.defeatedBosses],
    // Open world state: allows respawn in the open world at this structure
    openWorld: game.openWorld ? {
      seed: game.worldSeed,
      difficulty: game.difficulty,
    } : null,
  };
}

function checkCheckpoint() {
  const p = game.player;
  const col = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const row = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);

  // In open world, check via chunkManager; otherwise use map tiles
  let tile;
  if (game.openWorld) {
    tile = game.chunkManager.getTileAtWorld(col, row);
  } else {
    tile = getTile(game.currentMap, col, row);
  }
  if (tile === TILE.CHECKPOINT) {
    // Only save if this is a new checkpoint position
    if (!game.checkpoint || game.checkpoint.mapName !== game.currentMapName ||
        Math.abs(game.checkpoint.x - p.x) > TILE_SIZE || Math.abs(game.checkpoint.y - p.y) > TILE_SIZE) {
      saveCheckpoint();
      // Heal a bit at checkpoint
      p.hp = Math.min(p.maxHp, p.hp + 20);
      SFX.playCheckpoint();
      game.particles.push(createParticle(p.x, p.y - 16, 'ЧЕКПОИНТ!', '#b388ff', 1.2));
      game.particles.push(createParticle(p.x, p.y - 4, '+20 HP', '#44cc44'));
    }
  }
}

function respawnAtCheckpoint() {
  const cp = game.checkpoint;
  if (!cp) return false;

  // Load the checkpoint map — or re-enter open world if checkpoint was there
  if (cp.openWorld && cp.mapName === 'openworld') {
    enterOpenWorld(cp.openWorld.seed, cp.x, cp.y);
    if (cp.openWorld.difficulty) game.difficulty = cp.openWorld.difficulty;
  } else {
    loadMap(cp.mapName);
  }

  // Restore player stats from checkpoint
  const p = game.player;
  p.x = cp.x;
  p.y = cp.y;
  p.hp = cp.maxHp;  // full heal on respawn
  p.maxHp = cp.maxHp;
  p.atk = cp.atk;
  p.xp = cp.xp;
  p.level = cp.level;
  p.coins = cp.coins;
  p.potions = cp.potions;
  p.artifacts = { ...cp.artifacts };
  p.weapon = cp.weapon;
  p.ownedWeapons = [...cp.ownedWeapons];
  p.equippedArmor = { ...cp.equippedArmor };
  p.ownedArmor = [...(cp.ownedArmor || [])];
  p.quests = cp.quests ? JSON.parse(JSON.stringify(cp.quests)) : {};
  p.defeatedBosses = [...cp.defeatedBosses];
  p.invincibleTimer = 1.5; // brief invincibility after respawn
  p.attacking = false;
  p.attackTimer = 0;
  p._map = game.currentMap;

  game.portalCooldown = 0.5;
  return true;
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
  } else if (action === 'buy_potion_pack') {
    if (p.coins >= 40) {
      p.coins -= 40;
      p.potions += 5;
      game.particles.push(createParticle(p.x, p.y - 8, '+5 зелий!', '#44cc44'));
    } else {
      game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
    }
  } else if (action === 'king_blessing') {
    // King heals to full and gives +10 max HP (once per visit)
    p.hp = p.maxHp;
    game.particles.push(createParticle(p.x, p.y - 16, 'Благословение!', '#ffd54f', 1.5));
    game.particles.push(createParticle(p.x, p.y - 4, 'HP восстановлено', '#44cc44'));
  } else if (action === 'heal_full') {
    // Healer NPC — heal to full for 20 coins
    if (p.hp >= p.maxHp) {
      game.particles.push(createParticle(p.x, p.y - 8, 'HP уже полные!', '#ff9800'));
    } else if (p.coins >= 20) {
      p.coins -= 20;
      p.hp = p.maxHp;
      game.particles.push(createParticle(p.x, p.y - 8, 'HP восстановлено!', '#44cc44', 1.5));
    } else {
      game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
    }
  } else if (action.startsWith('buy_armor_')) {
    // Armor purchase
    const armorId = action.slice(10); // remove 'buy_armor_'
    const a = getArmor(armorId);
    if (!a) return;
    if (p.ownedArmor.includes(armorId)) {
      // Already owned — equip it
      p.equippedArmor[a.slot] = armorId;
      game.particles.push(createParticle(p.x, p.y - 8, a.name, '#4fc3f7'));
    } else if (p.coins >= a.price) {
      p.coins -= a.price;
      p.ownedArmor.push(armorId);
      p.equippedArmor[a.slot] = armorId;
      game.particles.push(createParticle(p.x, p.y - 8, a.name + '!', '#ffd54f'));
    } else {
      game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
    }
  } else if (action === 'buy_trader_bigpot3') {
    if (p.coins >= 60) { p.coins -= 60; p.potions += 3; game.particles.push(createParticle(p.x, p.y - 8, '+3 зелья', '#44cc44')); }
    else game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
  } else if (action === 'buy_trader_teleport') {
    if (p.coins >= 100) { p.coins -= 100; loadMap('village'); game.particles.push(createParticle(p.x, p.y - 8, 'Телепорт!', '#b388ff', 1.5)); }
    else game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
  } else if (action === 'buy_trader_atkup') {
    if (p.coins >= 150) { p.coins -= 150; p.atk += 2; game.particles.push(createParticle(p.x, p.y - 8, '+2 ATK!', '#ff9800', 1.5)); }
    else game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
  } else if (action === 'buy_trader_hpup') {
    if (p.coins >= 150) { p.coins -= 150; p.maxHp += 20; p.hp += 20; game.particles.push(createParticle(p.x, p.y - 8, '+20 HP!', '#cc2222', 1.5)); }
    else game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
  } else if (action === 'buy_trader_revive') {
    if (p._hasRevive) { game.particles.push(createParticle(p.x, p.y - 8, 'Уже есть!', '#ff9800')); }
    else if (p.coins >= 200) { p.coins -= 200; p._hasRevive = true; game.particles.push(createParticle(p.x, p.y - 8, 'Камень воскрешения!', '#f0c040', 1.5)); }
    else game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
  } else if (action === 'buy_horse') {
    if (game.hasHorse) {
      game.particles.push(createParticle(p.x, p.y - 8, 'Конь уже есть!', '#ff9800'));
    } else if (p.coins >= 300) {
      p.coins -= 300;
      game.hasHorse = true;
      game.particles.push(createParticle(p.x, p.y - 8, 'Боевой конь!', '#f0c040', 2));
      SFX.playPickupItem();
    } else {
      game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
    }
  } else if (action.startsWith('buy_')) {
    // Weapon purchase (generic handler — must be after specific buy_ actions)
    const weaponId = action.slice(4);
    const w = getWeapon(weaponId);
    if (!w) return; // unknown weapon
    if (p.ownedWeapons.includes(weaponId)) {
      p.weapon = weaponId;
      game.particles.push(createParticle(p.x, p.y - 8, w.name, '#4fc3f7'));
    } else if (p.coins >= w.price) {
      p.coins -= w.price;
      p.ownedWeapons.push(weaponId);
      p.weapon = weaponId;
      game.particles.push(createParticle(p.x, p.y - 8, w.name + '!', '#ffd54f'));
    } else {
      game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
    }
  } else if (action.startsWith('hire_merc_')) {
    const mercType = action.slice(5); // 'merc_sword', 'merc_spear', 'merc_bow'
    const maxCompanions = p.level + 1;
    if (game.companions.find(c => c.type === mercType)) {
      game.particles.push(createParticle(p.x, p.y - 8, 'Уже нанят!', '#ff9800'));
    } else if (game.companions.length >= maxCompanions) {
      game.particles.push(createParticle(p.x, p.y - 8, `Макс ${maxCompanions} (ур.${p.level})`, '#ff9800'));
    } else if (p.coins >= 100) {
      p.coins -= 100;
      const comp = createCompanion(mercType, p.x, p.y + 40);
      game.companions.push(comp);
      game.particles.push(createParticle(p.x, p.y - 8, comp.name + ' нанят!', '#4fc3f7', 1.5));
      SFX.playPickupItem();
    } else {
      game.particles.push(createParticle(p.x, p.y - 8, 'Мало $', '#ff4444'));
    }
  } else if (action.startsWith('quest_accept_')) {
    const qid = action.slice(13);
    acceptQuest(p, qid);
    const q = QUESTS[qid];
    game.particles.push(createParticle(p.x, p.y - 8, 'Квест принят!', '#4fc3f7', 1.5));
    game.particles.push(createParticle(p.x, p.y - 20, q.name, '#ffd54f', 1.5));
  } else if (action.startsWith('quest_claim_')) {
    const qid = action.slice(12);
    if (claimReward(p, qid)) {
      const q = QUESTS[qid];
      game.particles.push(createParticle(p.x, p.y - 16, 'Награда!', '#ffd54f', 1.5));
      game.particles.push(createParticle(p.x, p.y - 4, q.rewardText, '#44cc44', 1.5));
      if (checkLevelUp(p)) {
        game.particles.push(createParticle(p.x, p.y - 28, 'LEVEL UP!', '#f0c040', 1.5));
        vibrate(HAPTIC_LEVELUP);
      }
    }
  }


  // Play buy/sell sound based on action type
  if (action.startsWith('buy_') || action === 'buy_potion' || action === 'buy_big_potion' || action === 'buy_potion_pack') {
    SFX.playBuy();
  } else if (action.startsWith('quest_accept_')) {
    SFX.playMenuSelect();
  } else if (action.startsWith('quest_claim_')) {
    SFX.playQuestComplete();
  } else if (action.startsWith('gen_offer_')) {
    const npcId = action.slice(10);
    const quest = generateQuest(npcId, p.level, p.defeatedBosses);
    if (quest) {
      acceptGenQuest(p, quest);
      game.particles.push(createParticle(p.x, p.y - 8, 'Задание принято!', '#90caf9', 1.5));
      game.particles.push(createParticle(p.x, p.y - 20, quest.name, '#ffd54f', 1.5));
    }
  } else if (action.startsWith('gen_claim_')) {
    const qid = action.slice(10);
    if (claimGenReward(p, qid)) {
      game.particles.push(createParticle(p.x, p.y - 16, 'Награда!', '#ffd54f', 1.5));
      if (checkLevelUp(p)) {
        game.particles.push(createParticle(p.x, p.y - 28, 'LEVEL UP!', '#f0c040', 1.5));
        vibrate(HAPTIC_LEVELUP);
      }
      SFX.playQuestComplete();
    }
  } else if (action === 'king_blessing') {
    SFX.playCheckpoint();
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

  // Horse + buff bonuses for combat
  p._atkMultiplier = (game.hasHorse ? 1.5 : 1) * getBuffAtkMultiplier(game);

  // Cooldowns handled by updateCooldowns() in game loop

  // Movement blocked when fast travel is open
  if (game.fastTravel && game.fastTravel.active) return;

  // Movement (keyboard + touch joystick)
  const move = getMovementInput();
  let dx = move.dx;
  let dy = move.dy;

  // Normalize if from keyboard (values are -1/0/1)
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

  // Attack
  if (isKeyPressed('Space') && !p.attacking) {
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
  const cx = getGameOffsetX() + 320; // center of game area

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
  ctx.fillText('ХРОНИКИ', cx + 2, 122);
  ctx.fillText('ЭЛЬДОРИИ', cx + 2, 162);

  // Title
  ctx.fillStyle = '#f0c040';
  ctx.fillText('ХРОНИКИ', cx, 120);
  ctx.fillText('ЭЛЬДОРИИ', cx, 160);

  // Menu prompts — different for mobile vs desktop
  if (isMobileDevice()) {
    renderMenuTouchControls(ctx, width, height, hasSave());
  } else {
    const blink = Math.sin(game.totalTime * 3) > 0;
    if (blink) {
      ctx.font = '14px "Press Start 2P"';
      ctx.fillStyle = '#ffffff';
      if (hasSave()) {
        ctx.fillText('ENTER=Новая  C=Продолжить', cx, 330);
      } else {
        ctx.fillText('НАЖМИ ENTER', cx, 330);
      }
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#b388ff';
      ctx.fillText('S = Песочница', cx, 360);
    }
  }

  // Footer
  ctx.font = '10px "Press Start 2P"';
  ctx.fillStyle = '#555';
  ctx.fillText('VOVA GAMES 2026', cx, 460);
}

// --- Boss Dialogs ---
const BOSS_DIALOGS = {
  forest_guardian: [
    { text: 'Я — Лесной Страж! Этот лес под моей защитой уже тысячу лет. Ты пришёл осквернить мои земли?', choices: [
      { text: 'Я пришёл за артефактом Земли!', next: 1 },
      { text: 'Я не хочу сражаться...', next: 2 },
    ]},
    { text: 'Дерзкий смертный! Артефакт получит лишь тот, кто одолеет меня в бою. ЗАЩИЩАЙСЯ!', choices: [
      { text: 'К бою!', next: null },
    ]},
    { text: 'У тебя нет выбора. Лес сам решает, кого пропустить. А сейчас — лес говорит: СРАЖАЙСЯ!', choices: [
      { text: 'Тогда сразимся!', next: null },
    ]},
  ],
  fire_dragon: [
    { text: '*РЁЁЁВ!* Ещё один герой, пришедший за славой? Я — Огненный Дракон, и это ущелье — мой дом!', choices: [
      { text: 'Отдай артефакт Огня по-хорошему!', next: 1 },
      { text: 'Какой огромный...', next: 2 },
    ]},
    { text: 'Ха-ха-ха! Ты смелый, но глупый. Моё пламя расплавит твою броню! ГОРИ!', choices: [
      { text: 'Посмотрим!', next: null },
    ]},
    { text: 'Верно, трепещи! Уже 300 лет ни один воин не покидал моё ущелье живым. Ты будешь следующим!', choices: [
      { text: 'Я буду первым, кто уйдёт!', next: null },
    ]},
  ],
  ice_lich: [
    { text: 'Тс-с-с... Ты чувствуешь холод? Это моя магия. Я — Ледяной Лич, повелитель этих пещер.', choices: [
      { text: 'Мне нужен артефакт Воды!', next: 1 },
      { text: 'Здесь так холодно...', next: 2 },
    ]},
    { text: 'Артефакт? Он давно слился с моей ледяной душой. Хочешь его — забери из моего мёртвого тела! Если сможешь...', choices: [
      { text: 'Смогу!', next: null },
    ]},
    { text: 'Холод — это лишь начало. Скоро ты познаешь вечную тьму. Твоя душа станет ещё одним льдом в моей коллекции!', choices: [
      { text: 'Не дождёшься!', next: null },
    ]},
  ],
  dark_mage: [
    { text: 'Наконец-то ты здесь, герой. Я ждал тебя. Я — Тёмный Маг, и скоро вся Эльдория будет моей!', choices: [
      { text: 'Твоё правление закончится сегодня!', next: 1 },
      { text: 'Зачем тебе это?', next: 2 },
    ]},
    { text: 'Глупец! Я собрал силу тысячи душ! Ты не представляешь, с чем столкнулся. Но я уважаю твою храбрость... перед смертью.', choices: [
      { text: 'За Эльдорию!', next: null },
    ]},
    { text: 'Зачем? Потому что могу. Потому что этот мир слаб, а я — силён. Три артефакта у тебя? Неважно. Моя магия сильнее!', choices: [
      { text: 'Проверим!', next: null },
    ]},
  ],
  rock_demon: [
    { text: '*Земля дрожит* ...СМЕРТНЫЙ. Ты посмел войти в мою яму? Я — ЗлойРокДемон, древнейший из демонов!', choices: [
      { text: 'Я пришёл за твоим оружием!', next: 1 },
      { text: 'Что ты такое?!', next: 2 },
    ]},
    { text: 'МОЁ ОРУЖИЕ?! Ха! Оно выковано из крови тысячи воинов! Хочешь его — умри и стань частью клинка!', choices: [
      { text: 'Или ты умрёшь!', next: null },
    ]},
    { text: 'Я — пламя под землёй. Я — камень, что крушит. Мой щит не пробить, мой меч не отразить. Но ты можешь попытаться... ПОСЛЕДНИЙ РАЗ!', choices: [
      { text: 'Начнём!', next: null },
    ]},
  ],
};

// --- Horse Drawing ---
function drawHorse(ctx, x, y, facing, animFrame) {
  const s = 2;
  ctx.save();
  ctx.translate(x, y);
  const mirror = facing === 'left';
  if (mirror) { ctx.scale(-1, 1); ctx.translate(-32, 0); }

  const gallop = animFrame % 2 === 0 ? 0 : s;
  const isSide = facing === 'left' || facing === 'right';

  if (isSide) {
    // Side view — elongated body
    // Body
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(1*s, 6*s, 14*s, 6*s);
    ctx.fillStyle = '#795548';
    ctx.fillRect(2*s, 7*s, 12*s, 4*s);

    // Neck
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(12*s, 2*s, 3*s, 5*s);
    ctx.fillStyle = '#795548';
    ctx.fillRect(13*s, 3*s, 2*s, 3*s);

    // Head
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(14*s, 0, 4*s, 3*s);
    ctx.fillStyle = '#795548';
    ctx.fillRect(15*s, 0, 2*s, 2*s);
    // Eye
    ctx.fillStyle = '#222';
    ctx.fillRect(16*s, 1*s, 1*s, 1*s);
    // Nostril
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(17*s, 2*s, 1*s, 1*s);

    // Mane
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(12*s, 1*s, 2*s, 4*s);

    // Legs (front pair)
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(11*s, 12*s - gallop, 2*s, 4*s + gallop);
    ctx.fillRect(13*s, 12*s + gallop, 2*s, 4*s - gallop);
    // Legs (back pair)
    ctx.fillRect(2*s, 12*s + gallop, 2*s, 4*s - gallop);
    ctx.fillRect(4*s, 12*s - gallop, 2*s, 4*s + gallop);

    // Hooves
    ctx.fillStyle = '#333';
    ctx.fillRect(11*s, 15*s, 2*s, 1*s);
    ctx.fillRect(13*s, 15*s, 2*s, 1*s);
    ctx.fillRect(2*s, 15*s, 2*s, 1*s);
    ctx.fillRect(4*s, 15*s, 2*s, 1*s);

    // Tail
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 5*s, 2*s, 4*s);
    ctx.fillRect(-1*s, 7*s, 2*s, 3*s);

    // Saddle
    ctx.fillStyle = '#c62828';
    ctx.fillRect(6*s, 5*s, 5*s, 2*s);
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(7*s, 5*s, 3*s, 1*s);
    // Stirrup
    ctx.fillStyle = '#bbb';
    ctx.fillRect(7*s, 10*s, 1*s, 2*s);
  } else {
    // Front/back view — compact
    // Body
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(3*s, 6*s, 10*s, 6*s);
    ctx.fillStyle = '#795548';
    ctx.fillRect(4*s, 7*s, 8*s, 4*s);

    // Head (above or below based on facing)
    if (facing === 'down') {
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(5*s, 2*s, 6*s, 5*s);
      ctx.fillStyle = '#795548';
      ctx.fillRect(6*s, 3*s, 4*s, 3*s);
      // Eyes
      ctx.fillStyle = '#222';
      ctx.fillRect(6*s, 4*s, 1*s, 1*s);
      ctx.fillRect(9*s, 4*s, 1*s, 1*s);
      // Ears
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(5*s, 1*s, 2*s, 2*s);
      ctx.fillRect(9*s, 1*s, 2*s, 2*s);
    } else {
      // facing up — show back of head/mane
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(5*s, 2*s, 6*s, 5*s);
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(6*s, 2*s, 4*s, 4*s); // mane
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(5*s, 1*s, 2*s, 2*s);
      ctx.fillRect(9*s, 1*s, 2*s, 2*s);
    }

    // Legs
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(4*s, 12*s - gallop, 2*s, 4*s + gallop);
    ctx.fillRect(10*s, 12*s + gallop, 2*s, 4*s - gallop);
    // Hooves
    ctx.fillStyle = '#333';
    ctx.fillRect(4*s, 15*s, 2*s, 1*s);
    ctx.fillRect(10*s, 15*s, 2*s, 1*s);

    // Saddle
    ctx.fillStyle = '#c62828';
    ctx.fillRect(5*s, 5*s, 6*s, 2*s);
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(6*s, 5*s, 4*s, 1*s);
  }

  ctx.restore();
}

// --- Class Select Screen ---
function renderClassSelect(ctx) {
  const cx = getGameOffsetX() + 320;

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, game.width, game.height);

  // Title
  ctx.font = '16px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('ВЫБЕРИ КЛАСС', cx, 40);

  // Draw class cards
  const cardW = 100, cardH = 320, spacing = 10;
  const totalW = CLASSES.length * (cardW + spacing) - spacing;
  const startX = cx - totalW / 2;

  for (let i = 0; i < CLASSES.length; i++) {
    const cls = CLASSES[i];
    const x = startX + i * (cardW + spacing);
    const y = 60;
    const selected = i === game.selectedClass;

    // Card background
    ctx.fillStyle = selected ? '#1a1a3a' : '#111';
    ctx.fillRect(x, y, cardW, cardH);

    // Border
    ctx.strokeStyle = selected ? cls.color : '#333';
    ctx.lineWidth = selected ? 3 : 1;
    ctx.strokeRect(x, y, cardW, cardH);

    // Class icon (simple character preview)
    const iconX = x + cardW / 2;
    const iconY = y + 50;
    drawClassIcon(ctx, iconX, iconY, cls, selected);

    // Class name
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = selected ? cls.color : '#888';
    ctx.fillText(cls.name, x + cardW / 2, y + 100);

    // Description (word wrap)
    if (selected) {
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = '#ccc';
      const words = cls.desc.split(' ');
      let line = '', lineY = y + 120;
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > cardW - 10) {
          ctx.fillText(line, x + cardW / 2, lineY);
          line = word;
          lineY += 12;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x + cardW / 2, lineY);

      // Stats
      lineY += 16;
      ctx.fillStyle = '#cc2222';
      ctx.fillText(`HP: ${cls.hp}`, x + cardW / 2, lineY);
      lineY += 12;
      ctx.fillStyle = '#ff9800';
      ctx.fillText(`ATK: ${cls.atk}`, x + cardW / 2, lineY);
      if (cls.coins > 0) {
        lineY += 12;
        ctx.fillStyle = '#f0c040';
        ctx.fillText(`$: ${cls.coins}`, x + cardW / 2, lineY);
      }

      // Equipment list
      lineY += 16;
      ctx.fillStyle = '#90caf9';
      const wep = getWeapon(cls.weapon);
      if (wep) ctx.fillText(wep.name, x + cardW / 2, lineY);
      lineY += 12;
      for (const slot of ['helmet', 'chest', 'legs', 'shield']) {
        if (cls.armor[slot]) {
          const arm = getArmor(cls.armor[slot]);
          if (arm) {
            ctx.fillText(arm.name, x + cardW / 2, lineY);
            lineY += 12;
          }
        }
      }
    }

    // Number key hint
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = selected ? '#fff' : '#555';
    ctx.fillText(`${i + 1}`, x + cardW / 2, y + cardH - 8);
  }

  // Instructions
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666';
  ctx.fillText(isMobileDevice() ? 'Джойстик=выбор  ⚔=Начать' : '← → = выбор    ENTER = начать    ESC = назад', cx, 470);

  ctx.textAlign = 'left';
}

function drawClassIcon(ctx, x, y, cls, selected) {
  const s = 3;
  // Simple character silhouette with class color
  const c = selected ? cls.color : '#555';

  // Head
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(x - 2*s, y - 6*s, 4*s, 4*s);

  // Helmet (if class has one)
  if (cls.armor.helmet) {
    ctx.fillStyle = c;
    ctx.fillRect(x - 3*s, y - 7*s, 6*s, 3*s);
  }

  // Body
  ctx.fillStyle = c;
  ctx.fillRect(x - 3*s, y - 2*s, 6*s, 6*s);

  // Legs
  ctx.fillStyle = selected ? '#555' : '#333';
  ctx.fillRect(x - 2*s, y + 4*s, 2*s, 4*s);
  ctx.fillRect(x, y + 4*s, 2*s, 4*s);

  // Shield (left)
  if (cls.armor.shield) {
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(x - 5*s, y - 1*s, 2*s, 4*s);
  }

  // Weapon (right)
  const wep = getWeapon(cls.weapon);
  if (wep) {
    ctx.fillStyle = wep.color;
    if (wep.type === 'bow') {
      ctx.fillRect(x + 4*s, y - 4*s, 1*s, 7*s);
      ctx.fillStyle = '#ddd';
      ctx.fillRect(x + 5*s, y - 4*s, 0.5*s, 7*s);
    } else if (wep.type === 'spear') {
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(x + 4*s, y - 8*s, 1*s, 12*s);
      ctx.fillStyle = '#bbb';
      ctx.fillRect(x + 3.5*s, y - 9*s, 2*s, 2*s);
    } else if (wep.type === 'axe') {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(x + 4*s, y - 5*s, 1*s, 8*s);
      ctx.fillStyle = '#999';
      ctx.fillRect(x + 3*s, y - 6*s, 3*s, 2*s);
    } else {
      // sword
      ctx.fillRect(x + 4*s, y - 5*s, 1*s, 8*s);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(x + 3*s, y + 2*s, 3*s, 1*s);
    }
  }
}

// --- HUD ---
function renderHUD(ctx) {
  const p = game.player;
  if (!p) return;
  const GW = 640; // game area width

  // Top bar background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, GW, 36);

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

  // Weapon name
  const curW = getWeapon(p.weapon);
  ctx.fillStyle = curW.color;
  const def = getTotalDef(game.player);
  if (def > 0) {
    ctx.fillStyle = '#78909c';
    ctx.fillText(`DEF ${def}`, 380, hpBarY + 10);
  }

  // Difficulty indicator (open world, non-normal)
  if (game.openWorld && game.difficulty && game.difficulty !== 'normal') {
    const _diff = getDifficulty(game.difficulty);
    ctx.textAlign = 'left';
    ctx.fillStyle = DIFFICULTY_COLORS[game.difficulty] || '#aaa';
    ctx.fillText(_diff.name, 440, hpBarY + 10);
  }

  // Map name + sandbox label
  ctx.textAlign = 'right';
  if (game.sandbox) {
    ctx.fillStyle = '#b388ff';
    ctx.fillText('ПЕСОЧНИЦА', GW - 8, hpBarY + 10);
  } else {
    ctx.fillStyle = '#aaa';
    ctx.fillText(game.openWorld ? 'Открытый мир' : (game.currentMap ? game.currentMap.name : ''), GW - 8, hpBarY + 10);
  }

  // Arena wave counter
  if (game.currentMapName === 'arena') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0c040';
    ctx.fillText(`РАУНД ${game.arenaWave}`, GW / 2, hpBarY + 10);
  }

  // Reset textAlign
  ctx.textAlign = 'left';
}

// --- Minimap ---
function renderMinimap(ctx) {
  const map = game.currentMap;
  const p = game.player;
  if (!p) return;
  if (!map && !game.openWorld) return;

  // Open world minimap: enhanced with biome terrain, fog of war, structures
  if (game.openWorld && game.minimapRenderer) {
    const mmW = 120, mmH = 120;
    let mmX, mmY;
    if (isMobileDevice()) {
      // Render in the right panel area (outside game clip — handled by caller)
      mmX = 640 - mmW - 6;
      mmY = 480 - mmH - 6;
    } else {
      mmX = 640 - mmW - 6;
      mmY = 480 - mmH - 6;
    }
    game.minimapRenderer.render(
      ctx, mmX, mmY, mmW, mmH,
      p, game.enemies, game.chunkManager,
      game.visitedChunks, game.totalTime
    );

    // --- World Event minimap marker ---
    if (game.worldEventManager) {
      const marker = game.worldEventManager.getMinimapMarker();
      if (marker) {
        // Convert world pixel coords to minimap pixel coords
        // Minimap shows RADIUS chunks in each direction (GRID = 7 chunks)
        const { cx: playerCX, cy: playerCY } = game.chunkManager.pixelToChunk(
          p.x + (p.hitW || 0) / 2,
          p.y + (p.hitH || 0) / 2
        );
        const RADIUS = 3;
        const GRID   = RADIUS * 2 + 1;
        const cellW  = mmW / GRID;
        const cellH  = mmH / GRID;

        const { cx: evCX, cy: evCY } = game.chunkManager.pixelToChunk(marker.worldX, marker.worldY);
        const edx = evCX - playerCX;
        const edy = evCY - playerCY;

        // Clamp to minimap edge if out of range
        const clampedDx = Math.max(-RADIUS, Math.min(RADIUS, edx));
        const clampedDy = Math.max(-RADIUS, Math.min(RADIUS, edy));

        const fracX = (((marker.worldX / TILE_SIZE) % CHUNK_W) + CHUNK_W) % CHUNK_W / CHUNK_W;
        const fracY = (((marker.worldY / TILE_SIZE) % CHUNK_H) + CHUNK_H) % CHUNK_H / CHUNK_H;

        // Only draw sub-cell fraction if not clamped
        const useSubX = edx === clampedDx ? fracX : (edx < 0 ? 0 : 1);
        const useSubY = edy === clampedDy ? fracY : (edy < 0 ? 0 : 1);

        const mx = Math.floor(mmX + (clampedDx + RADIUS + useSubX) * cellW);
        const my = Math.floor(mmY + (clampedDy + RADIUS + useSubY) * cellH);

        // Pulsing dot
        const pulse = Math.floor(game.totalTime / 0.4) % 2 === 0;
        const dotR  = pulse ? 4 : 3;
        ctx.fillStyle = marker.color;
        ctx.globalAlpha = pulse ? 1.0 : 0.7;
        ctx.beginPath();
        ctx.arc(mx, my, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Small indicator if event is out of minimap range
        if (Math.abs(edx) > RADIUS || Math.abs(edy) > RADIUS) {
          ctx.font = '6px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = marker.color;
          ctx.fillText('!', mx, my + 1);
          ctx.textAlign = 'left';
        }
      }
    }

    return;
  }

  if (!map) return;

  const mmW = 72, mmH = 72;
  const mmX = 640 - mmW - 8;
  const mmY = 480 - mmH - 8;

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
  ctx.fillStyle = '#1a2a10';
  ctx.fillRect(mmX, mmY, mmW, mmH);

  // Scale factors
  const scaleX = mmW / (map.width * TILE_SIZE);
  const scaleY = mmH / (map.height * TILE_SIZE);

  // Enemy dots (red, 3x3)
  ctx.fillStyle = '#ff3333';
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const ex = mmX + e.x * scaleX;
    const ey = mmY + e.y * scaleY;
    ctx.fillRect(ex - 1, ey - 1, 3, 3);
  }

  // Boss dot (gold, 5x5)
  if (game.boss && game.boss.alive) {
    ctx.fillStyle = '#f0c040';
    const bx = mmX + game.boss.x * scaleX;
    const by = mmY + game.boss.y * scaleY;
    ctx.fillRect(bx - 2, by - 2, 5, 5);
  }

  // Player dot (cyan, 4x4)
  ctx.fillStyle = '#00ffff';
  const px = mmX + p.x * scaleX;
  const py = mmY + p.y * scaleY;
  ctx.fillRect(px - 2, py - 2, 4, 4);
}

// --- Help Overlay ---
function renderHelpOverlay(ctx) {
  const x = 60, y = 40;
  const w = 640 - 120, h = 480 - 80;

  // Dark background
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(x, y, w, h);
  // Gold border
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Title
  ctx.font = '14px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('УПРАВЛЕНИЕ', 320, y + 36);

  // Lines
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#ffffff';
  const lines = [
    'WASD / Стрелки — Движение',
    'ПРОБЕЛ — Удар мечом',
    'E — Говорить с NPC',
    'Q — Использовать зелье',
    '1 — Каменный щит',
    '2 — Огненный шар',
    '3 — Ледяная волна',
    'I — Инвентарь',
    'J — Журнал квестов',
    'M — Музыка вкл/выкл',
    'H — Эта справка',
  ];
  let lineY = y + 70;
  for (const line of lines) {
    ctx.fillText(line, 320, lineY);
    lineY += 28;
  }

  // Footer
  ctx.fillStyle = '#aaa';
  ctx.fillText('Нажми H чтобы закрыть', 320, y + h - 20);
  ctx.textAlign = 'left';
}

// --- Render Play State ---
function renderPlay(ctx) {
  const cam = game.camera;
  const map = game.currentMap;
  if (!cam) return;
  if (!map && !game.openWorld) return;

  const gOffset = getGameOffsetX();

  // Clear entire canvas (including panels)
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, game.width, game.height);

  // Render side panels
  if (isMobileDevice()) {
    renderMobilePanels(ctx, game.width, game.height);
  }

  // Clip and translate to game area
  ctx.save();
  if (gOffset > 0) {
    ctx.beginPath();
    ctx.rect(gOffset, 0, 640, 480);
    ctx.clip();
    ctx.translate(gOffset, 0);
  }

  // Map tiles
  if (game.openWorld) {
    renderOpenWorld(ctx, game.chunkManager, cam);
  } else {
    renderMap(ctx, map, cam, game.animFrame);
  }

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

  // Chests
  if (game.chests) {
    for (const chest of game.chests) {
      const cx = chest.x - cam.x;
      const cy = chest.y - cam.y;
      if (cx > -32 && cx < 672 && cy > -32 && cy < 512) {
        drawChest(ctx, cx, cy, chest.opened);
      }
    }
  }

  // Buff stones
  if (game.buffStones) {
    for (const stone of game.buffStones) {
      if (stone.picked) continue;
      const bx = stone.x - cam.x;
      const by = stone.y - cam.y;
      if (bx > -32 && bx < 672 && by > -32 && by < 512) {
        drawBuffStone(ctx, bx, by, stone.buff, game.totalTime);
      }
    }
  }

  // Secret portals
  if (game.secretPortals) {
    for (const portal of game.secretPortals) {
      if (portal.used) continue;
      const px = portal.x - cam.x;
      const py = portal.y - cam.y;
      if (px > -32 && px < 672 && py > -32 && py < 512) {
        drawSecretPortal(ctx, px, py, game.totalTime);
      }
    }
  }

  // World Event beams (rendered before enemies so beam is behind them)
  if (game.openWorld && game.worldEventManager) {
    game.worldEventManager.render(ctx, cam);
  }

  // Enemies
  renderEnemies(ctx, game.enemies, cam, game.animFrame);

  // Elite indicators (drawn on top of enemies)
  for (const enemy of game.enemies) {
    if (!enemy.alive || !enemy._elite) continue;
    const ex = enemy.x - cam.x;
    const ey = enemy.y - cam.y;
    if (ex < -50 || ex > 690 || ey < -50 || ey > 530) continue;
    drawEliteIndicator(ctx, ex, ey, enemy.width, enemy.height, enemy._elite, game.totalTime);
  }

  // Boss
  if (game.boss && game.boss.alive) {
    renderBoss(ctx, game.boss, cam, game.animFrame);
  }

  // Companions
  renderCompanions(ctx, cam);

  // Projectiles
  renderProjectiles(ctx, game.projectiles, cam);

  // Player
  const p = game.player;
  if (p) {
    const px = p.x - cam.x;
    const py = p.y - cam.y;
    // Flash when invincible (semi-transparent flicker)
    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    // Body lean during turn
    let diff = p.targetAngle - p.facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const lean = Math.max(-0.15, Math.min(0.15, diff * 0.5));

    const heroCX = px + 16;
    const heroCY = py + 20;
    ctx.save();
    ctx.translate(heroCX, heroCY);
    ctx.rotate(lean);
    ctx.translate(-heroCX, -heroCY);

    // Two-handed weapon check
    const isTwoHanded = getWeapon(p.weapon).twoHanded || false;
    p._twoHanded = isTwoHanded;
    p.equippedArmor._twoHanded = isTwoHanded;

    // Horse (drawn under hero)
    if (game.hasHorse) {
      drawHorse(ctx, px, py, p.facing, p.moving ? game.animFrame : 0);
    }

    drawHero(ctx, px, py + (game.hasHorse ? -10 : 0), p.facing, p.moving ? game.animFrame : 0, p.attacking);
    drawArmorOnHero(ctx, px, py + (game.hasHorse ? -10 : 0), p.facing, p.equippedArmor, 2);
    const heroY = py + (game.hasHorse ? -10 : 0);
    if (p.attacking) {
      const atkProgress = 1 - (p.attackTimer / getAttackSpeed(p));
      drawWeaponAttack(ctx, px, heroY, p.facing, p.weapon, 2, atkProgress);
    } else {
      drawWeaponRest(ctx, px, heroY, p.weapon, 2);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Particles
  renderParticles(ctx, game.particles, game.camera);

  // Biome hazard overlays (before HUD)
  if (game.openWorld && game.hazardManager) {
    game.hazardManager.render(ctx, game.camera, game.totalTime);
  }

  // HUD on top
  renderHUD(ctx);

  // Ability bar
  renderAbilityBar(ctx, game.player, 640, 480);

  // Active buff HUD
  if (game.activeBuff) {
    const b = game.activeBuff;
    const bx = 460, by = 6;
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(bx, by, 80, 22);
    ctx.globalAlpha = 1;
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(b.name, bx + 4, by + 9);
    ctx.fillText(Math.ceil(b.timer) + 'с', bx + 4, by + 18);
    // Timer bar
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx + 40, by + 12, (b.timer / 30) * 36, 4);
  }

  // Boss HP bar (on top of HUD)
  if (game.boss && game.boss.alive) {
    renderBossHPBar(ctx, game.boss, 640);
  }

  // Minimap
  renderMinimap(ctx);

  // Fast Travel overlay
  if (game.fastTravel && game.fastTravel.active) {
    game.fastTravel.render(ctx, 0, 0, 640, 480);
  }

  // Restore from game area clip/translate
  ctx.restore();
}

// --- Game Loop ---
let lastTime = 0;

function gameLoop(timestamp) {
  FPS.begin();
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

  // On mobile, enable "tap anywhere" mode for GAMEOVER/WIN screens
  if (isMobileDevice()) {
    setTapAnywhereMode(game.state === STATE.GAMEOVER || game.state === STATE.WIN);
  }

  switch (game.state) {
    case STATE.MENU:
      renderMenu(ctx, dt);
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        game.selectedClass = 0;
        game.state = STATE.CLASS_SELECT;
        SFX.resumeAudio();
      }
      if (isKeyPressed('KeyS')) {
        deleteSave();
        game.player = null;
        game.checkpoint = null;
        game.sandbox = true;
        game.state = STATE.PLAY;
        loadMap('village');
        // Sandbox: max stats, all weapons, all armor, all artifacts
        const p = game.player;
        p.coins = 99999;
        p.hp = 9999;
        p.maxHp = 9999;
        p.atk = 50;
        p.level = 10;
        p.potions = 99;
        p.artifacts = { earth: true, fire: true, water: true };
        // Give all weapons
        p.ownedWeapons = Object.keys(WEAPONS);
        // Give all armor
        p.ownedArmor = Object.keys(ARMOR);
        p.equippedArmor = { helmet: 'ferida_helmet', chest: 'ezanilla_chest', legs: 'iomerida_legs', shield: 'moremirida_shield' };
        p.weapon = 'mithril_sword';
        saveCheckpoint();
        SFX.resumeAudio();
        SFX.playMusic('village');
      }
      if (isKeyPressed('KeyC') && hasSave()) {
        const save = loadGame();
        if (save) {
          game.player = null;
          game.state = STATE.PLAY;

          // Check if save is open world
          if (save.currentMap === 'openworld' && save.openWorld) {
            game.player = createPlayer(0, 0);
            game.playerClass = save.playerClass || null;
            game.hasHorse = save.hasHorse || false;
            enterOpenWorld(save.openWorld.seed, save.openWorld.playerX, save.openWorld.playerY);
            // Restore open world changes
            if (save.openWorld.changes) {
              game.chunkManager.loadChanges(save.openWorld.changes);
            }
            // Restore chunk kills
            if (save.openWorld.kills) {
              for (const [k, arr] of Object.entries(save.openWorld.kills)) {
                game.chunkKills.set(k, new Set(arr));
              }
              // Re-sync enemies with kill data
              game.chunkEnemies = new Map();
              syncChunkEnemies();
            }
            // Restore structure persistence
            if (save.openWorld.openedChests) {
              game._openedStructChests = new Set(save.openWorld.openedChests);
            }
            if (save.openWorld.pickedBuffStones) {
              game._pickedBuffStones = new Set(save.openWorld.pickedBuffStones);
            }
            // Restore difficulty and visited chunks
            if (save.openWorld.difficulty) {
              game.difficulty = save.openWorld.difficulty;
            }
            if (save.openWorld.visitedChunks) {
              game.visitedChunks = new Set(save.openWorld.visitedChunks);
            }
            if (save.openWorld.killedBosses) {
              game._killedOpenWorldBosses = new Set(save.openWorld.killedBosses);
            }
            if (game.minimapRenderer) {
              game.minimapRenderer.invalidate();
            }
          } else {
            loadMap(save.currentMap);
          }

          // Restore player stats from save
          const p = game.player;
          p.hp = save.hp;
          p.maxHp = save.maxHp;
          p.atk = save.atk;
          p.xp = save.xp;
          p.level = save.level;
          p.coins = save.coins;
          p.potions = save.potions;
          p.artifacts = { ...save.artifacts };
          p.defeatedBosses = [...(save.defeatedBosses || [])];
          p.weapon = save.weapon || 'iron_sword';
          p.ownedWeapons = [...(save.ownedWeapons || ['iron_sword'])];
          p.equippedArmor = { ...(save.equippedArmor || { helmet: null, chest: null, legs: null }) };
          p.ownedArmor = [...(save.ownedArmor || [])];
          p.quests = save.quests ? JSON.parse(JSON.stringify(save.quests)) : {};
          // Restore companions
          game.companions = [];
          if (save.companions) {
            for (const ctype of save.companions) {
              if (COMPANION_TYPES[ctype]) {
                game.companions.push(createCompanion(ctype, p.x + 20, p.y + 20));
              }
            }
          }
          // Restore class and horse
          game.playerClass = save.playerClass || null;
          game.hasHorse = save.hasHorse || false;
        }
      }
      break;

    case STATE.CLASS_SELECT:
      renderClassSelect(ctx);
      // Navigate classes
      if (isKeyPressed('ArrowLeft') || isKeyPressed('KeyA')) {
        game.selectedClass = (game.selectedClass - 1 + CLASSES.length) % CLASSES.length;
      }
      if (isKeyPressed('ArrowRight') || isKeyPressed('KeyD')) {
        game.selectedClass = (game.selectedClass + 1) % CLASSES.length;
      }
      // Mobile joystick flick
      if (isMobileDevice()) {
        const flick = getJoystickFlick();
        if (flick.dx < 0) game.selectedClass = (game.selectedClass - 1 + CLASSES.length) % CLASSES.length;
        if (flick.dx > 0) game.selectedClass = (game.selectedClass + 1) % CLASSES.length;
      }
      // Confirm selection
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        const cls = CLASSES[game.selectedClass];
        deleteSave();
        game.player = null;
        game.checkpoint = null;
        game.sandbox = false;
        game.playerClass = cls.id;
        game.hasHorse = false;
        game.state = STATE.PLAY;
        loadMap('village');
        // Apply class stats
        const p = game.player;
        p.hp = cls.hp;
        p.maxHp = cls.hp;
        p.atk = cls.atk;
        p.coins = cls.coins;
        p.potions = cls.potions;
        p.weapon = cls.weapon;
        p.ownedWeapons = [...cls.ownedWeapons];
        p.equippedArmor = { ...cls.armor };
        p.ownedArmor = [...cls.ownedArmor];
        saveCheckpoint();
        SFX.playMusic('village');
      }
      // Back to menu
      if (isKeyPressed('Escape')) {
        game.state = STATE.MENU;
      }
      break;

    case STATE.PLAY:
      // Sandbox: keep HP and coins maxed
      if (game.sandbox && game.player) {
        game.player.hp = game.player.maxHp;
        game.player.coins = 99999;
      }

      updatePlayer(dt);
      updateEnemies(game.enemies, game.player, game.currentMap, dt);
      updateCompanions(dt);

      // --- Random Events ---
      updateAmbush(game, dt, createParticle, spawnEnemy);
      updateBuff(game, dt);

      // --- World Events (open world only) ---
      if (game.openWorld && game.worldEventManager) {
        game.worldEventManager.update(game.player, dt, game.totalTime, game.enemies, game.particles);
      }

      // Buff invincibility
      if (isBuffInvincible(game)) {
        game.player.invincibleTimer = 0.1;
      }

      // Pick up buff stones
      if (game.buffStones) {
        for (const stone of game.buffStones) {
          if (stone.picked) continue;
          const dx = game.player.x - stone.x;
          const dy = game.player.y - stone.y;
          if (dx * dx + dy * dy < 30 * 30) {
            stone.picked = true;
            applyBuff(game, stone.buff);
            game.particles.push(createParticle(game.player.x, game.player.y - 16, stone.buff.name + '!', stone.buff.color, 2));
            // Track structure buff stone persistence
            if (stone._structureBuff && stone._bsKey) {
              if (!game._pickedBuffStones) game._pickedBuffStones = new Set();
              game._pickedBuffStones.add(stone._bsKey);
            }
            SFX.playPickupItem();
          }
        }
      }

      // Secret portal — enter
      if (game.secretPortals) {
        for (const portal of game.secretPortals) {
          if (portal.used) continue;
          const dx = game.player.x - portal.x;
          const dy = game.player.y - portal.y;
          if (dx * dx + dy * dy < 28 * 28) {
            portal.used = true;
            // Generate secret room (reuse dungeon generator at depth 0 = easy)
            game._returnMap = game.currentMapName;
            game._returnX = game.player.x;
            game._returnY = game.player.y;
            loadMap('dungeon');
            game.particles.push(createParticle(game.player.x, game.player.y - 16, 'Секретная комната!', '#b388ff', 2));
          }
        }
      }

      // Vampirism buff — heal on kill
      // (handled in combat section below)

      // --- Arena wave system ---
      if (game.currentMapName === 'arena') {
        const aliveCount = game.enemies.filter(e => e.alive).length;
        if (aliveCount === 0) {
          game.arenaTimer -= dt;
          if (game.arenaTimer <= 0) {
            game.arenaWave++;
            // Update arena quest progress
            const arenaQDone = updateGenArenaProgress(game.player, game.arenaWave);
            for (const q of arenaQDone) {
              game.particles.push(createParticle(game.player.x, game.player.y - 40, `Квест: ${q.name}!`, '#4caf50', 2));
            }
            const newEnemy = spawnEnemy('gladiator', 10, 9);
            if (newEnemy) {
              game.enemies = [newEnemy];
              game.particles.push(createParticle(10 * 32, 9 * 32 - 16, `Раунд ${game.arenaWave}!`, '#f0c040', 2));
              SFX.playPickupItem();
            }
            game.arenaTimer = 2.0;
          }
        }
      }

      // --- Combat: player attacks ---
      {
        const killed = playerAttackEnemies(game.player, game.enemies);
        for (const enemy of killed) {
          // Track open world chunk kills
          if (game.openWorld && enemy._chunkKey !== undefined) {
            if (!game.chunkKills.has(enemy._chunkKey)) game.chunkKills.set(enemy._chunkKey, new Set());
            game.chunkKills.get(enemy._chunkKey).add(enemy._spawnIndex);
          }
          awardLoot(enemy.xp, enemy.coins);
          SFX.playKillEnemy();
          SFX.playPickupCoin();
          // Elite kill effect
          if (enemy._elite) {
            game.particles.push(createParticle(enemy.x, enemy.y - 40, 'ЭЛИТА!', '#ffd54f', 2));
            // Chief drops hidden chest
            if (enemy._elite.id === 'chief') {
              if (!game.chests) game.chests = [];
              game.chests.push({ x: enemy.x, y: enemy.y, rarity: Math.random() < 0.5 ? 'good' : 'rare', opened: false });
            }
          }
          // Vampirism buff
          const vamp = getBuffVampirism(game);
          if (vamp > 0) {
            game.player.hp = Math.min(game.player.maxHp, game.player.hp + vamp);
            game.particles.push(createParticle(game.player.x, game.player.y - 20, `+${vamp} HP`, '#66bb6a'));
          }
          game.particles.push(createParticle(enemy.x, enemy.y - 8, `+${enemy.xp} XP`, '#cc66ff'));
          game.particles.push(createParticle(enemy.x, enemy.y - 20, `+${enemy.coins} $`, '#f0c040'));
          // 20% potion drop
          if (Math.random() < 0.2) {
            game.player.potions++;
            game.particles.push(createParticle(enemy.x, enemy.y - 32, '+1 POT', '#44cc44'));
            SFX.playPickupItem();
          }
          // Weapon loot drop
          if (enemy.loot && Math.random() < enemy.loot.dropChance) {
            const lootId = enemy.loot.weaponId;
            if (!game.player.ownedWeapons.includes(lootId)) {
              game.player.ownedWeapons.push(lootId);
              const w = getWeapon(lootId);
              game.particles.push(createParticle(enemy.x, enemy.y - 44, w.name + '!', '#ffd54f', 2));
              SFX.playPickupItem();
            }
          }
          // Quest progress
          const questsDone = updateKillProgress(game.player, enemy.type);
          const genQuestsDone = updateGenKillProgress(game.player, enemy.type);
          for (const q of [...questsDone, ...genQuestsDone]) {
            game.particles.push(createParticle(game.player.x, game.player.y - 32, `Квест: ${q.name}!`, '#4caf50', 2));
            SFX.playQuestComplete();
          }
          // Check level up
          if (checkLevelUp(game.player)) {
            SFX.playLevelUp();
            vibrate(HAPTIC_LEVELUP);
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

        // Shield melee block feedback
        if (game.player._shieldBlocked) {
          game.player._shieldBlocked = false;
          SFX.playShield();
          game.particles.push(createParticle(game.player.x, game.player.y - 12, 'БЛОК!', '#4fc3f7', 0.8));
        }

        // Enemy blocked player's attack feedback
        for (const e of game.enemies) {
          if (e._blocked) {
            e._blocked = false;
            game.particles.push(createParticle(e.x, e.y - 12, 'БЛОК!', '#ff9800', 0.7));
            SFX.playHitEnemy();
          }
        }

        if (dmgTaken > 0) {
          SFX.playPlayerHurt();
          game.particles.push(createParticle(
            game.player.x, game.player.y - 8,
            `-${dmgTaken}`, '#ff4444'
          ));
          if (game.player.hp <= 0) {
            game.player.hp = 0;
            if (!game.sandbox) {
              game.state = STATE.GAMEOVER;
              SFX.playPlayerDeath();
              SFX.stopMusic();
              vibrate(HAPTIC_DEATH);
            }
          }
        }
      }

      // --- Potion use: KeyQ ---
      if (isKeyPressed('KeyQ') && game.player.potions > 0) {
        game.player.potions--;
        const heal = Math.min(30, game.player.maxHp - game.player.hp);
        game.player.hp += heal;
        SFX.playUsePotion();
        game.particles.push(createParticle(
          game.player.x, game.player.y - 8,
          `+${heal} HP`, '#44cc44'
        ));
      }

      // --- Abilities ---
      if (isKeyPressed('Digit1') && useAbility('earth', game.player, game.projectiles, game.enemies)) SFX.playShield();
      if (isKeyPressed('Digit2') && useAbility('fire', game.player, game.projectiles, game.enemies)) SFX.playFireball();
      if (isKeyPressed('Digit3') && useAbility('water', game.player, game.projectiles, game.enemies)) SFX.playIceWave();
      {
        const projKilled = updateProjectiles(game.projectiles, game.enemies, dt);
        for (const enemy of projKilled) {
          if (game.openWorld && enemy._chunkKey !== undefined) {
            if (!game.chunkKills.has(enemy._chunkKey)) game.chunkKills.set(enemy._chunkKey, new Set());
            game.chunkKills.get(enemy._chunkKey).add(enemy._spawnIndex);
          }
          awardLoot(enemy.xp, enemy.coins);
          game.particles.push(createParticle(enemy.x, enemy.y - 8, `+${enemy.xp} XP`, '#cc66ff'));
          game.particles.push(createParticle(enemy.x, enemy.y - 20, `+${enemy.coins} $`, '#f0c040'));
          if (Math.random() < 0.2) {
            game.player.potions++;
            game.particles.push(createParticle(enemy.x, enemy.y - 32, '+1 POT', '#44cc44'));
          }
          if (checkLevelUp(game.player)) {
            vibrate(HAPTIC_LEVELUP);
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
        // Boss intro dialog — triggers once when player approaches
        if (!game.boss._dialogShown) {
          const bdx = game.player.x - game.boss.x;
          const bdy = game.player.y - game.boss.y;
          const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
          if (bDist < 180) {
            game.boss._dialogShown = true;
            const bossDialog = BOSS_DIALOGS[game.boss.type];
            if (bossDialog) {
              openDialog('_boss', game.boss.name, handleDialogAction, bossDialog, null, game.player);
              game.state = STATE.DIALOG;
            }
          }
        }

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
            let dmg = Math.max(1, phase.atk - getTotalDef(game.player));
            // Boss crit chance (e.g. rock_demon has 10% for mega damage)
            let bossCrit = false;
            if (game.boss.critChance && Math.random() < game.boss.critChance) {
              dmg = game.boss.critDamage;
              bossCrit = true;
            }
            game.player.hp -= dmg;
            game.player.invincibleTimer = 0.5;
            // Knockback (with collision check)
            const angle = Math.atan2(py - by, px - bx);
            const kbX = Math.cos(angle) * 30;
            const kbY = Math.sin(angle) * 30;
            const testX = game.player.x + kbX;
            const testY = game.player.y + kbY;
            if (!collides(testX, testY, game.player.hitW, game.player.hitH)) {
              game.player.x = testX;
              game.player.y = testY;
            }
            if (bossCrit) {
              game.particles.push(createParticle(game.player.x, game.player.y - 20, 'КРИТ!', '#ff1744', 2));
            }
            game.particles.push(createParticle(game.player.x, game.player.y - 8, `-${dmg}`, '#ff4444'));
            if (game.player.hp <= 0) {
              game.player.hp = 0;
              if (!game.sandbox) {
                game.state = STATE.GAMEOVER;
                vibrate(HAPTIC_DEATH);
              }
            }
          }
        }

        // Player weapon hits boss (only once per swing, gated by boss.hitTimer)
        const bossWeapon = getWeapon(game.player.weapon);
        if (game.player.attacking && game.boss.hitTimer <= 0 && bossWeapon.type !== 'bow') {
          const cx = game.player.x + game.player.hitW / 2;
          const cy = game.player.y + game.player.hitH / 2;
          let hx = cx, hy = cy;
          const range = getWeaponRange(game.player);
          switch (game.player.facing) {
            case 'up':    hy -= range / 2; break;
            case 'down':  hy += range / 2; break;
            case 'left':  hx -= range / 2; break;
            case 'right': hx += range / 2; break;
          }
          const bx = game.boss.x + game.boss.width / 2;
          const by = game.boss.y + game.boss.height / 2;
          const d = Math.sqrt((hx - bx) ** 2 + (hy - by) ** 2);
          let totalAtk = getTotalAtk(game.player);
          if (game.hasHorse) totalAtk = Math.floor(totalAtk * 1.5);
          if (d < range + 20) {
            // Boss block chance (e.g. rock_demon has 60%)
            if (game.boss.blockChance && Math.random() < game.boss.blockChance) {
              game.boss.hitTimer = 0.2;
              game.particles.push(createParticle(game.boss.x, game.boss.y - 8, 'БЛОК!', '#ff9800'));
            } else {
            // Player weapon crit chance
            const wep = getWeapon(game.player.weapon);
            let dmg = totalAtk;
            let isCrit = false;
            if (wep.critChance && Math.random() < wep.critChance) {
              dmg = wep.critDamage;
              isCrit = true;
            }
            game.boss.hp -= dmg;
            game.boss.hitTimer = 0.3;
            if (isCrit) {
              game.particles.push(createParticle(game.boss.x, game.boss.y - 16, 'КРИТ!', '#ff1744', 2));
            }
            game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `-${dmg}`, '#ffffff'));
            if (game.boss.hp <= 0) {
              game.boss.alive = false;
              game.player.defeatedBosses.push(game.boss.type);
              // Track open world boss kills
              if (game.boss._openWorldBoss) {
                if (!game._killedOpenWorldBosses) game._killedOpenWorldBosses = new Set();
                game._killedOpenWorldBosses.add(game.boss.type);
              }
              // Boss quest progress
              const bqDone = updateBossProgress(game.player, game.boss.type);
              const genBqDone = updateGenBossProgress(game.player, game.boss.type);
              for (const q of [...bqDone, ...genBqDone]) {
                game.particles.push(createParticle(game.player.x, game.player.y - 40, `Квест: ${q.name}!`, '#4caf50', 2));
              }
              // Rewards
              awardLoot(game.boss.xp, game.boss.coins);
              game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `+${game.boss.xp} XP`, '#cc66ff'));
              game.particles.push(createParticle(game.boss.x, game.boss.y - 20, `+${game.boss.coins} $`, '#f0c040'));
              // Grant artifact
              if (game.boss.artifact) {
                game.player.artifacts[game.boss.artifact] = true;
                game.particles.push(createParticle(game.boss.x, game.boss.y - 32, `${game.boss.artifact.toUpperCase()}!`, '#f0c040', 2));
              }
              // Boss loot: Rock Demon drops sword and shield
              if (game.boss.type === 'rock_demon') {
                if (!game.player.ownedWeapons.includes('rockdemon_sword')) {
                  game.player.ownedWeapons.push('rockdemon_sword');
                  game.particles.push(createParticle(game.boss.x, game.boss.y - 44, 'Меч РокДемона!', '#ff1744', 2.5));
                }
                if (!game.player.ownedArmor.includes('rockdemon_shield')) {
                  game.player.ownedArmor.push('rockdemon_shield');
                  game.particles.push(createParticle(game.boss.x, game.boss.y - 56, 'Щит РокДемона!', '#d50000', 2.5));
                }
              }
              // Boss loot: Ice Lich drops Baldionid Greatsword
              if (game.boss.type === 'ice_lich' && !game.player.ownedWeapons.includes('baldionid_greatsword')) {
                game.player.ownedWeapons.push('baldionid_greatsword');
                game.particles.push(createParticle(game.boss.x, game.boss.y - 44, 'Меч Бальдионидов!', '#ff00ff', 2.5));
              }
              if (checkLevelUp(game.player)) {
                vibrate(HAPTIC_LEVELUP);
                game.particles.push(createParticle(game.player.x, game.player.y - 20, 'LEVEL UP!', '#f0c040', 1.5));
              }
              // Win condition
              if (game.boss.type === 'dark_mage') {
                game.state = STATE.WIN;
                deleteSave();
                SFX.stopMusic();
                SFX.playVictory();
              }
            }
          } // end else (not blocked)
          }
        }

        // Arrow projectiles hit boss
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
          const proj = game.projectiles[i];
          if (!proj.isArrow) continue;
          const bx = game.boss.x + game.boss.width / 2;
          const by = game.boss.y + game.boss.height / 2;
          const d = Math.sqrt((proj.x - bx) ** 2 + (proj.y - by) ** 2);
          if (d < 30 && game.boss.hitTimer <= 0) {
            // Boss block chance for arrows too
            if (game.boss.blockChance && Math.random() < game.boss.blockChance) {
              game.boss.hitTimer = 0.2;
              game.particles.push(createParticle(game.boss.x, game.boss.y - 8, 'БЛОК!', '#ff9800'));
              game.projectiles.splice(i, 1);
              continue;
            }
            game.boss.hp -= proj.damage;
            game.boss.hitTimer = 0.2;
            game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `-${proj.damage}`, '#ffffff'));
            game.projectiles.splice(i, 1);
            if (game.boss.hp <= 0) {
              game.boss.alive = false;
              game.player.defeatedBosses.push(game.boss.type);
              // Track open world boss kills
              if (game.boss._openWorldBoss) {
                if (!game._killedOpenWorldBosses) game._killedOpenWorldBosses = new Set();
                game._killedOpenWorldBosses.add(game.boss.type);
              }
              awardLoot(game.boss.xp, game.boss.coins);
              if (game.boss.artifact) {
                game.player.artifacts[game.boss.artifact] = true;
              }
              if (game.boss.type === 'dark_mage') {
                game.state = STATE.WIN;
                deleteSave();
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
            // Shield block check
            const blockResult = tryBlockProjectile(game.player);
            if (blockResult === 'triple_reflected') {
              // Moremirida: reflect original + fire 2 extra projectiles
              proj.dirX *= -1;
              proj.dirY *= -1;
              proj.fromBoss = false;
              proj.isArrow = true;
              proj.damage = Math.floor(proj.damage * 1.5);
              // 2 extra projectiles at angles
              for (let angle = -0.5; angle <= 0.5; angle += 1.0) {
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const ndx = proj.dirX * cos - proj.dirY * sin;
                const ndy = proj.dirX * sin + proj.dirY * cos;
                game.projectiles.push({
                  x: game.player.x + game.player.hitW / 2,
                  y: game.player.y + game.player.hitH / 2,
                  dirX: ndx, dirY: ndy,
                  damage: proj.damage,
                  color: '#64ffda',
                  speed: proj.speed * 1.2,
                  life: 2, width: 8, height: 8,
                  isArrow: true,
                });
              }
              game.particles.push(createParticle(game.player.x, game.player.y - 12, 'x3 ОТРАЖЕНО!', '#64ffda', 1.5));
              SFX.playShield();
              SFX.playFireball();
            } else if (blockResult === 'reflected') {
              // Reflect projectile back at boss
              proj.dirX *= -1;
              proj.dirY *= -1;
              proj.fromBoss = false;
              proj.isArrow = true;
              game.particles.push(createParticle(game.player.x, game.player.y - 12, 'ОТРАЖЕНО!', '#e0e0e0', 1));
              SFX.playShield();
            } else if (blockResult === 'blocked') {
              // Block — no damage, destroy projectile
              game.projectiles.splice(i, 1);
              game.particles.push(createParticle(game.player.x, game.player.y - 12, 'БЛОК!', '#4fc3f7', 0.8));
              SFX.playShield();
            } else {
              // No block — take damage
              const dmg = Math.max(1, proj.damage - getTotalDef(game.player));
              game.player.hp -= dmg;
              game.player.invincibleTimer = 0.5;
              game.particles.push(createParticle(game.player.x, game.player.y - 8, `-${dmg}`, '#ff4444'));
              SFX.playPlayerHurt();
              game.projectiles.splice(i, 1);
              if (game.player.hp <= 0) {
                game.player.hp = 0;
                if (!game.sandbox) {
                  game.state = STATE.GAMEOVER;
                  SFX.playPlayerDeath();
                  SFX.stopMusic();
                  vibrate(HAPTIC_DEATH);
                }
              }
            }
          }
        }
      }

      // --- Fast Travel (T key, open world only) ---
      if (game.openWorld && game.fastTravel) {
        if (game.fastTravel.active) {
          // Fast travel UI is open — intercept input
          let ftResult = null;
          if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) ftResult = game.fastTravel.input('up');
          if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) ftResult = game.fastTravel.input('down');
          if (isKeyPressed('Enter')) ftResult = game.fastTravel.input('confirm');
          if (isKeyPressed('KeyT') || isKeyPressed('Escape')) ftResult = game.fastTravel.input('close');

          if (ftResult) {
            if (ftResult.action === 'travel') {
              const dest = ftResult.dest;
              // Special case: fast travel to village exits open world
              if (dest.cx === 0 && dest.cy === 0) {
                game.fastTravel.close();
                saveGame(game.player, 'openworld', getOpenWorldSaveState());
                exitOpenWorld();
                SFX.playPortal();
              } else {
              game.player.x = dest.worldX;
              game.player.y = dest.worldY;
              const { cx, cy } = game.chunkManager.pixelToChunk(dest.worldX, dest.worldY);
              game.chunkManager.updateCenter(cx, cy);
              syncChunkEnemies();
              // Teleport companions
              for (let i = 0; i < game.companions.length; i++) {
                game.companions[i].x = game.player.x + (i + 1) * 20;
                game.companions[i].y = game.player.y + 30;
              }
              game.fastTravel.close();
              game.particles.push(createParticle(game.player.x, game.player.y - 16, 'ТЕЛЕПОРТ!', '#b388ff', 1.5));
              SFX.playPortal();
              }
            } else if (ftResult.action === 'close') {
              game.fastTravel.close();
            }
          }
        } else if (isKeyPressed('KeyT')) {
          game.fastTravel.open(game.chunkManager, game.visitedChunks);
        }
      }

      // --- Difficulty cycling (D key, open world only) ---
      if (game.openWorld && isKeyPressed('KeyD') && !game.fastTravel?.active) {
        game.difficulty = cycleDifficulty(game.difficulty);
        const diff = getDifficulty(game.difficulty);
        game.particles.push(createParticle(game.player.x, game.player.y - 16, diff.name, DIFFICULTY_COLORS[game.difficulty], 1.5));
        // Clear cached enemies so they respawn with new multipliers
        game.chunkEnemies = new Map();
        syncChunkEnemies();
      }

      // --- Help toggle ---
      if (isKeyPressed('KeyH')) game.showHelp = !game.showHelp;
      if (isKeyPressed('F3')) FPS.toggleFps();
      if (isKeyPressed('KeyJ')) game.showQuestLog = !game.showQuestLog;
      if (isKeyPressed('KeyM')) SFX.toggleMusic();

      // --- Emergency rescue (R key) — всегда спасает: телепорт в безопасную точку ---
      if (isKeyPressed('KeyR') && game.player) {
        if (game.openWorld && game.chunkManager) {
          // Телепорт на ближайшую свободную клетку в радиусе 5 тайлов, либо к village portal (0,0)
          const p = game.player;
          const origCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
          const origRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
          let rescued = false;
          // Поиск спиралью в радиусе до 8 тайлов
          for (let r = 1; r <= 8 && !rescued; r++) {
            for (let dr = -r; dr <= r && !rescued; dr++) {
              for (let dc = -r; dc <= r && !rescued; dc++) {
                if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue; // только периметр
                const col = origCol + dc;
                const row = origRow + dr;
                const tx = col * TILE_SIZE;
                const ty = row * TILE_SIZE;
                if (!collides(tx, ty, p.hitW, p.hitH) &&
                    !collides(tx + TILE_SIZE, ty, p.hitW, p.hitH) &&
                    !collides(tx, ty + TILE_SIZE, p.hitW, p.hitH)) {
                  // Проверяем что есть хотя бы одна соседняя walkable клетка (чтобы не прыгнуть в такую же ловушку)
                  p.x = tx;
                  p.y = ty;
                  rescued = true;
                  game.portalCooldown = 0.5;
                  game.particles.push(createParticle(p.x, p.y - 16, 'Спасён!', '#4fc3f7', 1.5));
                  // Очистить чанки врагов чтобы обновились с новой позиции
                  game.chunkEnemies = new Map();
                }
              }
            }
          }
          if (!rescued) {
            // Крайний случай — телепорт к village portal (0,0)
            p.x = 0;
            p.y = 0;
            game.portalCooldown = 1.0;
            const { cx, cy } = game.chunkManager.pixelToChunk(0, 0);
            game.chunkManager.updateCenter(cx, cy);
            game.chunkEnemies = new Map();
            syncChunkEnemies();
            game.particles.push(createParticle(p.x, p.y - 16, 'В деревню!', '#4fc3f7', 2));
          }
        } else if (game.checkpoint) {
          respawnAtCheckpoint();
        } else {
          // Фолбек — просто unstick
          unstickPlayer();
        }
      }
      if (isKeyPressed('Escape')) {
        game.player._companions = game.companions.map(c => c.type);
        game.player._playerClass = game.playerClass;
        game.player._hasHorse = game.hasHorse;
        saveGame(game.player, game.currentMapName, getOpenWorldSaveState());
        game.state = STATE.MENU;
        SFX.stopMusic();
      }
      if (isKeyPressed('KeyI') || isKeyPressed('Tab')) {
        resetInventorySelection(game.player);
        game.state = STATE.INVENTORY;
      }

      // --- Chest interaction ---
      if (isKeyPressed('KeyE')) {
        let interacted = false;
        // Check chests first
        if (game.chests) {
          for (const chest of game.chests) {
            if (chest.opened) continue;
            const dx = game.player.x - chest.x;
            const dy = game.player.y - chest.y;
            if (dx * dx + dy * dy < 40 * 40) {
              const loot = openChest(chest, game.player, game.currentMapName);
              if (loot) {
                game.player.coins += loot.coins;
                game.player.potions += loot.potions;
                if (loot.coins > 0) game.particles.push(createParticle(chest.x, chest.y - 8, `+${loot.coins}$`, '#f0c040'));
                if (loot.potions > 0) game.particles.push(createParticle(chest.x, chest.y - 20, `+${loot.potions} POT`, '#44cc44'));
                if (loot.weapon && !game.player.ownedWeapons.includes(loot.weapon)) {
                  game.player.ownedWeapons.push(loot.weapon);
                  const w = getWeapon(loot.weapon);
                  game.particles.push(createParticle(chest.x, chest.y - 32, w ? w.name + '!' : 'Оружие!', '#ffd54f', 2));
                }
                // Track structure chest persistence
                if (chest._structureChest && chest._chestKey) {
                  if (!game._openedStructChests) game._openedStructChests = new Set();
                  game._openedStructChests.add(chest._chestKey);
                }
                SFX.playPickupItem();
                interacted = true;
              }
              break;
            }
          }
        }

        // NPC interaction (including trader)
        if (!interacted) {
        const nearNPC = getNearbyNPC(game.npcs, game.player.x, game.player.y);
        if (nearNPC) {
          // Trader has custom dialog
          if (nearNPC._isTrader) {
            const traderDialog = getTraderDialog(nearNPC._mapName);
            if (openDialog('_trader', nearNPC.name, handleDialogAction, traderDialog, null, game.player)) {
              game.state = STATE.DIALOG;
              SFX.playDialogOpen();
            }
          } else {
          // Build quest choices to inject into dialog
          const { available, completedReady } = getNpcQuests(game.player, nearNPC.id);
          const extraChoices = [];

          for (const q of completedReady) {
            extraChoices.push({ text: `✓ Сдать: ${q.name}`, action: `quest_claim_${q.questId}`, next: 0 });
          }
          for (const q of available) {
            extraChoices.push({ text: `! Квест: ${q.name}`, action: `quest_accept_${q.questId}`, next: 0 });
          }

          // Generated quests (for elder, king, dungeon_guard)
          const genCompleted = getCompletedGenQuest(game.player, nearNPC.id);
          if (genCompleted) {
            extraChoices.push({ text: `✓ Сдать: ${genCompleted.name}`, action: `gen_claim_${genCompleted.questId}`, next: 0 });
          } else if (!hasActiveGenQuest(game.player, nearNPC.id) && ['elder', 'king', 'dungeon_guard'].includes(nearNPC.id)) {
            extraChoices.push({ text: '★ Новое задание', action: `gen_offer_${nearNPC.id}`, next: 0 });
          }

          if (openDialog(nearNPC.id, nearNPC.name, handleDialogAction, null, extraChoices, game.player)) {
            game.state = STATE.DIALOG;
            SFX.playDialogOpen();
          }
          } // end else (not trader)
        }
        } // end if (!interacted)
      } // end KeyE

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
          ctx.fillText('[E] Говорить', 320, 460);
          ctx.textAlign = 'left';
        }
      }

      // --- First-time hint (village, level 1) ---
      if (game.currentMapName === 'village' && game.player.level === 1 && !game.showHelp) {
        const blink = Math.sin(game.totalTime * 4) > 0;
        if (blink) {
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd54f';
          ctx.fillText('[H] Справка', 320, 56);
          ctx.textAlign = 'left';
        }
      }

      // --- Overlays (in game area) ---
      {
        const gOff = getGameOffsetX();
        if (gOff > 0) { ctx.save(); ctx.translate(gOff, 0); }
        renderQuestTracker(ctx, game.player, 640);
        if (game.showHelp) renderHelpOverlay(ctx);
        if (game.showQuestLog) renderQuestLog(ctx, game.player, 640, 480);
        if (gOff > 0) ctx.restore();
      }

      // Touch controls overlay (full canvas, outside game area)
      renderTouchControls(ctx, game.width, game.height);
      break;

    case STATE.DIALOG:
      // Dialog input handling
      if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) dialogInput('up', game.player);
      if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) dialogInput('down', game.player);
      if (isKeyPressed('Enter') || isKeyPressed('Space') || isKeyPressed('KeyE')) dialogInput('confirm', game.player);
      // Mobile: joystick flick for dialog navigation
      if (isMobileDevice()) {
        const flick = getJoystickFlick();
        if (flick.dy < 0) dialogInput('up', game.player);
        if (flick.dy > 0) dialogInput('down', game.player);
      }

      // Return to play if dialog closed
      if (!isDialogOpen()) {
        game.state = STATE.PLAY;
      }

      // Render play scene underneath + dialog overlay
      updateParticles(game.particles, dt);
      renderPlay(ctx);
      { const gOff = getGameOffsetX();
        if (gOff > 0) { ctx.save(); ctx.translate(gOff, 0); }
        renderDialog(ctx, 640, 480, game.player);
        if (gOff > 0) ctx.restore();
      }
      if (isMobileDevice()) renderTouchControls(ctx, game.width, game.height);
      break;

    case STATE.INVENTORY:
      // Input
      if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) inventoryInput('up', game.player);
      if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) inventoryInput('down', game.player);
      if (isKeyPressed('ArrowLeft') || isKeyPressed('KeyA')) inventoryInput('left', game.player);
      if (isKeyPressed('ArrowRight') || isKeyPressed('KeyD')) inventoryInput('right', game.player);
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        inventoryInput('use', game.player, game.particles, createParticle);
      }
      if (isKeyPressed('KeyX')) {
        inventoryInput('sell', game.player, game.particles, createParticle);
      }
      // Mobile: joystick flick for inventory navigation
      if (isMobileDevice()) {
        const flick = getJoystickFlick();
        if (flick.dy < 0) inventoryInput('up', game.player);
        if (flick.dy > 0) inventoryInput('down', game.player);
        if (flick.dx < 0) inventoryInput('left', game.player);
        if (flick.dx > 0) inventoryInput('right', game.player);
      }
      if (isKeyPressed('KeyI') || isKeyPressed('Tab') || isKeyPressed('Escape')) {
        game.state = STATE.PLAY;
      }
      // Render
      renderPlay(ctx);
      { const gOff = getGameOffsetX();
        if (gOff > 0) { ctx.save(); ctx.translate(gOff, 0); }
        renderInventory(ctx, game.player, 640, 480, game.sandbox);
        if (gOff > 0) ctx.restore();
      }
      if (isMobileDevice()) renderTouchControls(ctx, game.width, game.height);
      break;

    case STATE.GAMEOVER: {
      renderPlay(ctx);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, game.width, game.height);
      const goCx = getGameOffsetX() + 320;
      ctx.font = '24px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cc2222';
      ctx.fillText('GAME OVER', goCx, 220);
      if (game.checkpoint) {
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#b388ff';
        ctx.fillText('Респавн на чекпоинте', goCx, 250);
      }
      {
        const blink = Math.sin(game.totalTime * 3) > 0;
        if (blink) {
          ctx.font = '12px "Press Start 2P"';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(isMobileDevice() ? 'НАЖМИ СЮДА' : 'НАЖМИ ENTER', goCx, 280);
        }
      }
      ctx.textAlign = 'left';
      // Respawn at checkpoint or return to menu
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        if (game.checkpoint && respawnAtCheckpoint()) {
          game.state = STATE.PLAY;
          game.particles = [];
          game.projectiles = [];
        } else {
          game.state = STATE.MENU;
          game.player = null;
          game.enemies = [];
          game.particles = [];
        }
      }
    } break;

    case STATE.WIN: {
      renderPlay(ctx);
      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, game.width, game.height);
      const winCx = getGameOffsetX() + 320;
      ctx.font = '24px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0c040';
      ctx.fillText('ПОБЕДА!', winCx, 190);
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Тёмный маг повержен!', winCx, 240);
      ctx.fillText('Эльдория спасена!', winCx, 264);
      {
        const blink = Math.sin(game.totalTime * 3) > 0;
        if (blink) {
          ctx.font = '12px "Press Start 2P"';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(isMobileDevice() ? 'НАЖМИ СЮДА' : 'НАЖМИ ENTER', winCx, 310);
        }
      }
      ctx.textAlign = 'left';
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        game.state = STATE.MENU;
        game.player = null;
        game.enemies = [];
        game.particles = [];
        game.projectiles = [];
        game.boss = null;
      }
    } break;
  }

  // FPS overlay (F3 toggles visibility) — рисуем поверх всего
  FPS.endUpdate();
  FPS.endRender();
  FPS.render(ctx, game);

  requestAnimationFrame(gameLoop);
}

// --- Start Game ---
function startGame() {
  const canvas = initCanvasLayout(document.getElementById('game'));

  detectMobile();
  initInput();
  initTouchControls(canvas);
  SFX.initAudio();
  setProjectileCallback((proj) => game.projectiles.push(proj));

  initStars();

  requestAnimationFrame((timestamp) => {
    lastTime = timestamp;
    gameLoop(timestamp);
  });
}

startGame();
