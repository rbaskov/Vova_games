// ============================================================
// sprites.js — Programmatic Pixel Art Sprite System
// All sprites drawn with ctx.fillRect() — no external images.
// ============================================================

const T = 32; // tile size
const s = 2;  // character scale

// -------  TILE CONSTANTS  -------

export const TILE = {
  GRASS: 0,
  DIRT: 1,
  WALL: 2,
  WATER: 3,
  LAVA: 4,
  PORTAL: 5,
  TREE: 6,
  ICE: 7,
  CASTLE: 8,
};

export const SOLID_TILES = new Set([TILE.WALL, TILE.WATER, TILE.LAVA, TILE.TREE]);

// -------  TILE DRAW FUNCTIONS  -------

export function drawGrassTile(ctx, x, y) {
  // Base green
  ctx.fillStyle = '#3a8c3a';
  ctx.fillRect(x, y, T, T);
  // Lighter patches
  ctx.fillStyle = '#4aad4a';
  ctx.fillRect(x + 4, y + 2, 4, 2);
  ctx.fillRect(x + 18, y + 10, 4, 2);
  ctx.fillRect(x + 8, y + 22, 4, 2);
  ctx.fillRect(x + 24, y + 26, 4, 2);
  ctx.fillRect(x + 14, y + 6, 2, 2);
  // Dark detail blades
  ctx.fillStyle = '#2e7a2e';
  ctx.fillRect(x + 2, y + 14, 2, 4);
  ctx.fillRect(x + 12, y + 16, 2, 4);
  ctx.fillRect(x + 26, y + 4, 2, 4);
  ctx.fillRect(x + 20, y + 20, 2, 4);
  ctx.fillRect(x + 6, y + 28, 2, 2);
}

export function drawDirtTile(ctx, x, y) {
  // Base brown
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(x, y, T, T);
  // Light specks
  ctx.fillStyle = '#a07828';
  ctx.fillRect(x + 4, y + 4, 2, 2);
  ctx.fillRect(x + 16, y + 8, 2, 2);
  ctx.fillRect(x + 10, y + 20, 2, 2);
  ctx.fillRect(x + 24, y + 14, 2, 2);
  ctx.fillRect(x + 6, y + 28, 2, 2);
  // Dark pebbles
  ctx.fillStyle = '#6b5010';
  ctx.fillRect(x + 20, y + 2, 4, 2);
  ctx.fillRect(x + 2, y + 18, 4, 2);
  ctx.fillRect(x + 14, y + 26, 4, 2);
  ctx.fillRect(x + 26, y + 24, 2, 2);
}

export function drawWallTile(ctx, x, y) {
  // Base stone
  ctx.fillStyle = '#777';
  ctx.fillRect(x, y, T, T);
  // Brick pattern — row 1
  ctx.fillStyle = '#888';
  ctx.fillRect(x, y, 14, 8);
  ctx.fillRect(x + 16, y, 16, 8);
  // Row 2 offset
  ctx.fillRect(x + 8, y + 10, 14, 8);
  ctx.fillRect(x + 24, y + 10, 8, 8);
  ctx.fillRect(x, y + 10, 6, 8);
  // Row 3
  ctx.fillRect(x, y + 20, 14, 8);
  ctx.fillRect(x + 16, y + 20, 16, 8);
  // Mortar lines
  ctx.fillStyle = '#555';
  ctx.fillRect(x, y + 8, T, 2);
  ctx.fillRect(x, y + 18, T, 2);
  ctx.fillRect(x, y + 28, T, 2);
  // Vertical mortar
  ctx.fillRect(x + 14, y, 2, 8);
  ctx.fillRect(x + 6, y + 10, 2, 8);
  ctx.fillRect(x + 22, y + 10, 2, 8);
  ctx.fillRect(x + 14, y + 20, 2, 8);
  // Highlight edges
  ctx.fillStyle = '#999';
  ctx.fillRect(x, y, T, 1);
  ctx.fillRect(x, y, 1, T);
  // Shadow edges
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 31, y, 1, T);
  ctx.fillRect(x, y + 31, T, 1);
}

