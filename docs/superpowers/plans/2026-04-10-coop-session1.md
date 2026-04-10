# Coop Session 1 — Network Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relay-сервер + WS-клиент + lobby UI, критерий: две вкладки обмениваются `{type:"chat"}` через DevTools console.

**Architecture:** Stateless Node.js relay (форвардит сообщения между парами клиентов), client-side `network.js` (WS-обёртка с пингом и очередью), `lobby.js` (state machine: idle → create/join → waiting_for_peer). Игровая интеграция (players[1], snapshot) — Session 2.

**Tech Stack:** Node.js 20 + `ws` library (сервер); Vanilla JS ES-модули (клиент); Docker (деплой)

---

## Файловая карта

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `server/relay.js` | Создать | WebSocket relay: rooms Map, форвард сообщений, rate-limit, auto-expire |
| `server/package.json` | Создать | `{ "ws": "^8" }` |
| `server/Dockerfile` | Создать | Node 20 alpine, `node server/relay.js` |
| `docker-compose.yml` | Изменить | Раскомментировать relay-сервис |
| `nginx.conf` | Изменить | Раскомментировать `/ws` location |
| `js/network.js` | Создать | WS-клиент: connect/disconnect/send/flush/ping |
| `js/game-state.js` | Изменить | `STATE.LOBBY`, поля `network`, `coopRole`, `coopCode` |
| `js/lobby.js` | Создать | Lobby state machine + renderLobby() |
| `js/rendering.js` | Изменить | Кооп-кнопка в renderMenu (desktop) |
| `js/touch.js` | Изменить | Кооп-кнопка в menuButtonAreas (mobile) |
| `js/game-loop.js` | Изменить | case STATE.LOBBY, импорты |
| `index.html` | Изменить | cache-bust v31→v32 |

---

## Task 1: Relay сервер

**Files:**
- Create: `server/relay.js`
- Create: `server/package.json`
- Create: `server/Dockerfile`

- [ ] **Step 1.1: Создать `server/package.json`**

```json
{
  "name": "eldoria-relay",
  "version": "1.0.0",
  "main": "relay.js",
  "dependencies": {
    "ws": "^8.18.0"
  }
}
```

- [ ] **Step 1.2: Создать `server/relay.js`**

```js
'use strict';
const WebSocket = require('ws');

const PORT          = 8080;
const MAX_ROOMS     = 50;
const EXPIRE_MS     = 30 * 60 * 1000;   // 30 min неактивности
const RATE_LIMIT    = 100;               // max msg/sec на сокет
const ALPHABET      = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN      = 6;

// rooms: code → { host: WebSocket, guest: WebSocket|null, lastActivity: number }
const rooms       = new Map();
// socketRoom: WebSocket → code
const socketRoom  = new Map();

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LEN; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function safeSend(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function forward(data, peer) {
  if (peer && peer.readyState === WebSocket.OPEN) {
    peer.send(data);
  }
}

function cleanupSocket(ws) {
  const code = socketRoom.get(ws);
  if (!code) return;
  socketRoom.delete(ws);

  const room = rooms.get(code);
  if (!room) return;

  if (room.host === ws) {
    // Хост ушёл — закрываем гостя, удаляем комнату
    if (room.guest) {
      safeSend(room.guest, { type: 'peerLeft', reason: 'hostLeft' });
      room.guest.close();
    }
    rooms.delete(code);
    console.log(`[relay] room ${code} deleted (host left)`);
  } else if (room.guest === ws) {
    // Гость ушёл — уведомляем хоста
    safeSend(room.host, { type: 'peerLeft' });
    room.guest = null;
    console.log(`[relay] room ${code}: guest left`);
  }
}

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  let msgCount = 0;
  let rateWindow = Date.now();

  ws.on('message', (raw) => {
    // Rate limiting: > 100 msg/sec — silent drop
    const now = Date.now();
    if (now - rateWindow >= 1000) { msgCount = 0; rateWindow = now; }
    if (++msgCount > RATE_LIMIT) return;

    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const code = socketRoom.get(ws);

    // --- Room management ---
    if (msg.type === 'createRoom') {
      if (rooms.size >= MAX_ROOMS) {
        safeSend(ws, { type: 'error', reason: 'serverFull' });
        return;
      }
      if (code) return; // уже в комнате
      let newCode;
      let tries = 0;
      do { newCode = generateCode(); tries++; } while (rooms.has(newCode) && tries < 100);
      rooms.set(newCode, { host: ws, guest: null, lastActivity: now });
      socketRoom.set(ws, newCode);
      safeSend(ws, { type: 'roomCreated', code: newCode, role: 'host' });
      console.log(`[relay] room ${newCode} created`);
      return;
    }

    if (msg.type === 'joinRoom') {
      const room = rooms.get(msg.code);
      if (!room)       { safeSend(ws, { type: 'error', reason: 'notFound'  }); return; }
      if (room.guest)  { safeSend(ws, { type: 'error', reason: 'roomFull'  }); return; }
      if (code)        { return; } // уже в другой комнате
      room.guest = ws;
      room.lastActivity = now;
      socketRoom.set(ws, msg.code);
      safeSend(ws, { type: 'joined', role: 'guest' });
      safeSend(room.host, { type: 'peerJoined' });
      console.log(`[relay] room ${msg.code}: guest joined`);
      return;
    }

    if (msg.type === 'leave') {
      cleanupSocket(ws);
      ws.close();
      return;
    }

    // --- Forward всё остальное пиру ---
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    room.lastActivity = now;
    const peer = room.host === ws ? room.guest : room.host;
    forward(raw, peer);
  });

  ws.on('close', () => cleanupSocket(ws));
  ws.on('error', () => cleanupSocket(ws));
});

// Чистка устаревших комнат каждую минуту
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > EXPIRE_MS) {
      console.log(`[relay] room ${code} expired`);
      if (room.host)  room.host.close();
      if (room.guest) room.guest.close();
      rooms.delete(code);
    }
  }
}, 60_000);

console.log(`[relay] listening on :${PORT}`);
```

