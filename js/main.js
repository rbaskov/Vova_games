import { initInput, isKeyDown, isKeyPressed, getMovementInput } from './input.js';
import { detectMobile, initTouchControls, renderTouchControls, isMobileDevice } from './touch.js';
import { createTileMap, renderMap, isSolid, isPortal, getTile, TILE_SIZE } from './tilemap.js';
import { createCamera, updateCamera } from './camera.js';
import { villageMap } from './maps/village.js';
import { forestMap } from './maps/forest.js';
import { canyonMap } from './maps/canyon.js';
import { caveMap } from './maps/cave.js';
import { castleMap } from './maps/castle.js';
import { kingdomMap } from './maps/kingdom.js';
import { drawHero, drawNPC, TILE } from './sprites.js';
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
import * as SFX from './audio.js';

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
  portalCooldown: 0,
  currentMapName: null,
  checkpoint: null,
  sandbox: false,
  showQuestLog: false,
};

// --- Map Registry ---
const MAP_REGISTRY = {
  village: villageMap,
  forest: forestMap,
  canyon: canyonMap,
  cave: caveMap,
  castle: castleMap,
  kingdom: kingdomMap,
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
  };
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
    for (const q of visitDone) {
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

  // Boss from map data (skip if already defeated)
  game.boss = null;
  if (mapData.boss && !game.player.defeatedBosses.includes(mapData.boss.type)) {
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

// --- Unstick: push player out of solid tiles ---
function unstickPlayer() {
  const p = game.player;
  if (!collidesWithMap(p.x, p.y, p.hitW, p.hitH)) return;

  // Try nudging in 4 directions (1px increments up to 32px)
  for (let dist = 1; dist <= TILE_SIZE; dist++) {
    const offsets = [
      [dist, 0], [-dist, 0], [0, dist], [0, -dist],
      [dist, dist], [-dist, -dist], [dist, -dist], [-dist, dist],
    ];
    for (const [dx, dy] of offsets) {
      if (!collidesWithMap(p.x + dx, p.y + dy, p.hitW, p.hitH)) {
        p.x += dx;
        p.y += dy;
        return;
      }
    }
  }
}

// --- Check Portals ---
function checkPortals() {
  // Grace period after teleport to prevent instant re-teleport
  if (game.portalCooldown > 0) return;

  const p = game.player;
  const centerCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const centerRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
  const portal = isPortal(game.currentMap, centerCol, centerRow);
  if (portal) {
    saveGame(game.player, portal.target);
    loadMap(portal.target, portal.spawnX, portal.spawnY);
    game.portalCooldown = 0.5;
    SFX.playPortal();
    SFX.playMusic(SFX.getMusicTheme(game.currentMapName));
  }
}

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
  };
}

function checkCheckpoint() {
  const p = game.player;
  const col = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const row = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
  const tile = getTile(game.currentMap, col, row);
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

  // Load the checkpoint map
  loadMap(cp.mapName);

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
  } else if (action.startsWith('buy_')) {
    // Weapon purchase
    const weaponId = action.slice(4); // remove 'buy_'
    const w = getWeapon(weaponId);
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

  // Cooldowns handled by updateCooldowns() in game loop

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
    if (hasSave()) {
      ctx.fillText('ENTER=Новая  C=Продолжить', width / 2, 330);
    } else {
      ctx.fillText('НАЖМИ ENTER', width / 2, 330);
    }
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#b388ff';
    ctx.fillText('S = Песочница', width / 2, 360);
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

  // Weapon name
  const curW = getWeapon(p.weapon);
  ctx.fillStyle = curW.color;
  const def = getTotalDef(game.player);
  if (def > 0) {
    ctx.fillStyle = '#78909c';
    ctx.fillText(`DEF ${def}`, 380, hpBarY + 10);
  }

  // Map name + sandbox label
  ctx.textAlign = 'right';
  if (game.sandbox) {
    ctx.fillStyle = '#b388ff';
    ctx.fillText('ПЕСОЧНИЦА', game.width - 8, hpBarY + 10);
  } else {
    ctx.fillStyle = '#aaa';
    ctx.fillText(game.currentMap ? game.currentMap.name : '', game.width - 8, hpBarY + 10);
  }

  // Reset textAlign
  ctx.textAlign = 'left';
}

