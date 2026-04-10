// network.js — WebSocket клиент для кооп-режима
// Экспорт: createNetwork(), getRelayUrl()

/**
 * Возвращает URL relay-сервера исходя из window.location.
 * Всегда использует тот же origin + /ws — nginx проксирует на relay:8080.
 * Работает для dev (localhost:3040) и prod (eldo.evgosyan.ru).
 */
export function getRelayUrl() {
  const { hostname, port, protocol } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  const portStr = port ? `:${port}` : '';
  return `${wsProto}//${hostname}${portStr}/ws`;
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
  let ws        = null;
  let _state    = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
  let pingTimer = null;
  let _hadError = false;
  const queue   = [];   // входящие сообщения (объекты)

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
      const wasError = _hadError;
      _hadError = false;
      _cleanup();
      // onerror всегда предшествует onclose — не дублируем teardown
      if (!wasError) queue.push({ type: '_disconnected' });
    };

    ws.onerror = () => {
      _hadError = true;
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
