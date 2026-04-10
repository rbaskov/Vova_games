# Pre-Coop Refactor & Mobile Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести кодовую базу в состояние, готовое к добавлению кооп-режима ("Drop-in герой"), и одновременно закрыть технический долг мобильной версии. Ничего из запланированного НЕ должно сломать текущий геймплей — все изменения либо чисто структурные (вынос в модули), либо точечные (добавление safe-area, guard'ов, новых API). После выполнения этого плана должен начинаться отдельный план `2026-04-XX-coop-session1.md`.

**Scope:** Рефакторинг `main.js`, абстракция игрока, очередь ввода, фиксы мобильного UX, подготовка Docker/nginx к WebSocket-relay, дизайн-спека кооп-протокола, профилировка перфоманса.

**Non-goals:** Реализация WebSocket-relay, UI выбора класса для второго игрока, drop-in join-логика — всё это будет в отдельных планах после этого.

**Tech Stack:** Vanilla JS (ES6 modules), HTML5 Canvas 2D, zero npm dependencies. Docker nginx:alpine на Synology, домен eldo.evgosyan.ru через Cloudflare.

---

## Existing Codebase Context

**Ключевые файлы (на момент написания плана):**
- `index.html` — загружает `<script type="module" src="js/main.js?v=10">`
- `js/main.js` — **3541 строк**, монолит. Содержит: глобал `game` (lines 39-91), state machine, gameLoop (line 2475), renderPlay (line 2264), updatePlayer, loadMap, enterOpenWorld, canvas resize logic (lines 3473-3505), `let canvas` (line 3507)
- `js/touch.js` — 389 строк, боковые панели, джойстик (radius 50, deadzone 8), кнопки 22/36px
- `js/input.js` — клавиатурный ввод, читается напрямую в updatePlayer
- `js/save.js` — JSON.stringify в localStorage, ключ `eldoria_save`
- `js/inventory.js` — module-level state (`let selectedSlot = { x: 0, y: 0 }`)
- `js/dialog.js` — module-level state (`let selectedOptionIndex = 0`)
- `js/worldgen.js` — seeded (mulberry32 + simplex), но спавн врагов через `Math.random()`
- `js/enemies.js`, `js/bosses.js` — AI через `Math.random()` (недетерминированно)
- `css/style.css` — ~63 строки, `100dvh`, нет `env(safe-area-inset-*)`
- `docker-compose.yml` — один сервис `vova-games` на 3040:80
- `nginx.conf` — SPA fallback + gzip, **без** WebSocket upgrade-заголовков
- `docs/ROADMAP.md` — раздел "Кооп" (~lines 115-151), высокоуровневый

**Правило cache-bust:** после любого изменения JS поднимать `?v=N` в `index.html` для всех затронутых скриптов.

---

## Task 1: Спека кооп-протокола (design-only, без кода)

**Files:**
- Create: `docs/superpowers/specs/2026-04-10-coop-design.md`

Этот таск — пишем design doc, чтобы последующие задачи и будущий план кооп-сессий имели общую опору. Без этого документа рефакторинг `main.js` делается вслепую.

