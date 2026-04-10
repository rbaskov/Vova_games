# Типизированные порталы с подписями — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Каждый портал в игре получает уникальный цвет, pixel-art символ и подпись при приближении — чтобы Вова (11-14 лет) мог различать 6+ порталов в деревне и знать, куда ведёт каждый.

**Architecture:** Новый модуль `js/portals.js` хранит `PORTAL_STYLES` (11 типов), `drawPortalSymbol` с pixel-art для 11 символов 8×8 и `getNearbyPortal` helper. Ключевое архитектурное решение — **выделение порталов в runtime-слой поверх кешированного tile-рендера**: `tileDrawers[TILE.PORTAL]` становится no-op, а `drawPortalTile` вызывается каждый кадр из `renderMap`/`renderOpenWorld`. Это заодно восстанавливает утраченную анимацию пульсации (сейчас порталы в static maps статичны из-за одноразового `cacheMap`). Подпись рисуется как полупрозрачная плашка над ближайшим порталом — в стиле существующих `[E] Говорить` над NPC.

**Tech Stack:** Vanilla JS (ES6 modules), HTML5 Canvas 2D, zero npm dependencies. Проект не имеет автоматизированного test runner'а — валидация через `node --check`, статический анализ импортов grep'ом и ручной smoke-test через локальный `python3 -m http.server`.

**Связанная спека:** `docs/superpowers/specs/2026-04-10-portals-redesign.md`

---

## File Structure