- [ ] **Step 1.3: Создать `server/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY relay.js .
EXPOSE 8080
CMD ["node", "relay.js"]
```

- [ ] **Step 1.4: Проверить синтаксис relay.js**

```bash
node --check server/relay.js
```

Ожидаем: нет вывода (синтаксис OK).

- [ ] **Step 1.5: Установить зависимости и smoke-test relay**

```bash
cd server && npm install && cd ..
node server/relay.js &
# В отдельном терминале:
node -e "
const WebSocket = require('./server/node_modules/ws');
const ws = new WebSocket('ws://localhost:8080');
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'createRoom' }));
});
ws.on('message', d => { console.log('got:', d.toString()); ws.close(); });
"
```

Ожидаем: `got: {"type":"roomCreated","code":"XXXXXX","role":"host"}`

- [ ] **Step 1.6: Остановить relay (`kill %1` или Ctrl-C)**

- [ ] **Step 1.7: Коммит**

```bash
git add server/
git commit -m "feat(relay): WebSocket room relay server (Node.js + ws)"
```

---

## Task 2: Docker и nginx — раскомментировать relay

**Files:**
- Modify: `docker-compose.yml`
- Modify: `nginx.conf`

- [ ] **Step 2.1: Раскомментировать relay-сервис в `docker-compose.yml`**

Заменить закомментированный блок (строки 8-18) на рабочий:

```yaml
version: "3"
services:
  vova-games:
    build: .
    container_name: vova-games
    ports:
      - "3040:80"
    restart: unless-stopped
    depends_on:
      - relay

  relay:
    build: ./server
    container_name: eldoria-relay
    restart: unless-stopped
    expose:
      - "8080"
    networks:
      - default

networks:
  default:
    driver: bridge
```

- [ ] **Step 2.2: Раскомментировать `/ws` location в `nginx.conf`**

Заменить закомментированный блок на рабочий (внутри `server { ... }`, после блока `location /`):

```nginx
    # Coop WebSocket relay
    location /ws {
        proxy_pass http://relay:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
```

- [ ] **Step 2.3: Коммит**

```bash
git add docker-compose.yml nginx.conf
git commit -m "infra: enable relay service in docker-compose + nginx /ws"
```

---

## Task 3: `js/network.js` — WebSocket клиент

**Files:**
- Create: `js/network.js`

- [ ] **Step 3.1: Создать `js/network.js`**

```js
// network.js — WebSocket клиент для кооп-режима
// Экспорт: createNetwork(), getRelayUrl()

/**
 * Возвращает URL relay-сервера исходя из window.location.
 * В dev (localhost) — ws://localhost:3040/ws (проксируется через nginx).
 * В prod (eldo.evgosyan.ru) — wss://eldo.evgosyan.ru/ws.
 */
export function getRelayUrl() {
  const { hostname, protocol } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `ws://localhost:8080`; // dev: прямо на relay, без nginx proxy
  }
  return `${wsProto}//${hostname}/ws`;
}

