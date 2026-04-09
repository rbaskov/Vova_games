# Chronicles of Eldoria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable top-down pixel art Action-RPG in the browser with 5 locations, real-time combat, leveling, and inventory.

**Architecture:** HTML5 Canvas renders the game world. Vanilla JS modules handle game loop, player, enemies, combat, maps, NPC dialogs, inventory, camera, sprites, and UI. Tile-based maps stored as JSON. All sprites are programmatically drawn on canvas (no external image assets needed). Game state saved to localStorage.

**Tech Stack:** HTML5 Canvas, Vanilla JavaScript (ES6 modules), Press Start 2P font (Google Fonts)

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Entry point, canvas element, font loading |
| `css/style.css` | Page layout, canvas centering, menu overlays |
| `js/main.js` | Game loop, state machine (menu/play/dialog/inventory/gameover), init |
| `js/input.js` | Keyboard input tracking (keys currently pressed) |
| `js/camera.js` | Viewport offset, follow player, clamp to map bounds |
| `js/sprites.js` | Programmatic pixel sprite drawing functions (hero, enemies, tiles, items) |
| `js/tilemap.js` | Load tile data, render tile layers, collision lookup |
| `js/player.js` | Player entity: position, movement, facing, animation state, stats |
| `js/enemies.js` | Enemy spawning, AI patterns, per-enemy update logic |
| `js/combat.js` | Damage calculation, sword attack hitbox, ability effects, knockback |
| `js/abilities.js` | 3 elemental abilities: cooldowns, activation, projectiles, AoE |
| `js/npc.js` | NPC definitions, dialog trees, quest state |
| `js/dialog.js` | Dialog box renderer, text progression, choice selection |
| `js/inventory.js` | Item grid, stacking, equip, use potions, shop buy logic |
| `js/ui.js` | HUD rendering (HP bar, XP bar, level, coins, ability cooldowns, minimap) |
| `js/particles.js` | Simple particle effects (damage numbers, ability VFX, loot sparkle) |
| `js/save.js` | Save/load game state to/from localStorage |
| `js/maps/village.js` | Tile data + NPC placements for Brighthall village |
| `js/maps/forest.js` | Tile data + enemy spawns for Dark Forest |
| `js/maps/canyon.js` | Tile data + enemy spawns for Fire Canyon |
| `js/maps/cave.js` | Tile data + enemy spawns for Ice Cave |
| `js/maps/castle.js` | Tile data + enemy spawns for Dark Mage Castle |
| `js/bosses.js` | Boss entities: multi-phase AI, special attacks, HP bar |
| `tests/test.html` | Test runner page |
| `tests/test-combat.js` | Tests for damage, XP, leveling formulas |
| `tests/test-inventory.js` | Tests for inventory stacking, buy, use |

---

### Task 1: Project Scaffold & Game Loop

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/main.js`
- Create: `js/input.js`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Хроники Эльдории</title>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <canvas id="game" width="640" height="480"></canvas>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  overflow: hidden;
}

canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  border: 4px solid #333;
}

.hidden { display: none; }
```

- [ ] **Step 3: Create js/input.js**

```js
// js/input.js
const keys = {};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
}

export function isKeyDown(code) {
  return !!keys[code];
}

export function isKeyPressed(code) {
  if (keys[code]) {
    keys[code] = false;
    return true;
  }
  return false;
}
```

Note on `isKeyPressed`: it consumes the key on read, useful for one-shot actions (interact, attack). `isKeyDown` is for continuous hold (movement).

- [ ] **Step 4: Create js/main.js with game loop**

```js
// js/main.js
import { initInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Game states
export const STATE = {
  MENU: 'menu',
  PLAY: 'play',
  DIALOG: 'dialog',
  INVENTORY: 'inventory',
  GAMEOVER: 'gameover',
  WIN: 'win',
};

export const game = {
  state: STATE.MENU,
  ctx,
  canvas,
  width: canvas.width,
  height: canvas.height,
  dt: 0,
  player: null,
  currentMap: null,
  enemies: [],
  npcs: [],
  particles: [],
  projectiles: [],
};

let lastTime = 0;

function gameLoop(timestamp) {
  game.dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  update(game.dt);
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (game.state === STATE.MENU) {
    // menu input handled in render or separate module
    return;
  }
  if (game.state === STATE.PLAY) {
    // Will be filled in subsequent tasks
  }
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, game.width, game.height);

  if (game.state === STATE.MENU) {
    ctx.fillStyle = '#ffd54f';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('ХРОНИКИ', game.width / 2, game.height / 2 - 40);
    ctx.font = '28px "Press Start 2P"';
    ctx.fillText('ЭЛЬДОРИИ', game.width / 2, game.height / 2);
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#888';
    ctx.fillText('Нажми ENTER', game.width / 2, game.height / 2 + 60);
  }
}

export function startGame() {
  initInput();
  requestAnimationFrame(gameLoop);
}

startGame();
```

- [ ] **Step 5: Open index.html in browser — verify black screen with title text**

Open `index.html` via a local server (e.g., `npx serve .` or `python3 -m http.server`) because ES modules require HTTP. Verify you see "ХРОНИКИ ЭЛЬДОРИИ" in yellow pixel font on black background.

- [ ] **Step 6: Commit**

```bash
git add index.html css/ js/main.js js/input.js
git commit -m "feat: project scaffold with game loop, input handler, and menu screen"
```

---

### Task 2: Sprite System (Programmatic Pixel Art)

**Files:**
- Create: `js/sprites.js`

All sprites are drawn programmatically using `ctx.fillRect()` calls — no external images needed. Each sprite function draws at a given position and scale.

- [ ] **Step 1: Create js/sprites.js with tile sprites**

```js
// js/sprites.js

// Draw a single pixel (scaled)
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// === TILES (32x32) ===

export function drawGrassTile(ctx, x, y) {
  ctx.fillStyle = '#2a5a1a';
  ctx.fillRect(x, y, 32, 32);
  // Grass detail
  ctx.fillStyle = '#348a22';
  ctx.fillRect(x + 8, y + 12, 4, 4);
  ctx.fillRect(x + 20, y + 6, 4, 4);
  ctx.fillStyle = '#1e4a12';
  ctx.fillRect(x + 14, y + 22, 4, 4);
}

export function drawDirtTile(ctx, x, y) {
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = '#4a2e14';
  ctx.fillRect(x + 4, y + 4, 6, 4);
  ctx.fillRect(x + 18, y + 14, 8, 4);
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(x + 10, y + 24, 6, 4);
}

export function drawWallTile(ctx, x, y) {
  ctx.fillStyle = '#555';
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = '#666';
  ctx.fillRect(x + 1, y + 1, 14, 10);
  ctx.fillRect(x + 17, y + 1, 14, 10);
  ctx.fillRect(x + 1, y + 13, 14, 10);
  ctx.fillRect(x + 17, y + 13, 14, 10);
  ctx.fillStyle = '#444';
  ctx.fillRect(x, y + 11, 32, 2);
  ctx.fillRect(x, y + 23, 32, 2);
  ctx.fillRect(x + 15, y, 2, 32);
}

export function drawWaterTile(ctx, x, y, frame) {
  ctx.fillStyle = '#1a4a8a';
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = '#2a6aba';
  const offset = (frame % 2) * 4;
  ctx.fillRect(x + 2 + offset, y + 8, 10, 3);
  ctx.fillRect(x + 18 - offset, y + 20, 10, 3);
}

export function drawLavaTile(ctx, x, y, frame) {
  ctx.fillStyle = '#8a2a0a';
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = '#cc4400';
  const offset = (frame % 2) * 6;
  ctx.fillRect(x + offset, y + 6, 12, 4);
  ctx.fillRect(x + 16 - offset, y + 18, 12, 4);
  ctx.fillStyle = '#ff6600';
  ctx.fillRect(x + 10, y + 12, 6, 4);
}

export function drawPortalTile(ctx, x, y, frame) {
  ctx.fillStyle = '#2a1a4a';
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = frame % 2 === 0 ? '#7c4dff' : '#b388ff';
  ctx.fillRect(x + 4, y + 4, 24, 24);
  ctx.fillStyle = '#e0d0ff';
  ctx.fillRect(x + 10, y + 10, 12, 12);
}

export function drawTreeTile(ctx, x, y) {
  // Grass base
  drawGrassTile(ctx, x, y);
  // Trunk
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x + 13, y + 18, 6, 14);
  // Leaves
  ctx.fillStyle = '#1a6a10';
  ctx.fillRect(x + 4, y + 4, 24, 16);
  ctx.fillStyle = '#22881a';
  ctx.fillRect(x + 8, y + 0, 16, 8);
}

export function drawIceTile(ctx, x, y) {
  ctx.fillStyle = '#4a6a8a';
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = '#6a9aba';
  ctx.fillRect(x + 4, y + 8, 10, 6);
  ctx.fillRect(x + 18, y + 18, 10, 6);
  ctx.fillStyle = '#8abada';
  ctx.fillRect(x + 12, y + 2, 6, 4);
}

export function drawCastleTile(ctx, x, y) {
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = '#4a4a5a';
  ctx.fillRect(x + 1, y + 1, 14, 14);
  ctx.fillRect(x + 17, y + 17, 14, 14);
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(x + 15, y, 2, 32);
  ctx.fillRect(x, y + 15, 32, 2);
}

// Tile type enum
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

// Which tiles block movement
export const SOLID_TILES = new Set([TILE.WALL, TILE.WATER, TILE.LAVA, TILE.TREE]);

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
```

- [ ] **Step 2: Add character sprites to sprites.js**

Append to `js/sprites.js`:

```js
// === CHARACTER SPRITES ===

// Hero sprite (16x20 logical pixels, drawn at 2x = 32x40)
export function drawHero(ctx, x, y, facing, frame, attacking) {
  const s = 2; // scale
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(4 * s, 19 * s, 8 * s, 2 * s);

  // Hair
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(4 * s, 0, 8 * s, 3 * s);
  ctx.fillRect(3 * s, 1 * s, 1 * s, 3 * s);
  ctx.fillRect(12 * s, 1 * s, 1 * s, 3 * s);

  // Head
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(4 * s, 3 * s, 8 * s, 6 * s);

  // Eyes
  ctx.fillStyle = '#333';
  if (facing === 'up') {
    // back of head, no eyes
  } else {
    ctx.fillRect(5 * s, 5 * s, 2 * s, 2 * s);
    ctx.fillRect(9 * s, 5 * s, 2 * s, 2 * s);
    ctx.fillStyle = '#fff';
    ctx.fillRect(5 * s, 5 * s, 1 * s, 1 * s);
    ctx.fillRect(9 * s, 5 * s, 1 * s, 1 * s);
  }

  // Body
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(3 * s, 9 * s, 10 * s, 6 * s);
  ctx.fillStyle = '#1976d2';
  ctx.fillRect(4 * s, 9 * s, 8 * s, 1 * s);

  // Belt
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(4 * s, 13 * s, 8 * s, 1 * s);
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(7 * s, 13 * s, 2 * s, 1 * s);

  // Arms
  ctx.fillStyle = '#ffcc80';
  const armBob = frame % 2 === 0 ? 0 : 1 * s;
  ctx.fillRect(1 * s, 10 * s + armBob, 2 * s, 4 * s);
  ctx.fillRect(13 * s, 10 * s - armBob, 2 * s, 4 * s);

  // Legs (walking animation)
  ctx.fillStyle = '#4a2e14';
  const legOffset = frame % 2 === 0 ? 0 : 1 * s;
  ctx.fillRect(4 * s, 15 * s + legOffset, 3 * s, 4 * s);
  ctx.fillRect(9 * s, 15 * s - legOffset, 3 * s, 4 * s);

  // Boots
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(3 * s, 18 * s + legOffset, 4 * s, 2 * s);
  ctx.fillRect(9 * s, 18 * s - legOffset, 4 * s, 2 * s);

  // Sword
  if (attacking) {
    ctx.fillStyle = '#bdbdbd';
    switch (facing) {
      case 'right':
        ctx.fillRect(16 * s, 6 * s, 2 * s, 10 * s);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(16 * s, 4 * s, 2 * s, 3 * s);
        break;
      case 'left':
        ctx.fillRect(-2 * s, 6 * s, 2 * s, 10 * s);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(-2 * s, 4 * s, 2 * s, 3 * s);
        break;
      case 'up':
        ctx.fillRect(6 * s, -6 * s, 4 * s, 10 * s);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(6 * s, -8 * s, 4 * s, 3 * s);
        break;
      case 'down':
        ctx.fillRect(6 * s, 16 * s, 4 * s, 10 * s);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(6 * s, 25 * s, 4 * s, 3 * s);
        break;
    }
  } else {
    // Sword at rest (right side)
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(14 * s, 7 * s, 2 * s, 2 * s);
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(14.5 * s, 1 * s, 1 * s, 6 * s);
  }

  ctx.restore();
}

// Slime sprite
export function drawSlime(ctx, x, y, frame) {
  const s = 2;
  ctx.save();
  ctx.translate(x, y);

  const squish = frame % 2 === 0 ? 0 : 1;

  ctx.fillStyle = '#7cb342';
  ctx.fillRect((2 - squish) * s, (4 + squish) * s, (10 + squish * 2) * s, (8 - squish) * s);
  ctx.fillStyle = '#8bc34a';
  ctx.fillRect(3 * s, (2 + squish) * s, 8 * s, 4 * s);

  // Eyes
  ctx.fillStyle = '#333';
  ctx.fillRect(4 * s, 5 * s, 2 * s, 2 * s);
  ctx.fillRect(8 * s, 5 * s, 2 * s, 2 * s);
  ctx.fillStyle = '#fff';
  ctx.fillRect(4 * s, 5 * s, 1 * s, 1 * s);
  ctx.fillRect(8 * s, 5 * s, 1 * s, 1 * s);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(2 * s, 12 * s, 10 * s, 1 * s);

  ctx.restore();
}

// Wolf sprite
export function drawWolf(ctx, x, y, facing, frame) {
  const s = 2;
  ctx.save();
  ctx.translate(x, y);

  // Body
  ctx.fillStyle = '#616161';
  ctx.fillRect(4 * s, 5 * s, 10 * s, 5 * s);
  ctx.fillStyle = '#757575';
  ctx.fillRect(5 * s, 4 * s, 8 * s, 2 * s);

  // Head
  ctx.fillStyle = '#757575';
  if (facing === 'left') {
    ctx.fillRect(0, 2 * s, 5 * s, 5 * s);
    ctx.fillRect(0, 0, 2 * s, 3 * s);
    ctx.fillRect(3 * s, 0, 2 * s, 3 * s);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(1 * s, 3 * s, 2 * s, 1 * s);
  } else {
    ctx.fillRect(12 * s, 2 * s, 5 * s, 5 * s);
    ctx.fillRect(13 * s, 0, 2 * s, 3 * s);
    ctx.fillRect(16 * s, 0, 2 * s, 3 * s);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(15 * s, 3 * s, 2 * s, 1 * s);
  }

  // Legs (animated)
  ctx.fillStyle = '#555';
  const legAnim = frame % 2 === 0 ? 0 : 1 * s;
  ctx.fillRect(5 * s, 10 * s + legAnim, 2 * s, 3 * s);
  ctx.fillRect(8 * s, 10 * s - legAnim, 2 * s, 3 * s);
  ctx.fillRect(11 * s, 10 * s + legAnim, 2 * s, 3 * s);

  // Tail
  ctx.fillStyle = '#616161';
  ctx.fillRect(facing === 'left' ? 13 * s : 0, 4 * s, 4 * s, 2 * s);

  ctx.restore();
}

// Skeleton sprite
export function drawSkeleton(ctx, x, y, frame) {
  const s = 2;
  ctx.save();
  ctx.translate(x, y);

  // Head (skull)
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(4 * s, 0, 8 * s, 7 * s);
  ctx.fillStyle = '#333';
  ctx.fillRect(5 * s, 2 * s, 2 * s, 3 * s); // eye sockets
  ctx.fillRect(9 * s, 2 * s, 2 * s, 3 * s);
  ctx.fillRect(7 * s, 5 * s, 2 * s, 1 * s); // nose

  // Ribs
  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(5 * s, 8 * s, 6 * s, 1 * s);
  ctx.fillRect(5 * s, 10 * s, 6 * s, 1 * s);
  ctx.fillRect(5 * s, 12 * s, 6 * s, 1 * s);
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(7 * s, 7 * s, 2 * s, 7 * s); // spine

  // Arms
  const armBob = frame % 2 === 0 ? 0 : 1 * s;
  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(2 * s, 8 * s + armBob, 2 * s, 5 * s);
  ctx.fillRect(12 * s, 8 * s - armBob, 2 * s, 5 * s);

  // Legs
  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(5 * s, 14 * s, 2 * s, 5 * s);
  ctx.fillRect(9 * s, 14 * s, 2 * s, 5 * s);

  ctx.restore();
}

// Golem sprite (ice)
export function drawGolem(ctx, x, y, frame) {
  const s = 2;
  ctx.save();
  ctx.translate(x, y);

  // Body (large)
  ctx.fillStyle = '#6a9aba';
  ctx.fillRect(2 * s, 4 * s, 12 * s, 12 * s);
  ctx.fillStyle = '#8abada';
  ctx.fillRect(4 * s, 2 * s, 8 * s, 4 * s);

  // Eyes
  ctx.fillStyle = '#29b6f6';
  ctx.fillRect(4 * s, 6 * s, 3 * s, 2 * s);
  ctx.fillRect(9 * s, 6 * s, 3 * s, 2 * s);

  // Arms (thick)
  ctx.fillStyle = '#5a8aaa';
  ctx.fillRect(0, 6 * s, 2 * s, 8 * s);
  ctx.fillRect(14 * s, 6 * s, 2 * s, 8 * s);

  // Legs
  ctx.fillRect(3 * s, 16 * s, 4 * s, 4 * s);
  ctx.fillRect(9 * s, 16 * s, 4 * s, 4 * s);

  // Ice crystals on top
  ctx.fillStyle = '#e0f0ff';
  ctx.fillRect(6 * s, 0, 2 * s, 3 * s);
  ctx.fillRect(9 * s, 1 * s, 2 * s, 2 * s);

  ctx.restore();
}

// Generic NPC sprite (color parameterized)
export function drawNPC(ctx, x, y, bodyColor, headDetail) {
  const s = 2;
  ctx.save();
  ctx.translate(x, y);

  // Head
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(4 * s, 1 * s, 8 * s, 7 * s);

  // Eyes
  ctx.fillStyle = '#333';
  ctx.fillRect(5 * s, 4 * s, 2 * s, 2 * s);
  ctx.fillRect(9 * s, 4 * s, 2 * s, 2 * s);

  // Headband/hat
  ctx.fillStyle = headDetail || '#f44336';
  ctx.fillRect(3 * s, 1 * s, 10 * s, 2 * s);

  // Body
  ctx.fillStyle = bodyColor || '#5d4037';
  ctx.fillRect(2 * s, 9 * s, 12 * s, 7 * s);

  // Legs
  ctx.fillStyle = '#333';
  ctx.fillRect(4 * s, 16 * s, 3 * s, 4 * s);
  ctx.fillRect(9 * s, 16 * s, 3 * s, 4 * s);

  ctx.restore();
}

// Item sprites (16x16 at 1x)
export function drawPotionSprite(ctx, x, y, size) {
  const s = size / 10;
  ctx.fillStyle = '#e53935';
  ctx.fillRect(x + 3 * s, y + 1 * s, 4 * s, 6 * s);
  ctx.fillStyle = '#ef5350';
  ctx.fillRect(x + 4 * s, y + 0, 2 * s, 2 * s);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(x + 4 * s, y + 7 * s, 2 * s, 3 * s);
}

export function drawCoinSprite(ctx, x, y, size) {
  const s = size / 10;
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(x + 2 * s, y + 2 * s, 6 * s, 6 * s);
  ctx.fillStyle = '#ffb300';
  ctx.fillRect(x + 4 * s, y + 4 * s, 2 * s, 2 * s);
}
```

- [ ] **Step 3: Verify sprites render — add temporary test draw in main.js**

Temporarily add to the `render()` function in `main.js` after the menu text:

```js
import { drawHero, drawSlime, drawWolf, drawGrassTile, drawTreeTile } from './sprites.js';
```

And inside `render()` after menu drawing add:

```js
if (game.state === STATE.MENU) {
  // ... existing menu code ...
  // Temporary sprite preview
  drawGrassTile(ctx, 10, 400);
  drawTreeTile(ctx, 50, 400);
  drawHero(ctx, 100, 420, 'right', 0, false);
  drawSlime(ctx, 160, 430, 0);
  drawWolf(ctx, 200, 430, 'right', 0);
}
```

Open in browser — verify sprites appear at bottom of menu screen.

- [ ] **Step 4: Remove temporary sprite test, commit**

