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
      if (rooms.has(newCode)) {
        safeSend(ws, { type: 'error', reason: 'serverFull' });
        return;
      }
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
