// ============================================================
// questgen.js — Procedural Quest Generation
// ============================================================

// --- Quest Templates ---
const ADJECTIVES = ['Опасная', 'Срочная', 'Тайная', 'Кровавая', 'Дерзкая', 'Отчаянная', 'Суровая', 'Лютая'];
const NOUNS = ['охота', 'вылазка', 'миссия', 'зачистка', 'разведка', 'операция'];

const ENEMY_POOLS = {
  low:  [
    { type: 'slime', name: 'слаймов', maps: ['forest'] },
    { type: 'wolf', name: 'волков', maps: ['forest'] },
  ],
  mid:  [
    { type: 'skeleton', name: 'скелетов', maps: ['canyon', 'cave'] },
    { type: 'bandit_sword', name: 'бандитов-мечников', maps: ['forest', 'canyon'] },
    { type: 'bandit_spear', name: 'бандитов-копейщиков', maps: ['canyon', 'cave'] },
    { type: 'bandit_archer', name: 'бандитов-лучников', maps: ['canyon', 'castle'] },
    { type: 'bandit_axe', name: 'бандитов-топорщиков', maps: ['cave', 'castle'] },
  ],
  high: [
    { type: 'golem', name: 'големов', maps: ['cave', 'castle'] },
    { type: 'knight_guard', name: 'рыцарских стражей', maps: ['castle'] },
  ],
};

const MAP_NAMES = {
  forest: 'Тёмном лесу',
  canyon: 'Огненном ущелье',
  cave: 'Ледяной пещере',
  castle: 'Замке Тёмного мага',
  hellpit: 'Адской яме',
};

const BOSS_POOL = [
  { type: 'forest_guardian', name: 'Лесного стража' },
  { type: 'fire_dragon', name: 'Огненного дракона' },
  { type: 'ice_lich', name: 'Ледяного лича' },
];

const DELIVERY_TARGETS = [
  { from: 'elder', fromName: 'Старейшины', to: 'king', toName: 'Королю', toMap: 'kingdom' },
  { from: 'king', fromName: 'Короля', to: 'elder', toName: 'Старейшине', toMap: 'village' },
  { from: 'blacksmith', fromName: 'Кузнеца', to: 'royal_armorer', toName: 'Оружейнику', toMap: 'kingdom' },
];

