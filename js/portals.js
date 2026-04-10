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

/**
 * Рисует pixel-art символ 8×8 в центре портала.
 * Координаты (x, y) — левый верхний угол 8×8 квадрата.
 * color — базовый цвет (обычно ringColor стиля).
 */
export function drawPortalSymbol(ctx, x, y, symbol, color) {
  // Осветлённый цвет для деталей (подмешиваем белый)
  const light = lightenColor(color, 0.4);
  ctx.fillStyle = color;

  switch (symbol) {
    case 'house': {
      // Крыша (треугольник) + корпус + дверь
      ctx.fillRect(x + 3, y + 1, 2, 1);      // верх крыши
      ctx.fillRect(x + 2, y + 2, 4, 1);
      ctx.fillRect(x + 1, y + 3, 6, 1);
      ctx.fillRect(x + 1, y + 4, 6, 4);      // корпус
      ctx.fillStyle = light;
      ctx.fillRect(x + 3, y + 6, 2, 2);      // дверь
      break;
    }
    case 'compass': {
      // 4 точки по сторонам света + центр
      ctx.fillRect(x + 3, y + 0, 2, 1);      // N
      ctx.fillRect(x + 3, y + 7, 2, 1);      // S
      ctx.fillRect(x + 0, y + 3, 1, 2);      // W
      ctx.fillRect(x + 7, y + 3, 1, 2);      // E
      ctx.fillStyle = light;
      ctx.fillRect(x + 3, y + 3, 2, 2);      // центр
      break;
    }
    case 'tree': {
      // Крона (треугольник) + ствол
      ctx.fillRect(x + 3, y + 0, 2, 1);
      ctx.fillRect(x + 2, y + 1, 4, 1);
      ctx.fillRect(x + 1, y + 2, 6, 1);
      ctx.fillRect(x + 0, y + 3, 8, 2);
      ctx.fillStyle = '#4e342e';             // ствол коричневый
      ctx.fillRect(x + 3, y + 5, 2, 3);
      break;
    }
    case 'cliffs': {
      // Три неровных зубца разной высоты
      ctx.fillRect(x + 0, y + 4, 2, 4);
      ctx.fillRect(x + 1, y + 3, 2, 5);
      ctx.fillRect(x + 3, y + 5, 2, 3);
      ctx.fillRect(x + 4, y + 2, 2, 6);
      ctx.fillRect(x + 5, y + 4, 2, 4);
      ctx.fillRect(x + 6, y + 1, 2, 7);
      break;
    }
    case 'stalactite': {
      // Сталактиты сверху + сталагмиты снизу
      ctx.fillRect(x + 1, y + 0, 1, 3);
      ctx.fillRect(x + 3, y + 0, 1, 2);
      ctx.fillRect(x + 5, y + 0, 1, 4);
      ctx.fillRect(x + 7, y + 0, 1, 2);
      ctx.fillRect(x + 0, y + 6, 1, 2);
      ctx.fillRect(x + 2, y + 5, 1, 3);
      ctx.fillRect(x + 4, y + 6, 1, 2);
      ctx.fillRect(x + 6, y + 4, 1, 4);
      break;
    }
    case 'tower': {
      // Прямоугольная башня с зубцами сверху
      ctx.fillRect(x + 1, y + 0, 1, 2);      // зубец лев
      ctx.fillRect(x + 3, y + 0, 2, 2);      // зубец центр
      ctx.fillRect(x + 6, y + 0, 1, 2);      // зубец прав
      ctx.fillRect(x + 1, y + 2, 6, 5);      // корпус
      ctx.fillStyle = light;
      ctx.fillRect(x + 3, y + 4, 2, 2);      // окно
      break;
    }
    case 'crown': {
      // Три зубца с кружками на вершинах
      ctx.fillRect(x + 0, y + 3, 1, 1);
      ctx.fillRect(x + 3, y + 2, 2, 1);
      ctx.fillRect(x + 7, y + 3, 1, 1);
      ctx.fillRect(x + 1, y + 4, 6, 3);      // обод
      ctx.fillRect(x + 0, y + 4, 1, 2);
      ctx.fillRect(x + 7, y + 4, 1, 2);
      ctx.fillRect(x + 3, y + 3, 2, 2);      // средний зубец
      break;
    }
    case 'skull': {
      // Овал черепа + два глаза
      ctx.fillRect(x + 2, y + 1, 4, 5);      // основная форма
      ctx.fillRect(x + 1, y + 2, 6, 3);
      ctx.fillRect(x + 3, y + 6, 2, 1);      // челюсть
      ctx.fillStyle = '#0a0a0a';             // глаза тёмные
      ctx.fillRect(x + 2, y + 3, 1, 1);
      ctx.fillRect(x + 5, y + 3, 1, 1);
      break;
    }
    case 'skull_stars': {
      // Череп (уменьшенный) + 2 звёздочки
      ctx.fillRect(x + 3, y + 2, 2, 4);
      ctx.fillRect(x + 2, y + 3, 4, 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(x + 3, y + 3, 1, 1);
      ctx.fillRect(x + 4, y + 3, 1, 1);
      ctx.fillStyle = light;
      ctx.fillRect(x + 0, y + 0, 1, 1);      // звёздочка лев-верх
      ctx.fillRect(x + 7, y + 1, 1, 1);
      ctx.fillRect(x + 1, y + 7, 1, 1);
      ctx.fillRect(x + 6, y + 6, 1, 1);
      break;
    }
    case 'flame': {
      // Волнистое пламя
      ctx.fillRect(x + 3, y + 0, 2, 1);
      ctx.fillRect(x + 2, y + 1, 4, 1);
      ctx.fillRect(x + 1, y + 2, 6, 2);
      ctx.fillRect(x + 2, y + 4, 4, 3);
      ctx.fillRect(x + 3, y + 7, 2, 1);
      ctx.fillStyle = light;
      ctx.fillRect(x + 3, y + 3, 2, 2);      // внутренний яркий
      break;
    }
    case 'swords': {
      // Два меча крест-накрест
      // Клинок 1 (лево-верх → право-низ)
      ctx.fillRect(x + 1, y + 1, 1, 1);
      ctx.fillRect(x + 2, y + 2, 1, 1);
      ctx.fillRect(x + 3, y + 3, 2, 2);      // перекрестие
      ctx.fillRect(x + 5, y + 5, 1, 1);
      ctx.fillRect(x + 6, y + 6, 1, 1);
      // Клинок 2 (право-верх → лево-низ)
      ctx.fillRect(x + 6, y + 1, 1, 1);
      ctx.fillRect(x + 5, y + 2, 1, 1);
      ctx.fillRect(x + 2, y + 5, 1, 1);
      ctx.fillRect(x + 1, y + 6, 1, 1);
      break;
    }
    case 'question':
    default: {
      // '?' знак
      ctx.fillRect(x + 2, y + 1, 4, 1);
      ctx.fillRect(x + 5, y + 2, 1, 2);
      ctx.fillRect(x + 3, y + 4, 2, 1);
      ctx.fillRect(x + 3, y + 6, 2, 1);      // точка внизу
      break;
    }
  }
}

/**
 * Подмешивает белый в цвет для осветления.
 * Принимает hex '#rrggbb', возвращает hex.
 */
function lightenColor(hex, amount) {
  const h = hex.replace('#', '');
  let r = parseInt(h.slice(0, 2), 16);
  let g = parseInt(h.slice(2, 4), 16);
  let b = parseInt(h.slice(4, 6), 16);
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