Remove the test sprite drawing lines and the sprite import from `main.js` (we'll import properly later).

```bash
git add js/sprites.js
git commit -m "feat: programmatic pixel art sprite system for tiles, characters, and items"
```

---

### Task 3: Tile Map System & Camera

**Files:**
- Create: `js/tilemap.js`
- Create: `js/camera.js`
- Create: `js/maps/village.js`

- [ ] **Step 1: Create js/tilemap.js**

```js
// js/tilemap.js
import { tileDrawers, SOLID_TILES } from './sprites.js';

export const TILE_SIZE = 32;

export function createTileMap(data) {
  return {
    width: data.width,
    height: data.height,
    tiles: data.tiles,       // 2D array of tile type numbers
    spawns: data.spawns || [],
    npcs: data.npcs || [],
    portals: data.portals || [],
    playerStart: data.playerStart || { x: 5, y: 5 },
    name: data.name || 'Unknown',
  };
}

export function getTile(map, col, row) {
  if (row < 0 || row >= map.height || col < 0 || col >= map.width) {
    return -1; // out of bounds = solid
  }
  return map.tiles[row][col];
}

export function isSolid(map, col, row) {
  const tile = getTile(map, col, row);
  return tile === -1 || SOLID_TILES.has(tile);
}

export function isPortal(map, col, row) {
  return map.portals.find(p => p.col === col && p.row === row) || null;
}

export function renderMap(ctx, map, camera, animFrame) {
  const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endCol = Math.min(map.width, startCol + Math.ceil(camera.width / TILE_SIZE) + 2);
  const endRow = Math.min(map.height, startRow + Math.ceil(camera.height / TILE_SIZE) + 2);

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const tileType = map.tiles[row][col];
      const screenX = col * TILE_SIZE - camera.x;
      const screenY = col * TILE_SIZE - camera.y; // BUG — will fix below
      const drawFn = tileDrawers[tileType];
      if (drawFn) {
        drawFn(ctx, screenX, row * TILE_SIZE - camera.y);
      }
    }
  }
}
```

Wait — there is a bug in the render loop. Fix `screenY`:

```js
export function renderMap(ctx, map, camera, animFrame) {
  const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endCol = Math.min(map.width, startCol + Math.ceil(camera.width / TILE_SIZE) + 2);
  const endRow = Math.min(map.height, startRow + Math.ceil(camera.height / TILE_SIZE) + 2);

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const tileType = map.tiles[row][col];
      const screenX = col * TILE_SIZE - camera.x;
      const screenY = row * TILE_SIZE - camera.y;
      const drawFn = tileDrawers[tileType];
      if (drawFn) {
        drawFn(ctx, screenX, screenY);
      }
    }
  }
}
```

- [ ] **Step 2: Create js/camera.js**

```js
// js/camera.js
import { TILE_SIZE } from './tilemap.js';

export function createCamera(width, height) {
  return {
    x: 0,
    y: 0,
    width,
    height,
  };
}

export function updateCamera(camera, targetX, targetY, mapWidth, mapHeight) {
  // Center on target
  camera.x = targetX - camera.width / 2;
  camera.y = targetY - camera.height / 2;

  // Clamp to map bounds
  const maxX = mapWidth * TILE_SIZE - camera.width;
  const maxY = mapHeight * TILE_SIZE - camera.height;

  camera.x = Math.max(0, Math.min(camera.x, maxX));
  camera.y = Math.max(0, Math.min(camera.y, maxY));
}
```

- [ ] **Step 3: Create js/maps/village.js — first playable map**

Village is 30x20 tiles. Grass with dirt paths, buildings as wall clusters, trees along edges.

```js
// js/maps/village.js
import { TILE } from '../sprites.js';

const G = TILE.GRASS;
const D = TILE.DIRT;
const W = TILE.WALL;
const T = TILE.TREE;
const A = TILE.WATER;
const P = TILE.PORTAL;

// 30 columns x 20 rows
const tiles = [
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,G,G,G,G,G,T],
  [T,G,G,W,W,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,W,W,W,G,G,G,G,T],
  [T,G,G,W,W,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,W,W,W,G,G,G,G,T],
  [T,G,G,G,G,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,D,G,G,G,T],
  [T,G,G,G,G,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,D,G,G,G,G,G,T],
  [T,G,G,G,G,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,G,G,G,G,G,T],
  [T,G,G,G,G,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,D,G,G,G,G,G,T],
  [T,G,G,G,G,D,G,G,W,W,W,G,G,G,G,G,G,W,W,G,G,G,G,D,G,G,G,G,G,T],
  [T,G,G,G,G,D,G,G,W,W,W,G,G,G,G,G,G,W,W,G,G,G,G,D,G,G,G,G,G,T],
  [T,G,G,G,G,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,D,G,G,G,G,G,T],
  [T,G,G,G,G,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,A,A,A,A,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,A,A,A,A,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,D,D,D,P,D,D,G,G,G,G,G,G,G,G,G,G,T],
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

export const villageMap = {
  name: 'Деревня Брайтхолл',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 10 },
  portals: [
    { col: 16, row: 18, target: 'forest', spawnX: 15, spawnY: 1 },
  ],
  npcs: [
    { id: 'blacksmith', col: 4, row: 4, name: 'Кузнец Торин', bodyColor: '#5d4037', headDetail: '#f44336' },
    { id: 'elder', col: 9, row: 9, name: 'Старейшина', bodyColor: '#4a148c', headDetail: '#fff' },
    { id: 'merchant', col: 18, row: 9, name: 'Торговец', bodyColor: '#1b5e20', headDetail: '#ffd54f' },
  ],
  spawns: [],
};
```

- [ ] **Step 4: Wire tilemap + camera into main.js**

Update `js/main.js`:

```js
// js/main.js
import { initInput, isKeyDown, isKeyPressed } from './input.js';
import { createTileMap, renderMap, TILE_SIZE } from './tilemap.js';
import { createCamera, updateCamera } from './camera.js';
import { villageMap } from './maps/village.js';
import { drawHero, drawNPC } from './sprites.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export const STATE = {
  MENU: 'menu',
  PLAY: 'play',
  DIALOG: 'dialog',
  INVENTORY: 'inventory',
  GAMEOVER: 'gameover',
  WIN: 'win',
};

export const game = {
  state: STATE.MENU,
  ctx,
  canvas,
  width: canvas.width,
  height: canvas.height,
  dt: 0,
  currentMap: null,
  camera: null,
  player: null,
  enemies: [],
  npcs: [],
  particles: [],
  projectiles: [],
  animFrame: 0,
  animTimer: 0,
};

let lastTime = 0;

function gameLoop(timestamp) {
  game.dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Animation frame counter (4 frames, ~0.15s each)
  game.animTimer += game.dt;
  if (game.animTimer > 0.15) {
    game.animTimer = 0;
    game.animFrame = (game.animFrame + 1) % 4;
  }

  update(game.dt);
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (game.state === STATE.MENU) {
    if (isKeyPressed('Enter')) {
      loadMap(villageMap);
      game.state = STATE.PLAY;
    }
    return;
  }

  if (game.state === STATE.PLAY) {
    updatePlayer(dt);
    updateCamera(
      game.camera,
      game.player.x + 16,
      game.player.y + 20,
      game.currentMap.width,
      game.currentMap.height
    );
  }
}

function updatePlayer(dt) {
  const p = game.player;
  const speed = 120; // pixels per second
  let dx = 0, dy = 0;

  if (isKeyDown('ArrowLeft') || isKeyDown('KeyA')) { dx = -1; p.facing = 'left'; }
  if (isKeyDown('ArrowRight') || isKeyDown('KeyD')) { dx = 1; p.facing = 'right'; }
  if (isKeyDown('ArrowUp') || isKeyDown('KeyW')) { dy = -1; p.facing = 'up'; }
  if (isKeyDown('ArrowDown') || isKeyDown('KeyS')) { dy = 1; p.facing = 'down'; }

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  p.moving = dx !== 0 || dy !== 0;

  // Try X movement
  const newX = p.x + dx * speed * dt;
  if (!collidesWithMap(newX, p.y, p.hitW, p.hitH)) {
    p.x = newX;
  }

  // Try Y movement
  const newY = p.y + dy * speed * dt;
  if (!collidesWithMap(p.x, newY, p.hitW, p.hitH)) {
    p.y = newY;
  }
}

function collidesWithMap(x, y, w, h) {
  const map = game.currentMap;
  // Check all four corners of hitbox
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + w - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + h - 1) / TILE_SIZE);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (row < 0 || row >= map.height || col < 0 || col >= map.width) return true;
      const { isSolid } = await import('./tilemap.js'); // wrong — fix below
    }
  }
  return false;
}
```

Wait — we can't use dynamic import inside a sync function. Let's fix `collidesWithMap` properly. Add the import at top and use it:

Replace `main.js` entirely with the correct version:

```js
// js/main.js
import { initInput, isKeyDown, isKeyPressed } from './input.js';
import { createTileMap, renderMap, isSolid, isPortal, TILE_SIZE } from './tilemap.js';
import { createCamera, updateCamera } from './camera.js';
import { villageMap } from './maps/village.js';
import { drawHero, drawNPC } from './sprites.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export const STATE = {
  MENU: 'menu',
  PLAY: 'play',
  DIALOG: 'dialog',
  INVENTORY: 'inventory',
  GAMEOVER: 'gameover',
  WIN: 'win',
};

export const game = {
  state: STATE.MENU,
  ctx,
  canvas,
  width: canvas.width,
  height: canvas.height,
  dt: 0,
  currentMap: null,
  camera: null,
  player: null,
  enemies: [],
  npcs: [],
  particles: [],
  projectiles: [],
  animFrame: 0,
  animTimer: 0,
};

function createPlayer(startX, startY) {
  return {
    x: startX * TILE_SIZE,
    y: startY * TILE_SIZE,
    hitW: 24,
    hitH: 28,
    facing: 'down',
    moving: false,
    attacking: false,
    attackTimer: 0,
    hp: 100,
    maxHp: 100,
    atk: 5,
    xp: 0,
    level: 1,
    coins: 0,
    potions: 3,
    artifacts: { earth: false, fire: false, water: false },
    cooldowns: { earth: 0, fire: 0, water: 0 },
    invincibleTimer: 0,
  };
}

function loadMap(mapData) {
  game.currentMap = createTileMap(mapData);
  game.player = createPlayer(mapData.playerStart.x, mapData.playerStart.y);
  game.camera = createCamera(game.width, game.height);
  game.enemies = [];
  game.npcs = mapData.npcs || [];
}

let lastTime = 0;

function gameLoop(timestamp) {
  game.dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  game.animTimer += game.dt;
  if (game.animTimer > 0.15) {
    game.animTimer = 0;
    game.animFrame = (game.animFrame + 1) % 4;
  }

  update(game.dt);
  render();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (game.state === STATE.MENU) {
    if (isKeyPressed('Enter')) {
      loadMap(villageMap);
      game.state = STATE.PLAY;
    }
    return;
  }

  if (game.state === STATE.PLAY) {
    updatePlayer(dt);
    updateCamera(
      game.camera,
      game.player.x + 16,
      game.player.y + 20,
      game.currentMap.width,
      game.currentMap.height
    );
  }
}

function updatePlayer(dt) {
  const p = game.player;
  const speed = 120;
  let dx = 0, dy = 0;

  if (isKeyDown('ArrowLeft') || isKeyDown('KeyA')) { dx = -1; p.facing = 'left'; }
  if (isKeyDown('ArrowRight') || isKeyDown('KeyD')) { dx = 1; p.facing = 'right'; }
  if (isKeyDown('ArrowUp') || isKeyDown('KeyW')) { dy = -1; p.facing = 'up'; }
  if (isKeyDown('ArrowDown') || isKeyDown('KeyS')) { dy = 1; p.facing = 'down'; }

  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  p.moving = dx !== 0 || dy !== 0;

  const newX = p.x + dx * speed * dt;
  if (!collidesWithMap(newX, p.y, p.hitW, p.hitH)) {
    p.x = newX;
  }

  const newY = p.y + dy * speed * dt;
  if (!collidesWithMap(p.x, newY, p.hitW, p.hitH)) {
    p.y = newY;
  }

  // Attack
  if (p.attackTimer > 0) {
    p.attackTimer -= dt;
    if (p.attackTimer <= 0) p.attacking = false;
  }
  if (isKeyPressed('Space') && !p.attacking) {
    p.attacking = true;
    p.attackTimer = 0.3;
  }
}

function collidesWithMap(x, y, w, h) {
  const map = game.currentMap;
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + w - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + h - 1) / TILE_SIZE);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (isSolid(map, col, row)) return true;
    }
  }
  return false;
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, game.width, game.height);

  if (game.state === STATE.MENU) {
    renderMenu();
    return;
  }

  if (game.state === STATE.PLAY || game.state === STATE.DIALOG || game.state === STATE.INVENTORY) {
    renderMap(ctx, game.currentMap, game.camera, game.animFrame);

    // Render NPCs
    for (const npc of game.npcs) {
      const sx = npc.col * TILE_SIZE - game.camera.x;
      const sy = npc.row * TILE_SIZE - game.camera.y - 8;
      drawNPC(ctx, sx, sy, npc.bodyColor, npc.headDetail);

      // NPC name
      ctx.fillStyle = '#ffd54f';
      ctx.font = '7px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, sx + 16, sy - 4);
    }

    // Render player
    const px = game.player.x - game.camera.x;
    const py = game.player.y - game.camera.y;
    const frame = game.player.moving ? game.animFrame : 0;
    drawHero(ctx, px, py, game.player.facing, frame, game.player.attacking);

    renderHUD();
  }
}

function renderMenu() {
  // Background
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, game.width, game.height);

  // Stars
  ctx.fillStyle = '#fff';
  const stars = [[50,20],[120,40],[200,15],[310,30],[380,50],[440,20],[80,70],[260,55]];
  for (const [sx, sy] of stars) {
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Mountains
  ctx.fillStyle = '#1a1a3e';
  ctx.beginPath();
  ctx.moveTo(0, 350);
  ctx.lineTo(80, 280); ctx.lineTo(160, 310); ctx.lineTo(240, 260);
  ctx.lineTo(320, 290); ctx.lineTo(400, 270); ctx.lineTo(480, 300);
  ctx.lineTo(640, 280); ctx.lineTo(640, 350);
  ctx.fill();

  // Ground
  ctx.fillStyle = '#0f0f20';
  ctx.fillRect(0, 350, game.width, 130);

  // Title
  ctx.fillStyle = '#ffd54f';
  ctx.font = '20px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#b8860b';
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText('ХРОНИКИ', game.width / 2, 180);
  ctx.font = '28px "Press Start 2P"';
  ctx.fillText('ЭЛЬДОРИИ', game.width / 2, 220);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Prompt
  ctx.fillStyle = game.animFrame % 2 === 0 ? '#888' : '#555';
  ctx.font = '10px "Press Start 2P"';
  ctx.fillText('НАЖМИ ENTER', game.width / 2, 300);

  // Footer
  ctx.fillStyle = '#444';
  ctx.font = '7px "Press Start 2P"';
  ctx.fillText('VOVA GAMES 2026', game.width / 2, 460);
}

function renderHUD() {
  const p = game.player;

  // HUD background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, game.width, 32);
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 32, game.width, 2);

  // HP bar
  ctx.fillStyle = '#e53935';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillText('HP', 8, 14);

  const hpBarWidth = 100;
  const hpFill = (p.hp / p.maxHp) * hpBarWidth;
  ctx.fillStyle = '#333';
  ctx.fillRect(30, 6, hpBarWidth, 12);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(30, 6, hpFill, 12);

  // XP bar
  ctx.fillStyle = '#b388ff';
  ctx.fillText('XP', 145, 14);
  const xpNeeded = p.level * 50;
  const xpBarWidth = 60;
  const xpFill = (p.xp / xpNeeded) * xpBarWidth;
  ctx.fillStyle = '#333';
  ctx.fillRect(167, 8, xpBarWidth, 8);
  ctx.fillStyle = '#7c4dff';
  ctx.fillRect(167, 8, xpFill, 8);

  // Level
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('LV.' + p.level, 240, 14);

  // Coins
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('$ ' + p.coins, game.width - 80, 14);

  // Potions
  ctx.fillStyle = '#ef5350';
  ctx.fillText('HP x' + p.potions, game.width - 10, 14);

  // Map name
  ctx.textAlign = 'center';
  ctx.fillStyle = '#888';
  ctx.font = '6px "Press Start 2P"';
  ctx.fillText(game.currentMap.name, game.width / 2, 26);
}

export function startGame() {
  initInput();
  requestAnimationFrame(gameLoop);
}

startGame();
```

- [ ] **Step 5: Open in browser, verify: press Enter → village map renders, player moves with WASD/arrows, collides with trees and walls, HUD displays stats**

- [ ] **Step 6: Commit**

```bash
git add js/tilemap.js js/camera.js js/maps/village.js js/main.js
git commit -m "feat: tile map rendering, camera follow, player movement with collision, village map, HUD"
```

---

### Task 4: Enemy System & Basic AI

**Files:**
- Create: `js/enemies.js`
- Modify: `js/main.js` — wire enemies into update/render

- [ ] **Step 1: Create js/enemies.js**

```js
// js/enemies.js
import { drawSlime, drawWolf, drawSkeleton, drawGolem } from './sprites.js';
import { TILE_SIZE, isSolid } from './tilemap.js';

const ENEMY_TYPES = {
  slime: {
    hp: 30, maxHp: 30, atk: 5, speed: 40, xp: 10, coins: 3,
    width: 28, height: 26,
    draw: drawSlime,
    ai: 'hop', // hops toward player
    aggroRange: 150,
  },
  wolf: {
    hp: 25, maxHp: 25, atk: 8, speed: 100, xp: 15, coins: 5,
    width: 36, height: 28,
    draw: drawWolf,
    ai: 'chase', // fast chase
    aggroRange: 200,
  },
  skeleton: {
    hp: 40, maxHp: 40, atk: 10, speed: 50, xp: 25, coins: 7,
    width: 32, height: 40,
    draw: drawSkeleton,
    ai: 'patrol', // patrols, then chases
    aggroRange: 160,
  },
  golem: {
    hp: 80, maxHp: 80, atk: 18, speed: 25, xp: 50, coins: 10,
    width: 32, height: 40,
    draw: drawGolem,
    ai: 'slow_chase',
    aggroRange: 120,
  },
};

export function spawnEnemy(type, col, row) {
  const template = ENEMY_TYPES[type];
  if (!template) return null;

  return {
    type,
    ...template,
    x: col * TILE_SIZE,
    y: row * TILE_SIZE,
    startX: col * TILE_SIZE,
    startY: row * TILE_SIZE,
    facing: 'right',
    alive: true,
    hitTimer: 0,       // flash when hit
    moveTimer: 0,      // for hop AI
    patrolDir: 1,      // for patrol AI
    patrolDist: 0,
  };
}

export function updateEnemies(enemies, player, map, dt) {
  for (const e of enemies) {
    if (!e.alive) continue;

    if (e.hitTimer > 0) e.hitTimer -= dt;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > e.aggroRange) {
      // Idle / patrol
      if (e.ai === 'patrol') {
        updatePatrol(e, map, dt);
      }
      continue;
    }

    // In aggro range — move toward player
    const nx = dx / dist;
    const ny = dy / dist;

    switch (e.ai) {
      case 'hop':
        e.moveTimer += dt;
        if (e.moveTimer > 1.5) {
          e.moveTimer = 0;
          tryMoveEnemy(e, nx * 40, ny * 40, map, dt);
        }
        break;
      case 'chase':
        tryMoveEnemy(e, nx * e.speed, ny * e.speed, map, dt);
        break;
      case 'slow_chase':
        tryMoveEnemy(e, nx * e.speed, ny * e.speed, map, dt);
        break;
      case 'patrol':
        tryMoveEnemy(e, nx * e.speed, ny * e.speed, map, dt);
        break;
    }

    e.facing = dx > 0 ? 'right' : 'left';
  }
}

function updatePatrol(e, map, dt) {
  const patrolSpeed = 30;
  e.patrolDist += patrolSpeed * dt;
  if (e.patrolDist > 64) {
    e.patrolDist = 0;
    e.patrolDir *= -1;
  }
  tryMoveEnemy(e, e.patrolDir * patrolSpeed, 0, map, dt);
  e.facing = e.patrolDir > 0 ? 'right' : 'left';
}

function tryMoveEnemy(e, vx, vy, map, dt) {
  const newX = e.x + vx * dt;
  const newY = e.y + vy * dt;

  const col = Math.floor((newX + e.width / 2) / TILE_SIZE);
  const row = Math.floor((newY + e.height / 2) / TILE_SIZE);

  if (!isSolid(map, col, row)) {
    e.x = newX;
    e.y = newY;
  }
}

export function renderEnemies(ctx, enemies, camera, animFrame) {
  for (const e of enemies) {
    if (!e.alive) continue;

    const sx = e.x - camera.x;
    const sy = e.y - camera.y;

    // Hit flash
    if (e.hitTimer > 0 && Math.floor(e.hitTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Draw enemy sprite
    const template = ENEMY_TYPES[e.type];
    if (e.type === 'wolf') {
      template.draw(ctx, sx, sy, e.facing, animFrame);
    } else {
      template.draw(ctx, sx, sy, animFrame);
    }

    ctx.globalAlpha = 1;

    // HP bar above enemy
    const barW = 30;
    const barX = sx + (e.width - barW) / 2;
    const barY = sy - 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), 4);
  }
}
```

- [ ] **Step 2: Create forest map with enemy spawns**

Create `js/maps/forest.js`:

```js
// js/maps/forest.js
import { TILE } from '../sprites.js';

const G = TILE.GRASS;
const D = TILE.DIRT;
const T = TILE.TREE;
const W = TILE.WALL;
const P = TILE.PORTAL;

const tiles = [
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,D,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,T,G,G,T,G,G,G,G,G,G,D,G,D,G,G,T,G,G,G,G,T,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,T,G,G,G,D,G,D,G,G,G,G,G,G,G,G,G,G,T,G,G,T],
  [T,G,T,G,G,G,G,G,G,G,G,G,D,D,G,D,D,G,G,G,G,T,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,T,G,G,G,G,D,G,G,G,D,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,D,G,G,G,D,G,G,T,G,G,G,G,G,T,G,G,G,T],
  [T,G,T,G,G,G,G,G,G,G,G,G,D,D,D,D,D,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T,G,G,G,G,G,T],
  [T,G,G,G,G,T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T,G,G,T],
  [T,G,G,G,G,G,G,G,T,G,G,G,G,G,G,G,G,G,G,G,T,G,G,G,G,G,G,G,G,T],
  [T,G,G,T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T,G,G,G,G,G,G,G,T,G,T],
  [T,G,G,G,G,G,G,G,G,G,T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],
  [T,G,G,G,G,G,G,G,G,G,G,G,G,D,D,D,P,D,D,G,G,G,G,G,G,G,G,G,G,T],
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

export const forestMap = {
  name: 'Тёмный лес',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 1 },
  portals: [
    { col: 14, row: 1, target: 'village', spawnX: 14, spawnY: 17 },
    { col: 16, row: 18, target: 'canyon', spawnX: 15, spawnY: 1 },
  ],
  npcs: [],
  spawns: [
    { type: 'slime', col: 6, row: 4 },
    { type: 'slime', col: 20, row: 6 },
    { type: 'slime', col: 10, row: 10 },
    { type: 'slime', col: 25, row: 12 },
    { type: 'wolf', col: 18, row: 8 },
    { type: 'wolf', col: 8, row: 14 },
    { type: 'wolf', col: 22, row: 15 },
  ],
};
```

- [ ] **Step 3: Wire enemies into main.js update/render**

Add to the imports in `main.js`:

```js
import { spawnEnemy, updateEnemies, renderEnemies } from './enemies.js';
import { forestMap } from './maps/forest.js';
```

Add a map registry and update `loadMap`:

```js
const MAP_REGISTRY = {
  village: villageMap,
  forest: forestMap,
};

function loadMap(mapData) {
  game.currentMap = createTileMap(mapData);
  if (!game.player) {
    game.player = createPlayer(mapData.playerStart.x, mapData.playerStart.y);
  } else {
    game.player.x = mapData.playerStart.x * TILE_SIZE;
    game.player.y = mapData.playerStart.y * TILE_SIZE;
  }
  game.camera = createCamera(game.width, game.height);
  game.enemies = (mapData.spawns || []).map(s => spawnEnemy(s.type, s.col, s.row));
  game.npcs = mapData.npcs || [];
}
```

In `update()`, inside `STATE.PLAY`:

```js
if (game.state === STATE.PLAY) {
  updatePlayer(dt);
  updateEnemies(game.enemies, game.player, game.currentMap, dt);
  checkPortals();
  updateCamera(
    game.camera,
    game.player.x + 16,
    game.player.y + 20,
    game.currentMap.width,
    game.currentMap.height
  );
}
```

Add portal check function:

```js
function checkPortals() {
  const p = game.player;
  const col = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
  const row = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
  const portal = isPortal(game.currentMap, col, row);
  if (portal) {
    const targetMap = MAP_REGISTRY[portal.target];
    if (targetMap) {
      const savedPlayer = { ...game.player };
      loadMap(targetMap);
      // Restore player stats
      Object.assign(game.player, {
        hp: savedPlayer.hp,
        maxHp: savedPlayer.maxHp,
        atk: savedPlayer.atk,
        xp: savedPlayer.xp,
        level: savedPlayer.level,
        coins: savedPlayer.coins,
        potions: savedPlayer.potions,
        artifacts: savedPlayer.artifacts,
        cooldowns: savedPlayer.cooldowns,
      });
      if (portal.spawnX !== undefined) {
        game.player.x = portal.spawnX * TILE_SIZE;
        game.player.y = portal.spawnY * TILE_SIZE;
      }
    }
  }
}
```

In `render()`, add enemy rendering after NPCs and before player:

```js
renderEnemies(ctx, game.enemies, game.camera, game.animFrame);
```

- [ ] **Step 4: Open in browser, verify: enter forest through portal, see slimes and wolves, they chase player when close**

- [ ] **Step 5: Commit**

```bash
git add js/enemies.js js/maps/forest.js js/main.js
git commit -m "feat: enemy system with AI patterns, forest map, portal transitions"
```

---

### Task 5: Combat System

**Files:**
- Create: `js/combat.js`
- Create: `js/particles.js`
- Modify: `js/main.js` — integrate combat
- Create: `tests/test.html`
- Create: `tests/test-combat.js`

- [ ] **Step 1: Create tests/test.html and tests/test-combat.js**

```html
<!-- tests/test.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Game Tests</title>
  <style>
    body { background: #1a1a2e; color: #e0e0e0; font-family: monospace; padding: 20px; }
    .pass { color: #4caf50; }
    .fail { color: #f44336; }
    h2 { color: #ffd54f; }
  </style>
</head>
<body>
  <h2>Game Tests</h2>
  <div id="results"></div>
  <script type="module" src="test-combat.js"></script>
</body>
</html>
```

```js
// tests/test-combat.js
const results = document.getElementById('results');
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    results.innerHTML += `<div class="pass">PASS: ${name}</div>`;
    passed++;
  } catch (e) {
    results.innerHTML += `<div class="fail">FAIL: ${name} — ${e.message}</div>`;
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || ''} Expected ${expected}, got ${actual}`);
  }
}

