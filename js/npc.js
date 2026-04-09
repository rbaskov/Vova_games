export const DIALOGS = {
  blacksmith: [
    {
      text: 'Добро пожаловать в кузницу! Я кую лучшее оружие в Эльдории. Что тебе нужно?',
      choices: [
        { text: 'Стальной меч (50$)', action: 'buy_steel_sword', next: 0 },
        { text: 'Копьё (40$)', action: 'buy_spear', next: 0 },
        { text: 'Лук (80$)', action: 'buy_bow', next: 0 },
        { text: 'Ещё оружие...', next: 1 },
        { text: 'Уйти', next: null },
      ],
    },
    {
      text: 'Для опытных воинов у меня есть кое-что особенное!',
      choices: [
        { text: 'Мифриловый меч (120$)', action: 'buy_mithril_sword', next: 1 },
        { text: 'Огненное копьё (100$)', action: 'buy_fire_spear', next: 1 },
        { text: 'Арбалет (150$)', action: 'buy_crossbow', next: 1 },
        { text: 'Назад', next: 0 },
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
