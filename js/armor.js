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
  chain_helmet: {
    id: 'chain_helmet', slot: 'helmet',
    name: 'Кольчужный шлем', desc: '+2 DEF',
    def: 2, bonusHp: 0, price: 30,
    color: '#607d8b', accent: '#78909c',
  },
  iron_helmet: {
    id: 'iron_helmet', slot: 'helmet',
    name: 'Железный шлем', desc: '+3 DEF',
    def: 3, bonusHp: 0, price: 45,
    color: '#78909c', accent: '#90a4ae',
  },
  gladiator_helmet: {
    id: 'gladiator_helmet', slot: 'helmet',
    name: 'Шлем гладиатора', desc: '+4 DEF +5 HP',
    def: 4, bonusHp: 5, price: 75,
    color: '#c9a04e', accent: '#dbb85c',
  },
  mithril_helmet: {
    id: 'mithril_helmet', slot: 'helmet',
    name: 'Мифрил. шлем', desc: '+5 DEF +10 HP',
    def: 5, bonusHp: 10, price: 110,
    color: '#9575cd', accent: '#b39ddb',
  },
  knight_helmet: {
    id: 'knight_helmet', slot: 'helmet',
    name: 'Рыцарский шлем', desc: '+7 DEF +15 HP',
    def: 7, bonusHp: 15, price: 180,
    color: '#b0bec5', accent: '#cfd8dc',
  },
  ferida_helmet: {
    id: 'ferida_helmet', slot: 'helmet',
    name: 'Шлем Ферида', desc: '+800 DEF +50 HP',
    def: 800, bonusHp: 50, price: 500,
    color: '#ff6f00', accent: '#ffab00',
  },

  // === CHESTPLATES ===
  leather_chest: {
    id: 'leather_chest', slot: 'chest',
    name: 'Кожаный доспех', desc: '+2 DEF',
    def: 2, bonusHp: 0, price: 25,
    color: '#8d6e63', accent: '#a1887f',
  },
  chain_chest: {
    id: 'chain_chest', slot: 'chest',
    name: 'Кольчуга', desc: '+3 DEF +5 HP',
    def: 3, bonusHp: 5, price: 45,
    color: '#607d8b', accent: '#78909c',
  },
  iron_chest: {
    id: 'iron_chest', slot: 'chest',
    name: 'Железный доспех', desc: '+5 DEF +10 HP',
    def: 5, bonusHp: 10, price: 70,
    color: '#78909c', accent: '#b0bec5',
  },
  gladiator_chest: {
    id: 'gladiator_chest', slot: 'chest',
    name: 'Доспех гладиатора', desc: '+6 DEF +15 HP',
    def: 6, bonusHp: 15, price: 110,
    color: '#c9a04e', accent: '#dbb85c',
  },
  mithril_chest: {
    id: 'mithril_chest', slot: 'chest',
    name: 'Мифрил. доспех', desc: '+8 DEF +20 HP',
    def: 8, bonusHp: 20, price: 160,
    color: '#9575cd', accent: '#b39ddb',
  },
  knight_chest: {
    id: 'knight_chest', slot: 'chest',
    name: 'Рыцарский доспех', desc: '+10 DEF +30 HP',
    def: 10, bonusHp: 30, price: 250,
    color: '#b0bec5', accent: '#cfd8dc',
  },
  ezanilla_chest: {
    id: 'ezanilla_chest', slot: 'chest',
    name: 'Кольчуга Эзаниллы', desc: '+1000 DEF +40 HP',
    def: 1000, bonusHp: 40, price: 400,
    color: '#26c6da', accent: '#80deea',
  },

  // === LEGGINGS ===
  leather_legs: {
    id: 'leather_legs', slot: 'legs',
    name: 'Кожаные поножи', desc: '+1 DEF',
    def: 1, bonusHp: 0, price: 20,
    color: '#8d6e63', accent: '#a1887f',
  },
  chain_legs: {
    id: 'chain_legs', slot: 'legs',
    name: 'Кольчужные поножи', desc: '+2 DEF',
    def: 2, bonusHp: 0, price: 35,
    color: '#607d8b', accent: '#78909c',
  },
  iron_legs: {
    id: 'iron_legs', slot: 'legs',
    name: 'Железные поножи', desc: '+3 DEF',
    def: 3, bonusHp: 0, price: 50,
    color: '#78909c', accent: '#90a4ae',
  },
  gladiator_legs: {
    id: 'gladiator_legs', slot: 'legs',
    name: 'Поножи гладиатора', desc: '+4 DEF +5 HP',
    def: 4, bonusHp: 5, price: 85,
    color: '#c9a04e', accent: '#dbb85c',
  },
  mithril_legs: {
    id: 'mithril_legs', slot: 'legs',
    name: 'Мифрил. поножи', desc: '+5 DEF +10 HP',
    def: 5, bonusHp: 10, price: 120,
    color: '#9575cd', accent: '#b39ddb',
  },
  knight_legs: {
    id: 'knight_legs', slot: 'legs',
    name: 'Рыцарские поножи', desc: '+7 DEF +15 HP',
    def: 7, bonusHp: 15, price: 190,
    color: '#b0bec5', accent: '#cfd8dc',
  },
  iomerida_legs: {
    id: 'iomerida_legs', slot: 'legs',
    name: 'Поножи Иомерида', desc: '+900 DEF +60 HP',
    def: 900, bonusHp: 60, price: 550,
    color: '#00e676', accent: '#69f0ae',
  },

  // === SHIELDS ===
  wooden_shield: {
    id: 'wooden_shield', slot: 'shield',
    name: 'Деревянный щит', desc: '+1 DEF, 20% блок',
    def: 1, bonusHp: 0, price: 20,
    blockChance: 0.2,
    color: '#8d6e63', accent: '#a1887f',
  },
  iron_shield: {
    id: 'iron_shield', slot: 'shield',
    name: 'Железный щит', desc: '+3 DEF, 40% блок',
    def: 3, bonusHp: 0, price: 55,
    blockChance: 0.4,
    color: '#78909c', accent: '#b0bec5',
  },
  fire_shield: {
    id: 'fire_shield', slot: 'shield',
    name: 'Огненный щит', desc: '+2 DEF, 70% блок огня',
    def: 2, bonusHp: 0, price: 90,
    blockChance: 0.7,
    color: '#e65100', accent: '#ff9800',
  },
  mithril_shield: {
    id: 'mithril_shield', slot: 'shield',
    name: 'Мифрил. щит', desc: '+5 DEF, 60% блок +15 HP',
    def: 5, bonusHp: 15, price: 140,
    blockChance: 0.6,
    color: '#9575cd', accent: '#b39ddb',
  },
  mirror_shield: {
    id: 'mirror_shield', slot: 'shield',
    name: 'Зеркальный щит', desc: '+4 DEF, 80% блок, отражает',
    def: 4, bonusHp: 0, price: 200,
    blockChance: 0.8,
    reflects: true,
    color: '#e0e0e0', accent: '#ffffff',
  },
  moremirida_shield: {
    id: 'moremirida_shield', slot: 'shield',
    name: 'Щит Моремирида', desc: '+1000 DEF, 100% блок, x3 отражение',
    def: 1000, bonusHp: 30, price: 600,
    blockChance: 1.0,
    reflects: true,
    tripleReflect: true,
    color: '#00bfa5', accent: '#64ffda',
  },
  rockdemon_shield: {
    id: 'rockdemon_shield', slot: 'shield',
    name: 'Щит РокДемона', desc: '+2000 DEF, 60% блок любой атаки',
    def: 2000, bonusHp: 50, price: 0,
    blockChance: 0.6,
    reflects: true,
    tripleReflect: true,
    color: '#d50000', accent: '#ff1744',
  },
};