/**
 * Создаёт экземпляр сетевого клиента.
 *
 * Использование:
 *   const net = createNetwork();
 *   net.connect(getRelayUrl());
 *   net.send({ type: 'createRoom' });
 *   const msgs = net.flush(); // вызывать каждый кадр
 *   net.disconnect();
 */
export function createNetwork() {
  let ws      = null;
  let _state  = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
  let pingTimer = null;
  const queue = [];   // входящие сообщения (объекты)

  // --- Публичный API ---

  function getState() { return _state; }

  function connect(url) {
    if (ws) disconnect();
    _state = 'connecting';
    ws = new WebSocket(url);

    ws.onopen = () => {
      _state = 'connected';
      // Пинг каждые 5 сек — держим Cloudflare alive
      pingTimer = setInterval(() => {
        if (_state === 'connected') {
          _safeSend(JSON.stringify({ type: 'ping', ts: Date.now() }));
        }
      }, 5000);
    };

    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'pong') return; // pong игнорируем
      queue.push(msg);
    };

    ws.onclose = () => {
      _cleanup();
      // Пишем специальный маркер в очередь чтобы lobby/game могли среагировать
      queue.push({ type: '_disconnected' });
    };

    ws.onerror = () => {
      // onerror всегда предшествует onclose — достаточно пометки
      queue.push({ type: '_error' });
    };
  }

  function disconnect() {
    _cleanup();
  }

  /** Отправить объект. Молча игнорирует если не подключены. */
  function send(obj) {
    _safeSend(JSON.stringify(obj));
  }

  /**
   * Забирает все накопленные с прошлого вызова сообщения.
   * Вызывать один раз в начале кадра (как captureLocalInput).
   */
  function flush() {
    return queue.splice(0);
  }

  // --- Внутренние хелперы ---

  function _safeSend(str) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(str);
    }
  }

  function _cleanup() {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; ws.close(); ws = null; }
    _state = 'disconnected';
  }

  return { connect, disconnect, send, flush, getState };
}
```

- [ ] **Step 3.2: Проверить синтаксис**

```bash
node --check js/network.js
```

Ожидаем: нет вывода.

- [ ] **Step 3.3: Коммит**

```bash
git add js/network.js
git commit -m "feat(network): WebSocket client wrapper with queue + heartbeat"
```

---

## Task 4: `js/game-state.js` — LOBBY state + coop поля

**Files:**
- Modify: `js/game-state.js`

- [ ] **Step 4.1: Добавить `STATE.LOBBY` в STATE enum**

В `js/game-state.js` в объект STATE добавить:

```js
export const STATE = {
  MENU: 'MENU',
  CLASS_SELECT: 'CLASS_SELECT',
  PLAY: 'PLAY',
  DIALOG: 'DIALOG',
  INVENTORY: 'INVENTORY',
  GAMEOVER: 'GAMEOVER',
  WIN: 'WIN',
  LOBBY: 'LOBBY',   // ← новое
};
```

- [ ] **Step 4.2: Добавить coop поля в объект `game`**

В объекте `game` после поля `worldEventManager` добавить:

```js
  // --- Coop (Session 1+) ---
  network: null,       // экземпляр createNetwork() пока в лобби/игре
  coopRole: 'none',   // 'none' | 'host' | 'guest'
  coopCode: null,     // код комнаты (строка 6 символов)
```

- [ ] **Step 4.3: Проверить синтаксис**

```bash
node --check js/game-state.js
```

- [ ] **Step 4.4: Коммит**

```bash
git add js/game-state.js
git commit -m "feat(game-state): add STATE.LOBBY + coop fields"
```

---

## Task 5: `js/lobby.js` — Lobby state machine + рендер

**Files:**
- Create: `js/lobby.js`

- [ ] **Step 5.1: Создать `js/lobby.js`**

```js
// lobby.js — Lobby UI для кооп-режима (Session 1: create/join room)
// Session 2 добавит: handshake с character, переход в PLAY

import { game, STATE } from './game-state.js';
import { createNetwork, getRelayUrl } from './network.js';

// Lobby внутренний state — хранится в замыкании createLobby()
// (не в game, чтобы не захламлять game-state session-1 деталями)