| Файл | Роль |
|---|---|
| `js/portals.js` | **Новый.** Source-of-truth типов порталов. Экспортирует `PORTAL_STYLES`, `getPortalStyle(target)`, `getNearbyPortal(portals, px, py, radius)`, `drawPortalSymbol(ctx, x, y, symbol, color)` |
| `js/sprites.js` | `drawPortalTile(ctx, x, y, frame, target)` расширяется: принимает `target`, рисует grass-базу + кольца цвета из PORTAL_STYLES + символ. `tileDrawers[TILE.PORTAL]` становится no-op |
| `js/tilemap.js` | `renderMap` после blit'а cached canvas'а рисует порталы поверх с `animFrame`. `renderOpenWorld` аналогично, сканируя `chunk.tiles` |
| `js/chunks.js` | `getLoadedChunks()` расширяется — возвращает `tiles` в объекте чанка (нужно для scan'а порталов в runtime) |
| `js/rendering.js` | `renderPlay` после рендера player'а вызывает `getNearbyPortal(...)` и рисует плашку подписи над найденным порталом |
| `index.html` | Bump cache-bust `?v=29 → ?v=30` |

**Не меняются:**
- `js/map-loading.js` — логика `checkPortals` и телепортации сохраняется (мы только меняем рендер)
- `js/maps/*.js` — данные карт не трогаем, только читаем `portals[]`
- `js/minimap.js`, `js/fasttravel.js` — у них свои иконочные системы
- `js/structures.js` — данные структур не меняются

---

## Existing Codebase Context

**Что нужно знать перед стартом:**

1. **Кеширование карты** (`js/tilemap.js:43-76`): `cacheMap` рисует все тайлы в offscreen canvas один раз при первом рендере, потом `renderMap` просто blit'ит видимую часть. Это значит, что любая попытка анимировать тайл через `frame` параметр молча не сработает.

2. **Кеширование чанков** (`js/chunks.js:66-86`): тот же паттерн для open world — каждый чанк рендерится в свой canvas при `getChunkCanvas`. 9 чанков (3×3) одновременно загружены.

3. **Порталы в data**: все static maps имеют массив `portals: [{col, row, target, spawnX, spawnY}, ...]`. Формат стабилен, его можно читать напрямую:
   - `js/maps/village.js:61-68` — 6 порталов
   - `js/maps/forest.js:60-61` — 2 портала (village, canyon)
   - `js/maps/canyon.js:60-61` — 2 портала (forest, cave)
   - `js/maps/cave.js:60-61` — 2 портала (canyon, castle)
   - `js/maps/castle.js:60` — 1 портал (cave)
   - `js/maps/kingdom.js:72` — 1 портал (village)
   - `js/maps/hellpit.js:61` — 1 портал (village)
   - `js/maps/arena.js:60` — 1 портал (village)
   - `js/dungeon.js` — процедурный, использует `TILE.PORTAL` (нужно будет проверить)

4. **Open-world порталы** (`js/map-loading.js:621-678`): на чанке (0,0) тайл `TILE.PORTAL` = возврат в деревню. На других чанках = проц. данж. В данных это просто тайл, без явного target'а — target вычисляется в момент рендера по `chunk.cx/cy`.

5. **`TILE.PORTAL = 5`** (`js/sprites.js:17`). Единственный тайл для всех порталов.

6. **`drawPortalTile`** (`js/sprites.js:162-190`) — сейчас рисует фиолетовые кольца с фиксированным `frame=0`. Параметр `frame` есть, но не используется на практике (потому что кеш).

7. **`tileDrawers`** (`js/sprites.js:500`) — lookup table `tile-id → draw function (ctx, x, y)`. Функция не знает контекст карты.

8. **Render order в `renderPlay`** (`js/rendering.js:925-1086`):
   ```
   map (cached tiles) → NPCs → chests → buff stones → enemies → boss →
   companions → projectiles → player → particles → UI overlays
   ```
   Порталы должны рисоваться сразу после map (до сущностей, чтобы не перекрывать игрока), подпись — в конце (над всем).

9. **Паттерн `[E] Говорить`** (`js/game-loop.js:1210-1215`):
   ```js
   const nearNPC = getNearbyNPC(game.npcs, game.player.x, game.player.y);
   if (nearNPC) {
     ctx.font = '8px "Press Start 2P"';
     ctx.textAlign = 'center';
     ctx.fillStyle = '#ffd54f';
     ctx.fillText('[E] Говорить', 320, 460);
     ctx.textAlign = 'left';
   }
   ```
   Используется как эталон для нашей плашки подписи портала — но плашка рисуется над порталом, а не в footer'е экрана.

---

## Task 1: Модуль `js/portals.js` — данные и helpers

**Files:**
- Create: `js/portals.js`

- [ ] **Step 1.1: Создать файл `js/portals.js` с PORTAL_STYLES и helper'ами (без drawPortalSymbol — он в Task 2)**

```js
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
```

- [ ] **Step 1.2: Проверить синтаксис**

Run: `node --check js/portals.js`
Expected: (нет вывода, код 0)

- [ ] **Step 1.3: Проверить что helper'ы работают (inline-тест в Node)**

Run:
```bash
node -e "
import('./js/portals.js').then(m => {
  console.log('village:', JSON.stringify(m.getPortalStyle('village')));
  console.log('unknown:', JSON.stringify(m.getPortalStyle('foo_bar')));
  const nearby = m.getNearbyPortal(
    [{col: 14, row: 10, target: 'forest'}],
    14 * 32, 10 * 32
  );
  console.log('nearby:', JSON.stringify(nearby));
});
"
```
Expected:
```
village: {"ringColor":"#4fc3f7","symbol":"house","label":"В деревню"}
unknown: {"ringColor":"#a050e0","symbol":"question","label":"???"}
nearby: {"portal":{"col":14,"row":10,"target":"forest"},"dist":...}
```

- [ ] **Step 1.4: Коммит**

```bash
git add js/portals.js
git commit -m "feat(portals): add PORTAL_STYLES + getPortalStyle + getNearbyPortal helpers

Новый модуль js/portals.js — source-of-truth для 11 типов порталов.
PORTAL_STYLES содержит ringColor/symbol/label для каждого target.
getPortalStyle с fallback на фиолетовый + '?' для неизвестных.
getNearbyPortal — поиск ближайшего портала в пределах radius тайлов
(используется renderPlay для подписи при приближении).

drawPortalSymbol пока placeholder — реализация в Task 2.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Pixel-art символы для `drawPortalSymbol`

**Files:**
- Modify: `js/portals.js` — заменить placeholder `drawPortalSymbol` на switch по 12 символам (11 target-ов + fallback 'question')

**Дизайн каждого символа.** Все символы рисуются в квадрате 8×8 пикселей, начинающемся с координат `(x, y)`. Используется цвет `color` (обычно `ringColor` из стиля портала) и осветлённая версия для выделения. Каждый «пиксель» — `fillRect(x+n, y+m, 1, 1)`. Для простоты и производительности каждый символ хранится как inline-логика внутри `switch`.

- [ ] **Step 2.1: Заменить placeholder `drawPortalSymbol` на полную реализацию**

В `js/portals.js` заменить функцию `drawPortalSymbol` на:

```js
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
```

- [ ] **Step 2.2: Проверить синтаксис**

Run: `node --check js/portals.js`
Expected: (нет вывода)

- [ ] **Step 2.3: Коммит**

```bash
git add js/portals.js
git commit -m "feat(portals): pixel-art символы 8x8 для drawPortalSymbol

12 символов (11 типов + fallback 'question'): house, compass, tree,
cliffs, stalactite, tower, crown, skull, skull_stars, flame, swords.
Каждый — chunk fillRect'ов внутри switch. Используется ringColor
портала + осветлённая версия для деталей (light).

lightenColor — внутренний helper для подмеса белого в hex.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Type-aware `drawPortalTile` + runtime-рендер в static maps

**Files:**
- Modify: `js/sprites.js:162-190` — расширить `drawPortalTile` + сделать `tileDrawers[TILE.PORTAL]` no-op
- Modify: `js/tilemap.js:61-76` — `renderMap` рисует порталы после blit'а

Эти два изменения должны быть в **одном коммите** — между ними игра будет без порталов визуально (tileDrawers выключен, но renderMap ещё не рисует). Атомарность важна.

- [ ] **Step 3.1: Расширить `drawPortalTile` в `js/sprites.js`**

Текущий код (строки 162-190):
```js
export function drawPortalTile(ctx, x, y, frame = 0) {
  // Base dark purple
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(x, y, T, T);
  // Pulsing rings
  const pulse = frame % 4;
  const colors = ['#5a1a8e', '#7b2ebd', '#a050e0', '#c080ff'];
  // ... (кольца)
  // Center bright
  ctx.fillStyle = '#e0c0ff';
  ctx.fillRect(x + 14, y + 14, 4, 4);
}
```

Заменить полностью на:
```js
import { getPortalStyle, drawPortalSymbol } from './portals.js';

export function drawPortalTile(ctx, x, y, frame = 0, target = null) {
  // Base — grass tile as neutral floor (упрощение: везде grass).
  // Если в dungeon/cave под кольцами будет виден край травы — это
  // приемлемый trade-off, см. спеку. Альтернатива — baseTile по target.
  drawGrassTile(ctx, x, y);

  const style = getPortalStyle(target);
  const baseColor = style.ringColor;

  // Анимация пульсации: 4 оттенка, переключаются по frame % 4
  // Делаем градиент от тёмного к светлому: base → lighter → lightest → light
  const shades = makePulseShades(baseColor);
  const pulse = frame % 4;

  // Outer ring
  ctx.fillStyle = shades[pulse];
  ctx.fillRect(x + 4, y + 2, 24, 2);
  ctx.fillRect(x + 4, y + 28, 24, 2);
  ctx.fillRect(x + 2, y + 4, 2, 24);
  ctx.fillRect(x + 28, y + 4, 2, 24);

  // Middle ring
  ctx.fillStyle = shades[(pulse + 1) % 4];
  ctx.fillRect(x + 8, y + 6, 16, 2);
  ctx.fillRect(x + 8, y + 24, 16, 2);
  ctx.fillRect(x + 6, y + 8, 2, 16);
  ctx.fillRect(x + 24, y + 8, 2, 16);

  // Inner ring
  ctx.fillStyle = shades[(pulse + 2) % 4];
  ctx.fillRect(x + 12, y + 10, 8, 2);
  ctx.fillRect(x + 12, y + 20, 8, 2);
  ctx.fillRect(x + 10, y + 12, 2, 8);
  ctx.fillRect(x + 20, y + 12, 2, 8);

  // Symbol в центре — 8x8 квадрат с offset'ом (12, 12)
  drawPortalSymbol(ctx, x + 12, y + 12, style.symbol, baseColor);
}

/**
 * Создаёт палитру из 4 оттенков для пульсации кольца.
 * shades[0] = base, shades[3] = самый светлый.
 */
function makePulseShades(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (t) => {
    const nr = Math.min(255, Math.round(r + (255 - r) * t));
    const ng = Math.min(255, Math.round(g + (255 - g) * t));
    const nb = Math.min(255, Math.round(b + (255 - b) * t));
    return '#' + [nr, ng, nb].map(v => v.toString(16).padStart(2, '0')).join('');
  };
  return [mix(0), mix(0.2), mix(0.4), mix(0.6)];
}
```

**Важно**: импорт `getPortalStyle, drawPortalSymbol` из `./portals.js` добавить в начало `sprites.js`. Если там уже есть секция импортов — добавить туда, иначе создать. Посмотреть первые 10 строк:

```bash
head -10 js/sprites.js
```

- [ ] **Step 3.2: Сделать `tileDrawers[TILE.PORTAL]` no-op**

В `js/sprites.js` найти строку (примерно 500):
```js
[TILE.PORTAL]: (ctx, x, y) => drawPortalTile(ctx, x, y, 0),
```

Заменить на:
```js
// Портал теперь рисуется в runtime через renderMap/renderOpenWorld
// с type-specific цветом и анимацией. Здесь — no-op: место портала
// в кеше остаётся прозрачным, runtime-рендер поверх восстанавливает
// всю визуалку (grass фон + кольца + символ).
[TILE.PORTAL]: (ctx, x, y) => {},
```

- [ ] **Step 3.3: Модифицировать `renderMap` в `js/tilemap.js`**

Текущий код (строки 61-76):
```js
export function renderMap(ctx, map, camera, animFrame) {
  // Cache map on first render or map change
  if (cachedMapRef !== map) {
    cacheMap(map);
  }

  // Blit only the visible portion from cached canvas
  const sx = Math.floor(camera.x);
  const sy = Math.floor(camera.y);
  const sw = Math.min(camera.width, cachedCanvas.width - sx);
  const sh = Math.min(camera.height, cachedCanvas.height - sy);

  if (sw > 0 && sh > 0) {
    ctx.drawImage(cachedCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  }
}
```

Заменить на:
```js
export function renderMap(ctx, map, camera, animFrame) {
  // Cache map on first render or map change
  if (cachedMapRef !== map) {
    cacheMap(map);
  }

  // Blit only the visible portion from cached canvas
  const sx = Math.floor(camera.x);
  const sy = Math.floor(camera.y);
  const sw = Math.min(camera.width, cachedCanvas.width - sx);
  const sh = Math.min(camera.height, cachedCanvas.height - sy);

  if (sw > 0 && sh > 0) {
    ctx.drawImage(cachedCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  }

  // Runtime portal layer — рисуем поверх кешированной карты.
  // Здесь у нас есть animFrame (для пульсации) и target (для типизации).
  if (map.portals && map.portals.length > 0) {
    for (const p of map.portals) {
      const px = p.col * TILE_SIZE - camera.x;
      const py = p.row * TILE_SIZE - camera.y;
      // Skip если портал за пределами экрана
      if (px < -TILE_SIZE || px >= camera.width ||
          py < -TILE_SIZE || py >= camera.height) continue;
      drawPortalTile(ctx, px, py, animFrame, p.target);
    }
  }
}
```

**Важно**: добавить импорт `drawPortalTile` в начало `js/tilemap.js`:
```js
import { tileDrawers, SOLID_TILES, OPEN_WORLD_SOLID_TILES, drawPortalTile } from './sprites.js';
```

- [ ] **Step 3.4: Проверить синтаксис обоих файлов**

Run: `node --check js/sprites.js && node --check js/tilemap.js && echo OK`
Expected: `OK`

- [ ] **Step 3.5: Проверить что импорт `drawPortalTile` экспортируется в sprites.js**

Run: `grep -n "^export function drawPortalTile" js/sprites.js`
Expected: одна строка

- [ ] **Step 3.6: Ручной smoke-test в браузере**

1. Убедиться что сервер запущен: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3040/` — ожидается `200`. Если нет, запустить: `python3 -m http.server 3040 > /tmp/vova-server.log 2>&1 &`
2. Открыть `http://localhost:3040/` в браузере (Disable cache в DevTools)
3. New Game → village
4. Проверить все 6 порталов в деревне:
   - `(14, 0)` наверху — голубой (openworld), компас
   - `(17, 18)` внизу-право — зелёный (forest), ёлка
   - `(1, 9)` слева — золотой (kingdom), корона
   - `(28, 9)` справа — стальной (dungeon), череп
   - `(7, 18)` внизу-центр — красный (hellpit), пламя
   - `(24, 18)` внизу-право — оранжевый (arena), мечи
5. Порталы должны пульсировать (анимация кадров)
6. Пройти в любой портал → попасть в нужную локацию → вернуться через village_portal (но в open world портал ещё не будет правильным — это Task 4)

Expected: 6 разноцветных пульсирующих порталов в деревне. Телепортация работает как раньше.

- [ ] **Step 3.7: Коммит**

```bash
git add js/sprites.js js/tilemap.js
git commit -m "feat(portals): type-aware drawPortalTile + runtime рендер в static maps

tileDrawers[TILE.PORTAL] теперь no-op — портал не попадает в кеш.
renderMap после blit'а cached canvas'а итерирует map.portals[] и
рисует каждый через drawPortalTile(ctx, px, py, animFrame, target).

drawPortalTile расширен: принимает target, берёт ringColor из
getPortalStyle, рисует grass-базу, 3 кольца с пульсацией (4 оттенка
через makePulseShades), символ в центре через drawPortalSymbol.

Попутно восстанавливает утраченную анимацию пульсации — раньше она
не работала, потому что drawPortalTile вызывался один раз при
cacheMap с frame=0.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Runtime-рендер порталов в open world

**Files:**
- Modify: `js/chunks.js:178-196` — `getLoadedChunks()` возвращает `tiles` в объекте чанка
- Modify: `js/tilemap.js:78-116` — `renderOpenWorld` сканирует PORTAL-тайлы и рисует их поверх

- [ ] **Step 4.1: Расширить `getLoadedChunks` — возвращать `tiles`**

В `js/chunks.js` найти функцию `getLoadedChunks` (строка ~178). Текущий код:
```js
function getLoadedChunks() {
  if (centerCX === null) return [];
  const result = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = centerCX + dx;
      const cy = centerCY + dy;
      const canvas = getChunkCanvas(cx, cy);
      result.push({
        cx,
        cy,
        canvas,
        worldX: cx * CHUNK_W * TILE_SIZE,
        worldY: cy * CHUNK_H * TILE_SIZE,
      });
    }
  }
  return result;
}
```

Заменить на:
```js
function getLoadedChunks() {
  if (centerCX === null) return [];
  const result = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = centerCX + dx;
      const cy = centerCY + dy;
      const canvas = getChunkCanvas(cx, cy);
      // loadChunk уже вызывался внутри getChunkCanvas и закеширован в chunkCache.
      // Берём tiles из того же объекта chunk.
      const chunk = loadChunk(cx, cy);
      result.push({
        cx,
        cy,
        canvas,
        tiles: chunk.tiles,
        worldX: cx * CHUNK_W * TILE_SIZE,
        worldY: cy * CHUNK_H * TILE_SIZE,
      });
    }
  }
  return result;
}
```

- [ ] **Step 4.2: Модифицировать `renderOpenWorld` в `js/tilemap.js`**

Текущий код `renderOpenWorld` (строки 78-116) выполняет blit cached canvas'а каждого чанка. Нужно после каждого blit'а сканировать `chunk.tiles` на PORTAL-координаты и рисовать поверх.

Заменить функцию целиком:
```js
export function renderOpenWorld(ctx, chunkManager, camera) {
  const chunks = chunkManager.getLoadedChunks();

  for (const chunk of chunks) {
    // Chunk pixel bounds in world space
    const chunkLeft = chunk.worldX;
    const chunkTop = chunk.worldY;
    const chunkRight = chunkLeft + chunk.canvas.width;
    const chunkBottom = chunkTop + chunk.canvas.height;

    // Camera bounds in world space
    const camLeft = camera.x;
    const camTop = camera.y;
    const camRight = camera.x + camera.width;
    const camBottom = camera.y + camera.height;

    // Skip if chunk is entirely off-screen
    if (chunkRight <= camLeft || chunkLeft >= camRight ||
        chunkBottom <= camTop || chunkTop >= camBottom) continue;

    // Source rect (portion of chunk canvas to draw)
    const sx = Math.max(0, camLeft - chunkLeft);
    const sy = Math.max(0, camTop - chunkTop);
    const sx2 = Math.min(chunk.canvas.width, camRight - chunkLeft);
    const sy2 = Math.min(chunk.canvas.height, camBottom - chunkTop);
    const sw = sx2 - sx;
    const sh = sy2 - sy;

    // Dest rect (where on screen)
    const dx = Math.max(0, chunkLeft - camLeft);
    const dy = Math.max(0, chunkTop - camTop);

    if (sw > 0 && sh > 0) {
      ctx.drawImage(chunk.canvas,
        Math.floor(sx), Math.floor(sy), Math.floor(sw), Math.floor(sh),
        Math.floor(dx), Math.floor(dy), Math.floor(sw), Math.floor(sh));
    }

    // Runtime portal layer — сканируем chunk.tiles на TILE.PORTAL и рисуем
    // каждый портал с type-specific визуалом. Target определяется по
    // координате чанка: (0,0) → village (возврат), иначе → dungeon_ow.
    if (chunk.tiles) {
      const chunkTarget = (chunk.cx === 0 && chunk.cy === 0) ? 'village' : 'dungeon_ow';
      for (let row = 0; row < chunk.tiles.length; row++) {
        const tileRow = chunk.tiles[row];
        if (!tileRow) continue;
        for (let col = 0; col < tileRow.length; col++) {
          if (tileRow[col] !== TILE_PORTAL) continue;
          // Мировые пиксельные координаты тайла
          const worldPx = chunkLeft + col * TILE_SIZE;
          const worldPy = chunkTop + row * TILE_SIZE;
          // Экранные координаты
          const screenX = worldPx - camera.x;
          const screenY = worldPy - camera.y;
          // Skip off-screen
          if (screenX < -TILE_SIZE || screenX >= camera.width ||
              screenY < -TILE_SIZE || screenY >= camera.height) continue;
          drawPortalTile(ctx, screenX, screenY, chunkManager.animFrame || 0, chunkTarget);
        }
      }
    }
  }
}
```

**Проблема**: `TILE_PORTAL` и `drawPortalTile` нужно импортировать, а `animFrame` надо как-то получить. `chunkManager` вряд ли хранит animFrame — смотрим, где он определён. Он определён в `game.animFrame` (`game-state.js`).

Проще всего — **передавать `animFrame` как параметр** в `renderOpenWorld`. Посмотрим, как он вызывается:

Run: `grep -n "renderOpenWorld(" js/`
Expected: одна строчка в rendering.js, что-то типа `renderOpenWorld(ctx, game.chunkManager, cam)`.

Нужно изменить вызов на `renderOpenWorld(ctx, game.chunkManager, cam, game.animFrame)`.

Итого — заменить сигнатуру `renderOpenWorld`:
```js
export function renderOpenWorld(ctx, chunkManager, camera, animFrame = 0) {
```

И в теле заменить `chunkManager.animFrame || 0` на `animFrame`.

И добавить импорты в начало `js/tilemap.js`:
```js
import { TILE } from './sprites.js';
```

(Если `TILE` уже не импортирован — проверить и добавить.) Затем использовать `TILE.PORTAL` вместо `TILE_PORTAL` в сканере.

**Исправленная версия сканера в renderOpenWorld:**
```js
if (chunk.tiles) {
  const chunkTarget = (chunk.cx === 0 && chunk.cy === 0) ? 'village' : 'dungeon_ow';
  for (let row = 0; row < chunk.tiles.length; row++) {
    const tileRow = chunk.tiles[row];
    if (!tileRow) continue;
    for (let col = 0; col < tileRow.length; col++) {
      if (tileRow[col] !== TILE.PORTAL) continue;
      const worldPx = chunkLeft + col * TILE_SIZE;
      const worldPy = chunkTop + row * TILE_SIZE;
      const screenX = worldPx - camera.x;
      const screenY = worldPy - camera.y;
      if (screenX < -TILE_SIZE || screenX >= camera.width ||
          screenY < -TILE_SIZE || screenY >= camera.height) continue;
      drawPortalTile(ctx, screenX, screenY, animFrame, chunkTarget);
    }
  }
}
```

- [ ] **Step 4.3: Обновить вызов `renderOpenWorld` в `js/rendering.js`**

Найти строку `renderOpenWorld(ctx, game.chunkManager, cam)` (примерно 957) и заменить на:
```js
renderOpenWorld(ctx, game.chunkManager, cam, game.animFrame);
```

- [ ] **Step 4.4: Проверить что `TILE` импортирован в tilemap.js**

Run: `grep -n "^import.*TILE" js/tilemap.js`

Если `TILE` не импортирован, добавить в существующий импорт из sprites.js:
```js
import { tileDrawers, SOLID_TILES, OPEN_WORLD_SOLID_TILES, drawPortalTile, TILE } from './sprites.js';
```

Проверить что `TILE` экспортируется из sprites.js:
Run: `grep -n "^export const TILE" js/sprites.js`

Если не экспортируется (указан как `const TILE = ...`), добавить `export`.

- [ ] **Step 4.5: Проверить синтаксис**

Run: `node --check js/chunks.js && node --check js/tilemap.js && node --check js/rendering.js && echo OK`
Expected: `OK`

- [ ] **Step 4.6: Ручной smoke-test open world**

1. Открыть `http://localhost:3040/`, New Game → village
2. Войти в портал openworld (голубой компас наверху)
3. На чанке (0,0) должен быть **village_portal** (структура с порталом) — он должен быть **голубой домик** «В деревню» (это target='village')
4. Уйти в другой чанк, найти cave/ruin/другую структуру с порталом — должен быть **тёмно-серый череп со звёздами** (target='dungeon_ow')
5. Войти — должно перенести в проц. данж
6. Вернуться, все работает

Expected: village portal синий (дом), структурные порталы — тёмно-серые (череп).

- [ ] **Step 4.7: Коммит**

```bash
git add js/chunks.js js/tilemap.js js/rendering.js
git commit -m "feat(portals): runtime рендер порталов в open world

getLoadedChunks теперь возвращает chunk.tiles — нужно для сканирования
TILE.PORTAL координат в runtime. renderOpenWorld после blit'а каждого
чанка итерирует tiles, для каждого PORTAL-тайла рисует drawPortalTile
с target='village' (если chunk (0,0)) или 'dungeon_ow' (иначе).

renderOpenWorld теперь принимает animFrame параметром — для пульсации.
Вызов в rendering.js обновлён.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Подпись при приближении

**Files:**
- Modify: `js/rendering.js` — в `renderPlay` после рендера player'а вызвать `getNearbyPortal` и нарисовать плашку

- [ ] **Step 5.1: Импортировать нужные функции в `rendering.js`**

Проверить, какие импорты уже есть:
```bash
grep -n "^import.*from './portals\|^import.*TILE[^_]" js/rendering.js
```

Если нет — добавить в секцию импортов:
```js
import { getNearbyPortal, getPortalStyle } from './portals.js';
```

Также проверить что `TILE` импортируется из `./sprites.js` (или `./tilemap.js` если через прокси). Если `TILE` нигде не импортирован — добавить к существующему импорту:
```js
import { TILE_SIZE, renderMap, renderOpenWorld } from './tilemap.js';
```
→
```js
import { TILE_SIZE, renderMap, renderOpenWorld } from './tilemap.js';
import { TILE } from './sprites.js';
```

(Если `TILE` не экспортируется из `sprites.js`, это уже было исправлено в Task 4.4 — проверить.)

- [ ] **Step 5.2: Найти точку вставки подписи в renderPlay**

Run: `grep -n "renderParticles\|// Particles" js/rendering.js | head`
Expected: строка ~1088 `// Particles` и затем `renderParticles(ctx, game.particles, game.camera);`

Подпись нужно рисовать **после** particles (чтобы не перекрывалась эффектами), но **до** UI overlays. Открой файл на строке ~1088-1100 чтобы найти точное место.

- [ ] **Step 5.3: Добавить блок подписи портала в `renderPlay` после particles**

Вставить **после** `renderParticles(ctx, game.particles, game.camera);` и **перед** блоком `// --- Overlays (in game area) ---` или аналогичным:

```js
  // --- Portal label при приближении ---
  // Для static maps используем map.portals напрямую.
  // Для open world сканируем ближайшие тайлы через chunkManager.
  // ВНИМАНИЕ: `cam` и `p` уже объявлены выше в renderPlay — не дублируй const.
  {
    const p = game.player;
    if (p) {
      let nearbyPortal = null;
      let nearbyTarget = null;

      if (!game.openWorld && game.currentMap && game.currentMap.portals) {
        const result = getNearbyPortal(game.currentMap.portals, p.x, p.y, 2);
        if (result) {
          nearbyPortal = result.portal;
          nearbyTarget = nearbyPortal.target;
        }
      } else if (game.openWorld && game.chunkManager) {
        // Сканируем тайлы в радиусе 2 вокруг игрока
        const pcx = p.x + 12;
        const pcy = p.y + 14;
        const centerCol = Math.floor(pcx / TILE_SIZE);
        const centerRow = Math.floor(pcy / TILE_SIZE);
        let bestDist = Infinity;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const col = centerCol + dc;
            const row = centerRow + dr;
            const tile = game.chunkManager.getTileAtWorld(col, row);
            if (tile !== TILE.PORTAL) continue;
            const tx = col * TILE_SIZE + TILE_SIZE / 2;
            const ty = row * TILE_SIZE + TILE_SIZE / 2;
            const dx = pcx - tx;
            const dy = pcy - ty;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= 2 * TILE_SIZE && dist < bestDist) {
              bestDist = dist;
              nearbyPortal = { col, row };
              const { cx, cy } = game.chunkManager.pixelToChunk(col * TILE_SIZE, row * TILE_SIZE);
              nearbyTarget = (cx === 0 && cy === 0) ? 'village' : 'dungeon_ow';
            }
          }
        }
      }

      if (nearbyPortal && nearbyTarget) {
        const style = getPortalStyle(nearbyTarget);
        // Экранная позиция портала (cam объявлен выше в renderPlay)
        const portalScreenX = nearbyPortal.col * TILE_SIZE - game.camera.x + TILE_SIZE / 2;
        const portalScreenY = nearbyPortal.row * TILE_SIZE - game.camera.y;
        // Плашка над порталом (y - 14 от верха тайла)
        const labelY = portalScreenY - 14;
        ctx.font = '8px "Press Start 2P"';
        const textWidth = ctx.measureText(style.label).width;
        const padding = 6;
        const boxW = textWidth + padding * 2;
        const boxH = 14;
        const boxX = portalScreenX - boxW / 2;
        const boxY = labelY - boxH / 2;

        // Тень/фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        // Обводка цветом кольца портала
        ctx.strokeStyle = style.ringColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);
        // Текст
        ctx.fillStyle = '#ffd54f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(style.label, portalScreenX, boxY + boxH / 2 + 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }
  }
```

**Важно**: `TILE_SIZE` и `TILE` уже должны быть импортированы в `rendering.js`. Проверить:

Run: `grep -n "TILE_SIZE\|from './sprites\|from './tilemap" js/rendering.js | head -5`

Если `TILE` не импортирован — добавить в существующий импорт из `./sprites.js`.

- [ ] **Step 5.4: Проверить синтаксис**

Run: `node --check js/rendering.js && echo OK`
Expected: `OK`

- [ ] **Step 5.5: Ручной smoke-test**

1. В деревне подойти к каждому из 6 порталов на 1-2 тайла. Должна появляться плашка с правильной подписью:
   - `(14, 0)` → «Открытый мир»
   - `(17, 18)` → «Лес»
   - `(1, 9)` → «Королевство»
   - `(28, 9)` → «Подземелье»
   - `(7, 18)` → «Адская яма»
   - `(24, 18)` → «Арена»
2. Отойти от портала — плашка исчезает.
3. Обводка плашки = цвету колец портала.
4. В open world подойти к village_portal (чанк (0,0)) — «В деревню».
5. Подойти к любому структурному порталу — «Глубины».
6. Перейти в forest — подойти к возвратному порталу → «В деревню».

Expected: все подписи корректные, плашка исчезает при отходе.

- [ ] **Step 5.6: Коммит**

```bash
git add js/rendering.js
git commit -m "feat(portals): подпись при приближении (≤2 тайла)

После particles в renderPlay — находим ближайший портал и рисуем
плашку с названием локации над ним. Для static maps — через
getNearbyPortal(map.portals). Для open world — сканируем тайлы
в радиусе 2 через chunkManager.getTileAtWorld, target определяется
по chunk координате (village/dungeon_ow).

Плашка: полупрозрачный фон, обводка цветом ringColor портала,
жёлтый текст 8px \"Press Start 2P\" — единый стиль с [E] Говорить.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cache bump + финальный smoke-test + push

**Files:**
- Modify: `index.html` — bump `?v=29 → ?v=30`

- [ ] **Step 6.1: Bump cache**

В `index.html` найти:
```html
<script type="module" src="js/main.js?v=29"></script>
```

Заменить на:
```html
<script type="module" src="js/main.js?v=30"></script>
```

- [ ] **Step 6.2: Полный регресс-smoke-test**

Открыть `http://localhost:3040/?v=30` (Disable cache в DevTools), пройти чеклист:

**Static maps:**
- [ ] village: 6 уникальных порталов (цвет + символ) + пульсация + подписи при приближении
- [ ] forest: village (синий) + canyon (охра) — корректные визуал/подпись
- [ ] canyon: forest (зелёный) + cave (коричневый)
- [ ] cave: canyon + castle (фиолетовый)
- [ ] castle: cave
- [ ] kingdom: village
- [ ] hellpit: village
- [ ] arena: village

**Open world:**
- [ ] village_portal на (0,0) — голубой дом, подпись «В деревню»
- [ ] Любой структурный портал — тёмно-серый череп, подпись «Глубины»
- [ ] Перейти в проц. данж и вернуться

**Регрессия:**
- [ ] Телепортация работает (нажми портал, переместись, вернись)
- [ ] Fast travel (T) не сломан
- [ ] Миникарта не сломана
- [ ] Переключение между картами не лагает

**Edge cases:**
- [ ] Подпись портала не перекрывается с NPC prompt'ом `[E] Говорить` если NPC рядом с порталом
- [ ] Подпись правильно центрирована (не уехала вбок)
- [ ] При переходе между картами (village → forest) подпись не «зависает»

- [ ] **Step 6.3: Коммит bump версии**

```bash
git add index.html
git commit -m "chore: bump cache-bust для portals redesign (v29→v30)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6.4: Push всех коммитов на GitHub**

```bash
git push origin main
```

Expected: 6 коммитов (Task 1-6) запушены.

---

## Self-Review Checklist (для исполнителя)

После завершения всех задач:

- [ ] **Визуал всех 11 типов**: 10 статических target'ов + dungeon_ow — каждый проверен глазами в игре, видна уникальная палитра и символ
- [ ] **Анимация пульсации** работает во всех картах (раньше не работала — это восстановление)
- [ ] **Подпись появляется-исчезает** корректно при входе/выходе из радиуса 2 тайла
- [ ] **Телепортация не сломана**: регресс-тест всех порталов — ни один target не потерян
- [ ] **Fallback `?`** — если где-то появляется фиолетовый портал с вопросом, это сигнализирует о новом неизвестном target. Добавить в `PORTAL_STYLES`.
- [ ] **Cache bump** применён
- [ ] **Все 6 коммитов запушены** на origin/main

## Что НЕ входит в этот план (если возникнет соблазн добавить)

- Описания локаций в плашке («Лес — логово Лесного Стража») — отдельная задача
- Fade-in/fade-out анимация плашки — отдельная задача
- Иконки порталов на миникарте — `minimap.js` имеет свою систему, трогать отдельно
- Звук приближения к порталу — отдельная задача
- Tap-to-open portal на мобильном — отдельная задача
- Переделка структур в open-world чтобы они имели свои уникальные target'ы (cave, ruin, witch_hut) — отдельная задача, сейчас все = `dungeon_ow`
