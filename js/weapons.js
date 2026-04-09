// ============================================================
// weapons.js — Weapon Definitions & Attack Logic
// ============================================================

export const WEAPONS = {
  iron_sword: {
    id: 'iron_sword',
    name: 'Железный меч',
    desc: 'Надёжный клинок',
    type: 'sword',
    bonusAtk: 0,
    range: 48,
    attackSpeed: 0.3,  // seconds per swing
    knockback: 20,
    price: 0,
    color: '#bdbdbd',
  },
  steel_sword: {
    id: 'steel_sword',
    name: 'Стальной меч',
    desc: '+3 ATK, быстрый',
    type: 'sword',
    bonusAtk: 3,
    range: 48,
    attackSpeed: 0.25,
    knockback: 24,
    price: 50,
    color: '#90caf9',
  },
  mithril_sword: {
    id: 'mithril_sword',
    name: 'Мифриловый меч',
    desc: '+6 ATK, мощный',
    type: 'sword',
    bonusAtk: 6,
    range: 52,
    attackSpeed: 0.25,
    knockback: 28,
    price: 120,
    color: '#ce93d8',
  },
  spear: {
    id: 'spear',
    name: 'Копьё',
    desc: '+2 ATK, дальний удар',
    type: 'spear',
    bonusAtk: 2,
    range: 72,      // 2.25 tiles — much longer reach
    attackSpeed: 0.4, // slower swing
    knockback: 30,
    price: 40,
    color: '#8d6e63',
  },
  fire_spear: {
    id: 'fire_spear',
    name: 'Огненное копьё',
    desc: '+5 ATK, дальний',
    type: 'spear',
    bonusAtk: 5,
    range: 72,
    attackSpeed: 0.35,
    knockback: 32,
    price: 100,
    color: '#ff7043',
  },
  bow: {
    id: 'bow',
    name: 'Лук',
    desc: '+1 ATK, стреляет',
    type: 'bow',
    bonusAtk: 1,
    range: 200,      // projectile range (not melee)
    attackSpeed: 0.5, // slower fire rate
    knockback: 10,
    projectileSpeed: 250,
    price: 80,
    color: '#a1887f',
  },
  crossbow: {
    id: 'crossbow',
    name: 'Арбалет',
    desc: '+4 ATK, мощные болты',
    type: 'bow',
    bonusAtk: 4,
    range: 220,
    attackSpeed: 0.7,
    knockback: 15,
    projectileSpeed: 300,
    price: 150,
    color: '#78909c',
  },

  // === TWO-HANDED SWORDS (no shield) ===
  iron_greatsword: {
    id: 'iron_greatsword',
    name: 'Железный двуручник',
    desc: '+12 ATK, широкий удар',
    type: 'greatsword',
    bonusAtk: 12,
    range: 56,
    attackSpeed: 0.45,
    knockback: 35,
    price: 80,
    color: '#78909c',
    twoHanded: true,
  },
  steel_greatsword: {
    id: 'steel_greatsword',
    name: 'Стальной двуручник',
    desc: '+20 ATK, сокрушающий',
    type: 'greatsword',
    bonusAtk: 20,
    range: 60,
    attackSpeed: 0.4,
    knockback: 42,
    price: 160,
    color: '#90caf9',
    twoHanded: true,
  },
  knight_greatsword: {
    id: 'knight_greatsword',
    name: 'Рыцарский двуручник',
    desc: '+30 ATK, легендарный',
    type: 'greatsword',
    bonusAtk: 30,
    range: 64,
    attackSpeed: 0.38,
    knockback: 50,
    price: 300,
    color: '#b0bec5',
    twoHanded: true,
  },

  // === BATTLE AXES ===
  iron_axe: {
    id: 'iron_axe',
    name: 'Железный топор',
    desc: '+4 ATK, медленный',
    type: 'axe',
    bonusAtk: 4,
    range: 44,
    attackSpeed: 0.45,
    knockback: 35,
    price: 60,
    color: '#78909c',
  },
  steel_axe: {
    id: 'steel_axe',
    name: 'Стальной топор',
    desc: '+7 ATK, тяжёлый удар',
    type: 'axe',
    bonusAtk: 7,
    range: 46,
    attackSpeed: 0.4,
    knockback: 40,
    price: 110,
    color: '#90caf9',
  },
  gladiator_axe: {
    id: 'gladiator_axe',
    name: 'Топор гладиатора',
    desc: '+9 ATK, двулезвийный',
    type: 'axe',
    bonusAtk: 9,
    range: 48,
    attackSpeed: 0.38,
    knockback: 45,
    price: 170,
    color: '#c9a04e',
  },
  knight_axe: {
    id: 'knight_axe',
    name: 'Рыцарский топор',
    desc: '+12 ATK, сокрушительный',
    type: 'axe',
    bonusAtk: 12,
    range: 50,
    attackSpeed: 0.35,
    knockback: 50,
    price: 250,
    color: '#b0bec5',
  },

  // === BANDIT LOOT WEAPONS ===
  skeleton_sword: {
    id: 'skeleton_sword',
    name: 'Костяной меч скелета',
    desc: '+1 ATK, хрупкий',
    type: 'sword',
    bonusAtk: 1,
    range: 46,
    attackSpeed: 0.32,
    knockback: 18,
    price: 15,
    color: '#e0e0e0',
  },
  bandit_sword: {
    id: 'bandit_sword',
    name: 'Ржавый меч бандита',
    desc: '+2 ATK, зазубренный',
    type: 'sword',
    bonusAtk: 2,
    range: 48,
    attackSpeed: 0.28,
    knockback: 22,
    price: 30,
    color: '#8a8a8a',
  },
  bandit_spear: {
    id: 'bandit_spear',
    name: 'Грубое копьё бандита',
    desc: '+3 ATK, каменный наконечник',
    type: 'spear',
    bonusAtk: 3,
    range: 70,
    attackSpeed: 0.38,
    knockback: 28,
    price: 35,
    color: '#6d4c41',
  },
  bandit_bow: {
    id: 'bandit_bow',
    name: 'Потрёпанный лук бандита',
    desc: '+2 ATK, с оборванной тетивой',
    type: 'bow',
    bonusAtk: 2,
    range: 190,
    attackSpeed: 0.45,
    knockback: 12,
    projectileSpeed: 230,
    price: 40,
    color: '#795548',
  },
  bandit_axe: {
    id: 'bandit_axe',
    name: 'Ржавый топор бандита',
    desc: '+3 ATK, тяжёлый и грубый',
    type: 'axe',
    bonusAtk: 3,
    range: 42,
    attackSpeed: 0.5,
    knockback: 32,
    price: 35,
    color: '#6d6d6d',
  },
};