let _state = 'idle';
// 'idle'             — начальный экран (две кнопки: Создать / Присоединиться)
// 'connecting'       — WS устанавливается
// 'create_waiting'   — отправлен createRoom, ждём roomCreated
// 'join_input'       — пользователь набирает 6-символьный код
// 'join_waiting'     — отправлен joinRoom, ждём joined
// 'waiting_for_peer' — мы хост, ждём гостя (показываем код)
// 'error'            — что-то пошло не так

let _codeInput = '';   // набираемый код при joinRoom
let _roomCode  = null; // присвоенный нам код (для хоста) или тот что вводили (для гостя)
let _errorMsg  = null;

// ---------- Жизненный цикл ----------

export function openLobby() {
  _state     = 'idle';
  _codeInput = '';
  _roomCode  = null;
  _errorMsg  = null;
  game.coopRole = 'none';
  game.coopCode = null;
  // Подключаемся к network только когда пользователь нажмёт Создать/Присоединиться
  if (game.network) { game.network.disconnect(); game.network = null; }
}

export function closeLobby() {
  if (game.network) { game.network.disconnect(); game.network = null; }
  _state = 'idle';
}

// ---------- Действия пользователя ----------

export function lobbyCreateRoom() {
  if (_state !== 'idle') return;
  _state = 'connecting';
  _errorMsg = null;
  game.network = createNetwork();
  const net = game.network;
  // Слушаем очередь через update() — не через колбэки,
  // чтобы вся обработка шла в game loop (один поток).
  net.connect(getRelayUrl());
  // После connect сразу отправим createRoom — но WS ещё может не открыться.
  // update() увидит 'connected' и отправит команду.
  _pendingCreate = true;
}
let _pendingCreate = false;

export function lobbyStartJoinInput() {
  if (_state !== 'idle') return;
  _state = 'join_input';
  _codeInput = '';
  _errorMsg = null;
}

export function lobbyAddCodeChar(ch) {
  if (_state !== 'join_input') return;
  const valid = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const upper = ch.toUpperCase();
  if (valid.includes(upper) && _codeInput.length < 6) {
    _codeInput += upper;
  }
}

export function lobbyRemoveCodeChar() {
  if (_state !== 'join_input') return;
  _codeInput = _codeInput.slice(0, -1);
}

export function lobbySubmitCode() {
  if (_state !== 'join_input' || _codeInput.length !== 6) return;
  _state = 'connecting';
  _errorMsg = null;
  game.network = createNetwork();
  game.network.connect(getRelayUrl());
  _pendingJoin = _codeInput;
}
let _pendingJoin = null;

export function lobbyBack() {
  closeLobby();
  game.state = STATE.MENU;
}

// ---------- Update (вызывать каждый кадр в STATE.LOBBY) ----------

export function updateLobby() {
  if (!game.network) return;

  const net = game.network;
  const netState = net.getState();

  // Обрабатываем pending actions как только WS открылся
  if (netState === 'connected') {
    if (_pendingCreate) {
      _pendingCreate = false;
      _state = 'create_waiting';
      net.send({ type: 'createRoom' });
    }
    if (_pendingJoin) {
      const code = _pendingJoin;
      _pendingJoin = null;
      _state = 'join_waiting';
      net.send({ type: 'joinRoom', code });
    }
  }

  // Обрабатываем входящие сообщения
  const msgs = net.flush();
  for (const msg of msgs) {
    switch (msg.type) {
      case 'roomCreated':
        _roomCode = msg.code;
        game.coopRole = 'host';
        game.coopCode = msg.code;
        _state = 'waiting_for_peer';
        break;

      case 'joined':
        _roomCode = _codeInput;
        game.coopRole = 'guest';
        game.coopCode = _codeInput;
        _state = 'waiting_for_peer';
        // Session 2: здесь отправить {type:'hello', character:{...}}
        break;

      case 'peerJoined':
        // Хост: гость подключился.
        // Session 1: просто меняем подсказку. Session 2: перейти в PLAY.
        // Пока оставляем в LOBBY для демонстрации чата через DevTools.
        // Для теста: window._coopNet = game.network;
        if (typeof window !== 'undefined') window._coopNet = game.network;
        break;

      case 'error':
        _state = 'error';
        _errorMsg = ({
          notFound:   'Комната не найдена',
          roomFull:   'Комната полна',
          serverFull: 'Сервер переполнен',
          expired:    'Комната устарела',
        })[msg.reason] || `Ошибка: ${msg.reason}`;
        net.disconnect();
        game.network = null;
        break;

      case '_disconnected':
      case '_error':
        if (_state !== 'idle') {
          _state = 'error';
          _errorMsg = 'Соединение потеряно';
          game.network = null;
        }
        break;
    }
  }
}