// --- Scaling by level ---
function getScaling(level) {
  if (level <= 3) return { tier: 'low', countMin: 3, countMax: 5, arenaRounds: 5, coinsMin: 20, coinsMax: 50, xpMin: 15, xpMax: 30 };
  if (level <= 6) return { tier: 'mid', countMin: 5, countMax: 10, arenaRounds: 10, coinsMin: 50, coinsMax: 150, xpMin: 30, xpMax: 80 };
  return { tier: 'high', countMin: 8, countMax: 15, arenaRounds: 20, coinsMin: 150, coinsMax: 500, xpMin: 80, xpMax: 200 };
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName() {
  return pick(ADJECTIVES) + ' ' + pick(NOUNS);
}

// --- Generate a single quest ---
function generateHuntQuest(level) {
  const s = getScaling(level);
  const pool = ENEMY_POOLS[s.tier];
  const enemy = pick(pool);
  const count = randInt(s.countMin, s.countMax);
  const map = pick(enemy.maps);
  const coins = randInt(s.coinsMin, s.coinsMax);
  const xp = randInt(s.xpMin, s.xpMax);

  return {
    id: '_gen_hunt_' + Date.now() + Math.random().toString(36).slice(2, 6),
    name: generateName(),
    desc: `Убей ${count} ${enemy.name} в ${MAP_NAMES[map] || map}`,
    giver: null, // set by caller
    type: 'kill',
    target: enemy.type,
    targetCount: count,
    reward: { coins, xp },
    rewardText: `${coins}$ и ${xp} XP`,
    generated: true,
  };
}

function generateClearQuest(level) {
  const s = getScaling(level);
  const maps = s.tier === 'low' ? ['forest'] : s.tier === 'mid' ? ['canyon', 'cave'] : ['castle'];
  const map = pick(maps);
  const coins = randInt(s.coinsMin + 30, s.coinsMax + 50);
  const xp = randInt(s.xpMin + 20, s.xpMax + 30);

  return {
    id: '_gen_clear_' + Date.now() + Math.random().toString(36).slice(2, 6),
    name: generateName(),
    desc: `Зачисти всех врагов в ${MAP_NAMES[map] || map}`,
    giver: null,
    type: 'clear_map',
    target: map,
    targetCount: 1,
    reward: { coins, xp },
    rewardText: `${coins}$ и ${xp} XP`,
    generated: true,
  };
}

function generateArenaQuest(level) {
  const s = getScaling(level);
  const rounds = s.arenaRounds;
  const coins = randInt(s.coinsMin + 50, s.coinsMax + 100);
  const xp = randInt(s.xpMin + 30, s.xpMax + 50);

  return {
    id: '_gen_arena_' + Date.now() + Math.random().toString(36).slice(2, 6),
    name: generateName(),
    desc: `Продержись ${rounds} раундов на арене`,
    giver: null,
    type: 'arena',
    target: 'arena',
    targetCount: rounds,
    reward: { coins, xp },
    rewardText: `${coins}$ и ${xp} XP`,
    generated: true,
  };
}

function generateDeliveryQuest(level) {
  const s = getScaling(level);
  const d = pick(DELIVERY_TARGETS);
  const coins = randInt(s.coinsMin, s.coinsMax);
  const xp = randInt(s.xpMin, s.xpMax);

  return {
    id: '_gen_delivery_' + Date.now() + Math.random().toString(36).slice(2, 6),
    name: generateName(),
    desc: `Отнеси послание от ${d.fromName} к ${d.toName}`,
    giver: null,
    type: 'visit_map',
    target: d.toMap,
    targetCount: 1,
    reward: { coins, xp },
    rewardText: `${coins}$ и ${xp} XP`,
    generated: true,
  };
}

function generateBossRematchQuest(level, defeatedBosses) {
  const available = BOSS_POOL.filter(b => defeatedBosses.includes(b.type));
  if (available.length === 0) return null;

  const boss = pick(available);
  const s = getScaling(level);
  const coins = randInt(s.coinsMax, s.coinsMax + 200);
  const xp = randInt(s.xpMax, s.xpMax + 100);

  return {
    id: '_gen_boss_' + Date.now() + Math.random().toString(36).slice(2, 6),
    name: generateName(),
    desc: `Победи ${boss.name} снова`,
    giver: null,
    type: 'boss',
    target: boss.type,
    targetCount: 1,
    reward: { coins, xp, potions: 3 },
    rewardText: `${coins}$, ${xp} XP и 3 зелья`,
    generated: true,
    bossRematch: true,
  };
}

// --- Quest type weights by NPC ---
const NPC_QUEST_TYPES = {
  elder:         ['hunt', 'hunt', 'delivery', 'clear'],
  king:          ['clear', 'boss_rematch', 'delivery', 'hunt'],
  dungeon_guard: ['arena', 'arena', 'clear', 'hunt'],
};

// --- Public API ---

// Generate a random quest for an NPC
export function generateQuest(npcId, playerLevel, defeatedBosses) {
  const types = NPC_QUEST_TYPES[npcId] || ['hunt', 'clear', 'arena'];
  const type = pick(types);

  let quest = null;

  switch (type) {
    case 'hunt':
      quest = generateHuntQuest(playerLevel);
      break;
    case 'clear':
      quest = generateClearQuest(playerLevel);
      break;
    case 'arena':
      quest = generateArenaQuest(playerLevel);
      break;
    case 'delivery':
      quest = generateDeliveryQuest(playerLevel);
      break;
    case 'boss_rematch':
      quest = generateBossRematchQuest(playerLevel, defeatedBosses || []);
      if (!quest) quest = generateHuntQuest(playerLevel); // fallback
      break;
    default:
      quest = generateHuntQuest(playerLevel);
  }

  if (quest) quest.giver = npcId;
  return quest;
}

// Check if player has an active generated quest from this NPC
export function hasActiveGenQuest(player, npcId) {
  if (!player.quests) return false;
  for (const [qid, state] of Object.entries(player.quests)) {
    if (!qid.startsWith('_gen_')) continue;
    if (state.status === 'active' || state.status === 'completed') {
      if (state._giver === npcId) return true;
    }
  }
  return false;
}

// Check if a generated quest is completed and ready to claim
export function getCompletedGenQuest(player, npcId) {
  if (!player.quests) return null;
  for (const [qid, state] of Object.entries(player.quests)) {
    if (!qid.startsWith('_gen_')) continue;
    if (state.status === 'completed' && state._giver === npcId) {
      return { questId: qid, ...state._questData };
    }
  }
  return null;
}

// Accept a generated quest
export function acceptGenQuest(player, quest) {
  if (!player.quests) player.quests = {};
  player.quests[quest.id] = {
    status: 'active',
    progress: 0,
    _giver: quest.giver,
    _questData: quest,
  };
}

// Claim reward for generated quest
export function claimGenReward(player, questId) {
  const state = player.quests[questId];
  if (!state || state.status !== 'completed') return false;
  const quest = state._questData;
  if (!quest) return false;

  if (quest.reward.coins) player.coins += quest.reward.coins;
  if (quest.reward.xp) player.xp += quest.reward.xp;
  if (quest.reward.potions) player.potions += quest.reward.potions;

  // Remove completed generated quest (make room for new one)
  delete player.quests[questId];
  return true;
}

// Update generated quest progress for kill type
export function updateGenKillProgress(player, enemyType) {
  if (!player.quests) return [];
  const completed = [];
  for (const [qid, state] of Object.entries(player.quests)) {
    if (!qid.startsWith('_gen_')) continue;
    if (state.status !== 'active') continue;
    const quest = state._questData;
    if (!quest) continue;
    if (quest.type === 'kill' && quest.target === enemyType) {
      state.progress++;
      if (state.progress >= quest.targetCount) {
        state.status = 'completed';
        completed.push(quest);
      }
    }
  }
  return completed;
}

// Update generated quest progress for boss type
export function updateGenBossProgress(player, bossType) {
  if (!player.quests) return [];
  const completed = [];
  for (const [qid, state] of Object.entries(player.quests)) {
    if (!qid.startsWith('_gen_')) continue;
    if (state.status !== 'active') continue;
    const quest = state._questData;
    if (!quest) continue;
    if (quest.type === 'boss' && quest.target === bossType) {
      state.progress++;
      if (state.progress >= quest.targetCount) {
        state.status = 'completed';
        completed.push(quest);
      }
    }
  }
  return completed;
}

// Update generated quest progress for visit_map type
export function updateGenVisitProgress(player, mapName) {
  if (!player.quests) return [];
  const completed = [];
  for (const [qid, state] of Object.entries(player.quests)) {
    if (!qid.startsWith('_gen_')) continue;
    if (state.status !== 'active') continue;
    const quest = state._questData;
    if (!quest) continue;
    if (quest.type === 'visit_map' && quest.target === mapName) {
      state.progress = 1;
      state.status = 'completed';
      completed.push(quest);
    }
  }
  return completed;
}

// Update arena round progress
export function updateGenArenaProgress(player, currentRound) {
  if (!player.quests) return [];
  const completed = [];
  for (const [qid, state] of Object.entries(player.quests)) {
    if (!qid.startsWith('_gen_')) continue;
    if (state.status !== 'active') continue;
    const quest = state._questData;
    if (!quest || quest.type !== 'arena') continue;
    state.progress = currentRound;
    if (state.progress >= quest.targetCount) {
      state.status = 'completed';
      completed.push(quest);
    }
  }
  return completed;
}

// Get active generated quests for display
export function getActiveGenQuests(player) {
  if (!player.quests) return [];
  const result = [];
  for (const [qid, state] of Object.entries(player.quests)) {
    if (!qid.startsWith('_gen_')) continue;
    if (state.status === 'active' || state.status === 'completed') {
      const q = state._questData;
      if (q) result.push({ ...q, progress: state.progress, status: state.status });
    }
  }
  return result;
}