export function drawWaterTile(ctx, x, y, frame = 0) {
  // Base deep blue
  ctx.fillStyle = '#1a5eb8';
  ctx.fillRect(x, y, T, T);
  // Animated wave highlights
  const off = (frame % 4) * 4;
  ctx.fillStyle = '#2e8adf';
  for (let row = 0; row < 4; row++) {
    const rx = ((off + row * 10) % 28);
    ctx.fillRect(x + rx, y + row * 8 + 2, 8, 2);
  }
  // Shimmer
  ctx.fillStyle = '#60b0ff';
  ctx.fillRect(x + ((off + 6) % 24), y + 4, 4, 2);
  ctx.fillRect(x + ((off + 14) % 24), y + 18, 4, 2);
  // Dark depth
  ctx.fillStyle = '#104080';
  ctx.fillRect(x + ((off + 2) % 26), y + 12, 6, 2);
  ctx.fillRect(x + ((off + 16) % 26), y + 26, 6, 2);
}

export function drawLavaTile(ctx, x, y, frame = 0) {
  // Base dark red
  ctx.fillStyle = '#8b1a00';
  ctx.fillRect(x, y, T, T);
  // Flowing orange
  const off = (frame % 4) * 3;
  ctx.fillStyle = '#d44500';
  ctx.fillRect(x + ((off) % 24), y + 2, 10, 4);
  ctx.fillRect(x + ((off + 12) % 24), y + 14, 10, 4);
  ctx.fillRect(x + ((off + 6) % 24), y + 24, 8, 4);
  // Bright yellow hot spots
  ctx.fillStyle = '#ff8c00';
  ctx.fillRect(x + ((off + 4) % 22), y + 4, 4, 2);
  ctx.fillRect(x + ((off + 16) % 22), y + 16, 4, 2);
  // Glow
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(x + ((off + 8) % 26), y + 10, 2, 2);
  ctx.fillRect(x + ((off + 20) % 26), y + 22, 2, 2);
}

export function drawPortalTile(ctx, x, y, frame = 0) {
  // Base dark purple
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(x, y, T, T);
  // Pulsing rings
  const pulse = frame % 4;
  const colors = ['#5a1a8e', '#7b2ebd', '#a050e0', '#c080ff'];
  // Outer ring
  ctx.fillStyle = colors[pulse];
  ctx.fillRect(x + 4, y + 2, 24, 2);
  ctx.fillRect(x + 4, y + 28, 24, 2);
  ctx.fillRect(x + 2, y + 4, 2, 24);
  ctx.fillRect(x + 28, y + 4, 2, 24);
  // Middle ring
  ctx.fillStyle = colors[(pulse + 1) % 4];
  ctx.fillRect(x + 8, y + 6, 16, 2);
  ctx.fillRect(x + 8, y + 24, 16, 2);
  ctx.fillRect(x + 6, y + 8, 2, 16);
  ctx.fillRect(x + 24, y + 8, 2, 16);
  // Inner glow
  ctx.fillStyle = colors[(pulse + 2) % 4];
  ctx.fillRect(x + 12, y + 10, 8, 2);
  ctx.fillRect(x + 12, y + 20, 8, 2);
  ctx.fillRect(x + 10, y + 12, 2, 8);
  ctx.fillRect(x + 20, y + 12, 2, 8);
  // Center bright
  ctx.fillStyle = '#e0c0ff';
  ctx.fillRect(x + 14, y + 14, 4, 4);
}