// Import combat functions
import { calcDamage, calcXpToLevel, checkLevelUp } from '../js/combat.js';

test('calcDamage returns atk value for base case', () => {
  assertEqual(calcDamage(10, 0), 10);
});

test('calcDamage minimum is 1', () => {
  assertEqual(calcDamage(1, 100), 1);
});

test('calcXpToLevel for level 1 is 50', () => {
  assertEqual(calcXpToLevel(1), 50);
});

test('calcXpToLevel for level 5 is 250', () => {
  assertEqual(calcXpToLevel(5), 250);
});

test('checkLevelUp returns true when xp >= needed', () => {
  const player = { xp: 60, level: 1, maxHp: 100, hp: 100, atk: 5 };
  const result = checkLevelUp(player);
  assertEqual(result, true);
  assertEqual(player.level, 2);
  assertEqual(player.maxHp, 110);
  assertEqual(player.atk, 7);
  assertEqual(player.xp, 10); // 60 - 50
});

test('checkLevelUp returns false when xp < needed', () => {
  const player = { xp: 30, level: 1, maxHp: 100, hp: 100, atk: 5 };
  const result = checkLevelUp(player);
  assertEqual(result, false);
  assertEqual(player.level, 1);
});

test('checkLevelUp does not exceed level 10', () => {
  const player = { xp: 9999, level: 10, maxHp: 190, hp: 190, atk: 23 };
  const result = checkLevelUp(player);
  assertEqual(result, false);
  assertEqual(player.level, 10);
});

// Summary
results.innerHTML += `<hr><div>Total: ${passed + failed} | <span class="pass">Pass: ${passed}</span> | <span class="fail">Fail: ${failed}</span></div>`;
```

- [ ] **Step 2: Run tests — verify they fail (combat.js doesn't exist yet)**

Open `tests/test.html` in browser — all tests should fail with import error.

- [ ] **Step 3: Create js/combat.js**

```js
// js/combat.js

