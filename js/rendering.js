// Rendering module — все render/draw функции + константы данных для UI
// Вынесено из main.js в Task 2.5 (pre-coop refactor).
//
// Что здесь:
// - CLASSES (данные классов персонажа, используется renderClassSelect и gameLoop)
// - Меню и его помощники: stars, initStars, drawMountains, renderMenu
// - Выбор класса: renderClassSelect, drawClassIcon
// - Основной игровой рендер: renderPlay + renderHUD, renderMinimap, renderCompanions, drawHorse
// - renderHelpOverlay — оверлей справки
// - tryLockOrientation — lock ориентации на мобилках (вызывается из gameLoop при входе в игру)
//
// Экспорт: CLASSES, renderMenu, renderClassSelect, renderPlay, renderHelpOverlay,
//          initStars, tryLockOrientation

import { game } from './game-state.js';
import {
  isMobileDevice, getGameOffsetX,
  renderMenuTouchControls, renderMobilePanels,
} from './touch.js';
import { hasSave } from './save.js';
import {
  getWeapon, getAttackSpeed, drawWeaponAttack, drawWeaponRest,
} from './weapons.js';
import { getArmor, getTotalDef, drawArmorOnHero } from './armor.js';
import { getDifficulty, DIFFICULTY_COLORS } from './difficulty.js';
import { TILE_SIZE, renderMap, renderOpenWorld } from './tilemap.js';
import { CHUNK_W, CHUNK_H } from './worldgen.js';
import { drawNPC, drawHero } from './sprites.js';
import {
  drawChest, drawBuffStone, drawSecretPortal, drawEliteIndicator,
} from './events.js';
import { renderEnemies } from './enemies.js';
import { renderBoss, renderBossHPBar } from './bosses.js';
import { renderParticles } from './particles.js';
import { renderProjectiles, renderAbilityBar } from './abilities.js';

// --- Class Definitions ---
export const CLASSES = [
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

// --- Companions ---
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

// --- Menu ---
const stars = [];
const NUM_STARS = 80;

export function initStars() {
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

// Обновление звёзд меню — state mutation, вызывается из update-фазы.
// Вытащено из renderMenu в рамках update/render split'а чтобы updateMs был честным.
export function updateStars(dt) {
  for (const star of stars) {
    star.brightness += star.speed * dt;
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

export function renderMenu(ctx) {
  const { width, height } = game;
  const cx = getGameOffsetX() + 320; // center of game area

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // Stars — обновление brightness в updateStars(dt), здесь только рендер.
  for (const star of stars) {
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
export function renderClassSelect(ctx) {
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
export function renderHelpOverlay(ctx) {
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

// --- Render Exit Confirm Modal ---
// Полупрозрачный оверлей с подтверждением выхода в меню.
// Рисуется ПОВЕРХ обычного рендера PLAY, внутри игровой области
// (640x480), независимо от мобильных панелей — координаты локальные.
export function renderExitConfirm(ctx, canvasW, canvasH) {
  // Смещение игровой области (на мобильном — с учётом левой панели)
  // Получаем через getGameOffsetX из touch.js, но проще рисовать в
  // фиксированных координатах 640x480 и транслировать контекст.
  const gOff = (canvasW - 640) / 2;  // центрирование игровой области
  if (gOff > 0) { ctx.save(); ctx.translate(gOff, 0); }

  // Затемнение поверх всего игрового поля
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 640, 480);

  // Модальный бокс
  const boxW = 420;
  const boxH = 180;
  const boxX = (640 - boxW) / 2;
  const boxY = (480 - boxH) / 2;

  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 3;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Заголовок
  ctx.font = '12px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('ВЫЙТИ В МЕНЮ?', 320, boxY + 40);

  // Пояснение
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Прогресс будет сохранён', 320, boxY + 72);

  // Подсказки управления
  ctx.font = '10px "Press Start 2P"';
  ctx.fillStyle = '#80ff80';
  ctx.fillText('[Y] / [E] — Да', 320, boxY + 112);
  ctx.fillStyle = '#ff8080';
  ctx.fillText('[ESC] / [☰] — Нет', 320, boxY + 140);

  ctx.textAlign = 'left';
  if (gOff > 0) ctx.restore();
}

// --- Render Play State ---
export function renderPlay(ctx) {
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

// --- Orientation lock (mobile) ---
// Попытка зафиксировать landscape на Android. iOS Safari не поддерживает,
// но там есть CSS @media orientation:portrait → rotate-hint.
let _orientationLockAttempted = false;
export function tryLockOrientation() {
  if (_orientationLockAttempted) return;
  _orientationLockAttempted = true;
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.lock === 'function') {
    screen.orientation.lock('landscape').catch(() => {
      // iOS Safari / unsupported browsers — ignore silently
    });
  }
}