export function drawTreeTile(ctx, x, y) {
  // Grass base
  drawGrassTile(ctx, x, y);
  // Trunk
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(x + 12, y + 18, 8, 14);
  // Trunk highlight
  ctx.fillStyle = '#8b5a34';
  ctx.fillRect(x + 14, y + 20, 2, 10);
  // Leaves — dark layer
  ctx.fillStyle = '#1a6b1a';
  ctx.fillRect(x + 6, y + 4, 20, 6);
  ctx.fillRect(x + 4, y + 8, 24, 6);
  ctx.fillRect(x + 8, y + 14, 16, 6);
  // Leaves — lighter
  ctx.fillStyle = '#2e9b2e';
  ctx.fillRect(x + 10, y + 4, 6, 4);
  ctx.fillRect(x + 8, y + 8, 8, 4);
  ctx.fillRect(x + 18, y + 10, 6, 4);
  ctx.fillRect(x + 12, y + 14, 4, 4);
}

export function drawIceTile(ctx, x, y) {
  // Base ice blue
  ctx.fillStyle = '#a8d8ea';
  ctx.fillRect(x, y, T, T);
  // Lighter patches (reflection)
  ctx.fillStyle = '#d0f0ff';
  ctx.fillRect(x + 2, y + 2, 8, 4);
  ctx.fillRect(x + 16, y + 12, 8, 4);
  ctx.fillRect(x + 6, y + 24, 10, 4);
  // Cracks
  ctx.fillStyle = '#80b8cc';
  ctx.fillRect(x + 10, y + 6, 2, 8);
  ctx.fillRect(x + 12, y + 12, 6, 2);
  ctx.fillRect(x + 24, y + 2, 2, 6);
  ctx.fillRect(x + 22, y + 20, 2, 8);
  ctx.fillRect(x + 4, y + 16, 4, 2);
  // Sparkle
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 4, y + 4, 2, 2);
  ctx.fillRect(x + 20, y + 14, 2, 2);
  ctx.fillRect(x + 12, y + 26, 2, 2);
}

export function drawCastleTile(ctx, x, y) {
  // Base dark stone
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(x, y, T, T);
  // Tile pattern
  ctx.fillStyle = '#44445a';
  ctx.fillRect(x, y, 16, 16);
  ctx.fillRect(x + 16, y + 16, 16, 16);
  // Grout lines
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(x + 15, y, 2, T);
  ctx.fillRect(x, y + 15, T, 2);
  // Subtle highlights
  ctx.fillStyle = '#50506a';
  ctx.fillRect(x + 2, y + 2, 4, 2);
  ctx.fillRect(x + 20, y + 18, 4, 2);
  // Dark scuffs
  ctx.fillStyle = '#2e2e3e';
  ctx.fillRect(x + 8, y + 8, 2, 2);
  ctx.fillRect(x + 24, y + 24, 2, 2);
}

// -------  TILE DRAWER MAP  -------

export const tileDrawers = {
  [TILE.GRASS]: drawGrassTile,
  [TILE.DIRT]: drawDirtTile,
  [TILE.WALL]: drawWallTile,
  [TILE.WATER]: (ctx, x, y) => drawWaterTile(ctx, x, y, 0),
  [TILE.LAVA]: (ctx, x, y) => drawLavaTile(ctx, x, y, 0),
  [TILE.PORTAL]: (ctx, x, y) => drawPortalTile(ctx, x, y, 0),
  [TILE.TREE]: drawTreeTile,
  [TILE.ICE]: drawIceTile,
  [TILE.CASTLE]: drawCastleTile,
};

// -------  CHARACTER SPRITES  -------

