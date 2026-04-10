const SAVE_KEY = 'eldoria_save';

export function saveGame(player, currentMapName, openWorldState) {
  const data = {
    hp: player.hp, maxHp: player.maxHp, atk: player.atk,
    xp: player.xp, level: player.level, coins: player.coins,
    potions: player.potions, artifacts: { ...player.artifacts },
    defeatedBosses: [...(player.defeatedBosses || [])],
    weapon: player.weapon || 'iron_sword',
    ownedWeapons: [...(player.ownedWeapons || ['iron_sword'])],
    equippedArmor: { ...(player.equippedArmor || { helmet: null, chest: null, legs: null }) },
    ownedArmor: [...(player.ownedArmor || [])],
    quests: player.quests ? JSON.parse(JSON.stringify(player.quests)) : {},
    companions: player._companions || [],
    playerClass: player._playerClass || null,
    hasHorse: player._hasHorse || false,
    currentMap: currentMapName,
  };

  if (openWorldState) {
    data.openWorld = {
      seed: openWorldState.seed,
      playerX: openWorldState.playerX,
      playerY: openWorldState.playerY,
      changes: openWorldState.changes,
      kills: openWorldState.kills,
      openedChests: openWorldState.openedChests,
      pickedBuffStones: openWorldState.pickedBuffStones,
      difficulty: openWorldState.difficulty,
      visitedChunks: openWorldState.visitedChunks,
    };
  }

  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}