export function calcDamage(atk, defense) {
  return Math.max(1, atk - defense);
}

export function calcXpToLevel(level) {
  return level * 50;
}

export function checkLevelUp(player) {
  if (player.level >= 10) return false;

  const needed = calcXpToLevel(player.level);
  if (player.xp >= needed) {
    player.xp -= needed;
    player.level++;
    player.maxHp += 10;
    player.hp = player.maxHp; // full heal on level up
    player.atk += 2;
    return true;
  }
  return false;
}

export function playerAttackEnemies(player, enemies) {
  if (!player.attacking) return [];

  const killed = [];
  const range = 48; // 1.5 tiles
  let ax = player.x + 12, ay = player.y + 12;

  // Attack hitbox offset based on facing
  switch (player.facing) {
    case 'right': ax += 24; break;
    case 'left': ax -= 24; break;
    case 'up': ay -= 24; break;
    case 'down': ay += 24; break;
  }

  for (const e of enemies) {
    if (!e.alive) continue;

    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const dist = Math.sqrt((ax - ex) ** 2 + (ay - ey) ** 2);

    if (dist < range) {
      const dmg = calcDamage(player.atk, 0);
      e.hp -= dmg;
      e.hitTimer = 0.3;

      // Knockback
      const kx = (ex - ax);
      const ky = (ey - ay);
      const kd = Math.sqrt(kx * kx + ky * ky) || 1;
      e.x += (kx / kd) * 20;
      e.y += (ky / kd) * 20;

      if (e.hp <= 0) {
        e.alive = false;
        killed.push(e);
      }
    }
  }
  return killed;
}

export function enemyAttackPlayer(enemies, player, dt) {
  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= dt;
    return 0;
  }

  for (const e of enemies) {
    if (!e.alive) continue;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 30) {
      const dmg = calcDamage(e.atk, 0);
      player.hp -= dmg;
      player.invincibleTimer = 0.5; // 0.5s invincibility after hit

      // Knockback player
      const kd = dist || 1;
      player.x += (dx / kd) * 30;
      player.y += (dy / kd) * 30;

      return dmg;
    }
  }
  return 0;
}
```

- [ ] **Step 4: Run tests — verify all 6 pass**

Open `tests/test.html` — all tests should show green PASS.

- [ ] **Step 5: Create js/particles.js**

```js
// js/particles.js

export function createParticle(x, y, text, color, duration) {
  return {
    x, y, text, color,
    life: duration || 0.8,
    maxLife: duration || 0.8,
    vy: -40,
  };
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.y += p.vy * dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

export function renderParticles(ctx, particles, camera) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x - camera.x, p.y - camera.y);
  }
  ctx.globalAlpha = 1;
}
```

- [ ] **Step 6: Wire combat + particles into main.js**

Add imports:

```js
import { playerAttackEnemies, enemyAttackPlayer, checkLevelUp } from './combat.js';
import { createParticle, updateParticles, renderParticles } from './particles.js';
```

In `update()` STATE.PLAY section, after `updateEnemies`:

```js
// Combat
const killed = playerAttackEnemies(game.player, game.enemies);
for (const e of killed) {
  game.player.xp += e.xp;
  game.player.coins += e.coins;
  game.particles.push(createParticle(e.x + 16, e.y, '+' + e.xp + ' XP', '#b388ff'));
  game.particles.push(createParticle(e.x + 16, e.y + 12, '+' + e.coins + ' $', '#ffd54f'));

  // Potion drop (20% chance)
  if (Math.random() < 0.2) {
    game.player.potions++;
    game.particles.push(createParticle(e.x + 16, e.y + 24, '+1 HP pot', '#ef5350'));
  }

  if (checkLevelUp(game.player)) {
    game.particles.push(createParticle(game.player.x + 16, game.player.y - 10, 'LEVEL UP!', '#ffd54f', 1.5));
  }
}

const dmgTaken = enemyAttackPlayer(game.enemies, game.player, dt);
if (dmgTaken > 0) {
  game.particles.push(createParticle(game.player.x + 16, game.player.y, '-' + dmgTaken, '#ff5252'));

  if (game.player.hp <= 0) {
    game.state = STATE.GAMEOVER;
  }
}

// Use potion
if (isKeyPressed('KeyQ') && game.player.potions > 0) {
  game.player.potions--;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
  game.particles.push(createParticle(game.player.x + 16, game.player.y, '+30 HP', '#4caf50'));
}

updateParticles(game.particles, dt);
```

In `render()`, after player rendering:

```js
renderParticles(ctx, game.particles, game.camera);
```

Add gameover screen in `render()`:

```js
if (game.state === STATE.GAMEOVER) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, game.width, game.height);
  ctx.fillStyle = '#e53935';
  ctx.font = '20px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', game.width / 2, game.height / 2 - 10);
  ctx.fillStyle = '#888';
  ctx.font = '8px "Press Start 2P"';
  ctx.fillText('НАЖМИ ENTER', game.width / 2, game.height / 2 + 30);
}
```

In `update()`, add gameover handler:

```js
if (game.state === STATE.GAMEOVER) {
  if (isKeyPressed('Enter')) {
    game.state = STATE.MENU;
    game.player = null;
  }
  return;
}
```

- [ ] **Step 7: Open in browser, verify: attack enemies with Space, see damage numbers, collect XP/coins, level up, enemies hit back, game over on death**

- [ ] **Step 8: Commit**

```bash
git add js/combat.js js/particles.js tests/ js/main.js
git commit -m "feat: combat system with damage, XP, leveling, particles, potion use, game over"
```

---

### Task 6: NPC Dialog System

**Files:**
- Create: `js/npc.js`
- Create: `js/dialog.js`
- Modify: `js/main.js` — integrate dialogs

- [ ] **Step 1: Create js/npc.js with dialog trees**

```js
// js/npc.js

export const DIALOGS = {
  blacksmith: [
    {
      text: 'Герой! Монстры заняли лес к северу. Мой подмастерье пропал. Найди его — и я выкую тебе новый меч!',
      choices: [
        { text: 'Я найду его!', next: 1 },
        { text: 'Может позже...', next: null },
      ],
    },
    {
      text: 'Будь осторожен в лесу. Слаймы и волки не дремлют! Используй меч — нажми ПРОБЕЛ.',
      choices: [
        { text: 'Понял, спасибо!', next: null },
      ],
    },
  ],
  elder: [
    {
      text: 'Тёмный маг пробудил древнее зло в замке на севере. Чтобы победить его, тебе нужны 3 артефакта стихий.',
      choices: [
        { text: 'Где их найти?', next: 1 },
        { text: 'Я справлюсь!', next: null },
      ],
    },
    {
      text: 'Артефакт Земли — в Тёмном лесу. Артефакт Огня — в Огненном ущелье. Артефакт Воды — в Ледяной пещере. Каждый охраняет могущественный босс.',
      choices: [
        { text: 'Я отправляюсь!', next: null },
      ],
    },
  ],
  merchant: [
    {
      text: 'Добро пожаловать! Что желаешь?',
      choices: [
        { text: 'Зелье HP (10$)', action: 'buy_potion', next: 0 },
        { text: 'Большое зелье (25$)', action: 'buy_big_potion', next: 0 },
        { text: 'Уйти', next: null },
      ],
    },
  ],
};

export function getNearbyNPC(npcs, playerX, playerY) {
  for (const npc of npcs) {
    const nx = npc.col * 32 + 16;
    const ny = npc.row * 32 + 16;
    const dx = playerX + 12 - nx;
    const dy = playerY + 14 - ny;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 50) {
      return npc;
    }
  }
  return null;
}
```

- [ ] **Step 2: Create js/dialog.js**

```js
// js/dialog.js
import { DIALOGS } from './npc.js';

let currentDialog = null;
let currentNodeIndex = 0;
let selectedChoice = 0;
let actionCallback = null;

export function openDialog(npcId, onAction) {
  const tree = DIALOGS[npcId];
  if (!tree) return false;

  currentDialog = tree;
  currentNodeIndex = 0;
  selectedChoice = 0;
  actionCallback = onAction;
  return true;
}

export function isDialogOpen() {
  return currentDialog !== null;
}

export function dialogInput(key) {
  if (!currentDialog) return;

  const node = currentDialog[currentNodeIndex];
  if (!node) {
    closeDialog();
    return;
  }

  if (key === 'up') {
    selectedChoice = Math.max(0, selectedChoice - 1);
  } else if (key === 'down') {
    selectedChoice = Math.min(node.choices.length - 1, selectedChoice + 1);
  } else if (key === 'confirm') {
    const choice = node.choices[selectedChoice];
    if (choice.action && actionCallback) {
      actionCallback(choice.action);
    }
    if (choice.next === null) {
      closeDialog();
    } else {
      currentNodeIndex = choice.next;
      selectedChoice = 0;
    }
  }
}

export function closeDialog() {
  currentDialog = null;
  currentNodeIndex = 0;
  selectedChoice = 0;
  actionCallback = null;
}

export function renderDialog(ctx, width, height) {
  if (!currentDialog) return;

  const node = currentDialog[currentNodeIndex];
  if (!node) return;

  // Dialog box background
  const boxH = 140;
  const boxY = height - boxH;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, boxY, width, boxH);
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(0, boxY, width, 4);

  // Inner border
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, boxY + 12, width - 16, boxH - 20);

  // NPC name
  ctx.fillStyle = '#ffd54f';
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillText(currentDialog._npcName || '', 16, boxY + 26);

  // Dialog text (word wrap)
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '8px "Press Start 2P"';
  const maxWidth = width - 40;
  const words = node.text.split(' ');
  let line = '';
  let lineY = boxY + 44;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, 16, lineY);
      line = word;
      lineY += 16;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 16, lineY);

  // Choices
  const choicesY = boxY + boxH - 12 - (node.choices.length - 1) * 16;
  for (let i = 0; i < node.choices.length; i++) {
    const isSelected = i === selectedChoice;
    ctx.fillStyle = isSelected ? '#4fc3f7' : '#777';
    ctx.fillText((isSelected ? '> ' : '  ') + node.choices[i].text, 16, choicesY + i * 16);
  }

  // Blinking cursor
  ctx.fillStyle = '#ffd54f';
  ctx.textAlign = 'right';
  const blink = Math.floor(Date.now() / 400) % 2 === 0;
  if (blink) ctx.fillText('▼', width - 16, boxY + boxH - 12);
  ctx.textAlign = 'left';
}
```

- [ ] **Step 3: Wire dialogs into main.js**

Add imports:

```js
import { getNearbyNPC } from './npc.js';
import { openDialog, isDialogOpen, dialogInput, renderDialog, closeDialog } from './dialog.js';
```

In `updatePlayer`, add NPC interaction:

```js
// NPC interaction
if (isKeyPressed('KeyE')) {
  const npc = getNearbyNPC(game.npcs, game.player.x, game.player.y);
  if (npc) {
    const dialog = openDialog(npc.id, handleDialogAction);
    if (dialog) {
      // Store NPC name for display
      const { DIALOGS } = await import('./npc.js'); // nah, fix this
    }
  }
}
```

Wait — we need to attach the NPC name to the dialog. Let's modify `openDialog` to accept the name:

Update `dialog.js` — change `openDialog`:

```js
export function openDialog(npcId, npcName, onAction) {
  const tree = DIALOGS[npcId];
  if (!tree) return false;

  currentDialog = tree;
  currentDialog._npcName = npcName;
  currentNodeIndex = 0;
  selectedChoice = 0;
  actionCallback = onAction;
  return true;
}
```

Now in `main.js`, in `update()` — handle dialog state separately:

```js
if (game.state === STATE.DIALOG) {
  if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) dialogInput('up');
  if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) dialogInput('down');
  if (isKeyPressed('Enter') || isKeyPressed('Space') || isKeyPressed('KeyE')) dialogInput('confirm');

  if (!isDialogOpen()) {
    game.state = STATE.PLAY;
  }
  return;
}
```

In `updatePlayer`, the NPC interaction becomes:

```js
if (isKeyPressed('KeyE')) {
  const npc = getNearbyNPC(game.npcs, game.player.x, game.player.y);
  if (npc) {
    if (openDialog(npc.id, npc.name, handleDialogAction)) {
      game.state = STATE.DIALOG;
    }
  }
}
```

Add the dialog action handler:

```js
function handleDialogAction(action) {
  const p = game.player;
  switch (action) {
    case 'buy_potion':
      if (p.coins >= 10) {
        p.coins -= 10;
        p.potions++;
        game.particles.push(createParticle(p.x + 16, p.y, '+1 зелье', '#4caf50'));
      } else {
        game.particles.push(createParticle(p.x + 16, p.y, 'Мало $', '#e53935'));
      }
      break;
    case 'buy_big_potion':
      if (p.coins >= 25) {
        p.coins -= 25;
        p.hp = Math.min(p.maxHp, p.hp + 60);
        game.particles.push(createParticle(p.x + 16, p.y, '+60 HP', '#4caf50'));
      } else {
        game.particles.push(createParticle(p.x + 16, p.y, 'Мало $', '#e53935'));
      }
      break;
  }
}
```

In `render()`, after HUD, add dialog rendering:

```js
if (game.state === STATE.DIALOG) {
  renderDialog(ctx, game.width, game.height);
}
```

Also add an "E to talk" prompt when near an NPC. In `renderHUD()`, add:

```js
// NPC interaction prompt
if (game.state === STATE.PLAY) {
  const npc = getNearbyNPC(game.npcs, game.player.x, game.player.y);
  if (npc) {
    ctx.fillStyle = '#4fc3f7';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('[E] Говорить', game.width / 2, game.height - 10);
  }
}
```

- [ ] **Step 4: Open in browser, verify: approach NPC in village, press E, dialog opens, navigate choices with arrows, confirm with Enter, buy potions from merchant**

- [ ] **Step 5: Commit**

```bash
git add js/npc.js js/dialog.js js/main.js
git commit -m "feat: NPC dialog system with choices, merchant shop, quest text"
```

---

### Task 7: Abilities System

**Files:**
- Create: `js/abilities.js`
- Modify: `js/main.js` — wire abilities

- [ ] **Step 1: Create js/abilities.js**

```js
// js/abilities.js