export function drawHero(ctx, x, y, facing = 'down', frame = 0, attacking = false) {
  ctx.save();
  ctx.translate(x, y);

  const f = frame % 4;
  const mirror = facing === 'left';
  if (mirror) {
    ctx.scale(-1, 1);
    ctx.translate(-32, 0);
  }

  // ---------- Body ----------
  // Hair (brown)
  ctx.fillStyle = '#6b3a1a';
  if (facing === 'up') {
    ctx.fillRect(6 * s, 0, 4 * s, 3 * s);
  } else {
    ctx.fillRect(6 * s, 0, 4 * s, 2 * s);
    // Fringe
    ctx.fillRect(5 * s, 1 * s, 1 * s, 2 * s);
  }

  // Head (skin)
  ctx.fillStyle = '#f0c8a0';
  if (facing === 'up') {
    // Back of head, no face
    ctx.fillRect(6 * s, 2 * s, 4 * s, 4 * s);
  } else {
    ctx.fillRect(6 * s, 2 * s, 4 * s, 4 * s);
    // Eyes
    ctx.fillStyle = '#222';
    if (facing === 'down') {
      ctx.fillRect(7 * s, 3 * s, 1 * s, 1 * s);
      ctx.fillRect(9 * s, 3 * s, 1 * s, 1 * s);
    } else {
      // Side-facing (right or left-mirrored)
      ctx.fillRect(8 * s, 3 * s, 1 * s, 1 * s);
    }
  }

  // Tunic (blue)
  ctx.fillStyle = '#2266bb';
  ctx.fillRect(5 * s, 6 * s, 6 * s, 6 * s);
  // Belt
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(5 * s, 10 * s, 6 * s, 1 * s);
  // Belt buckle
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(7 * s, 10 * s, 2 * s, 1 * s);

  // Arms
  ctx.fillStyle = '#2266bb';
  const armSwing = (f === 1 || f === 3) ? 1 : 0;
  // Left arm
  ctx.fillRect(4 * s, (7 + armSwing) * s, 1 * s, 4 * s);
  // Right arm
  ctx.fillRect(11 * s, (7 - armSwing) * s, 1 * s, 4 * s);
  // Hands (skin)
  ctx.fillStyle = '#f0c8a0';
  ctx.fillRect(4 * s, (11 + armSwing) * s, 1 * s, 1 * s);
  ctx.fillRect(11 * s, (11 - armSwing) * s, 1 * s, 1 * s);

  // Legs (brown pants)
  ctx.fillStyle = '#6b5a3a';
  const legSwing = f % 2;
  // Left leg
  ctx.fillRect(6 * s, 12 * s, 2 * s, 5 * s + legSwing * s);
  // Right leg
  ctx.fillRect(9 * s, 12 * s, 2 * s, 5 * s + (1 - legSwing) * s);
  // Boots
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(6 * s, (16 + legSwing) * s, 2 * s, 2 * s);
  ctx.fillRect(9 * s, (16 + 1 - legSwing) * s, 2 * s, 2 * s);

  // Weapon is drawn separately by main.js via weapons.js

  ctx.restore();
}

export function drawSlime(ctx, x, y, frame = 0) {
  ctx.save();
  ctx.translate(x, y);

  const f = frame % 4;
  // Squish: frames 0,2 normal; 1 tall; 3 flat
  let w, h, yOff;
  if (f === 1) { w = 12; h = 14; yOff = -2; }
  else if (f === 3) { w = 14; h = 10; yOff = 2; }
  else { w = 13; h = 12; yOff = 0; }

  const ox = (16 - w) * s / 2;
  const oy = (20 - h) * s / 2 + yOff * s;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(4 * s, 18 * s, 10 * s, 2 * s);

  // Body
  ctx.fillStyle = '#44cc44';
  ctx.fillRect(ox, oy, w * s, h * s);

  // Highlight
  ctx.fillStyle = '#66ee66';
  ctx.fillRect(ox + 2 * s, oy + 2 * s, 3 * s, 2 * s);

  // Dark underside
  ctx.fillStyle = '#2a8a2a';
  ctx.fillRect(ox, oy + (h - 2) * s, w * s, 2 * s);

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(ox + 3 * s, oy + 3 * s, 2 * s, 2 * s);
  ctx.fillRect(ox + (w - 5) * s, oy + 3 * s, 2 * s, 2 * s);
  // Pupils
  ctx.fillStyle = '#111';
  ctx.fillRect(ox + 4 * s, oy + 4 * s, 1 * s, 1 * s);
  ctx.fillRect(ox + (w - 4) * s, oy + 4 * s, 1 * s, 1 * s);

  ctx.restore();
}

