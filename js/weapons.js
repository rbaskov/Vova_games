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
    attackSpeed: 0.7, // slow but powerful
    knockback: 15,
    projectileSpeed: 300,
    price: 150,
    color: '#78909c',
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

// Draw weapon sprite in attack direction
export function drawWeaponAttack(ctx, x, y, facing, weapon, s) {
  const w = getWeapon(weapon);

  switch (w.type) {
    case 'sword':
      drawSwordAttack(ctx, x, y, facing, w, s);
      break;
    case 'spear':
      drawSpearAttack(ctx, x, y, facing, w, s);
      break;
    case 'bow':
      drawBowHeld(ctx, x, y, facing, w, s);
      break;
  }
}

function drawSwordAttack(ctx, x, y, facing, w, s) {
  ctx.fillStyle = w.color;
  const bright = lightenColor(w.color);
  switch (facing) {
    case 'right':
      ctx.fillRect(x + 16 * s, y + 6 * s, 2 * s, 10 * s);
      ctx.fillStyle = bright;
      ctx.fillRect(x + 16 * s, y + 4 * s, 2 * s, 3 * s);
      break;
    case 'left':
      ctx.fillRect(x - 2 * s, y + 6 * s, 2 * s, 10 * s);
      ctx.fillStyle = bright;
      ctx.fillRect(x - 2 * s, y + 4 * s, 2 * s, 3 * s);
      break;
    case 'up':
      ctx.fillRect(x + 6 * s, y - 6 * s, 4 * s, 10 * s);
      ctx.fillStyle = bright;
      ctx.fillRect(x + 6 * s, y - 8 * s, 4 * s, 3 * s);
      break;
    case 'down':
      ctx.fillRect(x + 6 * s, y + 16 * s, 4 * s, 10 * s);
      ctx.fillStyle = bright;
      ctx.fillRect(x + 6 * s, y + 25 * s, 4 * s, 3 * s);
      break;
  }
}

function drawSpearAttack(ctx, x, y, facing, w, s) {
  ctx.fillStyle = '#8d6e63'; // shaft
  const tipColor = w.color === '#8d6e63' ? '#bdbdbd' : w.color;
  switch (facing) {
    case 'right':
      ctx.fillRect(x + 14 * s, y + 9 * s, 14 * s, 2 * s);
      ctx.fillStyle = tipColor;
      ctx.fillRect(x + 27 * s, y + 7 * s, 2 * s, 6 * s);
      break;
    case 'left':
      ctx.fillRect(x - 12 * s, y + 9 * s, 14 * s, 2 * s);
      ctx.fillStyle = tipColor;
      ctx.fillRect(x - 13 * s, y + 7 * s, 2 * s, 6 * s);
      break;
    case 'up':
      ctx.fillRect(x + 7 * s, y - 12 * s, 2 * s, 14 * s);
      ctx.fillStyle = tipColor;
      ctx.fillRect(x + 5 * s, y - 14 * s, 6 * s, 3 * s);
      break;
    case 'down':
      ctx.fillRect(x + 7 * s, y + 16 * s, 2 * s, 14 * s);
      ctx.fillStyle = tipColor;
      ctx.fillRect(x + 5 * s, y + 29 * s, 6 * s, 3 * s);
      break;
  }
}

function drawBowHeld(ctx, x, y, facing, w, s) {
  ctx.fillStyle = w.color;
  switch (facing) {
    case 'right':
      ctx.fillRect(x + 14 * s, y + 4 * s, 2 * s, 12 * s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 13 * s, y + 9 * s, 3 * s, 1 * s);
      break;
    case 'left':
      ctx.fillRect(x, y + 4 * s, 2 * s, 12 * s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y + 9 * s, 3 * s, 1 * s);
      break;
    case 'up':
      ctx.fillRect(x + 2 * s, y, 12 * s, 2 * s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 7 * s, y, 1 * s, 3 * s);
      break;
    case 'down':
      ctx.fillRect(x + 2 * s, y + 18 * s, 12 * s, 2 * s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 7 * s, y + 17 * s, 1 * s, 3 * s);
      break;
  }
}

// Draw weapon at rest (not attacking) on right side of hero
export function drawWeaponRest(ctx, x, y, weapon, s) {
  const w = getWeapon(weapon);
  switch (w.type) {
    case 'sword':
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(x + 14 * s, y + 7 * s, 2 * s, 2 * s);
      ctx.fillStyle = w.color;
      ctx.fillRect(x + 14.5 * s, y + 1 * s, 1 * s, 6 * s);
      break;
    case 'spear':
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(x + 14.5 * s, y + 2 * s, 1 * s, 12 * s);
      ctx.fillStyle = '#bdbdbd';
      ctx.fillRect(x + 14 * s, y, 2 * s, 3 * s);
      break;
    case 'bow':
      ctx.fillStyle = w.color;
      ctx.fillRect(x + 14 * s, y + 3 * s, 2 * s, 10 * s);
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