- [x] **Step 1.1: Создать файл спеки со следующими разделами:**

  - **Роли:** host (авторитетный, полный game loop), guest (только рендер + отправка input). Решение принято: без peer-to-peer, только host-authoritative.
  - **Транспорт:** WebSocket (ws://), через nginx `/ws` → Node.js relay (отдельный сервис `relay` в docker-compose)
  - **Relay:** stateless room manager. Хранит только `Map<roomCode, Set<ws>>`. Никакой game state. Сообщения broadcast'ятся всем в комнате кроме отправителя.
  - **Room code:** 4 символа заглавные буквы+цифры (A-Z 0-9), например `K7F2`. Генерируется хостом при `createRoom`.
  - **Сообщения** (все JSON):
    - `→ relay`: `{ type: 'createRoom' }` → `← { type: 'roomCreated', code: 'K7F2' }`
    - `→ relay`: `{ type: 'joinRoom', code: 'K7F2' }` → `← { type: 'joined' }` или `{ type: 'error', reason: 'notFound' }`
    - `→ host`: `{ type: 'input', pid: 1, keys: {...}, dx: 0.2, dy: -0.9, buttons: {...}, seq: 123 }` (30 Hz)
    - `← host → guest`: `{ type: 'snapshot', tick: 456, players: [...], enemies: [...], projectiles: [...], boss: {...}, particles: [], worldSeed, chunkOrigin: {cx, cy}, events: [] }` (20 Hz)
    - `→ host`: `{ type: 'chat', text: 'hi' }` (опционально на будущее)
    - `← host → guest`: `{ type: 'kicked' }` при дисконнекте
  - **Snapshot content (минимум):**
    - `players[2]` — x, y, hp, maxHp, class, weapon, shield, armor, anim, facing
    - `enemies[]` — id, type, x, y, hp, anim, facing (только видимые в 3×3 чанках)
    - `projectiles[]` — id, x, y, vx, vy, type, owner
    - `boss` — если есть: id, type, phase, x, y, hp, ability, cooldown
    - Клиент-гость интерполирует между snapshot'ами (2 buffer, 100ms задержка рендера)
  - **Частота:** snapshot 20 Hz, input 30 Hz. Delta не используем на первом этапе (KISS). Если snapshot > 4KB — режем particles/projectiles.
  - **Авторитет:**
    - Хост держит полный `game` state, обновляет всё в своём gameLoop
    - При приходе `input` от гостя — сохраняется в `game.players[1].pendingInput`
    - updatePlayer(1) читает из pendingInput вместо локальной клавиатуры
    - Гость: свой gameLoop крутит только рендер + отправку input. Его `game` state полностью перезаписывается из snapshot'ов
  - **Desync policy:** если гость не получил snapshot > 2 сек — баннер "reconnecting...". Если > 10 сек — вернуть в меню.
  - **Reconnect:** не реализуем на первом этапе. Порвалось — начали новую комнату.
  - **Save/load:** только хост сохраняет. Гость играет без персистентности.
  - **Drop-in:** гость может подключиться в любой момент. Хост отправляет `fullSnapshot` (тот же формат, но с флагом `full: true`) при join.
  - **Cloudflare:** проверить что WebSockets включён в Cloudflare (по умолчанию ON, но домен через Cloudflare — проверить в панели).
  - **Security:** никакой валидации, целевая аудитория — дети 11-14 играют с друзьями, не публичный сервис. Комнаты auto-expire через 30 мин неактивности.
  - **Открытые вопросы (решить до Task 8):**
    - Куда привязывать камеру при двух игроках? Варианты: (a) камера хоста, гость рендерит куда смотрит хост; (b) split-screen; (c) dynamic zoom вокруг обоих. **Рекомендация:** (a) для простоты, (c) если оба игрока в одной зоне (distance < 300px)
    - Что делать, когда игроки в разных чанках? **Рекомендация:** принудительный "resurrection timer" — если distance > 600px, гость телепортируется к хосту через 5 сек

- [x] **Step 1.2:** Добавить в спеку ASCII-диаграмму message flow (host ↔ relay ↔ guest) для наглядности.

- [x] **Step 1.3:** Зафиксировать в спеке граничные случаи: потеря пакетов, одновременный урон, смерть хоста (→ `gameover` всем), смерть гостя (→ respawn у хоста через 3 сек).

> **Status (2026-04-10):** Task 1 завершена. Spec существует, обновлена ревизией с уточнёнными решениями (midpoint camera, 6-char code, guest brings character, separate save slot, invite link). См. `docs/superpowers/specs/2026-04-10-coop-design.md`.

---

## Task 2: Рефакторинг main.js — подготовка

**Цель:** Разбить монолит `main.js` (3541 строк) на 5 модулей **без изменения поведения**. Ни одна строка логики не меняется, только move и update import'ов. Тесты поведения — ручные smoke-tests после каждого step'а.

**Files:**
- Modify: `js/main.js`
- Create: `js/game-state.js`
- Create: `js/canvas-layout.js`
- Create: `js/player-update.js`
- Create: `js/map-loading.js`
- Create: `js/game-loop.js`
- Modify: `index.html` (bump `?v=10` → `?v=11`)

- [ ] **Step 2.1: Создать `js/game-state.js`**
  - Вынести объект `game` (`main.js:39-91`) и его типы/константы
  - Экспорт: `export const game = { ... }`
  - Добавить в конце файла пустой `game.players = []` (заполняется позже в Task 3, пока неиспользуемый)
  - В `main.js` заменить на `import { game } from './game-state.js';`
  - **Smoke test:** запустить игру локально, убедиться что меню грузится и герой двигается

- [ ] **Step 2.2: Создать `js/canvas-layout.js`**
  - Вынести всё из `main.js:3473-3507` (resize logic, `let canvas`, updateLayout-хэндлеры)
  - Экспорт: `initCanvasLayout(canvasEl)`, `getCanvas()`, `getLayout()` (возвращает `{gameX, gameY, gameW, gameH, panelLeftW, panelRightW}`)
  - Внутри модуля — свой `let canvas`, `let layout`
  - В `main.js` оставить только вызов `initCanvasLayout(document.getElementById('game'))` в bootstrap

- [ ] **Step 2.3: Создать `js/player-update.js`**
  - Вынести функции: `updatePlayer`, `createPlayer`, `applyDamageToPlayer`, `heroAttack`, `processHeroAbility`, всё что напрямую модифицирует `game.player` и его HP/XP/level
  - **Ограничение:** функции должны принимать `player` параметром, а не читать `game.player` напрямую. Внутри функции работаем с параметром. Это критично для Task 3.
  - Временно в `main.js` оставить обёртки: `function updatePlayer(dt) { return updatePlayerImpl(game.player, dt); }` — для обратной совместимости вызовов из gameLoop

- [~] **Step 2.4: Создать `js/map-loading.js`** — ЧАСТИЧНО
  - Вынесено: `collides`, `collidesWithMap`, `collidesWithOpenWorld`, `unstickPlayer`, `awardLoot`, `getStructureChestRarity`, `getOpenWorldSaveState` — 118 строк чистых helpers без глубоких зависимостей
  - **Остаётся в main.js**: `loadMap`, `enterOpenWorld`, `exitOpenWorld`, `saveCheckpoint`, `respawnAtCheckpoint`, `checkCheckpoint`, `checkPortals`, `syncChunkEnemies`, `createOpenWorldMapProxy` — требуют доступа к `createPlayer`, `companions`, `enemies`, `MAP_REGISTRY` и будут вынесены в следующей сессии после smoke-теста

- [ ] **Step 2.5: Создать `js/game-loop.js`**
  - Вынести: `gameLoop` (основной switch по state), `renderPlay`, `renderHUD`, `step`/`tick` функции
  - В `main.js` оставить только bootstrap: `initCanvasLayout` → `initInput` → `startGameLoop()`
  - Импортирует всё из предыдущих модулей

- [ ] **Step 2.6: Провести ручной smoke-test (чеклист):**
  - [ ] Меню → Новая игра → выбор класса работает
  - [ ] Герой двигается клавишами, атакует
  - [ ] Вход в деревню, диалог с NPC, покупка/продажа
  - [ ] Вход в открытый мир через портал
  - [ ] Генерация чанков, биомы корректно отрисовываются
  - [ ] Встреча врага, бой, смерть врага, лут
  - [ ] Босс открытого мира (спавн, бой, победа)
  - [ ] Сохранение/загрузка через меню паузы
  - [ ] Мобильный режим (DevTools device toolbar iPhone SE + iPad): панели видны, джойстик работает, кнопки стреляют
  - [ ] Смена сложности клавишей D
  - [ ] Fast travel клавишей T

- [ ] **Step 2.7:** Поднять `?v=10` → `?v=11` в `index.html` для `main.js`. Убедиться что новые модули загружаются через relative import'ы (`./game-state.js` и т.д. — браузер сам их подтянет, в `index.html` их не нужно регистрировать).

- [ ] **Step 2.8:** Коммит: `refactor: split main.js into 5 modules (pre-coop prep)`

---

## Task 3: Абстракция `game.players[]`

**Цель:** Заменить singleton `game.player` на массив `game.players`, где `players[0]` — локальный игрок, `players[1]` — резервный слот для будущего гостя. Всё должно работать идентично при одном игроке.

**Files:**
- Modify: `js/game-state.js`, `js/player-update.js`, `js/main.js`, `js/game-loop.js`, `js/map-loading.js`, `js/combat.js`, `js/enemies.js`, `js/abilities.js`, `js/inventory.js`, `js/bosses.js`, `js/camera.js`, `js/sprites.js`, `js/save.js`, `js/touch.js`, `js/minimap.js`, `js/fasttravel.js`

- [ ] **Step 3.1: Ввести структуру в `game-state.js`:**
  ```
  game.players = []  // массив игроков
  Object.defineProperty(game, 'player', {
    get() { return game.players[0]; },
    set(v) { game.players[0] = v; }
  });
  ```
  Это даёт обратную совместимость: старый код через `game.player` продолжает работать, но читает/пишет `players[0]`. Так можно мигрировать модули постепенно.

- [ ] **Step 3.2:** Заменить `createPlayer(...)` в `player-update.js` так, чтобы он возвращал нового игрока и клиент клал его в `game.players.push(newPlayer)` (а не `game.player = newPlayer`).

- [ ] **Step 3.3:** Пройтись grep'ом по `game.player.` во всех js-файлах. Для каждого вхождения решить:
  - Если это логика, которая должна работать для каждого игрока (урон, коллизии, движение) — заменить на цикл `for (const p of game.players) { ... }`
  - Если это "активный игрок для UI" (инвентарь, диалог, камера) — оставить `game.player` (через геттер работает)
  - Отдельно пометить функции, которые принимают `player` параметром — они уже готовы

  **Приоритет замены на цикл:**
  - [ ] `updatePlayer` → `for (const p of game.players) updatePlayer(p, dt)`
  - [ ] `drawHero` → `for (const p of game.players) drawHero(p)`
  - [ ] Коллизии снарядов → проверять по всем `players`
  - [ ] Враги AI: цель = ближайший из `players`, не фиксированно `game.player`
  - [ ] `applyDamageToPlayer(p, dmg)` — уже принимает `p`, проверить вызовы

- [ ] **Step 3.4:** Камера. Ввести `game.cameraTarget` — вычисляется в game-loop.js: если `players.length === 1` → центр игрока; если 2 → midpoint, с минимальной/максимальной дистанцией. **На этом этапе** оставляем `players.length === 1`, просто код для двух игроков уже готов и закомментирован.

- [ ] **Step 3.5:** Враги AI — в `enemies.js` заменить любые обращения `game.player` внутри update врага на функцию `nearestPlayer(enemy)`, которая проходит `game.players` и возвращает ближайшего. Если `players.length === 1` — возвращает `players[0]`, поведение идентично.

- [ ] **Step 3.6:** Сохранение. `save.js`: сериализовать `players[0]` как раньше (`player: {...}`), при загрузке класть в `game.players = [loadedPlayer]`. Хост в кооп-режиме тоже сохраняет только `players[0]` — гость эфемерен.

- [ ] **Step 3.7:** Инвентарь/диалог работают только с `game.players[0]` (локальный игрок). У гостя — упрощённый UI без инвентаря на первом этапе кооп.

- [ ] **Step 3.8:** Smoke-test **полный** (тот же чеклист из Step 2.6). Критично: убедиться что ничего не сломалось. Враги должны атаковать игрока, урон должен проходить, смерть должна работать.

- [ ] **Step 3.9:** Коммит: `refactor: game.player → game.players[] (coop-ready)`

---

## Task 4: Input queue и абстракция ввода

**Цель:** Разделить физический ввод (клавиатура, тач) от логики игрока. updatePlayer должен читать input из `player.input`, а не из глобальных keyboard state.

**Files:**
- Modify: `js/input.js`, `js/touch.js`, `js/player-update.js`, `js/game-state.js`

- [ ] **Step 4.1: Ввести в game-state.js структуру input:**
  - Каждый player имеет `player.input = { dx: 0, dy: 0, attack: false, interact: false, potion: false, ability1: false, ability2: false, ability3: false, inventoryToggle: false, menuToggle: false, questsToggle: false }`
  - `dx/dy` — нормализованный вектор движения (-1..1)

- [ ] **Step 4.2:** В `input.js` добавить `captureLocalInput()` — читает `isKeyDown('ArrowLeft')` и т.д., заполняет `game.players[0].input`. Вызывается в начале каждого tick'а gameLoop.

- [ ] **Step 4.3:** В `touch.js` — если пользователь на тач-устройстве (`pointer: coarse`), поверх клавиатуры писать в тот же `game.players[0].input` значения джойстика + состояния кнопок. Тач приоритетнее: если `joystick.active` → override keyboard dx/dy.

- [ ] **Step 4.4:** `updatePlayer(player, dt)` — теперь читает **только** из `player.input`, никаких `isKeyDown` или `touchHeld` внутри функции.

- [ ] **Step 4.5:** Триггерные действия (кнопка меню, инвентарь, диалог-next) — их нельзя делать per-frame, они "клик". Ввести `player.inputEdges` — объект с bool, которые выставляются на true при нажатии и сбрасываются игровой логикой через `consumeEdge('menu')`. Edge-detection делается в captureLocalInput.

- [ ] **Step 4.6:** Smoke-test — полный чеклист. Особое внимание: кнопки (инвентарь, меню, диалог) не срабатывают по 10 раз подряд, reload не теряет фокус.

- [ ] **Step 4.7:** Коммит: `refactor: input via player.input struct (network-ready)`

---

## Task 5: Очистка module-level state

**Цель:** Убрать `let selectedSlot` из `inventory.js` и `let selectedOptionIndex` из `dialog.js`. Эти переменные блокируют корректную работу, если у гостя будет свой UI. Перенести в `game.players[i].ui`.

**Files:**
- Modify: `js/inventory.js`, `js/dialog.js`, `js/game-state.js`

- [x] **Step 5.1:** В `createPlayer` добавить `player.ui = { inventorySlot: 0, dialogOption: 0, settingsTab: 0 }` (inventorySlot — scalar, а не {x, y} — отражает реальное использование).

- [x] **Step 5.2:** В `inventory.js` — заменить `selectedSlot` на `player.ui.inventorySlot` через getSlot/setSlot хелперы с обратной совместимостью.

- [x] **Step 5.3:** Аналогично `dialog.js` → `player.ui.dialogOption`. `currentDialog/currentNodeIndex/actionCallback` оставлены module-level как "локальная UI-сессия браузера", только `selectedChoice` перенесён. Сигнатуры `openDialog/dialogInput/renderDialog/closeDialog` получили параметр `player`.

- [ ] **Step 5.4:** Smoke-test — отложен на follow-up тестирование пользователем.

- [x] **Step 5.5:** Коммит: `refactor: move ui state from module-level to player.ui`

---

## Task 6: Мобильный UX — safe-area и viewport

**Цель:** Сделать игру корректно работающей на iPhone с чёлкой (в том числе в standalone/home-screen режиме) и исправить Chrome Mobile address-bar bump.

**Files:**
- Modify: `index.html`, `css/style.css`, `js/canvas-layout.js`, `js/touch.js`

- [ ] **Step 6.1: `index.html` meta viewport:**
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content">
  ```
  Добавить `viewport-fit=cover` и `interactive-widget=resizes-content`.

- [ ] **Step 6.2:** Добавить `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` если ещё нет — чтобы в standalone-режиме строка статуса не оттесняла игру.

- [ ] **Step 6.3: `css/style.css`:**
  - Добавить на `body`/`#game-wrapper`: `padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px);`
  - Цвет фона на `html` сделать чёрным, чтобы safe-area по краям не светилась системным цветом
  - Убедиться что `100dvh` работает (fallback на `100vh` для старых браузеров)

- [ ] **Step 6.4: `canvas-layout.js` — учесть safe-area в вычислении размера:**
  - При resize брать `window.innerWidth/Height` и вычитать safe-area инсеты (через `getComputedStyle` или `CSS.supports('padding: env(safe-area-inset-top)')`)
  - Минимальная ширина canvas: 480px (если экран меньше — масштаб <1.0, но панели рисуются поверх игры, как сейчас)
  - Максимальная ширина панелей: 20% от экрана каждая (чтобы на iPad игровая зона не скукоживалась)
  - Если `screen.width < 400` — полностью отключить панели, рисовать touch-кнопки поверх canvas в полупрозрачном режиме (как было раньше)

- [ ] **Step 6.5: `touch.js` — guard на минимальный hit-radius:**
  - Каждая кнопка имеет `baseRadius`
  - При узком экране `effectiveRadius = max(baseRadius, 20)` — минимум 20px для точного тапа
  - Проверить, что хитбоксы не пересекаются: если суммарный диаметр двух соседних кнопок > расстояния между центрами, log warning в консоль (чтобы Vova мог сообщить при тесте)

- [ ] **Step 6.6: Orientation hard-lock** — в bootstrap (после первого user-gesture — тап "Начать игру"):
  ```javascript
  try { await screen.orientation.lock('landscape'); } catch (e) { /* unsupported, fallback hint */ }
  ```
  Обернуть в try/catch — iOS Safari не поддерживает, но Android Chrome поддерживает.

- [ ] **Step 6.7:** Smoke-test на DevTools:
  - [ ] iPhone SE (375×667): кнопки видны, не перекрываются
  - [ ] iPhone 14 Pro (393×852): safe-area работает, чёлка не перекрывает UI
  - [ ] iPad Mini (768×1024): панели не раздуваются > 20%
  - [ ] Galaxy S20 (360×800): джойстик эргономичен
  - [ ] Reload страницы в landscape: не сбрасывает в portrait hint ошибочно

- [ ] **Step 6.8:** Поднять `?v=N` в `index.html` для `main.js` (если модули импортируются относительно — cache bust через main.js протягивается).

- [ ] **Step 6.9:** Коммит: `mobile: safe-area support + viewport-fit=cover + orientation lock`

---

## Task 7: Мобильный UX — haptics и мелочи

**Files:**
- Modify: `js/touch.js`, `js/combat.js`, `js/player-update.js`
- Create: `js/haptics.js`

- [ ] **Step 7.1: Создать `js/haptics.js`:**
  - `export function vibrate(pattern)` — обёртка над `navigator.vibrate`. Если API недоступно — no-op.
  - Предустановленные паттерны: `HAPTIC_HIT = 20`, `HAPTIC_HURT = [30, 40, 30]`, `HAPTIC_DEATH = [100, 50, 100, 50, 200]`, `HAPTIC_LEVELUP = [40, 30, 40, 30, 60]`
  - Настройка в `game.settings.haptics = true` (default), тумблер в меню паузы (если есть)

- [ ] **Step 7.2:** Вызвать `vibrate(HAPTIC_HIT)` при успешном попадании по врагу (в `combat.js` — функция `dealDamage`).
- [ ] **Step 7.3:** Вызвать `vibrate(HAPTIC_HURT)` при получении урона игроком (в `applyDamageToPlayer`).
- [ ] **Step 7.4:** Вызвать `vibrate(HAPTIC_LEVELUP)` при повышении уровня.
- [ ] **Step 7.5:** Вызвать `vibrate(HAPTIC_DEATH)` при смерти.

- [ ] **Step 7.6: Touch feedback** — в `touch.js` при каждом нажатии на кнопку (touchstart) также `vibrate(10)` — короткий тик, чтобы Vova чувствовал отклик.

- [ ] **Step 7.7:** Smoke-test на реальном Android (через HTTPS домен — `navigator.vibrate` не работает по HTTP, нужен eldo.evgosyan.ru). Проверить что вибрация не спамит (не более одной на кадр).

- [ ] **Step 7.8:** Коммит: `mobile: haptic feedback on hit/hurt/levelup/death`

---

## Task 8: Docker и nginx — подготовка к relay

**Цель:** Обновить инфраструктуру так, чтобы второй сервис (Node.js relay) можно было добавить одной командой без конфигурационных сюрпризов. Сам relay-код здесь НЕ пишем — это будет отдельный план.

**Files:**
- Modify: `docker-compose.yml`, `nginx.conf`
- Create: `server/` (пустая папка-заглушка с README)

- [x] **Step 8.1: `docker-compose.yml` — добавить закомментированный блок relay-сервиса:**
  ```yaml
  # relay:
  #   build: ./server
  #   container_name: eldoria-relay
  #   restart: unless-stopped
  #   expose:
  #     - "8080"
  #   networks:
  #     - default
  ```
  Это напоминание на будущее и документация. Раскомментируется в coop-session1.

- [x] **Step 8.2: `nginx.conf` — добавить WebSocket upgrade-блок, закомментированный:**
  ```nginx
  # location /ws {
  #   proxy_pass http://relay:8080;
  #   proxy_http_version 1.1;
  #   proxy_set_header Upgrade $http_upgrade;
  #   proxy_set_header Connection "upgrade";
  #   proxy_set_header Host $host;
  #   proxy_read_timeout 3600s;
  # }
  ```

- [x] **Step 8.3: `server/README.md`** (новый файл, заглушка):
  - Текст "WebSocket relay for coop mode. Not yet implemented. See `docs/superpowers/specs/2026-04-10-coop-design.md`."

- [ ] **Step 8.4:** Проверить в Cloudflare панели (вручную, записать в ROADMAP): WebSockets включены для домена `eldo.evgosyan.ru`. Cloudflare включает их по умолчанию, но проверить. **TODO для Руслана** — добавлено в ROADMAP как ручная проверка.

- [~] **Step 8.5:** Docker локально не установлен — базовая проверка YAML-синтаксиса прошла, блоки полностью закомментированы, парсинг не сломан. Реальная проверка `docker-compose up -d --build` — при деплое на NAS.

- [ ] **Step 8.6:** Коммит: `infra: prep docker-compose and nginx for future relay service`

---

## Task 9: Профилировка перфоманса

**Цель:** Получить baseline FPS до кооп-нагрузки, чтобы при добавлении второго игрока было с чем сравнивать. Без чисел невозможно оценить, ухудшил ли кооп-код ситуацию.

**Files:**
- Create: `js/debug-fps.js`
- Modify: `js/game-loop.js`

- [ ] **Step 9.1: `js/debug-fps.js`:**
  - Счётчик FPS (скользящее среднее по 60 кадрам)
  - Счётчик времени update/render отдельно
  - Счётчик активных entities: enemies, projectiles, particles, chunks loaded
  - Overlay в левом верхнем углу canvas, включается по клавише `F3`
  - Пишет в `console.log` раз в секунду краткую сводку, если открыта DevTools

- [ ] **Step 9.2:** Интегрировать в `game-loop.js` — `fpsCounter.begin()` в начале tick, `fpsCounter.endUpdate()` после update, `fpsCounter.endRender()` после render.

- [ ] **Step 9.3:** Профилировка (manual):
  - [ ] Desktop Chrome, открытый мир, враги 30+, FPS должен быть 60
  - [ ] DevTools device toolbar → iPhone SE throttling "Low-end mobile", FPS должен быть ≥ 30
  - [ ] Лагающие моменты: смена чанка, спавн босса, нашествие врагов
  - [ ] Записать цифры в `docs/ROADMAP.md` → "Perf baseline (2026-04-10)"

- [ ] **Step 9.4: Быстрые оптимизации (если профиль плохой):**
  - [ ] В `minimap.js` — рендерить на offscreen canvas раз в 500мс, а не каждый кадр
  - [ ] В game-loop.js — `renderParticles` пропускать каждый второй кадр при `particles.length > 100`
  - [ ] `chunkEnemies` Map — проверить утечку: при выгрузке чанка чистить ли записи?

- [ ] **Step 9.5:** Коммит: `debug: fps overlay + perf baseline measurements`

---

## Task 10: Финальная проверка и документация

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `README.md`

- [ ] **Step 10.1: Обновить `docs/ROADMAP.md`:**
  - Отметить завершение "Pre-coop refactor" как новую запись между "Открытый мир" и "Кооп"
  - Добавить "Perf baseline (2026-04-10)" с цифрами из Task 9
  - Обновить секцию "Кооп" — сослаться на спеку `docs/superpowers/specs/2026-04-10-coop-design.md`

- [ ] **Step 10.2:** Обновить `README.md` — добавить упоминание haptics в разделе "Мобильное управление".

- [ ] **Step 10.3: Полный регресс-тест** — пройти игру от меню до убийства босса открытого мира (Лесной страж), включая:
  - [ ] Создание персонажа каждого из 5 классов (быстрая проверка, что ни один класс не сломан)
  - [ ] Сохранение и загрузка
  - [ ] Открытый мир → чанки → миникарта → fast travel → возврат в деревню
  - [ ] Мобильный эмулятор: iPhone SE + iPad Mini
  - [ ] Реальный Android телефон (HTTPS через eldo.evgosyan.ru) — если доступен

- [ ] **Step 10.4: Деплой на staging (Synology):**
  - SSH NAS порт 33122 (см. `reference_synology_ssh.md`)
  - `git pull && docker-compose -f docker-compose.yml up -d --build`
  - Открыть eldo.evgosyan.ru, полный smoke-test

- [ ] **Step 10.5:** Telegram evgosyan (chat_id из memory) — статус "Pre-coop refactor готов, baseline FPS X, кооп стартует в следующей сессии". Без деталей (по правилу из памяти).

- [ ] **Step 10.6:** Коммит: `docs: update ROADMAP + README for pre-coop milestone`

---

## Risks & Mitigations

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| Рефакторинг main.js сломает субтильное поведение | Средняя | Smoke-test чеклист после каждого step, маленькие коммиты, git bisect при регрессии |
| `game.player → players[0]` геттер создаст багу с `game.player = null` при смерти | Средняя | Явно протестировать сценарий смерти + respawn перед коммитом Task 3 |
| Safe-area padding "съест" часть игровой зоны | Низкая | На устройствах без чёлки `env(..., 0px)` fallback = 0, игра не меняется |
| `screen.orientation.lock` упадёт в iOS Safari | Высокая | try/catch + игнор, fallback на portrait hint как сейчас |
| Vibrate API замедлит слабый Android | Низкая | Короткие паттерны (20мс), не чаще раза в 100мс на hit |
| Cloudflare блокирует WS даже включённый | Низкая | Проверить перед Task 8; если блок — fallback на wss://host-only без CF proxy |
| Рефакторинг затянется больше одной сессии | Высокая | План разбит на task'и-коммиты, каждый самодостаточен — можно остановиться на любом |

## Execution Order & Dependencies

```
Task 1 (spec)
  ↓
Task 2 (main.js split) ← ОБЯЗАТЕЛЬНО ПЕРВЫМ из кода
  ↓
Task 3 (players[])
  ↓
Task 4 (input queue)
  ↓
Task 5 (ui state)

Task 6 (safe-area)  ─┐
Task 7 (haptics)     ├── параллельно, независимо от 2-5
Task 8 (docker)      │
Task 9 (fps)        ─┘
  ↓
Task 10 (regression + deploy)
```

**Рекомендация:** идти строго Task 1 → 2 → 3 → 4 → 5, затем параллельно 6+7+8+9, затем 10. Задачи 6-9 не зависят друг от друга и не трогают те же файлы, что рефакторинг.

## Definition of Done

- [ ] Все 10 задач отмечены `[x]`
- [ ] `main.js` ≤ 2500 строк (было 3541)
- [ ] `game.players` — массив, `game.player` работает через геттер
- [ ] `updatePlayer(player, dt)` принимает параметр, не читает глобалы
- [ ] Все `player.input` заполняются из `captureLocalInput()` перед updateтом
- [ ] Safe-area inset работает на эмуляторе iPhone 14 Pro
- [ ] Orientation lock пытается сработать на Android
- [ ] Haptics работают на реальном Android (или подтверждён graceful fallback)
- [ ] `docker-compose.yml` содержит закомментированный relay-блок
- [ ] `nginx.conf` содержит закомментированный `/ws` блок
- [ ] `docs/superpowers/specs/2026-04-10-coop-design.md` написан и содержит все разделы из Task 1
- [ ] Baseline FPS задокументирован в ROADMAP
- [ ] Прод-деплой прошёл, eldo.evgosyan.ru играется
- [ ] Telegram-статус отправлен evgosyan

## Out of Scope (для следующих планов)

- Реализация Node.js relay (`server/relay.js`)
- UI выбора "создать/присоединиться к комнате"
- Snapshot/input сериализация и десериализация
- Интерполяция гостя
- Меню ввода room code
- Drop-in resurrection mechanic
- Split-screen или dynamic zoom камеры для двух игроков
- Второй виртуальный джойстик или gamepad API
- Персонализация цвета героя (отличать игрока 1 и 2)
