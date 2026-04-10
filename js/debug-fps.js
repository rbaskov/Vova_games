// ============================================================
// debug-fps.js — FPS / update / render / entity counter overlay
// ============================================================
// Overlay в левом верхнем углу canvas, включается клавишей F3.
// Считает:
//   - FPS (скользящее среднее по последним 60 кадрам)
//   - Время update / render отдельно (мс на кадр, avg60)
//   - Количество активных сущностей (enemies/projectiles/particles/chunks)
// Используется для получения baseline метрик до кооп-нагрузки.

const HISTORY = 60; // размер скользящего окна

const state = {
  visible: false,
  fpsHistory: [],
  updateHistory: [],
  renderHistory: [],
  _frameStart: 0,
  _updateStart: 0,
  _updateEnd: 0,
  _renderEnd: 0,
  _lastLog: 0,
};

export function toggleFps() {
  state.visible = !state.visible;
}

export function isFpsVisible() {
  return state.visible;
}

/** Вызвать в самом начале tick */
export function begin() {
  state._frameStart = performance.now();
}

/** Вызвать после блока update() */
export function endUpdate() {
  state._updateEnd = performance.now();
}

/** Вызвать после блока render() */
export function endRender() {
  state._renderEnd = performance.now();

  const total = state._renderEnd - state._frameStart;
  const updateMs = state._updateEnd - state._frameStart;
  const renderMs = state._renderEnd - state._updateEnd;

  push(state.fpsHistory, total > 0 ? 1000 / total : 0);
  push(state.updateHistory, updateMs);
  push(state.renderHistory, renderMs);

  // Периодический log в консоль (если открыта DevTools — поможет при профилировке)
  if (state.visible && state._renderEnd - state._lastLog > 1000) {
    state._lastLog = state._renderEnd;
    const fps = avg(state.fpsHistory).toFixed(1);
    const u = avg(state.updateHistory).toFixed(1);
    const r = avg(state.renderHistory).toFixed(1);
    // eslint-disable-next-line no-console
    console.log(`[FPS] ${fps}  update=${u}ms  render=${r}ms`);
  }
}

function push(arr, v) {
  arr.push(v);
  if (arr.length > HISTORY) arr.shift();
}

function avg(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

/**
 * Рисует overlay. Вызывать в конце render() — должен быть поверх всего.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} game — чтобы посчитать entity counts
 */
export function render(ctx, game) {
  if (!state.visible) return;

  const fps = avg(state.fpsHistory);
  const u = avg(state.updateHistory);
  const r = avg(state.renderHistory);

  const enemies = game.enemies ? game.enemies.length : 0;
  const projectiles = game.projectiles ? game.projectiles.length : 0;
  const particles = game.particles ? game.particles.length : 0;
  const chunks = game.chunkManager && game.chunkManager.chunks
    ? game.chunkManager.chunks.size || 0
    : 0;

  const lines = [
    `FPS: ${fps.toFixed(1)}`,
    `upd: ${u.toFixed(1)}ms`,
    `ren: ${r.toFixed(1)}ms`,
    `ent: E${enemies} P${projectiles} p${particles}`,
    `chunks: ${chunks}`,
  ];

  ctx.save();
  const x = 6;
  const y = 6;
  const w = 110;
  const h = lines.length * 11 + 6;

  // Полупрозрачный фон
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);

  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // Цвет меняется по FPS — красный если ниже 30, жёлтый если 30-50, зелёный выше
  const fpsColor = fps < 30 ? '#ff5252' : fps < 50 ? '#ffd54f' : '#81c784';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = i === 0 ? fpsColor : '#e0e0e0';
    ctx.fillText(lines[i], x + 4, y + 4 + i * 11);
  }
  ctx.restore();
}