export function drawWolf(ctx, x, y, facing = 'right', frame = 0) {
  ctx.save();
  ctx.translate(x, y);

  if (facing === 'left') {
    ctx.scale(-1, 1);
    ctx.translate(-32, 0);
  }

  const f = frame % 4;

  // Body (gray)
  ctx.fillStyle = '#888';
  ctx.fillRect(3 * s, 6 * s, 10 * s, 6 * s);

  // Lighter belly
  ctx.fillStyle = '#aaa';
  ctx.fillRect(4 * s, 10 * s, 8 * s, 2 * s);

  // Head
  ctx.fillStyle = '#888';
  ctx.fillRect(11 * s, 3 * s, 5 * s, 5 * s);
  // Snout
  ctx.fillStyle = '#999';
  ctx.fillRect(14 * s, 5 * s, 2 * s, 3 * s);

  // Ears
  ctx.fillStyle = '#666';
  ctx.fillRect(11 * s, 2 * s, 2 * s, 2 * s);
  ctx.fillRect(14 * s, 2 * s, 2 * s, 2 * s);

  // Red eyes
  ctx.fillStyle = '#ff2222';
  ctx.fillRect(12 * s, 4 * s, 1 * s, 1 * s);
  ctx.fillRect(14 * s, 4 * s, 1 * s, 1 * s);

  // Nose
  ctx.fillStyle = '#222';
  ctx.fillRect(15 * s, 6 * s, 1 * s, 1 * s);

  // Tail
  ctx.fillStyle = '#777';
  ctx.fillRect(1 * s, 5 * s, 3 * s, 2 * s);
  ctx.fillRect(0, 4 * s, 2 * s, 2 * s);

  // Legs with animation
  const legOff = (f === 1 || f === 3) ? 1 : 0;
  ctx.fillStyle = '#777';
  // Front legs
  ctx.fillRect(10 * s, 12 * s, 2 * s, 4 * s + legOff * s);
  ctx.fillRect(12 * s, 12 * s, 2 * s, 4 * s + (1 - legOff) * s);
  // Back legs
  ctx.fillRect(4 * s, 12 * s, 2 * s, 4 * s + (1 - legOff) * s);
  ctx.fillRect(6 * s, 12 * s, 2 * s, 4 * s + legOff * s);

  // Paws
  ctx.fillStyle = '#555';
  ctx.fillRect(10 * s, (16 + legOff) * s, 2 * s, 1 * s);
  ctx.fillRect(12 * s, (16 + 1 - legOff) * s, 2 * s, 1 * s);
  ctx.fillRect(4 * s, (16 + 1 - legOff) * s, 2 * s, 1 * s);
  ctx.fillRect(6 * s, (16 + legOff) * s, 2 * s, 1 * s);

  ctx.restore();
}

export function drawSkeleton(ctx, x, y, frame = 0) {
  ctx.save();
  ctx.translate(x, y);

  const f = frame % 4;

  // Skull
  ctx.fillStyle = '#eee';
  ctx.fillRect(6 * s, 0, 5 * s, 5 * s);
  // Eye sockets
  ctx.fillStyle = '#222';
  ctx.fillRect(7 * s, 1 * s, 1 * s, 2 * s);
  ctx.fillRect(9 * s, 1 * s, 1 * s, 2 * s);
  // Nose
  ctx.fillRect(8 * s, 3 * s, 1 * s, 1 * s);
  // Jaw
  ctx.fillStyle = '#ddd';
  ctx.fillRect(7 * s, 4 * s, 3 * s, 1 * s);

  // Spine
  ctx.fillStyle = '#ddd';
  ctx.fillRect(8 * s, 5 * s, 1 * s, 7 * s);

  // Ribs
  ctx.fillStyle = '#eee';
  for (let r = 0; r < 3; r++) {
    ctx.fillRect(5 * s, (6 + r * 2) * s, 7 * s, 1 * s);
  }

  // Arms with animation
  const armSwing = (f === 1 || f === 3) ? 1 : 0;
  ctx.fillStyle = '#ddd';
  // Left arm
  ctx.fillRect(4 * s, (6 + armSwing) * s, 1 * s, 5 * s);
  // Right arm
  ctx.fillRect(12 * s, (6 - armSwing) * s, 1 * s, 5 * s);
  // Hands
  ctx.fillStyle = '#eee';
  ctx.fillRect(4 * s, (11 + armSwing) * s, 1 * s, 1 * s);
  ctx.fillRect(12 * s, (11 - armSwing) * s, 1 * s, 1 * s);

  // Pelvis
  ctx.fillStyle = '#ccc';
  ctx.fillRect(6 * s, 12 * s, 5 * s, 1 * s);

  // Legs
  const legSwing = f % 2;
  ctx.fillStyle = '#ddd';
  ctx.fillRect(6 * s, 13 * s, 1 * s, 5 * s + legSwing * s);
  ctx.fillRect(10 * s, 13 * s, 1 * s, 5 * s + (1 - legSwing) * s);
  // Feet
  ctx.fillStyle = '#ccc';
  ctx.fillRect(5 * s, (18 + legSwing) * s, 2 * s, 1 * s);
  ctx.fillRect(10 * s, (18 + 1 - legSwing) * s, 2 * s, 1 * s);

  ctx.restore();
}

