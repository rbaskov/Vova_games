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
      choices: [{ text: 'Понял, спасибо!', next: null }],
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
      text: 'Артефакт Земли — в лесу. Огня — в ущелье. Воды — в пещере. Каждый охраняет босс.',
      choices: [{ text: 'Я отправляюсь!', next: null }],
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
    if (Math.sqrt(dx * dx + dy * dy) < 50) return npc;
  }
  return null;
}