export function getArmor(id) {
  return ARMOR[id] || null;
}

// Check if shield blocks a projectile. Returns: 'blocked' | 'reflected' | null
export function tryBlockProjectile(player) {
  // Two-handed weapons disable shield
  if (player._twoHanded) return null;

  const shieldId = player.equippedArmor && player.equippedArmor.shield;
  if (!shieldId) return null;
  const shield = ARMOR[shieldId];
  if (!shield || !shield.blockChance) return null;

  if (Math.random() < shield.blockChance) {
    if (shield.tripleReflect) return 'triple_reflected';
    if (shield.reflects) return 'reflected';
    return 'blocked';
  }
  return null;
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

  // Helmet — unique per tier
  const helmet = ARMOR[equippedArmor.helmet];
  if (helmet) {
    const hid = helmet.id;
    ctx.fillStyle = helmet.color;

    if (hid === 'leather_helmet') {
      // Leather cap — simple rounded top
      ctx.fillRect(5*s, 0, 6*s, 2*s);
      ctx.fillStyle = helmet.accent;
      ctx.fillRect(6*s, 0, 4*s, 1*s);
    } else if (hid === 'chain_helmet') {
      // Chain coif — covers head with mail texture dots
      ctx.fillRect(5*s, 0, 6*s, 3*s);
      ctx.fillStyle = helmet.accent;
      ctx.fillRect(6*s, 1*s, 1*s, 1*s);
      ctx.fillRect(8*s, 0, 1*s, 1*s);
      ctx.fillRect(10*s, 1*s, 1*s, 1*s);
    } else if (hid === 'iron_helmet') {
      // Iron helm — full coverage with visor
      ctx.fillRect(5*s, 0, 6*s, 3*s);
      ctx.fillStyle = helmet.accent;
      ctx.fillRect(6*s, 0, 4*s, 1*s);
      if (facing !== 'up') { ctx.fillStyle = '#222'; ctx.fillRect(6*s, 2*s, 4*s, 1*s); }
    } else if (hid === 'gladiator_helmet') {
      // Gladiator — open face with crest/mohawk
      ctx.fillRect(5*s, 0, 6*s, 2*s);
      ctx.fillStyle = helmet.accent;
      ctx.fillRect(7*s, -1*s, 2*s, 2*s); // crest
      ctx.fillRect(6*s, 0, 4*s, 1*s);
      // Cheek guards
      ctx.fillStyle = helmet.color;
      ctx.fillRect(5*s, 2*s, 1*s, 2*s);
      ctx.fillRect(10*s, 2*s, 1*s, 2*s);
    } else if (hid === 'mithril_helmet') {
      // Mithril — elegant with gem
      ctx.fillRect(5*s, 0, 6*s, 3*s);
      ctx.fillStyle = helmet.accent;
      ctx.fillRect(6*s, 0, 4*s, 1*s);
      ctx.fillStyle = '#e040fb'; // purple gem
      ctx.fillRect(7.5*s, 0, 1*s, 1*s);
      if (facing !== 'up') { ctx.fillStyle = '#222'; ctx.fillRect(6*s, 2*s, 4*s, 1*s); }
    } else if (hid === 'knight_helmet') {
      // Knight — great helm, full visor, cross slit
      ctx.fillRect(4*s, 0, 8*s, 4*s);
      ctx.fillStyle = helmet.accent;
      ctx.fillRect(5*s, 0, 6*s, 1*s);
      if (facing !== 'up') {
        ctx.fillStyle = '#222';
        ctx.fillRect(6*s, 2*s, 4*s, 1*s); // horizontal slit
        ctx.fillRect(7.5*s, 1*s, 1*s, 3*s); // vertical slit (cross)
      }
      // Plume
      ctx.fillStyle = '#c62828';
      ctx.fillRect(7*s, -2*s, 2*s, 3*s);
    } else if (hid === 'ferida_helmet') {
      // Ferida — legendary flaming crown helmet
      ctx.fillRect(4*s, 0, 8*s, 4*s);
      ctx.fillStyle = helmet.accent;
      ctx.fillRect(5*s, 0, 6*s, 2*s);
      // Flame crown spikes
      ctx.fillStyle = '#ff6f00';
      ctx.fillRect(5*s, -2*s, 1*s, 3*s);
      ctx.fillRect(7*s, -3*s, 2*s, 4*s);
      ctx.fillRect(10*s, -2*s, 1*s, 3*s);
      ctx.fillStyle = '#ffab00';
      ctx.fillRect(7.5*s, -2*s, 1*s, 2*s);
      // Glowing eyes
      if (facing !== 'up') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(6*s, 2*s, 1.5*s, 1*s);
        ctx.fillRect(8.5*s, 2*s, 1.5*s, 1*s);
      }
    } else {
      // Fallback
      ctx.fillRect(5*s, 0, 6*s, 3*s);
    }
  }

  // Chestplate — unique per tier
  const chest = ARMOR[equippedArmor.chest];
  if (chest) {
    const cid = chest.id;
    ctx.fillStyle = chest.color;

    if (cid === 'leather_chest') {
      // Leather vest — simple, no shoulders
      ctx.fillRect(5*s, 6*s, 6*s, 5*s);
      ctx.fillStyle = chest.accent;
      ctx.fillRect(6*s, 7*s, 4*s, 2*s);
    } else if (cid === 'chain_chest') {
      // Chainmail — dotted texture
      ctx.fillRect(5*s, 6*s, 6*s, 5*s);
      ctx.fillStyle = chest.accent;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillRect((6+c*2)*s, (7+r*1.5)*s, 1*s, 0.5*s);
        }
      }
    } else if (cid === 'iron_chest') {
      // Iron plate — shoulder pads, center rivets
      ctx.fillRect(5*s, 6*s, 6*s, 5*s);
      ctx.fillRect(4*s, 6*s, 1*s, 2*s);
      ctx.fillRect(11*s, 6*s, 1*s, 2*s);
      ctx.fillStyle = chest.accent;
      ctx.fillRect(7*s, 6*s, 2*s, 5*s); // center plate
      // Rivets
      ctx.fillStyle = '#555';
      ctx.fillRect(6*s, 7*s, 1*s, 1*s);
      ctx.fillRect(9*s, 7*s, 1*s, 1*s);
    } else if (cid === 'gladiator_chest') {
      // Gladiator — one shoulder pad, exposed arm, belt straps
      ctx.fillRect(5*s, 6*s, 6*s, 5*s);
      ctx.fillRect(4*s, 6*s, 2*s, 3*s); // big left shoulder
      ctx.fillStyle = chest.accent;
      ctx.fillRect(6*s, 8*s, 4*s, 1*s); // belt
      ctx.fillRect(5*s, 10*s, 6*s, 1*s); // lower belt
      ctx.fillStyle = '#333';
      ctx.fillRect(7.5*s, 8*s, 1*s, 1*s); // buckle
    } else if (cid === 'mithril_chest') {
      // Mithril — elegant scales, glowing trim
      ctx.fillRect(5*s, 6*s, 6*s, 5*s);
      ctx.fillRect(4*s, 6*s, 1*s, 2*s);
      ctx.fillRect(11*s, 6*s, 1*s, 2*s);
      ctx.fillStyle = chest.accent;
      // Scale pattern
      for (let r = 0; r < 4; r++) {
        ctx.fillRect((5.5 + (r%2)*1)*s, (6.5+r)*s, 4*s, 0.5*s);
      }
      ctx.fillStyle = '#e040fb';
      ctx.fillRect(7.5*s, 7*s, 1*s, 1*s); // gem
    } else if (cid === 'knight_chest') {
      // Knight — full plate, layered, emblem
      ctx.fillRect(4*s, 6*s, 8*s, 5*s);
      // Big shoulder plates
      ctx.fillRect(3*s, 5*s, 2*s, 3*s);
      ctx.fillRect(11*s, 5*s, 2*s, 3*s);
      ctx.fillStyle = chest.accent;
      ctx.fillRect(5*s, 6*s, 6*s, 2*s); // upper plate
      ctx.fillRect(6*s, 9*s, 4*s, 2*s); // lower plate
      // Emblem
      ctx.fillStyle = '#c62828';
      ctx.fillRect(7*s, 7*s, 2*s, 2*s);
    } else if (cid === 'ezanilla_chest') {
      // Эзанилла — glowing chainmail, magical aura
      ctx.fillRect(5*s, 6*s, 6*s, 5*s);
      ctx.fillRect(4*s, 6*s, 1*s, 2*s);
      ctx.fillRect(11*s, 6*s, 1*s, 2*s);
      ctx.fillStyle = chest.accent;
      // Shimmering mail links
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillRect((5.5+c*1.3)*s, (6.2+r)*s, 0.8*s, 0.5*s);
        }
      }
      // Magic glow dots
      ctx.fillStyle = '#fff';
      ctx.fillRect(6*s, 7*s, 0.5*s, 0.5*s);
      ctx.fillRect(9*s, 8*s, 0.5*s, 0.5*s);
      ctx.fillRect(7*s, 10*s, 0.5*s, 0.5*s);
    } else {
      ctx.fillRect(5*s, 6*s, 6*s, 5*s);
    }
  }

  // Leggings — unique per tier
  const legs = ARMOR[equippedArmor.legs];
  if (legs) {
    const lid = legs.id;
    ctx.fillStyle = legs.color;

    if (lid === 'leather_legs') {
      // Leather pants — simple
      ctx.fillRect(5*s, 12*s, 2*s, 4*s);
      ctx.fillRect(9*s, 12*s, 2*s, 4*s);
    } else if (lid === 'chain_legs') {
      // Chain leggings — mail dots
      ctx.fillRect(5*s, 12*s, 2*s, 4*s);
      ctx.fillRect(9*s, 12*s, 2*s, 4*s);
      ctx.fillStyle = legs.accent;
      ctx.fillRect(5*s, 13*s, 1*s, 0.5*s);
      ctx.fillRect(6*s, 14*s, 1*s, 0.5*s);
      ctx.fillRect(9*s, 13*s, 1*s, 0.5*s);
      ctx.fillRect(10*s, 14*s, 1*s, 0.5*s);
    } else if (lid === 'iron_legs') {
      // Iron greaves — knee guards
      ctx.fillRect(5*s, 12*s, 2*s, 4*s);
      ctx.fillRect(9*s, 12*s, 2*s, 4*s);
      ctx.fillStyle = legs.accent;
      ctx.fillRect(5*s, 12*s, 2*s, 1*s); // knee plate
      ctx.fillRect(9*s, 12*s, 2*s, 1*s);
    } else if (lid === 'gladiator_legs') {
      // Gladiator — strapped greaves, open sides
      ctx.fillRect(5*s, 12*s, 2*s, 4*s);
      ctx.fillRect(9*s, 12*s, 2*s, 4*s);
      ctx.fillStyle = legs.accent;
      ctx.fillRect(5*s, 12*s, 2*s, 0.5*s); // top strap
      ctx.fillRect(5*s, 14*s, 2*s, 0.5*s); // mid strap
      ctx.fillRect(9*s, 12*s, 2*s, 0.5*s);
      ctx.fillRect(9*s, 14*s, 2*s, 0.5*s);
    } else if (lid === 'mithril_legs') {
      // Mithril — elegant greaves with gem
      ctx.fillRect(5*s, 12*s, 2*s, 4*s);
      ctx.fillRect(9*s, 12*s, 2*s, 4*s);
      ctx.fillStyle = legs.accent;
      ctx.fillRect(5*s, 12*s, 2*s, 1*s);
      ctx.fillRect(9*s, 12*s, 2*s, 1*s);
      ctx.fillStyle = '#e040fb';
      ctx.fillRect(5.5*s, 12.5*s, 0.5*s, 0.5*s); // tiny gem
      ctx.fillRect(9.5*s, 12.5*s, 0.5*s, 0.5*s);
    } else if (lid === 'knight_legs') {
      // Knight — full plate legs, layered
      ctx.fillRect(4*s, 12*s, 3*s, 4*s);
      ctx.fillRect(9*s, 12*s, 3*s, 4*s);
      ctx.fillStyle = legs.accent;
      ctx.fillRect(4*s, 12*s, 3*s, 1*s); // knee plate
      ctx.fillRect(9*s, 12*s, 3*s, 1*s);
      ctx.fillRect(5*s, 14*s, 1*s, 1*s); // shin plate
      ctx.fillRect(10*s, 14*s, 1*s, 1*s);
    } else if (lid === 'iomerida_legs') {
      // Iomerida — divine greaves with emerald glow
      ctx.fillRect(4*s, 12*s, 3*s, 4*s);
      ctx.fillRect(9*s, 12*s, 3*s, 4*s);
      ctx.fillStyle = legs.accent;
      ctx.fillRect(4*s, 12*s, 3*s, 1*s);
      ctx.fillRect(9*s, 12*s, 3*s, 1*s);
      ctx.fillRect(5*s, 14*s, 1*s, 2*s);
      ctx.fillRect(10*s, 14*s, 1*s, 2*s);
      // Emerald gems
      ctx.fillStyle = '#fff';
      ctx.fillRect(5*s, 12.5*s, 0.5*s, 0.5*s);
      ctx.fillRect(10*s, 12.5*s, 0.5*s, 0.5*s);
      // Glow particles
      ctx.fillStyle = '#69f0ae';
      ctx.fillRect(3.5*s, 13*s, 0.5*s, 0.5*s);
      ctx.fillRect(12*s, 14*s, 0.5*s, 0.5*s);
    } else {
      ctx.fillRect(5*s, 12*s, 2*s, 4*s);
      ctx.fillRect(9*s, 12*s, 2*s, 4*s);
    }
  }

  // Shield (on left arm) — hidden with two-handed weapons
  const shield = ARMOR[equippedArmor.shield];
  if (shield && !equippedArmor._twoHanded) {
    ctx.fillStyle = shield.color;
    ctx.fillRect(1 * s, 7 * s, 4 * s, 6 * s);
    ctx.fillStyle = shield.accent;
    ctx.fillRect(2 * s, 8 * s, 2 * s, 4 * s);
    // Cross/emblem for iron+
    if (shield.def >= 3) {
      ctx.fillStyle = shield.color;
      ctx.fillRect(2.5 * s, 8 * s, 1 * s, 4 * s);
      ctx.fillRect(1.5 * s, 9.5 * s, 3 * s, 1 * s);
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
    case 'shield':
      // Shield shape
      ctx.fillRect(cx - 7, cy - 8, 14, 16);
      ctx.fillRect(cx - 5, cy + 6, 10, 4);
      ctx.fillStyle = a.accent;
      ctx.fillRect(cx - 5, cy - 6, 10, 10);
      // Cross emblem
      ctx.fillStyle = a.color;
      ctx.fillRect(cx - 1, cy - 5, 2, 8);
      ctx.fillRect(cx - 4, cy - 2, 8, 2);
      break;
  }
}
