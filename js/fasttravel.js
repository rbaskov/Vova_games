// ============================================================
// fasttravel.js — Fast Travel System
// ============================================================

import { CHUNK_W, CHUNK_H } from './worldgen.js';
import { TILE_SIZE } from './tilemap.js';

/** Biome display colors */
const BIOME_COLORS = {
  forest:     '#4caf50',
  plains:     '#aed581',
  desert:     '#ffd54f',
  tundra:     '#b3e5fc',
  swamp:      '#8d6e63',
  volcanic:   '#ff7043',
  wasteland:  '#ff7043',
  mountains:  '#9e9e9e',
  snow:       '#b3e5fc',
  default:    '#9e9e9e',
};

function biomeColor(biome) {
  return BIOME_COLORS[biome] || BIOME_COLORS.default;
}

/** Structure type icons (single char) */
const STRUCTURE_ICONS = {
  village:   '⌂',
  camp:      '⛺',
  cave:      '▼',
  ruins:     '✦',
  hut:       '▲',
  fortress:  '■',
  boss:      '☠',
  portal:    '⊕',
  default:   '◆',
};

function structureIcon(id) {
  if (!id) return STRUCTURE_ICONS.default;
  for (const key of Object.keys(STRUCTURE_ICONS)) {
    if (id.includes(key)) return STRUCTURE_ICONS[key];
  }
  return STRUCTURE_ICONS.default;
}

export function createFastTravel() {
  return {
    active: false,
    destinations: [], // [{name, cx, cy, worldX, worldY, icon, biome}]
    selectedIndex: 0,

    /**
     * Open the fast travel UI.
     * Gathers the home village + all visited chunk structures.
     */
    open(chunkManager, visitedChunks) {
      this.destinations = [];

      // Always include home village
      this.destinations.push({
        name: 'Деревня Брайтхолл',
        cx: 0,
        cy: 0,
        worldX: 15 * TILE_SIZE,
        worldY: 10 * TILE_SIZE,
        icon: '⌂',
        biome: 'plains',
      });

      // Add destinations from visited chunks that have structures
      if (visitedChunks && chunkManager) {
        for (const chunkKey of visitedChunks) {
          const parts = chunkKey.split(',');
          if (parts.length !== 2) continue;
          const cx = parseInt(parts[0], 10);
          const cy = parseInt(parts[1], 10);
          // Skip chunk (0,0) — village already added
          if (cx === 0 && cy === 0) continue;

          const chunk = chunkManager.getChunk(cx, cy);
          if (!chunk || !chunk.structure) continue;

          const st = chunk.structure;
          // World pixel position: chunk origin + structure tile offset
          const worldX = cx * CHUNK_W * TILE_SIZE + st.col * TILE_SIZE;
          const worldY = cy * CHUNK_H * TILE_SIZE + st.row * TILE_SIZE;

          // Determine dominant biome from structure spawn or fallback
          let biome = 'default';
          if (st.spawns && st.spawns.length > 0 && st.spawns[0].biome) {
            biome = st.spawns[0].biome;
          }

          this.destinations.push({
            name: st.name || 'Неизвестное место',
            cx,
            cy,
            worldX,
            worldY,
            icon: structureIcon(st.id || ''),
            biome,
          });
        }
      }

      this.selectedIndex = 0;
      this.active = true;
    },

    close() {
      this.active = false;
      this.destinations = [];
      this.selectedIndex = 0;
    },

    /**
     * Handle keyboard input.
     * Returns { action: 'travel', dest } on confirm, or null otherwise.
     * Returns { action: 'close' } on cancel.
     */
    input(key) {
      if (!this.active) return null;

      if (key === 'up') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      } else if (key === 'down') {
        this.selectedIndex = Math.min(this.destinations.length - 1, this.selectedIndex + 1);
      } else if (key === 'confirm') {
        if (this.destinations.length > 0) {
          return { action: 'travel', dest: this.destinations[this.selectedIndex] };
        }
      } else if (key === 'close') {
        return { action: 'close' };
      }
      return null;
    },

    /**
     * Render the fast travel UI.
     * x, y, w, h define the game area (640x480).
     */
    render(ctx, x, y, w, h) {
      if (!this.active) return;

      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(x, y, w, h);

      const panelW = 400;
      const panelH = Math.min(360, 80 + this.destinations.length * 32 + 48);
      const panelX = x + (w - panelW) / 2;
      const panelY = y + (h - panelH) / 2;

      // Panel background
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = '#b388ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(panelX, panelY, panelW, panelH);

      // Title
      ctx.font = '11px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#b388ff';
      ctx.fillText('БЫСТРОЕ ПЕРЕМЕЩЕНИЕ', panelX + panelW / 2, panelY + 24);

      // Separator
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(panelX + 16, panelY + 34);
      ctx.lineTo(panelX + panelW - 16, panelY + 34);
      ctx.stroke();

      // Destinations list
      const listStartY = panelY + 52;
      const itemH = 30;
      const maxVisible = Math.floor((panelH - 100) / itemH);
      const scrollOffset = Math.max(0, this.selectedIndex - maxVisible + 1);

      for (let i = 0; i < Math.min(maxVisible, this.destinations.length); i++) {
        const di = i + scrollOffset;
        if (di >= this.destinations.length) break;
        const dest = this.destinations[di];
        const iy = listStartY + i * itemH;
        const isSelected = di === this.selectedIndex;

        // Selection highlight
        if (isSelected) {
          ctx.fillStyle = 'rgba(179, 136, 255, 0.25)';
          ctx.fillRect(panelX + 8, iy - 14, panelW - 16, itemH - 2);
          ctx.strokeStyle = '#b388ff';
          ctx.lineWidth = 1;
          ctx.strokeRect(panelX + 8, iy - 14, panelW - 16, itemH - 2);
        }

        // Biome color dot
        ctx.fillStyle = biomeColor(dest.biome);
        ctx.beginPath();
        ctx.arc(panelX + 24, iy - 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Destination name
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
        ctx.fillText(dest.name, panelX + 36, iy);

        // Biome label (right-aligned, smaller)
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillStyle = biomeColor(dest.biome);
        const biomeName = dest.biome.charAt(0).toUpperCase() + dest.biome.slice(1);
        ctx.fillText(biomeName, panelX + panelW - 16, iy);
      }

      // Scroll indicator
      if (this.destinations.length > maxVisible) {
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';
        ctx.fillText(`${this.selectedIndex + 1}/${this.destinations.length}`, panelX + panelW / 2, panelY + panelH - 36);
      }

      // Instructions
      ctx.fillStyle = '#555';
      ctx.font = '6px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('↑↓ Выбор    Enter Перемещение    T Закрыть', panelX + panelW / 2, panelY + panelH - 12);

      ctx.textAlign = 'left';
    },
  };
}
