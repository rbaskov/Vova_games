// ============================================================
// portals.js — Типизированные порталы (цвет/символ/подпись)
// ============================================================
// Source-of-truth для визуала 11 типов порталов. Используется:
//   - sprites.drawPortalTile — читает ringColor и symbol из PORTAL_STYLES
//   - tilemap.renderMap / renderOpenWorld — runtime-рендер порталов поверх
//     кешированного tile-уровня
//   - rendering.renderPlay — подпись при приближении через getNearbyPortal
//
// Типы порталов соответствуют полю `target` в map.portals[] static maps +
// двум виртуальным типам для open-world:
//   - village (возврат в деревню) — target из kingdom/forest/cave/...
//   - openworld — target из village
//   - dungeon_ow — не существует в данных, назначается в open-world
//     рендере порталам на чанках ≠ (0,0)
//
// Fallback: неизвестный target → фиолетовые кольца + символ '?'.

export const PORTAL_STYLES = {
  village:    { ringColor: '#4fc3f7', symbol: 'house',       label: 'В деревню' },
  openworld:  { ringColor: '#81d4fa', symbol: 'compass',     label: 'Открытый мир' },
  forest:     { ringColor: '#4caf50', symbol: 'tree',        label: 'Лес' },
  canyon:     { ringColor: '#a1887f', symbol: 'cliffs',      label: 'Ущелье' },
  cave:       { ringColor: '#5d4037', symbol: 'stalactite',  label: 'Пещера' },
  castle:     { ringColor: '#8e24aa', symbol: 'tower',       label: 'Замок' },
  kingdom:    { ringColor: '#ffc107', symbol: 'crown',       label: 'Королевство' },
  dungeon:    { ringColor: '#546e7a', symbol: 'skull',       label: 'Подземелье' },
  dungeon_ow: { ringColor: '#455a64', symbol: 'skull_stars', label: 'Глубины' },
  hellpit:    { ringColor: '#e53935', symbol: 'flame',       label: 'Адская яма' },
  arena:      { ringColor: '#ff9800', symbol: 'swords',      label: 'Арена' },
};

const FALLBACK_STYLE = { ringColor: '#a050e0', symbol: 'question', label: '???' };

/**
 * Возвращает стиль портала по target. Неизвестные target дают FALLBACK_STYLE
 * (фиолетовый портал с символом '?') — явный визуальный сигнал багa.
 */
export function getPortalStyle(target) {
  return PORTAL_STYLES[target] || FALLBACK_STYLE;
}

/**
 * Ищет ближайший портал к позиции игрока в пределах radiusTiles тайлов.
 * Используется renderPlay для определения, показывать ли подпись.
 *
 * @param {Array} portals — массив портал-объектов вида {col, row, target, ...}
 * @param {number} playerX — пиксельная X координата игрока
 * @param {number} playerY — пиксельная Y координата игрока
 * @param {number} radiusTiles — радиус поиска в тайлах (default 2)
 * @param {number} tileSize — размер тайла в пикселях (default 32)
 * @returns {Object|null} — {portal, dist} или null если нет порталов в радиусе
 */
export function getNearbyPortal(portals, playerX, playerY, radiusTiles = 2, tileSize = 32) {
  if (!portals || portals.length === 0) return null;
  // Центр игрока в пиксельных координатах с учётом hitbox (стандартный 24x28)
  const pcx = playerX + 12;
  const pcy = playerY + 14;
  const maxDistPx = radiusTiles * tileSize;
  let best = null;
  let bestDist = Infinity;
  for (const p of portals) {
    // Центр портального тайла
    const tx = p.col * tileSize + tileSize / 2;
    const ty = p.row * tileSize + tileSize / 2;
    const dx = pcx - tx;
    const dy = pcy - ty;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= maxDistPx && dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return best ? { portal: best, dist: bestDist } : null;
}

// drawPortalSymbol определяется в Task 2 — здесь placeholder, чтобы импорты
// не падали при dev-итерациях.
export function drawPortalSymbol(ctx, x, y, symbol, color) {
  // Будет реализовано в Task 2. Пока рисуем заглушку — красный квадрат,
  // чтобы визуально было видно, что функция вызвана, но не реализована.
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(x, y, 8, 8);
}
