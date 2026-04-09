import { DIALOGS } from './npc.js';

let currentDialog = null;
let currentNodeIndex = 0;
let selectedChoice = 0;
let actionCallback = null;

export function openDialog(npcId, npcName, onAction, customTree, extraChoices) {
  const sourceTree = customTree || DIALOGS[npcId];
  if (!sourceTree) return false;

  // Deep copy to avoid mutating the original DIALOGS
  currentDialog = sourceTree.map(node => ({
    text: node.text,
    choices: [...node.choices],
  }));

  // Inject extra choices (quests) into the first node
  if (extraChoices && extraChoices.length > 0 && currentDialog.length > 0) {
    // Add before the last choice (which is usually "Уйти")
    const firstNode = currentDialog[0];
    const lastChoice = firstNode.choices[firstNode.choices.length - 1];
    const isExitChoice = lastChoice && lastChoice.next === null && !lastChoice.action;

    if (isExitChoice) {
      // Insert quest choices before the exit option
      firstNode.choices.splice(firstNode.choices.length - 1, 0, ...extraChoices);
    } else {
      firstNode.choices.push(...extraChoices);
    }
  }

  currentDialog._npcName = npcName;
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
  if (!node) return;

  if (key === 'up') {
    selectedChoice = Math.max(0, selectedChoice - 1);
  } else if (key === 'down') {
    selectedChoice = Math.min(node.choices.length - 1, selectedChoice + 1);
  } else if (key === 'confirm') {
    const choice = node.choices[selectedChoice];
    if (!choice) return;

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

  const boxH = 160;
  const boxY = height - boxH - 10;
  const boxX = 20;
  const boxW = width - 40;

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Top border
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(boxX, boxY, boxW, 3);

  // Inner border
  ctx.strokeStyle = '#555';
  ctx.strokeRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);

  // NPC name
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd54f';
  const npcName = currentDialog._npcName || '???';
  ctx.fillText(npcName, boxX + 14, boxY + 22);

  // Dialog text with word-wrap
  ctx.fillStyle = '#ffffff';
  const maxLineW = boxW - 32;
  const words = node.text.split(' ');
  let line = '';
  let textY = boxY + 40;
  const lineHeight = 14;

  for (const word of words) {
    const testLine = line ? line + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxLineW && line) {
      ctx.fillText(line, boxX + 14, textY);
      line = word;
      textY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, boxX + 14, textY);
    textY += lineHeight;
  }

  // Choices
  textY += 6;
  for (let i = 0; i < node.choices.length; i++) {
    const choice = node.choices[i];
    if (i === selectedChoice) {
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText('> ' + choice.text, boxX + 14, textY);
    } else {
      ctx.fillStyle = '#777';
      ctx.fillText('  ' + choice.text, boxX + 14, textY);
    }
    textY += lineHeight;
  }

  // Blinking cursor
  const blink = Math.sin(Date.now() / 300) > 0;
  if (blink) {
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('\u25bc', boxX + boxW - 24, boxY + boxH - 14);
  }

  ctx.textAlign = 'left';
}
