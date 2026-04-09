// ============================================================
// quests.js — Mini Quest System
// ============================================================

export const QUESTS = {
  // === Village quests ===
  slay_slimes: {
    id: 'slay_slimes',
    name: 'Охота на слаймов',
    desc: 'Убей 5 слаймов в лесу',
    giver: 'blacksmith',
    type: 'kill',
    target: 'slime',
    targetCount: 5,
    reward: { coins: 30, xp: 50 },
    rewardText: '30$ и 50 XP',
  },
  wolf_hunt: {
    id: 'wolf_hunt',
    name: 'Волчья угроза',
    desc: 'Убей 3 волков',
    giver: 'elder',
    type: 'kill',
    target: 'wolf',
    targetCount: 3,
    reward: { coins: 40, xp: 60 },
    rewardText: '40$ и 60 XP',
  },
  skeleton_purge: {
    id: 'skeleton_purge',
    name: 'Костяная чума',
    desc: 'Уничтожь 6 скелетов',
    giver: 'knight1',
    type: 'kill',
    target: 'skeleton',
    targetCount: 6,
    reward: { coins: 60, xp: 100 },
    rewardText: '60$ и 100 XP',
  },
  golem_breaker: {
    id: 'golem_breaker',
    name: 'Крушитель големов',
    desc: 'Уничтожь 3 голема',
    giver: 'knight3',
    type: 'kill',
    target: 'golem',
    targetCount: 3,
    reward: { coins: 80, xp: 120 },
    rewardText: '80$ и 120 XP',
  },
  // === Boss quests ===
  forest_boss: {
    id: 'forest_boss',
    name: 'Страж леса',
    desc: 'Победи Лесного стража',
    giver: 'elder',
    type: 'boss',
    target: 'forest_guardian',
    targetCount: 1,
    reward: { coins: 50, xp: 100, potions: 3 },
    rewardText: '50$, 100 XP и 3 зелья',
  },
  dragon_slayer: {
    id: 'dragon_slayer',
    name: 'Драконоборец',
    desc: 'Победи Огненного дракона',
    giver: 'knight2',
    type: 'boss',
    target: 'fire_dragon',
    targetCount: 1,
    reward: { coins: 80, xp: 150, potions: 5 },
    rewardText: '80$, 150 XP и 5 зелий',
  },
  lich_hunter: {
    id: 'lich_hunter',
    name: 'Охотник на лича',
    desc: 'Победи Ледяного лича',
    giver: 'king',
    type: 'boss',
    target: 'ice_lich',
    targetCount: 1,
    reward: { coins: 100, xp: 200, potions: 5 },
    rewardText: '100$, 200 XP и 5 зелий',
  },
  // === Exploration quests ===
  visit_canyon: {
    id: 'visit_canyon',
    name: 'Огненный путь',
    desc: 'Доберись до Огненного ущелья',
    giver: 'blacksmith',
    type: 'visit_map',
    target: 'canyon',
    targetCount: 1,
    reward: { coins: 25, xp: 40 },
    rewardText: '25$ и 40 XP',
  },
  visit_cave: {
    id: 'visit_cave',
    name: 'В ледяную глубь',
    desc: 'Доберись до Ледяной пещеры',
    giver: 'knight4',
    type: 'visit_map',
    target: 'cave',
    targetCount: 1,
    reward: { coins: 35, xp: 60 },
    rewardText: '35$ и 60 XP',
  },
  reach_castle: {
    id: 'reach_castle',
    name: 'К замку тьмы',
    desc: 'Доберись до Замка Тёмного мага',
    giver: 'king',
    type: 'visit_map',
    target: 'castle',
    targetCount: 1,
    reward: { coins: 50, xp: 80 },
    rewardText: '50$ и 80 XP',
  },
};

// Quest states: 'available' -> 'active' -> 'completed' -> 'rewarded'

export function initQuestState() {
  return {};
  // Each quest: { status: 'available'|'active'|'completed'|'rewarded', progress: 0 }
}

export function getQuestState(player, questId) {
  if (!player.quests) player.quests = {};
  return player.quests[questId] || { status: 'available', progress: 0 };
}

export function acceptQuest(player, questId) {
  if (!player.quests) player.quests = {};
  player.quests[questId] = { status: 'active', progress: 0 };
}

