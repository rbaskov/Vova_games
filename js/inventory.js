// ============================================================
// inventory.js — Inventory Screen Rendering & Logic
// ============================================================

import { drawPotionSprite, drawCoinSprite } from './sprites.js';

let selectedSlot = 0;

export function resetInventorySelection() {
  selectedSlot = 0;
}

export function inventoryInput(key, player, particles, createParticle) {
  const totalSlots = getItems(player).length;
  if (totalSlots === 0) return 'close';

  if (key === 'up') {
    selectedSlot = Math.max(0, selectedSlot - 4);
  } else if (key === 'down') {
    selectedSlot = Math.min(totalSlots - 1, selectedSlot + 4);
  } else if (key === 'left') {
    selectedSlot = Math.max(0, selectedSlot - 1);
  } else if (key === 'right') {
    selectedSlot = Math.min(totalSlots - 1, selectedSlot + 1);
  } else if (key === 'use') {
    const items = getItems(player);
    if (selectedSlot < items.length) {
      const item = items[selectedSlot];
      if (item.action) {
        item.action(player, particles, createParticle);
      }
    }
  } else if (key === 'close') {
    return 'close';
  }
  return null;
}

function getItems(player) {
  const items = [];

  // Potions
  if (player.potions > 0) {
    items.push({
      id: 'potion',
      name: 'Зелье HP',
      desc: '+30 HP',
      count: player.potions,
      color: '#e53935',
      drawIcon: (ctx, x, y) => drawPotionSprite(ctx, x + 4, y + 4, 24),
      action: (p, particles, createParticle) => {
        if (p.hp < p.maxHp) {
          p.potions--;
          p.hp = Math.min(p.maxHp, p.hp + 30);
          if (particles && createParticle) {
            particles.push(createParticle(p.x, p.y - 8, '+30 HP', '#44cc44'));
          }
        }
      },
    });
  }

  // Artifacts
  if (player.artifacts.earth) {
    items.push({
      id: 'artifact_earth',
      name: 'Артефакт Земли',
      desc: 'Каменный щит [1]',
      count: 1,
      color: '#4caf50',
      drawIcon: (ctx, x, y) => {
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(x + 6, y + 6, 20, 20);
        ctx.fillStyle = '#66bb6a';
        ctx.fillRect(x + 10, y + 10, 12, 12);
        ctx.fillStyle = '#81c784';
        ctx.fillRect(x + 13, y + 13, 6, 6);
      },
    });
  }

  if (player.artifacts.fire) {
    items.push({
      id: 'artifact_fire',
      name: 'Артефакт Огня',
      desc: 'Огненный шар [2]',
      count: 1,
      color: '#ff5722',
      drawIcon: (ctx, x, y) => {
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(x + 8, y + 6, 16, 16);
        ctx.fillStyle = '#ff9800';
        ctx.fillRect(x + 11, y + 4, 10, 6);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(x + 13, y + 8, 6, 6);
      },
    });
  }

  if (player.artifacts.water) {
    items.push({
      id: 'artifact_water',
      name: 'Артефакт Воды',
      desc: 'Ледяная волна [3]',
      count: 1,
      color: '#29b6f6',
      drawIcon: (ctx, x, y) => {
        ctx.fillStyle = '#29b6f6';
        ctx.fillRect(x + 6, y + 8, 20, 14);
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(x + 9, y + 5, 14, 6);
        ctx.fillStyle = '#81d4fa';
        ctx.fillRect(x + 12, y + 10, 8, 6);
      },
    });
  }

  return items;
}

export function renderInventory(ctx, player, width, height) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, width, height);

  const panelW = width - 80;
  const panelH = height - 60;
  const panelX = 40;
  const panelY = 30;

  // Panel background
  ctx.fillStyle = '#111';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 3;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // Title
  ctx.fillStyle = '#ffd54f';
  ctx.font = '12px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('ИНВЕНТАРЬ', width / 2, panelY + 24);

  // === Left side: Stats ===
  const statsX = panelX + 16;
  const statsY = panelY + 50;

  ctx.fillStyle = '#888';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillText('ХАРАКТЕРИСТИКИ', statsX, statsY);

  const statLines = [
    { label: 'HP', value: `${player.hp}/${player.maxHp}`, color: '#e53935' },
    { label: 'ATK', value: `${player.atk}`, color: '#ffd54f' },
    { label: 'LVL', value: `${player.level}`, color: '#4fc3f7' },
    { label: 'XP', value: `${player.xp}/${player.level * 50}`, color: '#b388ff' },
    { label: '$', value: `${player.coins}`, color: '#ffd54f' },
  ];

  for (let i = 0; i < statLines.length; i++) {
    const s = statLines[i];
    const y = statsY + 18 + i * 20;

    ctx.fillStyle = s.color;
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(s.label, statsX, y);

    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(s.value, statsX + 60, y);
  }

  // === Equipment section ===
  const equipY = statsY + 18 + statLines.length * 20 + 16;
  ctx.fillStyle = '#888';
  ctx.font = '7px "Press Start 2P"';
  ctx.fillText('ЭКИПИРОВКА', statsX, equipY);

  // Sword
  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(statsX, equipY + 10, 24, 24);
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(statsX + 8, equipY + 12, 3, 16);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(statsX + 5, equipY + 28, 9, 3);
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '7px "Press Start 2P"';
  ctx.fillText('Железный меч', statsX + 30, equipY + 26);

  // === Right side: Item Grid ===
  const gridX = panelX + panelW / 2 + 10;
  const gridY = panelY + 50;
  const cellSize = 36;
  const gridCols = 4;
  const gridRows = 3;

  ctx.fillStyle = '#888';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillText('ПРЕДМЕТЫ', gridX, gridY);

  const items = getItems(player);

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const idx = row * gridCols + col;
      const cx = gridX + col * (cellSize + 4);
      const cy = gridY + 12 + row * (cellSize + 4);

      // Cell background
      const hasItem = idx < items.length;
      ctx.fillStyle = hasItem ? '#1a1a2e' : '#111';
      ctx.fillRect(cx, cy, cellSize, cellSize);

      // Cell border
      const isSelected = idx === selectedSlot && hasItem;
      ctx.strokeStyle = isSelected ? '#ffd54f' : (hasItem ? '#444' : '#222');
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(cx, cy, cellSize, cellSize);

      if (hasItem) {
        const item = items[idx];
        // Draw icon
        item.drawIcon(ctx, cx, cy);

        // Count badge
        if (item.count > 1) {
          ctx.fillStyle = '#fff';
          ctx.font = '6px "Press Start 2P"';
          ctx.textAlign = 'right';
          ctx.fillText(`x${item.count}`, cx + cellSize - 2, cy + cellSize - 3);
          ctx.textAlign = 'left';
        }
      }
    }
  }

  // Selected item info
  if (selectedSlot < items.length) {
    const item = items[selectedSlot];
    const infoY = gridY + 12 + gridRows * (cellSize + 4) + 12;

    ctx.fillStyle = item.color;
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(item.name, gridX, infoY);

    ctx.fillStyle = '#aaa';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText(item.desc, gridX, infoY + 16);

    if (item.action) {
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText('[ENTER] Использовать', gridX, infoY + 34);
    }
  }

  // Footer
  ctx.fillStyle = '#555';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('Стрелки — выбор    ENTER — использовать    I — закрыть', width / 2, panelY + panelH - 10);
}
