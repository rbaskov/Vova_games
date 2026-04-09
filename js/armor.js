// ============================================================
// armor.js — Armor System: Helmets, Chestplates, Leggings
// ============================================================

// Armor slots: helmet, chest, legs
// Each piece gives defense (reduces incoming damage) and may give bonus HP

export const ARMOR = {
  // === HELMETS ===
  leather_helmet: {
    id: 'leather_helmet', slot: 'helmet',
    name: 'Кожаный шлем', desc: '+1 DEF',
    def: 1, bonusHp: 0, price: 15,
    color: '#8d6e63', accent: '#a1887f',
  },
  iron_helmet: {
    id: 'iron_helmet', slot: 'helmet',
    name: 'Железный шлем', desc: '+3 DEF',
    def: 3, bonusHp: 0, price: 45,
    color: '#78909c', accent: '#90a4ae',
  },
  mithril_helmet: {
    id: 'mithril_helmet', slot: 'helmet',
    name: 'Мифрил. шлем', desc: '+5 DEF +10 HP',
    def: 5, bonusHp: 10, price: 110,
    color: '#9575cd', accent: '#b39ddb',
  },

  // === CHESTPLATES ===
  leather_chest: {
    id: 'leather_chest', slot: 'chest',
    name: 'Кожаный доспех', desc: '+2 DEF',
    def: 2, bonusHp: 0, price: 25,
    color: '#8d6e63', accent: '#a1887f',
  },
  iron_chest: {
    id: 'iron_chest', slot: 'chest',
    name: 'Железный доспех', desc: '+5 DEF +10 HP',
    def: 5, bonusHp: 10, price: 70,
    color: '#78909c', accent: '#b0bec5',
  },
  mithril_chest: {
    id: 'mithril_chest', slot: 'chest',
    name: 'Мифрил. доспех', desc: '+8 DEF +20 HP',
    def: 8, bonusHp: 20, price: 160,
    color: '#9575cd', accent: '#b39ddb',
  },

  // === LEGGINGS ===
  leather_legs: {
    id: 'leather_legs', slot: 'legs',
    name: 'Кожаные поножи', desc: '+1 DEF',
    def: 1, bonusHp: 0, price: 20,
    color: '#8d6e63', accent: '#a1887f',
  },
  iron_legs: {
    id: 'iron_legs', slot: 'legs',
    name: 'Железные поножи', desc: '+3 DEF',
    def: 3, bonusHp: 0, price: 50,
    color: '#78909c', accent: '#90a4ae',
  },
  mithril_legs: {
    id: 'mithril_legs', slot: 'legs',
    name: 'Мифрил. поножи', desc: '+5 DEF +10 HP',
    def: 5, bonusHp: 10, price: 120,
    color: '#9575cd', accent: '#b39ddb',
  },
};

export function getArmor(id) {
  return ARMOR[id] || null;
}

export function getTotalDef(player) {
  let def = 0;
  const slots = player.equippedArmor || {};
  for (const slotId of Object.values(slots)) {
    const a = ARMOR[slotId];
    if (a) def += a.def;
  }
  return def;
}

export function getArmorBonusHp(player) {
  let hp = 0;
  const slots = player.equippedArmor || {};
  for (const slotId of Object.values(slots)) {
    const a = ARMOR[slotId];
    if (a) hp += a.bonusHp;
  }
  return hp;
}

// Draw armor overlay on hero sprite (called from main.js after drawHero)
export function drawArmorOnHero(ctx, x, y, facing, equippedArmor, s) {
  if (!equippedArmor) return;
  const mirror = facing === 'left';

  ctx.save();
  ctx.translate(x, y);
  if (mirror) {
    ctx.scale(-1, 1);
    ctx.translate(-32, 0);
  }

  // Helmet
  const helmet = ARMOR[equippedArmor.helmet];
  if (helmet) {
    ctx.fillStyle = helmet.color;
    ctx.fillRect(5 * s, 0, 6 * s, 3 * s);
    ctx.fillStyle = helmet.accent;
    ctx.fillRect(6 * s, 0, 4 * s, 1 * s);
    // Visor slit for iron/mithril
    if (helmet.def >= 3 && facing !== 'up') {
      ctx.fillStyle = '#222';
      ctx.fillRect(6 * s, 2 * s, 4 * s, 1 * s);
    }
  }

  // Chestplate
  const chest = ARMOR[equippedArmor.chest];
  if (chest) {
    ctx.fillStyle = chest.color;
    ctx.fillRect(5 * s, 6 * s, 6 * s, 5 * s);
    // Shoulder pads
    ctx.fillRect(4 * s, 6 * s, 1 * s, 2 * s);
    ctx.fillRect(11 * s, 6 * s, 1 * s, 2 * s);
    // Highlight
    ctx.fillStyle = chest.accent;
    ctx.fillRect(6 * s, 7 * s, 4 * s, 2 * s);
    // Center stripe for iron+
    if (chest.def >= 5) {
      ctx.fillStyle = chest.accent;
      ctx.fillRect(7 * s, 6 * s, 2 * s, 5 * s);
    }
  }

  // Leggings
  const legs = ARMOR[equippedArmor.legs];
  if (legs) {
    ctx.fillStyle = legs.color;
    ctx.fillRect(5 * s, 12 * s, 2 * s, 4 * s);
    ctx.fillRect(9 * s, 12 * s, 2 * s, 4 * s);
    // Knee guards for iron+
    if (legs.def >= 3) {
      ctx.fillStyle = legs.accent;
      ctx.fillRect(5 * s, 13 * s, 2 * s, 1 * s);
      ctx.fillRect(9 * s, 13 * s, 2 * s, 1 * s);
    }
  }

  ctx.restore();
}

// Draw armor icon for inventory
export function drawArmorIcon(ctx, x, y, armorId) {
  const a = ARMOR[armorId];
  if (!a) return;
  const cx = x + 16, cy = y + 16;

  ctx.fillStyle = a.color;
  switch (a.slot) {
    case 'helmet':
      ctx.fillRect(cx - 8, cy - 6, 16, 10);
      ctx.fillStyle = a.accent;
      ctx.fillRect(cx - 6, cy - 6, 12, 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(cx - 4, cy, 8, 2);
      break;
    case 'chest':
      ctx.fillRect(cx - 8, cy - 8, 16, 16);
      ctx.fillStyle = a.accent;
      ctx.fillRect(cx - 6, cy - 6, 12, 8);
      // Shoulders
      ctx.fillStyle = a.color;
      ctx.fillRect(cx - 10, cy - 8, 4, 6);
      ctx.fillRect(cx + 6, cy - 8, 4, 6);
      break;
    case 'legs':
      ctx.fillRect(cx - 6, cy - 6, 5, 14);
      ctx.fillRect(cx + 1, cy - 6, 5, 14);
      ctx.fillStyle = a.accent;
      ctx.fillRect(cx - 5, cy - 2, 3, 4);
      ctx.fillRect(cx + 2, cy - 2, 3, 4);
      break;
  }
}
