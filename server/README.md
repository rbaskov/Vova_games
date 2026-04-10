# Coop Relay Server

WebSocket relay for coop mode. **Not yet implemented.**

Реализуется в плане `coop-session1` (следующий после `pre-coop-refactor-and-mobile`). См. дизайн-документ:

- [`docs/superpowers/specs/2026-04-10-coop-design.md`](../docs/superpowers/specs/2026-04-10-coop-design.md)

## Стек

- `node:20-alpine`
- Единственная зависимость: [`ws`](https://www.npmjs.com/package/ws)
- Stateless room manager: `Map<code, {host, guest}>`
- Слушает порт `8080` (internal), проксируется через nginx по `/ws`

## Планируемая структура

```
server/
├── Dockerfile       # node:20-alpine + npm install ws
├── package.json     # { "dependencies": { "ws": "^8" } }
├── relay.js         # ~140 строк: комнаты, коды, heartbeat, forward
└── README.md        # этот файл
```

## Подключение

Клиент (браузер) подключается по адресу `wss://eldo.evgosyan.ru/ws` (prod) или `ws://localhost:3040/ws` (dev).

Протокол сообщений описан в разделе **"Протокол сообщений"** спеки.