// ---------- Render ----------

/**
 * Рендерит lobby экран.
 * Вызывать после renderMenu-фона (звёзды/горы) в game-loop STATE.LOBBY.
 * ctx уже в raw canvas coords (без clip/translate).
 */
export function renderLobby(ctx, canvasW, canvasH) {
  const cx = Math.floor(canvasW / 2);
  const cy = Math.floor(canvasH / 2);
  const BOX_W = 420;
  const BOX_H = 280;
  const bx = cx - Math.floor(BOX_W / 2);
  const by = cy - Math.floor(BOX_H / 2);

  // Фон + рамка
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(bx, by, BOX_W, BOX_H);
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, BOX_W, BOX_H);

  ctx.textAlign = 'center';

  // Заголовок
  ctx.font = '14px "Press Start 2P"';
  ctx.fillStyle = '#f0c040';
  ctx.fillText('КООП-РЕЖИМ', cx, by + 36);

  // Контент в зависимости от состояния
  switch (_state) {
    case 'idle':
      _renderIdleScreen(ctx, cx, by);
      break;
    case 'connecting':
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Подключение...', cx, cy + 10);
      break;
    case 'create_waiting':
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Создаём комнату...', cx, cy + 10);
      break;
    case 'join_input':
      _renderJoinInput(ctx, cx, cy, bx, by, BOX_W);
      break;
    case 'join_waiting':
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Подключаемся...', cx, cy + 10);
      break;
    case 'waiting_for_peer':
      _renderWaiting(ctx, cx, cy, bx, by, BOX_W, canvasW, canvasH);
      break;
    case 'error':
      _renderError(ctx, cx, cy);
      break;
  }

  // ESC / кнопка назад
  if (_state === 'idle' || _state === 'error') {
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#777';
    ctx.fillText('[ESC] Назад', cx, by + BOX_H - 14);
  }

  ctx.textAlign = 'left';
}

function _renderIdleScreen(ctx, cx, by) {
  ctx.font = '11px "Press Start 2P"';
  ctx.fillStyle = '#80ff80';
  ctx.fillText('[N] Создать комнату', cx, by + 110);
  ctx.fillStyle = '#80c8ff';
  ctx.fillText('[J] Присоединиться', cx, by + 150);
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#888';
  ctx.fillText('Нужен интернет и друг', cx, by + 195);
}

function _renderJoinInput(ctx, cx, cy, bx, by, BOX_W) {
  ctx.font = '10px "Press Start 2P"';
  ctx.fillStyle = '#fff';
  ctx.fillText('Введи код комнаты:', cx, by + 90);

  // Поле ввода кода (6 ячеек)
  const cellW = 36;
  const cellH = 42;
  const totalW = 6 * cellW + 5 * 6;
  const startX = cx - Math.floor(totalW / 2);
  const cellY = cy - 10;
  for (let i = 0; i < 6; i++) {
    const x = startX + i * (cellW + 6);
    ctx.strokeStyle = i < _codeInput.length ? '#f0c040' : '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, cellY, cellW, cellH);
    if (i < _codeInput.length) {
      ctx.font = '18px "Press Start 2P"';
      ctx.fillStyle = '#f0c040';
      ctx.fillText(_codeInput[i], x + cellW / 2, cellY + 28);
    }
  }

  ctx.font = '8px "Press Start 2P"';
  if (_codeInput.length === 6) {
    ctx.fillStyle = '#80ff80';
    ctx.fillText('[ENTER] Войти', cx, cellY + cellH + 24);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillText(`${_codeInput.length}/6 символов`, cx, cellY + cellH + 24);
  }
  ctx.fillStyle = '#666';
  ctx.fillText('[ESC] Отмена', cx, cellY + cellH + 46);
}