export function createProjectile(x, y, dirX, dirY, damage, color, speed) {
  return {
    x, y, dirX, dirY, damage, color,
    speed: speed || 200,
    life: 2,
    width: 8,
    height: 8,
  };
}

export function useAbility(type, player, projectiles, enemies) {
  if (!player.artifacts[type]) return false;
  if (player.cooldowns[type] > 0) return false;

  switch (type) {
    case 'earth': {
      // Stone shield — blocks 1 hit
      player.invincibleTimer = 2;
      player.cooldowns.earth = 8;
      return true;
    }
    case 'fire': {
      // Fireball projectile
      let dx = 0, dy = 0;
      switch (player.facing) {
        case 'right': dx = 1; break;
        case 'left': dx = -1; break;
        case 'up': dy = -1; break;
        case 'down': dy = 1; break;
      }
      projectiles.push(createProjectile(
        player.x + 12, player.y + 12,
        dx, dy,
        15,
        '#ff5722',
        250
      ));
      player.cooldowns.fire = 5;
      return true;
    }
    case 'water': {
      // Ice wave — AoE slow
      for (const e of enemies) {
        if (!e.alive) continue;
        const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
        if (dist < 120) {
          e.speed *= 0.3; // slow to 30%
          e.slowTimer = 3;
        }
      }
      player.cooldowns.water = 10;
      return true;
    }
  }
  return false;
}

export function updateProjectiles(projectiles, enemies, dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.dirX * p.speed * dt;
    p.y += p.dirY * p.speed * dt;
    p.life -= dt;

    if (p.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    // Check collision with enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = p.x - (e.x + e.width / 2);
      const dy = p.y - (e.y + e.height / 2);
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        e.hp -= p.damage;
        e.hitTimer = 0.3;
        if (e.hp <= 0) e.alive = false;
        projectiles.splice(i, 1);
        break;
      }
    }
  }
}

export function updateCooldowns(player, dt) {
  for (const key of ['earth', 'fire', 'water']) {
    if (player.cooldowns[key] > 0) {
      player.cooldowns[key] = Math.max(0, player.cooldowns[key] - dt);
    }
  }
}

export function updateSlowTimers(enemies, dt) {
  for (const e of enemies) {
    if (e.slowTimer && e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) {
        // Restore original speed from template
        const SPEEDS = { slime: 40, wolf: 100, skeleton: 50, golem: 25 };
        e.speed = SPEEDS[e.type] || 50;
      }
    }
  }
}

export function renderProjectiles(ctx, projectiles, camera) {
  for (const p of projectiles) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    ctx.fillStyle = p.color;
    ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx - 2, sy - 2, 4, 4);
  }
}

export function renderAbilityBar(ctx, player, width, height) {
  const barY = height - 52;
  const barX = width / 2 - 72;

  const abilities = [
    { key: 'earth', label: '1', icon: '🛡', color: '#4caf50', cd: 8 },
    { key: 'fire', label: '2', icon: '🔥', color: '#ff5722', cd: 5 },
    { key: 'water', label: '3', icon: '❄', color: '#29b6f6', cd: 10 },
  ];

  for (let i = 0; i < abilities.length; i++) {
    const a = abilities[i];
    const x = barX + i * 48;
    const unlocked = player.artifacts[a.key];

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(x, barY, 40, 40);

    // Border
    ctx.strokeStyle = unlocked ? a.color : '#333';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, barY, 40, 40);

    // Icon
    ctx.globalAlpha = unlocked ? 1 : 0.3;
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(a.icon, x + 20, barY + 28);
    ctx.globalAlpha = 1;

    // Key label
    ctx.fillStyle = '#aaa';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText(a.label, x + 36, barY + 10);

    // Cooldown overlay
    if (unlocked && player.cooldowns[a.key] > 0) {
      const cdPct = player.cooldowns[a.key] / a.cd;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x + 2, barY + 2, 36, 36 * cdPct);

      ctx.fillStyle = '#fff';
      ctx.font = '8px "Press Start 2P"';
      ctx.fillText(Math.ceil(player.cooldowns[a.key]).toString(), x + 20, barY + 24);
    }
  }
}
```

- [ ] **Step 2: Wire abilities into main.js**

Add imports:

```js
import { useAbility, updateProjectiles, updateCooldowns, updateSlowTimers, renderProjectiles, renderAbilityBar } from './abilities.js';
```

In `update()` STATE.PLAY, after existing combat code:

```js
// Abilities
if (isKeyPressed('Digit1')) useAbility('earth', game.player, game.projectiles, game.enemies);
if (isKeyPressed('Digit2')) useAbility('fire', game.player, game.projectiles, game.enemies);
if (isKeyPressed('Digit3')) useAbility('water', game.player, game.projectiles, game.enemies);

updateProjectiles(game.projectiles, game.enemies, dt);
updateCooldowns(game.player, dt);
updateSlowTimers(game.enemies, dt);
```

In `render()`, after enemies and before particles:

```js
renderProjectiles(ctx, game.projectiles, game.camera);
```

After HUD:

```js
if (game.state === STATE.PLAY) {
  renderAbilityBar(ctx, game.player, game.width, game.height);
}
```

For testing: temporarily grant all artifacts in `createPlayer`:

```js
artifacts: { earth: true, fire: true, water: true }, // temp for testing
```

- [ ] **Step 3: Open in browser, verify: press 1/2/3 to use abilities, see fireball fly, cooldown overlay on ability bar, shield grants invincibility, ice wave slows enemies**

- [ ] **Step 4: Revert temporary artifact grant — set back to all false**

```js
artifacts: { earth: false, fire: false, water: false },
```

- [ ] **Step 5: Commit**

```bash
git add js/abilities.js js/main.js
git commit -m "feat: elemental abilities - stone shield, fireball, ice wave with cooldowns"
```

---

### Task 8: Boss System

**Files:**
- Create: `js/bosses.js`
- Modify: `js/enemies.js` — add boss rendering
- Modify: `js/main.js` — boss HP bar, artifact drops

- [ ] **Step 1: Create js/bosses.js**

```js
// js/bosses.js

export function createBoss(type, col, row) {
  const TILE_SIZE = 32;
  const bossDefs = {
    forest_guardian: {
      name: 'Лесной страж',
      hp: 200, maxHp: 200, atk: 12, speed: 35,
      width: 48, height: 48,
      xp: 100, coins: 30,
      artifact: 'earth',
      color1: '#2e7d32', color2: '#4caf50',
      phases: [
        { hpThreshold: 1.0, speed: 35, atk: 12, pattern: 'circle' },
        { hpThreshold: 0.5, speed: 55, atk: 15, pattern: 'charge' },
      ],
    },
    fire_dragon: {
      name: 'Огненный дракон',
      hp: 300, maxHp: 300, atk: 18, speed: 40,
      width: 56, height: 48,
      xp: 150, coins: 40,
      artifact: 'fire',
      color1: '#d84315', color2: '#ff5722',
      phases: [
        { hpThreshold: 1.0, speed: 40, atk: 18, pattern: 'ranged' },
        { hpThreshold: 0.6, speed: 50, atk: 22, pattern: 'charge' },
        { hpThreshold: 0.3, speed: 60, atk: 25, pattern: 'frenzy' },
      ],
    },
    ice_lich: {
      name: 'Ледяной лич',
      hp: 250, maxHp: 250, atk: 15, speed: 30,
      width: 48, height: 56,
      xp: 150, coins: 40,
      artifact: 'water',
      color1: '#0277bd', color2: '#29b6f6',
      phases: [
        { hpThreshold: 1.0, speed: 30, atk: 15, pattern: 'teleport' },
        { hpThreshold: 0.4, speed: 45, atk: 20, pattern: 'frenzy' },
      ],
    },
    dark_knight: {
      name: 'Тёмный рыцарь',
      hp: 200, maxHp: 200, atk: 20, speed: 50,
      width: 40, height: 48,
      xp: 100, coins: 30,
      artifact: null,
      color1: '#37474f', color2: '#607d8b',
      phases: [
        { hpThreshold: 1.0, speed: 50, atk: 20, pattern: 'charge' },
        { hpThreshold: 0.5, speed: 70, atk: 25, pattern: 'frenzy' },
      ],
    },
    dark_mage: {
      name: 'Тёмный маг',
      hp: 400, maxHp: 400, atk: 25, speed: 35,
      width: 48, height: 56,
      xp: 300, coins: 100,
      artifact: null,
      color1: '#4a148c', color2: '#7c4dff',
      phases: [
        { hpThreshold: 1.0, speed: 35, atk: 25, pattern: 'ranged' },
        { hpThreshold: 0.6, speed: 45, atk: 30, pattern: 'teleport' },
        { hpThreshold: 0.3, speed: 55, atk: 35, pattern: 'frenzy' },
      ],
    },
  };

  const def = bossDefs[type];
  if (!def) return null;

  return {
    ...def,
    type,
    x: col * TILE_SIZE,
    y: row * TILE_SIZE,
    isBoss: true,
    alive: true,
    facing: 'left',
    hitTimer: 0,
    moveTimer: 0,
    phaseIndex: 0,
    actionTimer: 0,
    chargeDir: { x: 0, y: 0 },
    charging: false,
    teleportTimer: 0,
  };
}

export function updateBoss(boss, player, projectiles, dt) {
  if (!boss || !boss.alive) return;

  if (boss.hitTimer > 0) boss.hitTimer -= dt;

  // Determine phase
  const hpPct = boss.hp / boss.maxHp;
  for (let i = boss.phases.length - 1; i >= 0; i--) {
    if (hpPct <= boss.phases[i].hpThreshold) {
      boss.phaseIndex = i;
      boss.atk = boss.phases[i].atk;
      boss.speed = boss.phases[i].speed;
      break;
    }
  }

  const pattern = boss.phases[boss.phaseIndex].pattern;
  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  boss.facing = dx > 0 ? 'right' : 'left';
  boss.actionTimer += dt;

  switch (pattern) {
    case 'circle':
      // Slowly circle the player
      const angle = boss.actionTimer * 1.5;
      const targetX = player.x + Math.cos(angle) * 100;
      const targetY = player.y + Math.sin(angle) * 100;
      boss.x += (targetX - boss.x) * dt * 2;
      boss.y += (targetY - boss.y) * dt * 2;
      break;

    case 'chase':
      boss.x += nx * boss.speed * dt;
      boss.y += ny * boss.speed * dt;
      break;

    case 'charge':
      if (!boss.charging) {
        boss.moveTimer += dt;
        if (boss.moveTimer > 2) {
          boss.charging = true;
          boss.chargeDir = { x: nx, y: ny };
          boss.moveTimer = 0;
        }
      } else {
        boss.x += boss.chargeDir.x * boss.speed * 3 * dt;
        boss.y += boss.chargeDir.y * boss.speed * 3 * dt;
        boss.moveTimer += dt;
        if (boss.moveTimer > 0.5) {
          boss.charging = false;
          boss.moveTimer = 0;
        }
      }
      break;

    case 'ranged':
      // Keep distance and shoot
      if (dist < 150) {
        boss.x -= nx * boss.speed * dt;
        boss.y -= ny * boss.speed * dt;
      } else if (dist > 200) {
        boss.x += nx * boss.speed * 0.5 * dt;
        boss.y += ny * boss.speed * 0.5 * dt;
      }
      boss.moveTimer += dt;
      if (boss.moveTimer > 1.5) {
        boss.moveTimer = 0;
        projectiles.push({
          x: boss.x + boss.width / 2,
          y: boss.y + boss.height / 2,
          dirX: nx, dirY: ny,
          damage: boss.atk,
          color: boss.color2,
          speed: 180,
          life: 3,
          width: 12, height: 12,
          fromBoss: true,
        });
      }
      break;

    case 'teleport':
      boss.teleportTimer += dt;
      if (boss.teleportTimer > 3) {
        boss.teleportTimer = 0;
        // Teleport to random position near player
        const angle2 = Math.random() * Math.PI * 2;
        boss.x = player.x + Math.cos(angle2) * 100;
        boss.y = player.y + Math.sin(angle2) * 100;
      }
      boss.x += nx * boss.speed * dt;
      boss.y += ny * boss.speed * dt;
      break;

    case 'frenzy':
      // Fast aggressive chase
      boss.x += nx * boss.speed * dt;
      boss.y += ny * boss.speed * dt;
      break;
  }
}