// --- Minimap ---
function renderMinimap(ctx) {
  const map = game.currentMap;
  const p = game.player;
  if (!map || !p) return;

  const mmW = 72, mmH = 72;
  const mmX = game.width - mmW - 8;
  const mmY = game.height - mmH - 8;

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
  const w = game.width - 120, h = game.height - 80;

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
  ctx.fillText('УПРАВЛЕНИЕ', game.width / 2, y + 36);

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
    ctx.fillText(line, game.width / 2, lineY);
    lineY += 28;
  }

  // Footer
  ctx.fillStyle = '#aaa';
  ctx.fillText('Нажми H чтобы закрыть', game.width / 2, y + h - 20);
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

    drawHero(ctx, px, py, p.facing, p.moving ? game.animFrame : 0, p.attacking);
    drawArmorOnHero(ctx, px, py, p.facing, p.equippedArmor, 2);
    if (p.attacking) {
      const atkProgress = 1 - (p.attackTimer / getAttackSpeed(p));
      drawWeaponAttack(ctx, px, py, p.facing, p.weapon, 2, atkProgress);
    } else {
      drawWeaponRest(ctx, px, py, p.weapon, 2);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
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

  // Minimap
  renderMinimap(ctx);
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
      if (isMobileDevice()) {
        renderTouchControls(ctx, game.width, game.height);
      }
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        deleteSave();
        game.player = null;
        game.checkpoint = null;
        game.sandbox = false;
        game.state = STATE.PLAY;
        loadMap('village');
        saveCheckpoint();
        SFX.resumeAudio();
        SFX.playMusic('village');
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
          loadMap(save.currentMap);
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
        }
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

      // --- Combat: player attacks ---
      {
        const killed = playerAttackEnemies(game.player, game.enemies);
        for (const enemy of killed) {
          game.player.xp += enemy.xp;
          game.player.coins += enemy.coins;
          SFX.playKillEnemy();
          SFX.playPickupCoin();
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
          for (const q of questsDone) {
            game.particles.push(createParticle(game.player.x, game.player.y - 32, `Квест: ${q.name}!`, '#4caf50', 2));
            SFX.playQuestComplete();
          }
          // Check level up
          if (checkLevelUp(game.player)) {
            SFX.playLevelUp();
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
            const dmg = Math.max(1, phase.atk - getTotalDef(game.player));
            game.player.hp -= dmg;
            game.player.invincibleTimer = 0.5;
            // Knockback (with collision check)
            const angle = Math.atan2(py - by, px - bx);
            const kbX = Math.cos(angle) * 30;
            const kbY = Math.sin(angle) * 30;
            const testX = game.player.x + kbX;
            const testY = game.player.y + kbY;
            if (!collidesWithMap(testX, testY, game.player.hitW, game.player.hitH)) {
              game.player.x = testX;
              game.player.y = testY;
            }
            game.particles.push(createParticle(game.player.x, game.player.y - 8, `-${dmg}`, '#ff4444'));
            if (game.player.hp <= 0) {
              game.player.hp = 0;
              if (!game.sandbox) game.state = STATE.GAMEOVER;
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
          const totalAtk = getTotalAtk(game.player);
          if (d < range + 20) {
            game.boss.hp -= totalAtk;
            game.boss.hitTimer = 0.3;
            game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `-${totalAtk}`, '#ffffff'));
            if (game.boss.hp <= 0) {
              game.boss.alive = false;
              game.player.defeatedBosses.push(game.boss.type);
              // Boss quest progress
              const bqDone = updateBossProgress(game.player, game.boss.type);
              for (const q of bqDone) {
                game.particles.push(createParticle(game.player.x, game.player.y - 40, `Квест: ${q.name}!`, '#4caf50', 2));
              }
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
                deleteSave();
                SFX.stopMusic();
                SFX.playVictory();
              }
            }
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
            game.boss.hp -= proj.damage;
            game.boss.hitTimer = 0.2;
            game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `-${proj.damage}`, '#ffffff'));
            game.projectiles.splice(i, 1);
            if (game.boss.hp <= 0) {
              game.boss.alive = false;
              game.player.defeatedBosses.push(game.boss.type);
              game.player.xp += game.boss.xp;
              game.player.coins += game.boss.coins;
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
                }
              }
            }
          }
        }
      }

      // --- Help toggle ---
      if (isKeyPressed('KeyH')) game.showHelp = !game.showHelp;
      if (isKeyPressed('KeyJ')) game.showQuestLog = !game.showQuestLog;
      if (isKeyPressed('KeyM')) SFX.toggleMusic();
      if (isKeyPressed('KeyI') || isKeyPressed('Tab')) {
        resetInventorySelection();
        game.state = STATE.INVENTORY;
      }

      // --- NPC interaction ---
      if (isKeyPressed('KeyE')) {
        const nearNPC = getNearbyNPC(game.npcs, game.player.x, game.player.y);
        if (nearNPC) {
          // Build quest choices to inject into dialog
          const { available, completedReady } = getNpcQuests(game.player, nearNPC.id);
          const extraChoices = [];

          for (const q of completedReady) {
            extraChoices.push({ text: `✓ Сдать: ${q.name}`, action: `quest_claim_${q.questId}`, next: 0 });
          }
          for (const q of available) {
            extraChoices.push({ text: `! Квест: ${q.name}`, action: `quest_accept_${q.questId}`, next: 0 });
          }

          if (openDialog(nearNPC.id, nearNPC.name, handleDialogAction, null, extraChoices)) {
            game.state = STATE.DIALOG;
            SFX.playDialogOpen();
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

      // --- First-time hint (village, level 1) ---
      if (game.currentMapName === 'village' && game.player.level === 1 && !game.showHelp) {
        const blink = Math.sin(game.totalTime * 4) > 0;
        if (blink) {
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd54f';
          ctx.fillText('[H] Справка', game.width / 2, 56);
          ctx.textAlign = 'left';
        }
      }

      // --- Quest tracker ---
      renderQuestTracker(ctx, game.player, game.width);

      // --- Help overlay ---
      if (game.showHelp) {
        renderHelpOverlay(ctx);
      }

      // --- Quest log overlay ---
      if (game.showQuestLog) {
        renderQuestLog(ctx, game.player, game.width, game.height);
      }

      // Touch controls overlay
      renderTouchControls(ctx, game.width, game.height);
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
      if (isKeyPressed('KeyI') || isKeyPressed('Tab') || isKeyPressed('Escape')) {
        game.state = STATE.PLAY;
      }
      // Render
      renderPlay(ctx);
      renderInventory(ctx, game.player, game.width, game.height, game.sandbox);
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
      // Show checkpoint hint
      if (game.checkpoint) {
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#b388ff';
        ctx.fillText('Респавн на чекпоинте', game.width / 2, game.height / 2 + 10);
      }
      // Prompt
      {
        const blink = Math.sin(game.totalTime * 3) > 0;
        if (blink) {
          ctx.font = '12px "Press Start 2P"';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('НАЖМИ ENTER', game.width / 2, game.height / 2 + 40);
        }
      }
      ctx.textAlign = 'left';
      // Respawn at checkpoint or return to menu
      if (isKeyPressed('Enter')) {
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
function resizeCanvas() {
  const ratio = canvas.width / canvas.height;
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;

  let w, h;
  if (maxW / maxH > ratio) {
    h = maxH;
    w = h * ratio;
  } else {
    w = maxW;
    h = w / ratio;
  }

  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}

let canvas; // module-level reference

function startGame() {
  canvas = document.getElementById('game');
  game.canvas = canvas;
  game.ctx = canvas.getContext('2d');
  game.width = canvas.width;
  game.height = canvas.height;

  detectMobile();
  initInput();
  initTouchControls(canvas);
  SFX.initAudio();
  setProjectileCallback((proj) => game.projectiles.push(proj));

  // Resize canvas for mobile
  if (isMobileDevice()) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
  initStars();

  requestAnimationFrame((timestamp) => {
    lastTime = timestamp;
    gameLoop(timestamp);
  });
}

startGame();