export function updateKillProgress(player, enemyType) {
  if (!player.quests) return [];
  const completed = [];
  for (const [qid, state] of Object.entries(player.quests)) {
    if (state.status !== 'active') continue;
    const quest = QUESTS[qid];
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

export function updateBossProgress(player, bossType) {
  if (!player.quests) return [];
  const completed = [];
  for (const [qid, state] of Object.entries(player.quests)) {
    if (state.status !== 'active') continue;
    const quest = QUESTS[qid];
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

export function updateVisitProgress(player, mapName) {
  if (!player.quests) return [];
  const completed = [];
  for (const [qid, state] of Object.entries(player.quests)) {
    if (state.status !== 'active') continue;
    const quest = QUESTS[qid];
    if (!quest) continue;
    if (quest.type === 'visit_map' && quest.target === mapName) {
      state.progress = 1;
      state.status = 'completed';
      completed.push(quest);
    }
  }
  return completed;
}

export function claimReward(player, questId) {
  const quest = QUESTS[questId];
  if (!quest) return false;
  const state = getQuestState(player, questId);
  if (state.status !== 'completed') return false;

  if (quest.reward.coins) player.coins += quest.reward.coins;
  if (quest.reward.xp) player.xp += quest.reward.xp;
  if (quest.reward.potions) player.potions += quest.reward.potions;

  state.status = 'rewarded';
  return true;
}

export function getActiveQuests(player) {
  if (!player.quests) return [];
  return Object.entries(player.quests)
    .filter(([_, s]) => s.status === 'active')
    .map(([id, s]) => ({ ...QUESTS[id], ...s }))
    .filter(q => q.name);
}

export function getCompletedQuests(player) {
  if (!player.quests) return [];
  return Object.entries(player.quests)
    .filter(([_, s]) => s.status === 'completed')
    .map(([id, s]) => ({ ...QUESTS[id], questId: id }))
    .filter(q => q.name);
}

// Get quests available from a specific NPC
export function getNpcQuests(player, npcId) {
  const available = [];
  const completedReady = [];

  for (const [qid, quest] of Object.entries(QUESTS)) {
    if (quest.giver !== npcId) continue;
    const state = getQuestState(player, qid);
    if (state.status === 'available') {
      available.push({ ...quest, questId: qid });
    } else if (state.status === 'completed') {
      completedReady.push({ ...quest, questId: qid });
    }
  }

  return { available, completedReady };
}

// Render quest tracker (active quests in corner of screen)
export function renderQuestTracker(ctx, player, width) {
  const active = getActiveQuests(player);
  if (active.length === 0) return;

  const trackerX = width - 200;
  const trackerY = 40;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(trackerX, trackerY, 192, 12 + active.length * 18);

  ctx.font = '6px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('КВЕСТЫ', trackerX + 4, trackerY + 10);

  for (let i = 0; i < Math.min(active.length, 4); i++) {
    const q = active[i];
    const y = trackerY + 22 + i * 18;
    ctx.fillStyle = '#ccc';
    ctx.fillText(q.name, trackerX + 4, y);
    ctx.fillStyle = '#888';
    ctx.fillText(`${q.progress}/${q.targetCount}`, trackerX + 4, y + 10);
  }
}

// Render quest log screen (opened with J key)
export function renderQuestLog(ctx, player, width, height) {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, width, height);

  const px = 50, py = 30;
  const pw = width - 100, ph = height - 60;

  ctx.fillStyle = '#111';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);

  ctx.fillStyle = '#ffd54f';
  ctx.font = '12px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('ЖУРНАЛ КВЕСТОВ', width / 2, py + 24);

  ctx.textAlign = 'left';
  ctx.font = '7px "Press Start 2P"';
  let y = py + 50;

  // Active quests
  const active = getActiveQuests(player);
  if (active.length > 0) {
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText('АКТИВНЫЕ:', px + 16, y);
    y += 16;
    for (const q of active) {
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(q.name, px + 20, y);
      ctx.fillStyle = '#888';
      ctx.fillText(`${q.desc}  [${q.progress}/${q.targetCount}]`, px + 20, y + 12);
      y += 28;
    }
  }

  // Completed (ready to claim)
  const completed = getCompletedQuests(player);
  if (completed.length > 0) {
    y += 8;
    ctx.fillStyle = '#4caf50';
    ctx.fillText('ВЫПОЛНЕНЫ (вернись к NPC):', px + 16, y);
    y += 16;
    for (const q of completed) {
      ctx.fillStyle = '#4caf50';
      ctx.fillText(`✓ ${q.name}`, px + 20, y);
      ctx.fillStyle = '#888';
      ctx.fillText(`Награда: ${q.rewardText}`, px + 20, y + 12);
      y += 28;
    }
  }

  if (active.length === 0 && completed.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('Нет активных квестов', px + 16, y);
    ctx.fillText('Поговори с NPC чтобы получить задания', px + 16, y + 16);
  }

  // Footer
  ctx.fillStyle = '#555';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('J — закрыть', width / 2, py + ph - 10);
}