function _renderWaiting(ctx, cx, cy, bx, by, BOX_W, canvasW, canvasH) {
  if (game.coopRole === 'host') {
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Код комнаты:', cx, by + 88);

    // Большой код
    ctx.font = '28px "Press Start 2P"';
    ctx.fillStyle = '#f0c040';
    ctx.fillText(_roomCode || '------', cx, by + 140);

    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Жди друга...', cx, by + 175);
    ctx.fillStyle = '#555';
    ctx.fillText('(ESC = закрыть комнату)', cx, by + BOX_H - 14);
  } else {
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Подключено!', cx, by + 100);
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#555';
    ctx.fillText('Ждём старт от хоста...', cx, by + 135);
  }
  // Dev-подсказка: в DevTools можно набрать window._coopNet.send({type:'chat',text:'hi'})
  ctx.font = '6px "Press Start 2P"';
  ctx.fillStyle = '#333';
  ctx.fillText('DevTools: window._coopNet.send({type:"chat",text:"hi"})', cx, by + BOX_H - 30);
}

function _renderError(ctx, cx, cy) {
  ctx.font = '10px "Press Start 2P"';
  ctx.fillStyle = '#ff6666';
  ctx.fillText(_errorMsg || 'Неизвестная ошибка', cx, cy - 10);
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#aaa';
  ctx.fillText('[ESC] Назад', cx, cy + 30);
}

// ---------- Геттеры для game-loop ----------
export function getLobbyState()      { return _state; }
export function getLobbyCodeInput()  { return _codeInput; }
```

- [ ] **Step 5.2: Проверить синтаксис**

```bash
node --check js/lobby.js
```

- [ ] **Step 5.3: Коммит**

```bash
git add js/lobby.js
git commit -m "feat(lobby): lobby state machine + render (create/join/waiting)"
```

---

## Task 6: Кооп-кнопка в главном меню

**Files:**
- Modify: `js/rendering.js` (desktop menu)
- Modify: `js/touch.js` (mobile menu button)

- [ ] **Step 6.1: Добавить Кооп в desktop-меню в `rendering.js`**

В функции `renderMenu`, в ветке `else` (desktop), найти строку `ctx.fillText('S = Песочница', cx, 360)` и добавить после неё:

```js
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#80c8ff';
      ctx.fillText('N = Кооп', cx, 390);
```

(Добавить внутри блока `if (blink)`, после строки с S = Песочница.)

Полный блок `else` после правки:

```js
  } else {
    const blink = Math.sin(game.totalTime * 3) > 0;
    if (blink) {
      ctx.font = '14px "Press Start 2P"';
      ctx.fillStyle = '#ffffff';
      if (hasSave()) {
        ctx.fillText('ENTER=Новая  C=Продолжить', cx, 330);
      } else {
        ctx.fillText('НАЖМИ ENTER', cx, 330);
      }
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#b388ff';
      ctx.fillText('S = Песочница', cx, 360);
      ctx.fillStyle = '#80c8ff';
      ctx.fillText('N = Кооп', cx, 390);
    }
  }
```

- [ ] **Step 6.2: Добавить Кооп-кнопку в mobile `menuButtonAreas` в `touch.js`**

В функции `updateLayout` найти объявление `menuButtonAreas = [...]` и добавить 4-й элемент:

```js
  menuButtonAreas = [
    { id: 'start',    x: gameCenterX, y: 290, r: 60, w: 260, h: 46, key: 'Enter', label: 'ИГРАТЬ'         },
    { id: 'continue', x: gameCenterX, y: 345, r: 60, w: 260, h: 38, key: 'KeyC',  label: 'ПРОДОЛЖИТЬ'     },
    { id: 'sandbox',  x: gameCenterX, y: 393, r: 60, w: 200, h: 34, key: 'KeyS',  label: 'ПЕСОЧНИЦА'      },
    { id: 'coop',     x: gameCenterX, y: 437, r: 60, w: 200, h: 34, key: 'KeyN',  label: 'КООП'           },
  ];
```

*(Y-координаты слегка сдвинуты вверх чтобы освободить место для 4-й кнопки.)*

- [ ] **Step 6.3: Добавить рендер Кооп-кнопки в `renderMenuTouchControls` в `touch.js`**

После рендера sandbox-кнопки добавить:

```js
  const coop = menuButtonAreas[3];
  drawMenuButton(ctx, coop.x, coop.y, coop.w, coop.h, coop.label, '#1a6aaa', '#fff');
