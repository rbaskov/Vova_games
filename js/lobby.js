// lobby.js — Lobby UI для кооп-режима (Session 1: create/join room)
// Session 2 добавит: handshake с character, переход в PLAY

import { game, STATE } from './game-state.js';
import { createNetwork, getRelayUrl } from './network.js';
import { CLASSES } from './rendering.js';

// Lobby внутренний state — хранится в замыкании createLobby()
// (не в game, чтобы не захламлять game-state session-1 деталями)

let _state = 'idle';
// 'idle'             — начальный экран (две кнопки: Создать / Присоединиться)
// 'class_select'     — выбор класса перед connect (для обоих ролей)
// 'connecting'       — WS устанавливается
// 'create_waiting'   — отправлен createRoom, ждём roomCreated
// 'join_input'       — пользователь набирает 6-символьный код
// 'join_waiting'     — отправлен joinRoom, ждём joined
// 'waiting_for_peer' — мы хост, ждём гостя (показываем код)
// 'error'            — что-то пошло не так

let _codeInput = '';   // набираемый код при joinRoom
let _roomCode  = null; // присвоенный нам код (для хоста) или тот что вводили (для гостя)
let _errorMsg  = null;
let _pendingStart = null; // { map: 'village' } когда кооп готов к старту
let _classIntent = null;  // 'host' | 'guest' — куда идти после class_select
let _selectedClass = 0;   // индекс в CLASSES
let _myClass = null;      // выбранный класс (id)
let _hostHasHello = false; // хост получил hello от гостя
let _hostHasPeer = false;  // хост получил peerJoined

// ---------- Жизненный цикл ----------

export function openLobby() {
  _state     = 'idle';
  _codeInput = '';
  _roomCode  = null;
  _errorMsg  = null;
  _classIntent = null;
  _selectedClass = 0;
  _myClass = null;
  _hostHasHello = false;
  _hostHasPeer = false;
  game.coopRole = 'none';
  game.coopCode = null;
  game._coopHostClass = null;
  game._coopGuestClass = null;
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
  _classIntent = 'host';
  _state = 'class_select';
  _errorMsg = null;
}
let _pendingCreate = false;

export function lobbyStartJoinInput() {
  if (_state !== 'idle') return;
  _classIntent = 'guest';
  _state = 'class_select';
  _codeInput = '';
  _errorMsg = null;
}

export function lobbyClassPrev() {
  if (_state !== 'class_select') return;
  _selectedClass = (_selectedClass - 1 + CLASSES.length) % CLASSES.length;
}
export function lobbyClassNext() {
  if (_state !== 'class_select') return;
  _selectedClass = (_selectedClass + 1) % CLASSES.length;
}
export function lobbyConfirmClass() {
  if (_state !== 'class_select') return;
  _myClass = CLASSES[_selectedClass].id;
  if (_classIntent === 'host') {
    _state = 'connecting';
    game.network = createNetwork();
    game.network.connect(getRelayUrl());
    _pendingCreate = true;
  } else {
    _state = 'join_input';
  }
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
        game._coopHostClass = _myClass;
        _state = 'waiting_for_peer';
        break;

      case 'joined':
        _roomCode = _codeInput;
        game.coopRole = 'guest';
        game.coopCode = _codeInput;
        game._coopGuestClass = _myClass;
        _state = 'waiting_for_peer';
        // Шлём hello с выбранным классом — хост сохранит и применит к players[1]
        net.send({ type: 'hello', class: _myClass });
        break;

      case 'peerJoined':
        // Хост: гость подключился — ждём hello, потом запускаем игру.
        if (typeof window !== 'undefined') window._coopNet = game.network;
        _hostHasPeer = true;
        break;

      case 'hello':
        // Хост получил hello от гостя — сохраняем класс.
        if (game.coopRole === 'host') {
          game._coopGuestClass = msg.class || null;
          _hostHasHello = true;
        }
        break;

      case 'startGame':
        // Гость: хост запустил игру и прислал свой класс.
        game._coopHostClass = msg.hostClass || null;
        _pendingStart = { map: msg.map };
        break;

      case 'chat':
        console.log(`[coop chat] ${game.coopRole}: ${msg.text}`);
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
          net.disconnect();
          game.network = null;
        }
        break;
    }
  }

  // Хост: оба условия выполнены — стартуем игру.
  if (game.coopRole === 'host' && _hostHasPeer && _hostHasHello && !_pendingStart) {
    net.send({ type: 'startGame', map: 'village', hostClass: _myClass });
    _pendingStart = { map: 'village' };
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
  const BOX_W = Math.min(460, canvasW - 20);
  const BOX_H = 300;
  const bx = cx - Math.floor(BOX_W / 2);
  const by = cy - Math.floor(BOX_H / 2);

  // Затемнение всего экрана — скрывает кнопки меню под боксом
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Фон + рамка
  ctx.fillStyle = '#0a0a18';
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
    case 'class_select':
      _renderClassSelect(ctx, cx, cy, bx, by, BOX_W, BOX_H);
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
      _renderWaiting(ctx, cx, cy, bx, by, BOX_W, BOX_H, canvasW, canvasH);
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

function _renderClassSelect(ctx, cx, cy, bx, by, BOX_W, BOX_H) {
  ctx.font = '10px "Press Start 2P"';
  ctx.fillStyle = '#fff';
  ctx.fillText(_classIntent === 'host' ? 'Класс хоста:' : 'Класс гостя:', cx, by + 80);

  const cls = CLASSES[_selectedClass];
  ctx.font = '14px "Press Start 2P"';
  ctx.fillStyle = cls.color || '#f0c040';
  ctx.fillText(cls.name, cx, by + 120);

  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#aaa';
  // Описание может быть длинным — режем на 2 строки.
  const desc = cls.desc || '';
  const words = desc.split(' ');
  let line1 = '', line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).length < 35) line1 += (line1 ? ' ' : '') + w;
    else line2 += (line2 ? ' ' : '') + w;
  }
  ctx.fillText(line1, cx, by + 150);
  if (line2) ctx.fillText(line2, cx, by + 165);

  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#888';
  ctx.fillText(`HP ${cls.hp}  ATK ${cls.atk}  POT ${cls.potions}`, cx, by + 195);

  ctx.font = '9px "Press Start 2P"';
  ctx.fillStyle = '#80ff80';
  ctx.fillText('[← →] выбор   [ENTER] OK', cx, by + 235);
  ctx.fillStyle = '#777';
  ctx.fillText('[ESC] назад', cx, by + 260);
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

function _renderWaiting(ctx, cx, cy, bx, by, BOX_W, BOX_H, canvasW, canvasH) {
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

/** Возвращает pending-старт кооп-игры и сбрасывает флаг. Вызывать в game-loop. */
export function getPendingStart() {
  const s = _pendingStart;
  _pendingStart = null;
  return s;
}
