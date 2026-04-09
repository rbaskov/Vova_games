const SAVE_KEY = 'eldoria_save';

export function saveGame(player, currentMapName) {
  const data = {
    hp: player.hp, maxHp: player.maxHp, atk: player.atk,
    xp: player.xp, level: player.level, coins: player.coins,
    potions: player.potions, artifacts: { ...player.artifacts },
    defeatedBosses: [...(player.defeatedBosses || [])],
    currentMap: currentMapName,
  };
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
