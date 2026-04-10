// ============================================================
// biome-hazards.js — Environmental Hazards per Biome
// ============================================================
// Biomes: plains, forest, mountains, wasteland, swamp, snow
// TILE IDs: MUD=14, ROCK=15, LAVA=4, SWAMP_WATER=18

import { createParticle } from './particles.js';

const TILE_SIZE = 32;
const TILE_MUD         = 14;
const TILE_ROCK        = 15;
const TILE_LAVA        = 4;
const TILE_SWAMP_WATER = 18;

export function createHazardManager() {

  // --- Swamp poison state ---
  let poisonTickTimer = 0;

  // --- Snow freeze state ---
  let snowTimer       = 0;   // continuous seconds in snow biome

  // --- Wasteland geyser state ---
  let geyserTimer     = _nextGeyserInterval();
  let geyserWarning   = false;  // true in final 1 sec before eruption
  let geyserWarningTimer = 0;
  let geyserLavaTile  = null;   // { wx, wy } world pixel of warning lava tile

  // --- Mountain rockfall state ---
  let rockfallTimer   = _nextRockfallInterval();
  let rockParticles   = [];     // { x, y, vy, life } screen-space falling squares

  // --- Current biome ---
  let currentBiome    = '';
  let speedMult       = 1.0;

  // -------------------------------------------------------
  function _nextGeyserInterval() {
    return 3 + Math.random() * 2; // 3–5 sec
  }

  function _nextRockfallInterval() {
    return 4 + Math.random() * 2; // 4–6 sec
  }

  // -------------------------------------------------------
  function update(player, chunkManager, dt, totalTime, particles) {
    if (!player || !chunkManager) return;

    const px = player.x + player.hitW / 2;
    const py = player.y + player.hitH / 2;
    const playerCol = Math.floor(px / TILE_SIZE);
    const playerRow = Math.floor(py / TILE_SIZE);

    currentBiome = chunkManager.getBiomeAtWorld(playerCol, playerRow) || '';

    // ---- reset speed multiplier each frame ----
    speedMult = 1.0;

    // ======================================================
    // SWAMP — Poison zones
    // ======================================================
    if (currentBiome === 'swamp') {
      const onMud = chunkManager.getTileAtWorld(playerCol, playerRow) === TILE_MUD;
      let adjacentSwampWater = false;
      if (onMud) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dc, dr] of dirs) {
          if (chunkManager.getTileAtWorld(playerCol + dc, playerRow + dr) === TILE_SWAMP_WATER) {
            adjacentSwampWater = true;
            break;
          }
        }
      }

      if (onMud && adjacentSwampWater && !(player.invincibleTimer > 0)) {
        player.hp -= 2 * dt;
        if (player.hp < 0) player.hp = 0;

        // Green damage particle every 1 sec
        poisonTickTimer -= dt;
        if (poisonTickTimer <= 0) {
          poisonTickTimer = 1.0;
          particles.push(createParticle(
            player.x + player.hitW / 2,
            player.y - 4,
            '-2',
            '#44ff44',
            1.0
          ));
        }
      } else {
        poisonTickTimer = 0;
      }
    } else {
      poisonTickTimer = 0;
    }

    // ======================================================
    // SNOW — Freezing
    // ======================================================
    if (currentBiome === 'snow') {
      speedMult = 0.7;
      snowTimer += dt;

      if (snowTimer >= 8 && !(player.invincibleTimer > 0)) {
        player.hp -= 1 * dt;
        if (player.hp < 0) player.hp = 0;

        // Blue damage particle (roughly every 1.5 sec using fract of snowTimer)
        const snowPhase = snowTimer % 1.5;
        if (snowPhase < dt) {
          particles.push(createParticle(
            player.x + player.hitW / 2,
            player.y - 4,
            '-1',
            '#88ccff',
            1.0
          ));
        }
      }
    } else {
      snowTimer = 0;
    }

    // ======================================================
    // WASTELAND — Fire Geysers
    // ======================================================
    if (currentBiome === 'wasteland') {
      geyserTimer -= dt;

      // Enter warning phase 1 sec before eruption
      if (geyserTimer <= 1.0 && !geyserWarning) {
        geyserWarning = true;
        geyserWarningTimer = geyserTimer;

        // Find a nearby LAVA tile to display warning on
        geyserLavaTile = null;
        outer:
        for (let dr = -3; dr <= 3; dr++) {
          for (let dc = -3; dc <= 3; dc++) {
            if (chunkManager.getTileAtWorld(playerCol + dc, playerRow + dr) === TILE_LAVA) {
              geyserLavaTile = {
                wx: (playerCol + dc) * TILE_SIZE + TILE_SIZE / 2,
                wy: (playerRow + dr) * TILE_SIZE + TILE_SIZE / 2
              };
              break outer;
            }
          }
        }
      }

      if (geyserTimer <= 0) {
        // Check if any LAVA tile within 3 tiles
        let foundLava = false;
        for (let dr = -3; dr <= 3 && !foundLava; dr++) {
          for (let dc = -3; dc <= 3 && !foundLava; dc++) {
            if (chunkManager.getTileAtWorld(playerCol + dc, playerRow + dr) === TILE_LAVA) {
              foundLava = true;
            }
          }
        }

        if (foundLava && !(player.invincibleTimer > 0)) {
          player.hp -= 15;
          if (player.hp < 0) player.hp = 0;

          // Orange explosion particles
          for (let i = 0; i < 3; i++) {
            particles.push(createParticle(
              player.x + player.hitW / 2 + (Math.random() - 0.5) * 12,
              player.y - 4 - Math.random() * 8,
              i === 0 ? '-15' : '💥',
              '#ff6600',
              1.2
            ));
          }
        }

        geyserTimer     = _nextGeyserInterval();
        geyserWarning   = false;
        geyserLavaTile  = null;
        geyserWarningTimer = 0;
      }
    } else {
      // Reset when not in wasteland
      geyserTimer    = _nextGeyserInterval();
      geyserWarning  = false;
      geyserLavaTile = null;
    }

    // ======================================================
    // MOUNTAINS — Rockfalls
    // ======================================================
    if (currentBiome === 'mountains') {
      rockfallTimer -= dt;

      if (rockfallTimer <= 0) {
        // Check if ROCK tile within 2 tiles
        let foundRock = false;
        let rockCol = playerCol, rockRow = playerRow;
        outer2:
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if (chunkManager.getTileAtWorld(playerCol + dc, playerRow + dr) === TILE_ROCK) {
              foundRock = true;
              rockCol = playerCol + dc;
              rockRow = playerRow + dr;
              break outer2;
            }
          }
        }

        if (foundRock && !(player.invincibleTimer > 0)) {
          player.hp -= 10;
          if (player.hp < 0) player.hp = 0;

          particles.push(createParticle(
            player.x + player.hitW / 2,
            player.y - 4,
            '-10',
            '#aaaaaa',
            1.0
          ));

          // Spawn falling rock visual squares (world coords)
          for (let i = 0; i < 5; i++) {
            rockParticles.push({
              x:    rockCol * TILE_SIZE + Math.random() * TILE_SIZE,
              y:    rockRow * TILE_SIZE - 20 - Math.random() * 30,
              vy:   80 + Math.random() * 60,
              life: 0.6 + Math.random() * 0.4,
              maxLife: 1.0,
              size: 3 + Math.random() * 4,
            });
          }
        }

        rockfallTimer = _nextRockfallInterval();
      }
    } else {
      rockfallTimer = _nextRockfallInterval();
    }

    // Update rock particles
    for (let i = rockParticles.length - 1; i >= 0; i--) {
      const rp = rockParticles[i];
      rp.y    += rp.vy * dt;
      rp.life -= dt;
      if (rp.life <= 0) rockParticles.splice(i, 1);
    }
  }

  // -------------------------------------------------------
  function render(ctx, camera, totalTime) {
    const GW = 640, GH = 480;

    // ======================================================
    // SWAMP — green tint pulse on screen edges
    // ======================================================
    if (currentBiome === 'swamp') {
      const pulse = 0.08 + 0.04 * Math.sin(totalTime * 3);
      const grad = ctx.createRadialGradient(GW / 2, GH / 2, GH * 0.25, GW / 2, GH / 2, GH * 0.75);
      grad.addColorStop(0, 'rgba(0,80,0,0)');
      grad.addColorStop(1, `rgba(0,160,0,${pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, GW, GH);
    }

    // ======================================================
    // SNOW — blue frost overlay intensifying with time
    // ======================================================
    if (currentBiome === 'snow') {
      const intensity = Math.min(snowTimer / 12, 1);
      const pulse = 0.05 + 0.03 * Math.sin(totalTime * 2);
      const alpha = pulse + intensity * 0.18;
      const grad = ctx.createRadialGradient(GW / 2, GH / 2, GH * 0.2, GW / 2, GH / 2, GH * 0.75);
      grad.addColorStop(0, 'rgba(80,160,255,0)');
      grad.addColorStop(1, `rgba(80,180,255,${alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, GW, GH);

      // Frost vignette corners
      if (intensity > 0.3) {
        ctx.fillStyle = `rgba(200,230,255,${(intensity - 0.3) * 0.15})`;
        ctx.fillRect(0, 0, GW, GH);
      }
    }

    // ======================================================
    // WASTELAND — geyser warning: pulsing orange glow on
    //              nearby LAVA tile
    // ======================================================
    if (currentBiome === 'wasteland' && geyserWarning && geyserLavaTile) {
      const sx = geyserLavaTile.wx - camera.x;
      const sy = geyserLavaTile.wy - camera.y;
      const pulse = 0.4 + 0.4 * Math.sin(totalTime * 10);
      const r = 20 + 8 * Math.sin(totalTime * 10);
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grd.addColorStop(0, `rgba(255,150,0,${pulse})`);
      grd.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }

    // ======================================================
    // MOUNTAINS — falling rock squares
    // ======================================================
    for (const rp of rockParticles) {
      const sx = rp.x - camera.x;
      const sy = rp.y - camera.y;
      const alpha = rp.life / rp.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#888';
      ctx.fillRect(sx, sy, rp.size, rp.size);
      ctx.fillStyle = '#555';
      ctx.fillRect(sx + 1, sy + 1, rp.size - 2, rp.size - 2);
    }
    ctx.globalAlpha = 1;
  }

  // -------------------------------------------------------
  function getSpeedMultiplier() {
    return speedMult;
  }

  return { update, render, getSpeedMultiplier };
}