```

Полная функция `renderMenuTouchControls` после правки:

```js
export function renderMenuTouchControls(ctx, width, height, hasSaveData) {
  if (!isMobile) return;

  ctx.globalAlpha = 0.9;
  const start = menuButtonAreas[0];
  drawMenuButton(ctx, start.x, start.y, start.w, start.h, start.label, '#f0c040', '#000');

  if (hasSaveData) {
    const cont = menuButtonAreas[1];
    drawMenuButton(ctx, cont.x, cont.y, cont.w, cont.h, cont.label, '#3498db', '#fff');
  }

  const sandbox = menuButtonAreas[2];
  drawMenuButton(ctx, sandbox.x, sandbox.y, sandbox.w, sandbox.h, sandbox.label, '#b388ff', '#000');

  const coop = menuButtonAreas[3];
  drawMenuButton(ctx, coop.x, coop.y, coop.w, coop.h, coop.label, '#1a6aaa', '#fff');

  ctx.globalAlpha = 1;
}
```

- [ ] **Step 6.4: Проверить синтаксис**

```bash
node --check js/rendering.js && node --check js/touch.js
```

- [ ] **Step 6.5: Коммит**

```bash
git add js/rendering.js js/touch.js
git commit -m "feat(menu): add Coop button to main menu (desktop N + mobile touch)"
```

---

## Task 7: `js/game-loop.js` — STATE.LOBBY handler

**Files:**
- Modify: `js/game-loop.js`

- [ ] **Step 7.1: Добавить импорты в начало `game-loop.js`**

В блоке импортов (первые ~70 строк) добавить:

```js
import {
  openLobby, closeLobby, updateLobby, renderLobby,
  lobbyCreateRoom, lobbyStartJoinInput,
  lobbyAddCodeChar, lobbyRemoveCodeChar, lobbySubmitCode,
  lobbyBack,
} from './lobby.js';
```

- [ ] **Step 7.2: В STATE.MENU — обработать нажатие `KeyN` (Кооп)**

В `case STATE.MENU:` после блока `if (isKeyPressed('KeyC') && hasSave())` добавить:

```js
      if (isKeyPressed('KeyN')) {
        openLobby();
        game.state = STATE.LOBBY;
        SFX.resumeAudio();
      }
```

- [ ] **Step 7.3: Добавить `case STATE.LOBBY` в switch**

Добавить перед `case STATE.CLASS_SELECT:` (или в конец switch):

```js
    case STATE.LOBBY: {
      // --- UPDATE ---
      updateLobby();

      // Keyboard input для lobby
      if (isKeyPressed('Escape') || isKeyPressed('KeyN')) {
        // ESC/N — назад в меню (если в idle или error)
        const ls = getLobbyState();
        if (ls === 'idle' || ls === 'error') {
          lobbyBack();
          break;
        }
        if (ls === 'join_input') {
          lobbyBack(); // полный выход из лобби
          break;
        }
        if (ls === 'waiting_for_peer') {
          lobbyBack(); // закрыть комнату/отключиться
          break;
        }
      }

      if (getLobbyState() === 'idle') {
        if (isKeyPressed('KeyN')) {
          lobbyCreateRoom();
        } else if (isKeyPressed('KeyJ')) {
          lobbyStartJoinInput();
        }
      } else if (getLobbyState() === 'join_input') {
        // Буквы и цифры кода
        const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (const ch of codeChars) {
          if (isKeyPressed('Key' + ch) || isKeyPressed('Digit' + ch)) {
            lobbyAddCodeChar(ch);
          }
        }
        if (isKeyPressed('Backspace')) lobbyRemoveCodeChar();
        if (isKeyPressed('Enter') && getLobbyCodeInput().length === 6) {
          lobbySubmitCode();
        }
      }

      FPS.endUpdate();
      // --- RENDER ---
      // Фон — звёзды и горы как в меню
      updateStars(dt);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, game.width, game.height);
      renderMenu(ctx);          // рисует фон (звёзды, горы, title)
      renderLobby(ctx, game.width, game.height);
      FPS.endRender();
    } break;
```

Также добавить импорт геттеров в шаге 7.1:
```js
import { ..., getLobbyState, getLobbyCodeInput } from './lobby.js';
```

- [ ] **Step 7.4: Проверить синтаксис**

```bash
node --check js/game-loop.js
```

- [ ] **Step 7.5: Коммит**

```bash
git add js/game-loop.js
git commit -m "feat(game-loop): STATE.LOBBY handler with keyboard navigation"
```

---

## Task 8: Финальная интеграция и smoke-test

**Files:**
- Modify: `index.html` (cache-bust)

- [ ] **Step 8.1: Поднять cache-bust v31→v32 в `index.html`**

```html
<script type="module" src="js/main.js?v=32"></script>
```

- [ ] **Step 8.2: `node --check` всех новых/изменённых JS-файлов**

```bash
node --check js/network.js js/lobby.js js/game-state.js js/game-loop.js js/rendering.js js/touch.js
```

Ожидаем: нет ошибок.

- [ ] **Step 8.3: Запустить relay и статический сервер**

```bash
# Терминал 1
node server/relay.js