export function renderBoss(ctx, boss, camera, animFrame) {
  if (!boss || !boss.alive) return;

  const sx = boss.x - camera.x;
  const sy = boss.y - camera.y;

  // Hit flash
  if (boss.hitTimer > 0 && Math.floor(boss.hitTimer * 10) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  // Boss body (simple colored rectangle with details)
  ctx.fillStyle = boss.color1;
  ctx.fillRect(sx, sy, boss.width, boss.height);
  ctx.fillStyle = boss.color2;
  ctx.fillRect(sx + 4, sy + 4, boss.width - 8, boss.height - 8);

  // Eyes
  ctx.fillStyle = '#fff';
  const eyeY = sy + boss.height * 0.3;
  ctx.fillRect(sx + boss.width * 0.25, eyeY, 6, 6);
  ctx.fillRect(sx + boss.width * 0.6, eyeY, 6, 6);
  ctx.fillStyle = '#f44336';
  ctx.fillRect(sx + boss.width * 0.25 + 2, eyeY + 2, 3, 3);
  ctx.fillRect(sx + boss.width * 0.6 + 2, eyeY + 2, 3, 3);

  // Charging indicator
  if (boss.charging) {
    ctx.fillStyle = '#ff0';
    ctx.fillRect(sx - 2, sy - 2, boss.width + 4, 3);
  }

  ctx.globalAlpha = 1;
}

export function renderBossHPBar(ctx, boss, width) {
  if (!boss || !boss.alive) return;

  const barW = 300;
  const barH = 16;
  const barX = (width - barW) / 2;
  const barY = 40;

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

  // HP fill
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(barX, barY, barW * (boss.hp / boss.maxHp), barH);

  // Name
  ctx.fillStyle = '#ffd54f';
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText(boss.name, width / 2, barY - 6);

  // Phase dots
  const phases = boss.phases.length;
  for (let i = 0; i < phases; i++) {
    const dotX = barX + barW * (1 - boss.phases[i].hpThreshold) + 2;
    ctx.fillStyle = i <= boss.phaseIndex ? '#ffd54f' : '#666';
    ctx.fillRect(dotX, barY + barH + 4, 4, 4);
  }
}
```

- [ ] **Step 2: Wire bosses into main.js**

Add imports:

```js
import { createBoss, updateBoss, renderBoss, renderBossHPBar } from './bosses.js';
```

Add `boss` field to game state:

```js
game.boss = null;
```

In `loadMap`, if map has a boss spawn:

```js
game.boss = null;
if (mapData.boss) {
  game.boss = createBoss(mapData.boss.type, mapData.boss.col, mapData.boss.row);
}
```

Add boss field to forest map (`js/maps/forest.js`):

```js
boss: { type: 'forest_guardian', col: 14, row: 14 },
```

In `update()` STATE.PLAY:

```js
// Boss update
if (game.boss && game.boss.alive) {
  updateBoss(game.boss, game.player, game.projectiles, dt);

  // Boss melee damage to player
  if (game.player.invincibleTimer <= 0) {
    const bx = game.boss.x + game.boss.width / 2;
    const by = game.boss.y + game.boss.height / 2;
    const px = game.player.x + 12;
    const py = game.player.y + 14;
    const dist = Math.sqrt((bx - px) ** 2 + (by - py) ** 2);
    if (dist < 40) {
      game.player.hp -= game.boss.atk;
      game.player.invincibleTimer = 0.8;
      game.particles.push(createParticle(px, py, '-' + game.boss.atk, '#ff5252'));
      if (game.player.hp <= 0) game.state = STATE.GAMEOVER;
    }
  }

  // Player sword hits boss
  if (game.player.attacking && game.player.attackTimer > 0.25) {
    const range = 48;
    let ax = game.player.x + 12, ay = game.player.y + 12;
    switch (game.player.facing) {
      case 'right': ax += 24; break;
      case 'left': ax -= 24; break;
      case 'up': ay -= 24; break;
      case 'down': ay += 24; break;
    }
    const bx = game.boss.x + game.boss.width / 2;
    const by = game.boss.y + game.boss.height / 2;
    if (Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2) < range + 20) {
      game.boss.hp -= game.player.atk;
      game.boss.hitTimer = 0.2;
      game.particles.push(createParticle(bx, by - 10, '-' + game.player.atk, '#ffd54f'));

      if (game.boss.hp <= 0) {
        game.boss.alive = false;
        game.player.xp += game.boss.xp;
        game.player.coins += game.boss.coins;
        if (game.boss.artifact) {
          game.player.artifacts[game.boss.artifact] = true;
          game.particles.push(createParticle(bx, by - 20, 'АРТЕФАКТ!', '#ffd54f', 2));
        }
        checkLevelUp(game.player);
      }
    }
  }

  // Boss projectiles hit player
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const proj = game.projectiles[i];
    if (!proj.fromBoss) continue;
    const dist = Math.sqrt((proj.x - game.player.x - 12) ** 2 + (proj.y - game.player.y - 14) ** 2);
    if (dist < 24 && game.player.invincibleTimer <= 0) {
      game.player.hp -= proj.damage;
      game.player.invincibleTimer = 0.5;
      game.particles.push(createParticle(game.player.x + 12, game.player.y, '-' + proj.damage, '#ff5252'));
      game.projectiles.splice(i, 1);
      if (game.player.hp <= 0) game.state = STATE.GAMEOVER;
    }
  }
}
```

In `render()`, after enemies:

```js
renderBoss(ctx, game.boss, game.camera, game.animFrame);
```

After HUD:

```js
if (game.boss && game.boss.alive) {
  renderBossHPBar(ctx, game.boss, game.width);
}
```

- [ ] **Step 3: Open in browser, verify: enter forest, find boss at bottom, fight it, see phase changes, collect artifact on kill**

- [ ] **Step 4: Commit**

```bash
git add js/bosses.js js/maps/forest.js js/main.js
git commit -m "feat: boss system with multi-phase AI, artifact drops, boss HP bar"
```

---

### Task 9: Remaining Maps (Canyon, Cave, Castle)

**Files:**
- Create: `js/maps/canyon.js`
- Create: `js/maps/cave.js`
- Create: `js/maps/castle.js`
- Modify: `js/main.js` — add to registry

- [ ] **Step 1: Create js/maps/canyon.js**

```js
// js/maps/canyon.js
import { TILE } from '../sprites.js';

const G = TILE.GRASS;
const D = TILE.DIRT;
const W = TILE.WALL;
const L = TILE.LAVA;
const P = TILE.PORTAL;