export function getWeapon(id) {
  return WEAPONS[id] || WEAPONS.iron_sword;
}

export function getTotalAtk(player) {
  const weapon = getWeapon(player.weapon);
  return player.atk + weapon.bonusAtk;
}

export function getWeaponRange(player) {
  return getWeapon(player.weapon).range;
}

export function getAttackSpeed(player) {
  return getWeapon(player.weapon).attackSpeed;
}

export function getKnockback(player) {
  return getWeapon(player.weapon).knockback;
}

// Draw weapon attack animation with progress (0→1)
export function drawWeaponAttack(ctx, x, y, facing, weapon, s, progress = 0.5) {
  const w = getWeapon(weapon);

  switch (w.type) {
    case 'sword':
      drawSwordSwing(ctx, x, y, facing, w, s, progress);
      break;
    case 'spear':
      drawSpearThrust(ctx, x, y, facing, w, s, progress);
      break;
    case 'bow':
      drawBowShot(ctx, x, y, facing, w, s, progress);
      break;
    case 'axe':
      drawAxeSwing(ctx, x, y, facing, w, s, progress);
      break;
    case 'greatsword':
      drawGreatswordSwing(ctx, x, y, facing, w, s, progress);
      break;
  }
}

// Sword: sweeping arc swing
function drawSwordSwing(ctx, x, y, facing, w, s, progress) {
  const cx = x + 8 * s; // hero center x
  const cy = y + 10 * s; // hero center y
  const len = 12 * s;    // blade length
  const bright = lightenColor(w.color);

  // Swing angle: start behind, sweep forward (120 degree arc)
  const swingRange = Math.PI * 0.7;
  const swingOffset = -swingRange / 2;
  const angle = swingOffset + progress * swingRange;

  let baseAngle;
  switch (facing) {
    case 'right': baseAngle = -Math.PI / 2; break;
    case 'left':  baseAngle = Math.PI / 2; break;
    case 'up':    baseAngle = Math.PI; break;
    case 'down':  baseAngle = 0; break;
  }

  const totalAngle = baseAngle + angle;
  const tipX = cx + Math.sin(totalAngle) * len;
  const tipY = cy + Math.cos(totalAngle) * len;
  const midX = cx + Math.sin(totalAngle) * (len * 0.5);
  const midY = cy + Math.cos(totalAngle) * (len * 0.5);

  // Blade
  ctx.strokeStyle = w.color;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Bright tip
  ctx.strokeStyle = bright;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(midX, midY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Slash trail arc (visible mid-swing)
  if (progress > 0.2 && progress < 0.8) {
    const trailAlpha = 1 - Math.abs(progress - 0.5) * 3;
    ctx.globalAlpha = trailAlpha * 0.6;
    ctx.strokeStyle = bright;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const trailStart = baseAngle + swingOffset + (progress - 0.3) * swingRange;
    const trailEnd = baseAngle + swingOffset + progress * swingRange;
    ctx.arc(cx, cy, len - 2, trailStart, trailEnd);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Impact sparks at peak (progress ~0.4-0.6)
  if (progress > 0.35 && progress < 0.65) {
    ctx.fillStyle = '#fff';
    const sparkAngle = baseAngle + swingOffset + 0.5 * swingRange;
    for (let i = 0; i < 3; i++) {
      const sparkDist = len + (i * 4 + (progress - 0.35) * 20);
      const sa = sparkAngle + (i - 1) * 0.3;
      const sx = cx + Math.sin(sa) * sparkDist;
      const sy = cy + Math.cos(sa) * sparkDist;
      const sparkSize = (1 - Math.abs(progress - 0.5) * 4) * 3;
      ctx.fillRect(sx - sparkSize / 2, sy - sparkSize / 2, sparkSize, sparkSize);
    }
  }
}

// Spear: forward thrust with recoil
function drawSpearThrust(ctx, x, y, facing, w, s, progress) {
  const cx = x + 8 * s;
  const cy = y + 10 * s;
  const tipColor = w.color === '#8d6e63' ? '#bdbdbd' : w.color;

  // Thrust: quick extend (0→0.4), hold (0.4→0.6), retract (0.6→1)
  let thrustDist;
  if (progress < 0.4) {
    thrustDist = (progress / 0.4);  // 0→1
  } else if (progress < 0.6) {
    thrustDist = 1;                  // hold
  } else {
    thrustDist = 1 - ((progress - 0.6) / 0.4); // 1→0
  }

  const maxLen = 18 * s;
  const shaftLen = maxLen * (0.4 + thrustDist * 0.6);

  let dx = 0, dy = 0;
  switch (facing) {
    case 'right': dx = 1; break;
    case 'left':  dx = -1; break;
    case 'up':    dy = -1; break;
    case 'down':  dy = 1; break;
  }

  const endX = cx + dx * shaftLen;
  const endY = cy + dy * shaftLen;

  // Shaft
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = 2 * s;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Spearhead (triangle-ish)
  const headSize = 4 * s;
  ctx.fillStyle = tipColor;
  if (dx !== 0) {
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(endX + dx * headSize, endY);
    ctx.lineTo(endX, endY - headSize / 2);
    ctx.lineTo(endX, endY + headSize / 2);
    ctx.fill();
  } else {
    // Vertical
    ctx.beginPath();
    ctx.moveTo(endX, endY + dy * headSize);
    ctx.lineTo(endX - headSize / 2, endY);
    ctx.lineTo(endX + headSize / 2, endY);
    ctx.fill();
  }

  // Thrust impact lines at full extension
  if (thrustDist > 0.8) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = thrustDist * 0.6;
    for (let i = -1; i <= 1; i++) {
      const offset = i * 6;
      ctx.beginPath();
      if (dx !== 0) {
        ctx.moveTo(endX + dx * 4, endY + offset);
        ctx.lineTo(endX + dx * (8 + Math.abs(i) * 2), endY + offset);
      } else {
        ctx.moveTo(endX + offset, endY + dy * 4);
        ctx.lineTo(endX + offset, endY + dy * (8 + Math.abs(i) * 2));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// Bow: draw string, release arrow
function drawBowShot(ctx, x, y, facing, w, s, progress) {
  const cx = x + 8 * s;
  const cy = y + 10 * s;

  let dx = 0, dy = 0;
  switch (facing) {
    case 'right': dx = 1; break;
    case 'left':  dx = -1; break;
    case 'up':    dy = -1; break;
    case 'down':  dy = 1; break;
  }

  // Bow arc perpendicular to facing
  const bowDist = 6 * s;
  const bowLen = 8 * s;
  const bowX = cx + dx * bowDist;
  const bowY = cy + dy * bowDist;

  // Draw bow limb
  ctx.strokeStyle = w.color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (dx !== 0) {
    // Horizontal facing — vertical bow
    ctx.moveTo(bowX, bowY - bowLen);
    ctx.quadraticCurveTo(bowX + dx * 6, bowY, bowX, bowY + bowLen);
  } else {
    // Vertical facing — horizontal bow
    ctx.moveTo(bowX - bowLen, bowY);
    ctx.quadraticCurveTo(bowX, bowY + dy * 6, bowX + bowLen, bowY);
  }
  ctx.stroke();

  // String — pulled back before release (progress < 0.3), then snap forward
  const stringPull = progress < 0.3 ? (1 - progress / 0.3) * 5 : 0;
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (dx !== 0) {
    ctx.moveTo(bowX, bowY - bowLen);
    ctx.lineTo(bowX - dx * stringPull, bowY);
    ctx.lineTo(bowX, bowY + bowLen);
  } else {
    ctx.moveTo(bowX - bowLen, bowY);
    ctx.lineTo(bowX - dy * stringPull, bowY); // pulled back
    ctx.lineTo(bowX + bowLen, bowY);
  }
  ctx.stroke();

  // Release flash
  if (progress > 0.25 && progress < 0.45) {
    const flash = 1 - (progress - 0.25) / 0.2;
    ctx.globalAlpha = flash * 0.8;
    ctx.fillStyle = '#fff';
    const fx = bowX + dx * 4;
    const fy = bowY + dy * 4;
    ctx.fillRect(fx - 3, fy - 3, 6, 6);
    ctx.globalAlpha = 1;
  }

  // Arrow flying away (after release)
  if (progress > 0.3 && progress < 0.9) {
    const arrowDist = (progress - 0.3) / 0.6 * 30;
    const ax = bowX + dx * (4 + arrowDist);
    const ay = bowY + dy * (4 + arrowDist);
    ctx.fillStyle = '#fff';
    if (dx !== 0) {
      ctx.fillRect(ax, ay - 1, 6, 2);
      // Arrowhead
      ctx.fillRect(ax + dx * 5, ay - 2, 2, 4);
    } else {
      ctx.fillRect(ax - 1, ay, 2, 6);
      ctx.fillRect(ax - 2, ay + dy * 5, 4, 2);
    }
  }
}

// Greatsword: wide two-handed sweep with afterimage
function drawGreatswordSwing(ctx, x, y, facing, w, s, progress) {
  const cx = x + 8 * s;
  const cy = y + 10 * s;
  const len = 16 * s; // longer than normal sword
  const bright = lightenColor(w.color);

  const swingRange = Math.PI * 1.0; // wider arc
  const swingOffset = -swingRange / 2;
  const angle = swingOffset + progress * swingRange;

  let baseAngle;
  switch (facing) {
    case 'right': baseAngle = -Math.PI / 2; break;
    case 'left':  baseAngle = Math.PI / 2; break;
    case 'up':    baseAngle = Math.PI; break;
    case 'down':  baseAngle = 0; break;
  }

  const totalAngle = baseAngle + angle;
  const tipX = cx + Math.sin(totalAngle) * len;
  const tipY = cy + Math.cos(totalAngle) * len;
  const midX = cx + Math.sin(totalAngle) * (len * 0.4);
  const midY = cy + Math.cos(totalAngle) * (len * 0.4);

  // Afterimage trail (3 fading copies)
  if (progress > 0.1 && progress < 0.9) {
    for (let t = 1; t <= 3; t++) {
      const trailP = Math.max(0, progress - t * 0.08);
      const trailAngle = baseAngle + swingOffset + trailP * swingRange;
      const tx = cx + Math.sin(trailAngle) * len;
      const ty = cy + Math.cos(trailAngle) * len;
      ctx.globalAlpha = 0.15 / t;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Main blade (thick)
  ctx.strokeStyle = w.color;
  ctx.lineWidth = 5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Bright edge
  ctx.strokeStyle = bright;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(midX, midY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Guard (crossguard)
  const guardAngle = totalAngle + Math.PI / 2;
  const gx1 = cx + Math.sin(guardAngle) * 4 * s;
  const gy1 = cy + Math.cos(guardAngle) * 4 * s;
  const gx2 = cx - Math.sin(guardAngle) * 4 * s;
  const gy2 = cy - Math.cos(guardAngle) * 4 * s;
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gx1, gy1);
  ctx.lineTo(gx2, gy2);
  ctx.stroke();

  // Impact slash arc
  if (progress > 0.3 && progress < 0.7) {
    const intensity = 1 - Math.abs(progress - 0.5) * 4;
    ctx.globalAlpha = intensity * 0.4;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const arcStart = baseAngle + swingOffset + (progress - 0.2) * swingRange;
    const arcEnd = baseAngle + swingOffset + progress * swingRange;
    ctx.arc(cx, cy, len + 2, arcStart, arcEnd);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// Axe: heavy overhead swing
function drawAxeSwing(ctx, x, y, facing, w, s, progress) {
  const cx = x + 8 * s;
  const cy = y + 10 * s;
  const len = 10 * s;
  const bright = lightenColor(w.color);

  // Overhead swing: starts high, smashes down (wider arc than sword)
  const swingRange = Math.PI * 0.9;
  const swingOffset = -swingRange / 2;
  const angle = swingOffset + progress * swingRange;

  let baseAngle;
  switch (facing) {
    case 'right': baseAngle = -Math.PI / 2; break;
    case 'left':  baseAngle = Math.PI / 2; break;
    case 'up':    baseAngle = Math.PI; break;
    case 'down':  baseAngle = 0; break;
  }

  const totalAngle = baseAngle + angle;
  const tipX = cx + Math.sin(totalAngle) * len;
  const tipY = cy + Math.cos(totalAngle) * len;

  // Handle (shaft)
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Axe head (wide rectangle at tip, perpendicular to shaft)
  const perpX = Math.cos(totalAngle);
  const perpY = -Math.sin(totalAngle);
  const headSize = 5 * s;

  ctx.fillStyle = w.color;
  ctx.beginPath();
  ctx.moveTo(tipX + perpX * headSize, tipY + perpY * headSize);
  ctx.lineTo(tipX - perpX * headSize, tipY - perpY * headSize);
  ctx.lineTo(tipX - perpX * headSize * 0.3 + Math.sin(totalAngle) * 4, tipY - perpY * headSize * 0.3 + Math.cos(totalAngle) * 4);
  ctx.lineTo(tipX + perpX * headSize * 0.3 + Math.sin(totalAngle) * 4, tipY + perpY * headSize * 0.3 + Math.cos(totalAngle) * 4);
  ctx.fill();

  // Edge highlight
  ctx.fillStyle = bright;
  ctx.beginPath();
  ctx.moveTo(tipX + perpX * headSize, tipY + perpY * headSize);
  ctx.lineTo(tipX - perpX * headSize, tipY - perpY * headSize);
  ctx.lineTo(tipX + Math.sin(totalAngle) * 2, tipY + Math.cos(totalAngle) * 2);
  ctx.fill();

  // Impact shockwave at peak (progress ~0.4-0.6)
  if (progress > 0.35 && progress < 0.65) {
    const intensity = 1 - Math.abs(progress - 0.5) * 4;
    ctx.globalAlpha = intensity * 0.5;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 8 + intensity * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// Draw weapon at rest (not attacking) on right side of hero
export function drawWeaponRest(ctx, x, y, weapon, s) {
  const w = getWeapon(weapon);
  const cx = x + 8 * s;
  const cy = y + 10 * s;

  switch (w.type) {
    case 'sword':
      // Sword resting diagonally on back
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 13 * s, y + 12 * s);
      ctx.lineTo(x + 16 * s, y + 2 * s);
      ctx.stroke();
      // Guard
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(x + 12.5 * s, y + 11 * s, 3 * s, 2 * s);
      break;
    case 'spear':
      // Spear held vertically
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 15 * s, y + 14 * s);
      ctx.lineTo(x + 15 * s, y - 1 * s);
      ctx.stroke();
      // Spearhead
      const tipColor = w.color === '#8d6e63' ? '#bdbdbd' : w.color;
      ctx.fillStyle = tipColor;
      ctx.beginPath();
      ctx.moveTo(x + 15 * s, y - 3 * s);
      ctx.lineTo(x + 13 * s, y);
      ctx.lineTo(x + 17 * s, y);
      ctx.fill();
      break;
    case 'bow':
      // Bow slung on back
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 14 * s, y + 4 * s);
      ctx.quadraticCurveTo(x + 18 * s, y + 10 * s, x + 14 * s, y + 16 * s);
      ctx.stroke();
      // String
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 14 * s, y + 4 * s);
      ctx.lineTo(x + 14 * s, y + 16 * s);
      ctx.stroke();
      break;
    case 'greatsword':
      // Greatsword on back (diagonal, longer)
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 12 * s, y + 14 * s);
      ctx.lineTo(x + 18 * s, y - 2 * s);
      ctx.stroke();
      // Bright edge
      ctx.strokeStyle = lightenColor(w.color);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 16 * s, y + 2 * s);
      ctx.lineTo(x + 18 * s, y - 2 * s);
      ctx.stroke();
      // Guard
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(x + 11 * s, y + 13 * s, 4 * s, 2 * s);
      break;
    case 'axe':
      // Axe resting on shoulder
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 12 * s, y + 12 * s);
      ctx.lineTo(x + 16 * s, y + 1 * s);
      ctx.stroke();
      // Axe head
      ctx.fillStyle = w.color;
      ctx.fillRect(x + 14 * s, y - 1 * s, 4 * s, 4 * s);
      ctx.fillStyle = lightenColor(w.color);
      ctx.fillRect(x + 17 * s, y - 1 * s, 1 * s, 4 * s);
      break;
  }
}

// Create arrow/bolt projectile for bow weapons
export function createArrow(player) {
  const w = getWeapon(player.weapon);
  if (w.type !== 'bow') return null;

  let dx = 0, dy = 0;
  switch (player.facing) {
    case 'right': dx = 1; break;
    case 'left':  dx = -1; break;
    case 'up':    dy = -1; break;
    case 'down':  dy = 1; break;
  }

  return {
    x: player.x + player.hitW / 2,
    y: player.y + player.hitH / 2,
    dirX: dx,
    dirY: dy,
    damage: player.atk + w.bonusAtk,
    color: '#fff',
    speed: w.projectileSpeed,
    life: 1.5,
    width: 6,
    height: 6,
    isArrow: true,
  };
}

function lightenColor(hex) {
  // Simple lighten: just return a brighter version
  const map = {
    '#bdbdbd': '#e0e0e0',
    '#90caf9': '#bbdefb',
    '#ce93d8': '#e1bee7',
    '#8d6e63': '#bcaaa4',
    '#ff7043': '#ff8a65',
    '#a1887f': '#bcaaa4',
    '#78909c': '#b0bec5',
  };
  return map[hex] || '#ffffff';
}