# Терминал 2
cd /path/to/Vova_games && python3 -m http.server 3040
```

- [ ] **Step 8.4: Тест через две вкладки**

1. Открыть `http://localhost:3040` в двух вкладках (Disable cache в DevTools)
2. **Вкладка 1 (хост):**
   - Главное меню → `N` → открылось лобби
   - В лобби → `N` → "Создать комнату" → появился 6-символьный код
   - В DevTools: `window._coopNet` ещё не доступен (ждём гостя)
3. **Вкладка 2 (гость):**
   - Главное меню → `N` → лобби
   - В лобби → `J` → набрать код из вкладки 1 → Enter
   - Появился статус "Подключено! Ждём старт от хоста..."
4. **Вкладка 1:** статус меняется, `window._coopNet` доступен
5. **Тест чата:**
   ```js
   // Вкладка 1 DevTools:
   window._coopNet.send({ type: 'chat', text: 'привет от хоста' })
   // Вкладка 2 DevTools — выполнить чтобы увидеть входящее:
   window._coopNet = game.network;
   // ... ждём flush() в следующем кадре ...
   // Или: поставить breakpoint на queue.push() в network.js
   ```

   Альтернативно — патч для визуального теста: в lobby.js в обработчике `msg.type === 'chat'` добавить `console.log('[chat]', msg.text)` и проверить консоль вкладки 2.

- [ ] **Step 8.5: Добавить временный chat-лог в `lobby.js` для теста**

В `updateLobby()`, в switch по `msg.type`, добавить:
```js
      case 'chat':
        console.log(`[coop chat] ${game.coopRole}: ${msg.text}`);
        break;
```

Это позволит видеть сообщения в консоли без UI.

- [ ] **Step 8.6: Финальный коммит**

```bash
git add index.html js/lobby.js
git commit -m "feat(coop-session1): wire up lobby + cache-bust v31→v32

Two browser tabs can now create/join a room and exchange messages
via the relay server. Criterion met: {type:'chat'} forwarded via
window._coopNet.send() visible in DevTools console.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 8.7: Push**

```bash
git push
```

---

## Критерий готовности Session 1

- [ ] `node --check` всех JS-файлов — нет ошибок
- [ ] `node server/relay.js` стартует без ошибок
- [ ] Две вкладки браузера создают/присоединяются к комнате
- [ ] `window._coopNet.send({ type:'chat', text:'test' })` в консоли вкладки 1 → `[coop chat] ...` в консоли вкладки 2
- [ ] ESC в лобби возвращает в главное меню
- [ ] Закрытие вкладки хоста → гостевая вкладка логирует "Соединение потеряно"

---

## Self-Review

**Покрытие спеки (Session 1):**
- ✅ `server/relay.js`: createRoom, joinRoom, leave, forward, rate-limit, auto-expire, MAX_ROOMS
- ✅ `server/package.json + Dockerfile`
- ✅ `docker-compose.yml + nginx.conf` раскомментированы
- ✅ `js/network.js`: connect, disconnect, send, flush, heartbeat ping 5s
- ✅ STATE.LOBBY + game.network + game.coopRole + game.coopCode
- ✅ Кооп-кнопка в меню (desktop N, mobile touch)
- ✅ Lobby: idle → create_waiting → waiting_for_peer
- ✅ Lobby: idle → join_input → join_waiting → waiting_for_peer
- ✅ Error states: notFound, roomFull, serverFull, disconnected
- ✅ Ping/pong (network.js heartbeat)
- ✅ Dev-экспоз `window._coopNet` для тестирования
- ⬜ Session 2: handshake hello/character, players[1], snapshot, PLAY transition

**Тип-консистентность:** `getLobbyState()` возвращает string-литерал, проверяется в game-loop через `=== 'idle'` etc. Не используем enum — нет смысла для session-1. `game.coopRole` — string `'none'|'host'|'guest'` везде. `game.network` — объект из `createNetwork()` или `null` везде.

**dev URL relay:** `ws://localhost:8080` (прямое подключение минуя nginx при dev-запуске через `python3 -m http.server 3040`). В prod: через nginx `/ws` → relay:8080. Обе ветки покрыты в `getRelayUrl()`.
