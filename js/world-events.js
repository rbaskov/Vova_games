/**
 * world-events.js — Periodic World Events for Open World
 *
 * Event types: Invasion, Caravan (chest), Meteorite, Chaos Portal
 * Each event spawns 3–8 chunks from the player, shows a beam of light
 * in the world and a pulsing marker on the minimap.
 */

import { TILE_SIZE } from './tilemap.js';
import { CHUNK_W, CHUNK_H } from './worldgen.js';
import { spawnEnemy } from './enemies.js';
import { createParticle } from './particles.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPAWN_INTERVAL_MIN = 180; // seconds
const SPAWN_INTERVAL_MAX = 300;
const POST_EVENT_COOLDOWN = 60; // seconds after event ends

// Minimum / maximum distance in CHUNKS from player
const MIN_CHUNKS = 3;
const MAX_CHUNKS = 8;

// Trigger radius: player must be within this many tiles to activate
const TRIGGER_TILES = 3;
const TRIGGER_PX = TRIGGER_TILES * TILE_SIZE;

// Event type weights (must sum to 100)
const EVENT_WEIGHTS = [
  { type: 'invasion',     weight: 30 },
  { type: 'caravan',      weight: 25 },
  { type: 'meteorite',    weight: 25 },
  { type: 'chaos_portal', weight: 20 },
];

// Per-type durations (seconds)
const EVENT_DURATION = {
  invasion:     90,
  caravan:      120,
  meteorite:    60,
  chaos_portal: 90,
};

// Beam / marker colours
const EVENT_COLOR = {
  invasion:     '#ff3333',
  caravan:      '#ffd700',
  meteorite:    '#cc44ff',
  chaos_portal: '#8b0000',
};

// Enemy types that can be spawned per event (fallback pool)
const INVASION_ENEMIES = ['bandit_sword', 'bandit_spear', 'bandit_archer', 'bandit_axe', 'skeleton', 'wolf'];
const CHAOS_ENEMIES    = ['skeleton', 'bandit_sword', 'bandit_archer', 'wolf', 'golem'];

// Rare weapons awarded by meteorite / chaos portal
const RARE_WEAPONS = ['mithril_sword', 'fire_spear', 'knight_spear', 'steel_axe', 'gladiator_axe', 'crossbow'];

// ---------------------------------------------------------------------------
// Helper: weighted random pick
// ---------------------------------------------------------------------------
function pickWeighted(weights) {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.type;
  }
  return weights[weights.length - 1].type;
}

// ---------------------------------------------------------------------------
// Helper: random spawn position 3–8 chunks from player
// ---------------------------------------------------------------------------
function randomEventPosition(playerX, playerY) {
  const angle = Math.random() * Math.PI * 2;
  const chunkDist = MIN_CHUNKS + Math.random() * (MAX_CHUNKS - MIN_CHUNKS);

  const offsetX = Math.cos(angle) * chunkDist * CHUNK_W * TILE_SIZE;
  const offsetY = Math.sin(angle) * chunkDist * CHUNK_H * TILE_SIZE;

  return {
    worldX: Math.round(playerX + offsetX),
    worldY: Math.round(playerY + offsetY),
  };
}