const tiles = [
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  [W,D,D,D,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,D,D,D,D,D,D,D,D,W],
  [W,D,D,D,L,L,L,D,D,D,D,D,D,W,W,D,D,D,L,L,L,D,D,D,D,D,D,D,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,D,D,D,D,W],
  [W,D,D,W,W,D,D,D,D,L,L,D,D,D,D,D,D,D,D,D,D,D,D,L,L,D,D,D,D,W],
  [W,D,D,W,W,D,D,D,D,L,L,L,D,D,D,D,D,L,L,D,D,D,D,D,D,D,D,D,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,D,D,D,D,D,D,D,W,W,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,W],
  [W,D,D,D,D,D,D,D,L,L,D,D,D,D,D,D,D,D,D,D,L,L,D,D,D,D,D,D,D,W],
  [W,D,D,D,D,D,D,D,L,L,D,D,D,D,D,D,D,D,D,D,L,L,L,D,D,D,D,D,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  [W,D,D,L,L,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,L,L,D,D,W],
  [W,D,D,L,L,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,L,L,D,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,P,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const canyonMap = {
  name: 'Огненное ущелье',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 1 },
  portals: [
    { col: 14, row: 1, target: 'forest', spawnX: 14, spawnY: 17 },
    { col: 14, row: 18, target: 'cave', spawnX: 15, spawnY: 1 },
  ],
  npcs: [],
  spawns: [
    { type: 'slime', col: 6, row: 5 },
    { type: 'slime', col: 22, row: 8 },
    { type: 'skeleton', col: 12, row: 10 },
    { type: 'skeleton', col: 20, row: 4 },
    { type: 'skeleton', col: 7, row: 14 },
    { type: 'wolf', col: 24, row: 14 },
  ],
  boss: { type: 'fire_dragon', col: 14, row: 14 },
};
```

- [ ] **Step 2: Create js/maps/cave.js**

```js
// js/maps/cave.js
import { TILE } from '../sprites.js';

const I = TILE.ICE;
const W = TILE.WALL;
const A = TILE.WATER;
const P = TILE.PORTAL;

const tiles = [
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,W,W,I,I,I,I,I,I,I,I,I,I,W,W,I,I,I,I,I,I,I,I,I,W],
  [W,I,I,A,A,I,W,W,I,I,I,I,I,I,I,I,I,I,W,W,I,I,I,A,A,I,I,I,I,W],
  [W,I,I,A,A,I,I,I,I,I,I,I,I,W,I,I,I,I,I,I,I,I,I,A,A,I,I,I,I,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,I,I,I,W,W,I,I,I,I,I,W,W,I,I,I,I,I,I,I,I,W,I,I,W],
  [W,I,I,I,I,I,I,I,I,W,W,I,I,I,I,I,W,W,I,I,I,I,I,I,I,I,W,I,I,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,I,W,W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W,W,I,I,I,W],
  [W,I,W,W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W,W,I,I,I,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,I,A,A,I,I,I,I,I,I,I,I,I,I,A,A,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,I,A,A,I,I,I,I,I,I,I,I,I,I,A,A,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,I,I,I,I,I,I,I,I,I,I,I,I,I,P,I,I,I,I,I,I,I,I,I,I,I,I,I,I,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const caveMap = {
  name: 'Ледяная пещера',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 1 },
  portals: [
    { col: 14, row: 1, target: 'canyon', spawnX: 14, spawnY: 17 },
    { col: 14, row: 18, target: 'castle', spawnX: 15, spawnY: 1 },
  ],
  npcs: [],
  spawns: [
    { type: 'skeleton', col: 6, row: 5 },
    { type: 'skeleton', col: 22, row: 7 },
    { type: 'skeleton', col: 14, row: 12 },
    { type: 'golem', col: 8, row: 10 },
    { type: 'golem', col: 20, row: 10 },
    { type: 'golem', col: 14, row: 6 },
  ],
  boss: { type: 'ice_lich', col: 14, row: 14 },
};
```

- [ ] **Step 3: Create js/maps/castle.js**

```js
// js/maps/castle.js
import { TILE } from '../sprites.js';

const C = TILE.CASTLE;
const W = TILE.WALL;
const D = TILE.DIRT;
const P = TILE.PORTAL;

const tiles = [
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,W,W,W,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,W,W,W,C,C,C,C,W],
  [W,C,C,W,W,W,C,C,C,C,C,C,C,C,D,D,C,C,C,C,C,C,W,W,W,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,D,D,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,W,W,C,C,C,C,D,D,C,C,C,C,W,W,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,W,W,C,C,C,C,D,D,C,C,C,C,W,W,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,D,D,D,D,D,D,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,D,C,C,C,C,D,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,W,W,C,C,C,C,C,C,C,D,C,C,C,C,D,C,C,C,C,C,C,C,W,W,C,C,W],
  [W,C,C,W,W,C,C,C,C,C,C,C,D,D,D,D,D,D,C,C,C,C,C,C,C,W,W,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,D,D,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,D,D,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,D,D,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,D,D,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,D,D,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,D,D,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,C,C,C,C,C,C,C,C,C,C,C,C,C,P,C,C,C,C,C,C,C,C,C,C,C,C,C,C,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export const castleMap = {
  name: 'Замок Тёмного мага',
  width: 30,
  height: 20,
  tiles,
  playerStart: { x: 14, y: 17 },
  portals: [
    { col: 14, row: 18, target: 'cave', spawnX: 14, spawnY: 2 },
  ],
  npcs: [],
  spawns: [
    { type: 'skeleton', col: 5, row: 5 },
    { type: 'skeleton', col: 24, row: 5 },
    { type: 'skeleton', col: 5, row: 14 },
    { type: 'skeleton', col: 24, row: 14 },
    { type: 'golem', col: 10, row: 9 },
    { type: 'golem', col: 19, row: 9 },
  ],
  boss: { type: 'dark_mage', col: 14, row: 5 },
};
```

- [ ] **Step 4: Update main.js — add all maps to registry**

Add imports:

```js
import { canyonMap } from './maps/canyon.js';
import { caveMap } from './maps/cave.js';
import { castleMap } from './maps/castle.js';
```

Update MAP_REGISTRY:

```js
const MAP_REGISTRY = {
  village: villageMap,
  forest: forestMap,
  canyon: canyonMap,
  cave: caveMap,
  castle: castleMap,
};
```

- [ ] **Step 5: Open in browser, verify: can traverse all 5 maps through portals, each has unique tiles and enemies, bosses present**

- [ ] **Step 6: Commit**

```bash
git add js/maps/canyon.js js/maps/cave.js js/maps/castle.js js/main.js
git commit -m "feat: add canyon, cave, and castle maps with enemies and bosses"
```

---

### Task 10: Save/Load System & Win Condition

**Files:**
- Create: `js/save.js`
- Modify: `js/main.js` — save/load, win screen

- [ ] **Step 1: Create js/save.js**

```js
// js/save.js

const SAVE_KEY = 'eldoria_save';

export function saveGame(player, currentMapName) {
  const data = {
    hp: player.hp,
    maxHp: player.maxHp,
    atk: player.atk,
    xp: player.xp,
    level: player.level,
    coins: player.coins,
    potions: player.potions,
    artifacts: { ...player.artifacts },
    currentMap: currentMapName,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}
```

- [ ] **Step 2: Wire save/load + win condition into main.js**

Add import:

```js
import { saveGame, loadGame, hasSave, deleteSave } from './save.js';
```

Auto-save on portal transition — in `checkPortals()`, before loading new map:

```js
if (portal) {
  saveGame(game.player, portal.target);
  // ... existing portal code
}
```

Add "Continue" option to menu. In `renderMenu()`, update the menu buttons:

```js
// Menu options
const menuY = 280;
ctx.font = '10px "Press Start 2P"';
ctx.fillStyle = '#ffd54f';
ctx.fillText('> НОВАЯ ИГРА', game.width / 2, menuY);

if (hasSave()) {
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('  ПРОДОЛЖИТЬ', game.width / 2, menuY + 24);
}
```

For simplicity, use Enter for new game, C for continue:

In `update()` MENU state:

```js
if (game.state === STATE.MENU) {
  if (isKeyPressed('Enter')) {
    deleteSave();
    loadMap(villageMap);
    game.state = STATE.PLAY;
  }
  if (isKeyPressed('KeyC') && hasSave()) {
    const save = loadGame();
    const targetMap = MAP_REGISTRY[save.currentMap] || villageMap;
    loadMap(targetMap);
    Object.assign(game.player, {
      hp: save.hp, maxHp: save.maxHp, atk: save.atk,
      xp: save.xp, level: save.level, coins: save.coins,
      potions: save.potions, artifacts: save.artifacts,
    });
    game.state = STATE.PLAY;
  }
  return;
}
```

Win condition — after killing dark_mage boss, check:

In the boss death block in `update()`:

```js
if (game.boss.hp <= 0) {
  game.boss.alive = false;
  // ... existing xp/coin/artifact code ...

  // Win condition
  if (game.boss.type === 'dark_mage') {
    game.state = STATE.WIN;
    deleteSave();
  }
}
```

Add WIN render:

```js
if (game.state === STATE.WIN) {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, game.width, game.height);
  ctx.fillStyle = '#ffd54f';
  ctx.font = '16px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('ПОБЕДА!', game.width / 2, game.height / 2 - 30);
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '8px "Press Start 2P"';
  ctx.fillText('Тёмный маг повержен!', game.width / 2, game.height / 2 + 10);
  ctx.fillText('Эльдория спасена!', game.width / 2, game.height / 2 + 30);
  ctx.fillStyle = '#888';
  ctx.fillText('НАЖМИ ENTER', game.width / 2, game.height / 2 + 70);
}
```

WIN state handler in `update()`:

```js
if (game.state === STATE.WIN) {
  if (isKeyPressed('Enter')) {
    game.state = STATE.MENU;
    game.player = null;
  }
  return;
}
```

Update menu text to show controls:

```js
if (hasSave()) {
  ctx.fillStyle = '#888';
  ctx.font = '8px "Press Start 2P"';
  ctx.fillText('ENTER=Новая  C=Продолжить', game.width / 2, menuY + 50);
} else {
  ctx.fillStyle = '#888';
  ctx.font = '8px "Press Start 2P"';
  ctx.fillText('НАЖМИ ENTER', game.width / 2, menuY + 30);
}
```

- [ ] **Step 3: Open in browser, verify: game saves on portal transition, "Continue" works after refresh, defeating dark mage shows win screen**

- [ ] **Step 4: Commit**

```bash
git add js/save.js js/main.js
git commit -m "feat: save/load with localStorage, continue game, win condition on dark mage defeat"
```

---

### Task 11: Final Polish — Controls Help, Minimap, Invincibility Flash

**Files:**
- Modify: `js/main.js` — add minimap, controls overlay, player flash

- [ ] **Step 1: Add minimap rendering**

Add to `renderHUD()`:

```js
// Minimap
const mmW = 72, mmH = 72;
const mmX = game.width - mmW - 8;
const mmY = game.height - mmH - 8;

ctx.fillStyle = '#111';
ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
ctx.strokeStyle = '#555';
ctx.lineWidth = 2;
ctx.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);

ctx.fillStyle = '#1a2a10';
ctx.fillRect(mmX, mmY, mmW, mmH);

const map = game.currentMap;
const scaleX = mmW / (map.width * TILE_SIZE);
const scaleY = mmH / (map.height * TILE_SIZE);

// Player dot
ctx.fillStyle = '#4fc3f7';
ctx.fillRect(
  mmX + game.player.x * scaleX - 2,
  mmY + game.player.y * scaleY - 2,
  4, 4
);

// Enemy dots
for (const e of game.enemies) {
  if (!e.alive) continue;
  ctx.fillStyle = '#e53935';
  ctx.fillRect(
    mmX + e.x * scaleX - 1,
    mmY + e.y * scaleY - 1,
    3, 3
  );
}

// Boss dot
if (game.boss && game.boss.alive) {
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(
    mmX + game.boss.x * scaleX - 2,
    mmY + game.boss.y * scaleY - 2,
    5, 5
  );
}
```

- [ ] **Step 2: Add player invincibility flash to render**

In the player rendering section of `render()`, wrap the drawHero call:

```js
// Player invincibility flash
if (game.player.invincibleTimer > 0 && Math.floor(game.player.invincibleTimer * 10) % 2 === 0) {
  ctx.globalAlpha = 0.4;
}
drawHero(ctx, px, py, game.player.facing, frame, game.player.attacking);
ctx.globalAlpha = 1;
```

- [ ] **Step 3: Add controls help overlay (press H)**

In `render()`, add at the end before closing brace:

```js
// Controls help (toggle with H)
if (game.showHelp) {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(60, 40, game.width - 120, game.height - 80);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 40, game.width - 120, game.height - 80);

  ctx.fillStyle = '#ffd54f';
  ctx.font = '10px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('УПРАВЛЕНИЕ', game.width / 2, 70);

  ctx.fillStyle = '#e0e0e0';
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'left';
  const helpX = 90;
  const lines = [
    'WASD / Стрелки — Движение',
    'ПРОБЕЛ — Удар мечом',
    'E — Говорить с NPC',
    'Q — Использовать зелье',
    '1 — Каменный щит',
    '2 — Огненный шар',
    '3 — Ледяная волна',
    'H — Эта справка',
  ];
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], helpX, 100 + i * 22);
  }

  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.fillText('Нажми H чтобы закрыть', game.width / 2, game.height - 60);
}
```

In `update()`, add help toggle (inside STATE.PLAY):

```js
if (isKeyPressed('KeyH')) {
  game.showHelp = !game.showHelp;
}
```

Add `showHelp: false` to game state.

- [ ] **Step 4: Add hint on first load**

In `renderHUD()`, when player is in village and level 1:

```js
if (game.currentMap.name === 'Деревня Брайтхолл' && game.player.level === 1) {
  ctx.fillStyle = '#888';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('[H] Справка по управлению', game.width / 2, 46);
}
```

- [ ] **Step 5: Open in browser, verify: minimap shows player/enemies/boss, player flashes when hit, H shows controls overlay**

- [ ] **Step 6: Commit**

```bash
git add js/main.js
git commit -m "feat: minimap, player invincibility flash, controls help overlay"
```

---

### Task 12: Inventory Tests & Final Verification

**Files:**
- Create: `tests/test-inventory.js`
- Modify: `tests/test.html` — add inventory tests

- [ ] **Step 1: Create tests/test-inventory.js**

```js
// tests/test-inventory.js
const results = document.getElementById('results');
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    results.innerHTML += `<div class="pass">PASS: ${name}</div>`;
    passed++;
  } catch (e) {
    results.innerHTML += `<div class="fail">FAIL: ${name} — ${e.message}</div>`;
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || ''} Expected ${expected}, got ${actual}`);
}

import { saveGame, loadGame, deleteSave } from '../js/save.js';

test('saveGame stores data in localStorage', () => {
  const player = {
    hp: 80, maxHp: 100, atk: 7, xp: 30, level: 2,
    coins: 42, potions: 3, artifacts: { earth: true, fire: false, water: false },
  };
  saveGame(player, 'forest');
  const loaded = loadGame();
  assertEqual(loaded.hp, 80);
  assertEqual(loaded.level, 2);
  assertEqual(loaded.currentMap, 'forest');
  assertEqual(loaded.artifacts.earth, true);
  assertEqual(loaded.artifacts.fire, false);
  deleteSave();
});

test('loadGame returns null when no save', () => {
  deleteSave();
  assertEqual(loadGame(), null);
});

test('deleteSave removes save data', () => {
  const player = { hp: 100, maxHp: 100, atk: 5, xp: 0, level: 1, coins: 0, potions: 0, artifacts: {} };
  saveGame(player, 'village');
  deleteSave();
  assertEqual(loadGame(), null);
});

// Summary
results.innerHTML += `<hr><div>Inventory/Save Tests: ${passed + failed} | <span class="pass">Pass: ${passed}</span> | <span class="fail">Fail: ${failed}</span></div>`;
```

- [ ] **Step 2: Update tests/test.html to include both test files**

```html
<!-- tests/test.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Game Tests</title>
  <style>
    body { background: #1a1a2e; color: #e0e0e0; font-family: monospace; padding: 20px; }
    .pass { color: #4caf50; }
    .fail { color: #f44336; }
    h2 { color: #ffd54f; }
    hr { border-color: #333; }
  </style>
</head>
<body>
  <h2>Хроники Эльдории — Тесты</h2>
  <div id="results"></div>
  <script type="module" src="test-combat.js"></script>
  <script type="module" src="test-inventory.js"></script>
</body>
</html>
```

- [ ] **Step 3: Run tests — verify all pass**

Open `tests/test.html` in browser. All combat and save/load tests should show green.

- [ ] **Step 4: Full playthrough verification**

Open `index.html`:
1. Press Enter — new game starts in village
2. Talk to NPCs with E
3. Walk to portal at bottom — enter forest
4. Kill slimes and wolves with Space
5. Level up, collect coins
6. Fight forest boss, get Earth artifact
7. Press 1 — stone shield activates
8. Continue through canyon (press 2 for fireball)
9. Continue through cave (press 3 for ice wave)
10. Enter castle, defeat dark mage
11. Win screen appears
12. Refresh — Continue works (until win clears save)

- [ ] **Step 5: Commit**

```bash
git add tests/ js/main.js
git commit -m "feat: save/load tests, final test suite, game complete"
```