export function drawGolem(ctx, x, y, frame = 0) {
  ctx.save();
  ctx.translate(x, y);

  const f = frame % 4;

  // Body — large ice blue
  ctx.fillStyle = '#6699bb';
  ctx.fillRect(3 * s, 4 * s, 10 * s, 10 * s);

  // Head
  ctx.fillStyle = '#7ab0cc';
  ctx.fillRect(4 * s, 0, 8 * s, 5 * s);

  // Eyes — glowing white
  ctx.fillStyle = '#ccffff';
  ctx.fillRect(5 * s, 2 * s, 2 * s, 2 * s);
  ctx.fillRect(9 * s, 2 * s, 2 * s, 2 * s);
  // Eye glow center
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(6 * s, 2 * s, 1 * s, 1 * s);
  ctx.fillRect(10 * s, 2 * s, 1 * s, 1 * s);

  // Ice crystals on top
  ctx.fillStyle = '#aaddff';
  ctx.fillRect(5 * s, -2 * s, 2 * s, 3 * s);
  ctx.fillRect(9 * s, -1 * s, 2 * s, 2 * s);
  ctx.fillRect(7 * s, -3 * s, 2 * s, 4 * s);
  // Crystal highlights
  ctx.fillStyle = '#ddeeff';
  ctx.fillRect(5 * s, -2 * s, 1 * s, 1 * s);
  ctx.fillRect(7 * s, -3 * s, 1 * s, 1 * s);

  // Chest detail
  ctx.fillStyle = '#5588aa';
  ctx.fillRect(5 * s, 6 * s, 6 * s, 2 * s);
  ctx.fillStyle = '#88ccdd';
  ctx.fillRect(6 * s, 7 * s, 4 * s, 1 * s);

  // Arms — thick
  const armOff = (f === 1 || f === 3) ? 1 : 0;
  ctx.fillStyle = '#5e8eaa';
  ctx.fillRect(1 * s, (5 + armOff) * s, 2 * s, 7 * s);
  ctx.fillRect(13 * s, (5 - armOff) * s, 2 * s, 7 * s);
  // Fists
  ctx.fillStyle = '#7ab0cc';
  ctx.fillRect(1 * s, (12 + armOff) * s, 2 * s, 2 * s);
  ctx.fillRect(13 * s, (12 - armOff) * s, 2 * s, 2 * s);

  // Legs — thick
  const legOff = f % 2;
  ctx.fillStyle = '#5e8eaa';
  ctx.fillRect(4 * s, 14 * s, 3 * s, 5 * s + legOff * s);
  ctx.fillRect(9 * s, 14 * s, 3 * s, 5 * s + (1 - legOff) * s);
  // Feet
  ctx.fillStyle = '#4a7a99';
  ctx.fillRect(3 * s, (19 + legOff) * s, 4 * s, 1 * s);
  ctx.fillRect(9 * s, (19 + 1 - legOff) * s, 4 * s, 1 * s);

  ctx.restore();
}