// ---------------------------------------------------------------------------
// Helper: spawn invasion enemies around a world position
// ---------------------------------------------------------------------------
function spawnInvasionEnemies(worldX, worldY, worldGen, count) {
  const col = Math.floor(worldX / TILE_SIZE);
  const row = Math.floor(worldY / TILE_SIZE);

  // Try to determine biome for flavour
  let biome = 'plains';
  if (worldGen && worldGen.getBiomeAt) {
    biome = worldGen.getBiomeAt(col, row);
  }

  // Pick enemy types based on biome
  let pool;
  switch (biome) {
    case 'forest':   pool = ['wolf', 'bandit_sword', 'bandit_archer']; break;
    case 'mountains':pool = ['golem', 'bandit_axe', 'bandit_spear'];   break;
    case 'wasteland':pool = ['skeleton', 'bandit_sword', 'bandit_axe'];break;
    case 'swamp':    pool = ['slime', 'skeleton', 'bandit_spear'];      break;
    case 'snow':     pool = ['wolf', 'golem', 'bandit_axe'];            break;
    default:         pool = INVASION_ENEMIES;
  }

  const spawned = [];
  for (let i = 0; i < count; i++) {
    const type = pool[Math.floor(Math.random() * pool.length)];
    const offsetCol = col + Math.floor((Math.random() - 0.5) * 8);
    const offsetRow = row + Math.floor((Math.random() - 0.5) * 8);
    const enemy = spawnEnemy(type, offsetCol, offsetRow);
    if (enemy) {
      // 2× tier multiplier for event enemies
      enemy.hp     = Math.ceil(enemy.hp * 2);
      enemy.maxHp  = enemy.hp;
      enemy.atk    = Math.ceil(enemy.atk * 1.5);
      enemy.xp     = Math.ceil(enemy.xp * 2);
      enemy.coins  = Math.ceil(enemy.coins * 2);
      enemy._eventEnemy = true;
      spawned.push(enemy);
    }
  }
  return spawned;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

/**
 * Create a world event manager.
 *
 * @param {object} worldGen - Instance returned by createWorldGen()
 * @returns {WorldEventManager}
 */
export function createWorldEventManager(worldGen) {
  let activeEvent = null;  // current event object
  let cooldownTimer = 0;   // countdown until next event can spawn
  let nextEventTimer = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);

  // -------------------------------------------------------------------------
  // Internal: create a new event
  // -------------------------------------------------------------------------
  function spawnEvent(player) {
    const type = pickWeighted(EVENT_WEIGHTS);
    const { worldX, worldY } = randomEventPosition(player.x, player.y);

    const event = {
      type,
      worldX,
      worldY,
      timer: EVENT_DURATION[type],
      color: EVENT_COLOR[type],
      triggered: false,   // true once player reached it
      completed: false,   // true once reward given
      // type-specific state
      meteoritePhase: type === 'meteorite' ? 'falling' : null, // 'falling' | 'impact'
      meteoriteTimer: type === 'meteorite' ? 3.0 : 0,          // fall animation 3 s
      invasionEnemies: [],
      chaosWave: 0,
      chaosEnemiesLeft: 0,
      chaosTotalWaves: 3,
    };

    return event;
  }

  // -------------------------------------------------------------------------
  // Internal: give completion reward to player
  // -------------------------------------------------------------------------
  function giveReward(player, particles, type, x, y) {
    let coins = 0;
    let xpBonus = 0;
    let weaponId = null;

    switch (type) {
      case 'invasion':
        coins = 50 + Math.floor(Math.random() * 51); // 50–100
        xpBonus = player.xp > 0 ? Math.ceil(player.xp * 0.1) : 50; // 10% XP bonus
        particles.push(createParticle(x, y - 32, `+${xpBonus} XP!`, '#cc66ff', 2.5));
        particles.push(createParticle(x, y - 16, `+${coins}$`, '#f0c040', 2.5));
        particles.push(createParticle(x, y - 48, 'ВТОРЖЕНИЕ ОТБИТО!', '#ff6666', 3));
        player.xp    += xpBonus;
        player.coins += coins;
        break;

      case 'caravan':
        coins = 80 + Math.floor(Math.random() * 81); // 80–160
        weaponId = RARE_WEAPONS[Math.floor(Math.random() * RARE_WEAPONS.length)];
        particles.push(createParticle(x, y - 32, `+${coins}$`, '#f0c040', 2.5));
        particles.push(createParticle(x, y - 48, 'ТОВАРЫ КАРАВАНА!', '#ffd700', 3));
        player.coins += coins;
        _grantWeapon(player, particles, weaponId, x, y);
        break;

      case 'meteorite':
        coins = 100 + Math.floor(Math.random() * 101); // 100–200
        weaponId = RARE_WEAPONS[Math.floor(Math.random() * RARE_WEAPONS.length)];
        particles.push(createParticle(x, y - 32, `+${coins}$`, '#f0c040', 2.5));
        particles.push(createParticle(x, y - 48, 'МЕТЕОРИТ!', '#cc44ff', 3));
        player.coins += coins;
        _grantWeapon(player, particles, weaponId, x, y);
        break;

      case 'chaos_portal':
        coins = 120 + Math.floor(Math.random() * 81); // 120–200
        xpBonus = player.xp > 0 ? Math.ceil(player.xp * 0.15) : 80;
        weaponId = RARE_WEAPONS[Math.floor(Math.random() * RARE_WEAPONS.length)];
        particles.push(createParticle(x, y - 32, `+${xpBonus} XP!`, '#cc66ff', 2.5));
        particles.push(createParticle(x, y - 16, `+${coins}$`, '#f0c040', 2.5));
        particles.push(createParticle(x, y - 48, 'ПОРТАЛ ЗАКРЫТ!', '#ff4444', 3));
        player.xp    += xpBonus;
        player.coins += coins;
        _grantWeapon(player, particles, weaponId, x, y);
        break;
    }
  }

  function _grantWeapon(player, particles, weaponId, x, y) {
    if (!weaponId) return;
    if (!player.ownedWeapons.includes(weaponId)) {
      player.ownedWeapons.push(weaponId);
      particles.push(createParticle(x, y - 64, weaponId + '!', '#ffd54f', 3));
    } else {
      // Already own it → extra coins compensation
      const bonus = 60 + Math.floor(Math.random() * 41);
      player.coins += bonus;
      particles.push(createParticle(x, y - 64, `+${bonus}$ (замена)`, '#f0c040', 2));
    }
  }

  // -------------------------------------------------------------------------
  // update() — called every frame from main.js
  // -------------------------------------------------------------------------
  function update(player, dt, totalTime, enemies, particles) {
    if (!player) return;

    // Count down to next event
    if (!activeEvent) {
      if (cooldownTimer > 0) {
        cooldownTimer -= dt;
        return;
      }
      nextEventTimer -= dt;
      if (nextEventTimer <= 0) {
        activeEvent = spawnEvent(player);
        nextEventTimer = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
        // Announce event
        const labels = {
          invasion:     'ВТОРЖЕНИЕ!',
          caravan:      'ТОРГОВЫЙ ОБОЗ!',
          meteorite:    'МЕТЕОРИТ!',
          chaos_portal: 'ПОРТАЛ ХАОСА!',
        };
        particles.push(createParticle(player.x, player.y - 40, labels[activeEvent.type], activeEvent.color, 3.5));
      }
      return;
    }

    // Event is active — tick its timer
    activeEvent.timer -= dt;
    if (activeEvent.timer <= 0 && !activeEvent.completed) {
      // Timed out — clean up any dangling invasion enemies
      _cleanupEventEnemies(enemies, activeEvent);
      _endEvent();
      return;
    }

    // Check distance to player
    const dx = player.x - activeEvent.worldX;
    const dy = player.y - activeEvent.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // --- Meteorite falling phase (pre-trigger animation) ---
    if (activeEvent.type === 'meteorite' && activeEvent.meteoritePhase === 'falling') {
      activeEvent.meteoriteTimer -= dt;
      if (activeEvent.meteoriteTimer <= 0) {
        activeEvent.meteoritePhase = 'impact';
        particles.push(createParticle(activeEvent.worldX, activeEvent.worldY - 20, 'УДАР!', '#cc44ff', 2));
      }
      return; // don't allow triggering during fall
    }

    // --- Player reaches event location ---
    if (!activeEvent.triggered && dist < TRIGGER_PX) {
      activeEvent.triggered = true;
      _triggerEvent(player, enemies, particles);
    }

    // --- Per-type update after trigger ---
    if (activeEvent.triggered) {
      _updateTriggeredEvent(player, enemies, particles, dt);
    }
  }

  function _triggerEvent(player, enemies, particles) {
    const ev = activeEvent;
    switch (ev.type) {
      case 'invasion': {
        const count = 8 + Math.floor(Math.random() * 5); // 8–12
        const newEnemies = spawnInvasionEnemies(ev.worldX, ev.worldY, worldGen, count);
        ev.invasionEnemies = newEnemies;
        enemies.push(...newEnemies);
        particles.push(createParticle(ev.worldX, ev.worldY - 32, 'Враги атакуют!', '#ff3333', 2));
        break;
      }
      case 'caravan': {
        // Mark as triggered — reward given when player presses E (handled externally)
        // For simplicity: auto-give reward on arrival
        particles.push(createParticle(ev.worldX, ev.worldY - 16, '[E] Забрать товары', '#ffd700', 3));
        break;
      }
      case 'meteorite': {
        particles.push(createParticle(ev.worldX, ev.worldY - 16, '[E] Осмотреть кратер', '#cc44ff', 3));
        break;
      }
      case 'chaos_portal': {
        particles.push(createParticle(ev.worldX, ev.worldY - 16, 'Портал открыт!', '#8b0000', 2));
        _spawnChaosWave(player, enemies, particles);
        break;
      }
    }
  }

  function _spawnChaosWave(player, enemies, particles) {
    const ev = activeEvent;
    ev.chaosWave++;
    const count = 4;
    const pool = CHAOS_ENEMIES;
    const col = Math.floor(ev.worldX / TILE_SIZE);
    const row = Math.floor(ev.worldY / TILE_SIZE);
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const type = pool[Math.floor(Math.random() * pool.length)];
      const oc = col + Math.floor((Math.random() - 0.5) * 6);
      const or = row + Math.floor((Math.random() - 0.5) * 6);
      const enemy = spawnEnemy(type, oc, or);
      if (enemy) {
        enemy.hp    = Math.ceil(enemy.hp * 2);
        enemy.maxHp = enemy.hp;
        enemy.atk   = Math.ceil(enemy.atk * 1.5);
        enemy.xp    = Math.ceil(enemy.xp * 2);
        enemy.coins = Math.ceil(enemy.coins * 2);
        enemy._eventEnemy = true;
        enemy._chaosEnemy = true;
        enemies.push(enemy);
        spawned++;
      }
    }
    ev.chaosEnemiesLeft = spawned;
    particles.push(createParticle(ev.worldX, ev.worldY - 40, `Волна ${ev.chaosWave}/${ev.chaosTotalWaves}!`, '#ff4444', 2));
  }

  function _updateTriggeredEvent(player, enemies, particles, dt) {
    const ev = activeEvent;

    switch (ev.type) {
      case 'invasion': {
        // Count how many invasion enemies are still alive
        const alive = ev.invasionEnemies.filter(e => e.alive).length;
        if (alive === 0 && !ev.completed) {
          ev.completed = true;
          giveReward(player, particles, 'invasion', ev.worldX, ev.worldY);
          _endEvent();
        }
        break;
      }

      case 'caravan':
      case 'meteorite': {
        // Auto-collect when close (no extra E needed — reward on first proximity)
        if (!ev.completed) {
          ev.completed = true;
          giveReward(player, particles, ev.type, ev.worldX, ev.worldY);
          _endEvent();
        }
        break;
      }

      case 'chaos_portal': {
        // Check if current wave is cleared
        const chaosAlive = enemies.filter(e => e.alive && e._chaosEnemy).length;
        if (chaosAlive === 0) {
          if (ev.chaosWave < ev.chaosTotalWaves) {
            _spawnChaosWave(player, enemies, particles);
          } else if (!ev.completed) {
            ev.completed = true;
            giveReward(player, particles, 'chaos_portal', ev.worldX, ev.worldY);
            _endEvent();
          }
        }
        break;
      }
    }
  }

  function _cleanupEventEnemies(enemies, ev) {
    // Remove un-triggered invasion enemies still alive (they were never near player)
    if (ev && ev.invasionEnemies) {
      for (const e of ev.invasionEnemies) {
        e.alive = false;
      }
    }
    // Also mark chaos enemies dead
    for (const e of enemies) {
      if (e._chaosEnemy) e.alive = false;
    }
  }

  function _endEvent() {
    activeEvent = null;
    cooldownTimer = POST_EVENT_COOLDOWN;
  }

  // -------------------------------------------------------------------------
  // render() — called from renderPlay(), draws world-space beam
  // -------------------------------------------------------------------------
  function render(ctx, camera) {
    if (!activeEvent) return;
    const ev = activeEvent;

    const sx = ev.worldX - camera.x;
    const sy = ev.worldY - camera.y;

    // Only draw when on screen (generous margin)
    if (sx < -80 || sx > 720 || sy < -300 || sy > 560) return;

    const t = Date.now() / 1000; // use real time for pulsing
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);

    // --- Meteorite falling animation ---
    if (ev.type === 'meteorite' && ev.meteoritePhase === 'falling') {
      const progress = 1 - (ev.meteoriteTimer / 3.0); // 0→1
      // Ball falling from top of screen toward world position
      const ballY = sy - 300 + progress * 300;
      const ballX = sx;

      // Purple trail
      ctx.save();
      const gradient = ctx.createLinearGradient(ballX, ballY - 60, ballX, ballY);
      gradient.addColorStop(0, 'rgba(180, 60, 255, 0)');
      gradient.addColorStop(1, 'rgba(180, 60, 255, 0.8)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 6 + pulse * 4;
      ctx.beginPath();
      ctx.moveTo(ballX, ballY - 60);
      ctx.lineTo(ballX, ballY);
      ctx.stroke();

      // Meteor ball
      ctx.fillStyle = `rgba(200, 100, 255, ${0.8 + pulse * 0.2})`;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 8 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // --- Vertical light beam ---
    const beamHeight = 280;
    const beamWidth  = 12 + pulse * 6;
    const alpha      = 0.35 + pulse * 0.25;
    const color      = ev.color;

    ctx.save();

    // Beam gradient
    const grad = ctx.createLinearGradient(sx, sy - beamHeight, sx, sy);
    const rgb  = _hexToRgb(color);
    grad.addColorStop(0, `rgba(${rgb},0)`);
    grad.addColorStop(0.5, `rgba(${rgb},${alpha})`);
    grad.addColorStop(1, `rgba(${rgb},${alpha * 0.6})`);

    ctx.fillStyle = grad;
    ctx.fillRect(sx - beamWidth / 2, sy - beamHeight, beamWidth, beamHeight);

    // Ground circle glow
    const glowRadius = 20 + pulse * 8;
    const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRadius);
    glowGrad.addColorStop(0, `rgba(${rgb},${0.5 + pulse * 0.3})`);
    glowGrad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, glowRadius, glowRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Chaos portal specific: draw portal ring ---
    if (ev.type === 'chaos_portal') {
      ctx.strokeStyle = `rgba(${rgb},${0.6 + pulse * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 28 + pulse * 6, 14 + pulse * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Meteorite impact: draw crater ---
    if (ev.type === 'meteorite' && ev.meteoritePhase === 'impact') {
      ctx.fillStyle = `rgba(${rgb},${0.3 + pulse * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy + 4, 22 + pulse * 4, 12 + pulse * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},0.7)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // --- Event label (only when nearby, within ~5 chunks) ---
    const labelDist = 5 * CHUNK_W * TILE_SIZE;
    // We infer world distance from camera offset
    // (worldX,worldY relative to camera = screen space difference from camera.x,camera.y)
    // Just always show it — it's only rendered when on screen anyway
    const labels = {
      invasion:     'ВТОРЖЕНИЕ',
      caravan:      'ОБОЗ',
      meteorite:    'МЕТЕОРИТ',
      chaos_portal: 'ПОРТАЛ ХАОСА',
    };
    const timerSec = Math.ceil(ev.timer);
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = `rgba(${rgb},${0.8 + pulse * 0.2})`;
    ctx.fillText(`${labels[ev.type]} ${timerSec}с`, sx, sy - beamHeight + 12);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // getMinimapMarker() — returns {worldX, worldY, color, label} or null
  // -------------------------------------------------------------------------
  function getMinimapMarker() {
    if (!activeEvent) return null;
    return {
      worldX: activeEvent.worldX,
      worldY: activeEvent.worldY,
      color:  activeEvent.color,
      label:  activeEvent.type,
      timer:  activeEvent.timer,
    };
  }

  // -------------------------------------------------------------------------
  // isEventActive()
  // -------------------------------------------------------------------------
  function isEventActive() {
    return activeEvent !== null;
  }

  // -------------------------------------------------------------------------
  // Utility: hex color "#rrggbb" → "r,g,b" string for rgba()
  // -------------------------------------------------------------------------
  function _hexToRgb(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r},${g},${b}`;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  return {
    get activeEvent()   { return activeEvent; },
    get cooldownTimer() { return cooldownTimer; },
    update,
    render,
    getMinimapMarker,
    isEventActive,
  };
}