export function drawNPC(ctx, x, y, bodyColor = '#cc6633', headDetail = '#cc2222') {
  ctx.save();
  ctx.translate(x, y);

  // Head (skin)
  ctx.fillStyle = '#f0c8a0';
  ctx.fillRect(6 * s, 1 * s, 4 * s, 4 * s);

  // Eyes
  ctx.fillStyle = '#222';
  ctx.fillRect(7 * s, 2 * s, 1 * s, 1 * s);
  ctx.fillRect(9 * s, 2 * s, 1 * s, 1 * s);

  // Headband / hat detail
  ctx.fillStyle = headDetail;
  ctx.fillRect(5 * s, 0, 6 * s, 2 * s);

  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(5 * s, 5 * s, 6 * s, 7 * s);

  // Arms
  ctx.fillRect(4 * s, 6 * s, 1 * s, 5 * s);
  ctx.fillRect(11 * s, 6 * s, 1 * s, 5 * s);
  // Hands
  ctx.fillStyle = '#f0c8a0';
  ctx.fillRect(4 * s, 11 * s, 1 * s, 1 * s);
  ctx.fillRect(11 * s, 11 * s, 1 * s, 1 * s);

  // Legs
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(6 * s, 12 * s, 2 * s, 6 * s);
  ctx.fillRect(9 * s, 12 * s, 2 * s, 6 * s);

  // Boots
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(6 * s, 17 * s, 2 * s, 1 * s);
  ctx.fillRect(9 * s, 17 * s, 2 * s, 1 * s);

  ctx.restore();
}

// -------  ITEM SPRITES  -------

export function drawPotionSprite(ctx, x, y, size = 16) {
  ctx.save();
  ctx.translate(x, y);

  const u = size / 16; // unit

  // Bottle neck (glass)
  ctx.fillStyle = '#aaaacc';
  ctx.fillRect(6 * u, 0, 4 * u, 4 * u);
  // Cork
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(6 * u, 0, 4 * u, 2 * u);

  // Bottle body
  ctx.fillStyle = '#cc2222';
  ctx.fillRect(3 * u, 4 * u, 10 * u, 10 * u);
  // Rounded bottom
  ctx.fillRect(4 * u, 14 * u, 8 * u, 2 * u);

  // Highlight
  ctx.fillStyle = '#ff6666';
  ctx.fillRect(4 * u, 5 * u, 2 * u, 4 * u);

  // Glass shine
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(5 * u, 5 * u, 1 * u, 3 * u);

  // Dark shading
  ctx.fillStyle = '#991111';
  ctx.fillRect(10 * u, 6 * u, 2 * u, 6 * u);

  ctx.restore();
}

export function drawCoinSprite(ctx, x, y, size = 16) {
  ctx.save();
  ctx.translate(x, y);

  const u = size / 16;

  // Outer ring (dark gold)
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(3 * u, 1 * u, 10 * u, 2 * u);
  ctx.fillRect(1 * u, 3 * u, 2 * u, 10 * u);
  ctx.fillRect(3 * u, 13 * u, 10 * u, 2 * u);
  ctx.fillRect(13 * u, 3 * u, 2 * u, 10 * u);

  // Main coin body
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(3 * u, 3 * u, 10 * u, 10 * u);

  // Inner highlight
  ctx.fillStyle = '#ffec80';
  ctx.fillRect(4 * u, 3 * u, 4 * u, 3 * u);

  // "C" letter (coin mark)
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(6 * u, 5 * u, 4 * u, 1 * u);
  ctx.fillRect(5 * u, 6 * u, 2 * u, 4 * u);
  ctx.fillRect(6 * u, 10 * u, 4 * u, 1 * u);

  // Shine
  ctx.fillStyle = '#fff8dc';
  ctx.fillRect(4 * u, 4 * u, 1 * u, 1 * u);

  ctx.restore();
}
