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
        { text: 'Доспехи...', next: 1 },
        { text: 'Уйти', next: null },
      ],
    },
    {
      text: 'У меня лучшие доспехи! Выбирай:',
      choices: [
        { text: 'Кож. шлем (15$)', action: 'buy_armor_leather_helmet', next: 1 },
        { text: 'Кож. доспех (25$)', action: 'buy_armor_leather_chest', next: 1 },
        { text: 'Кож. поножи (20$)', action: 'buy_armor_leather_legs', next: 1 },
        { text: 'Дороже...', next: 2 },
        { text: 'Назад', next: 0 },
      ],
    },
    {
      text: 'Для серьёзных воинов!',
      choices: [
        { text: 'Жел. шлем (45$)', action: 'buy_armor_iron_helmet', next: 2 },
        { text: 'Жел. доспех (70$)', action: 'buy_armor_iron_chest', next: 2 },
        { text: 'Жел. поножи (50$)', action: 'buy_armor_iron_legs', next: 2 },
        { text: 'Ещё дороже...', next: 3 },
        { text: 'Назад', next: 1 },
      ],
    },
    {
      text: 'Мифриловые доспехи — лучшие в Эльдории!',
      choices: [
        { text: 'Миф. шлем (110$)', action: 'buy_armor_mithril_helmet', next: 3 },
        { text: 'Миф. доспех (160$)', action: 'buy_armor_mithril_chest', next: 3 },
        { text: 'Миф. поножи (120$)', action: 'buy_armor_mithril_legs', next: 3 },
        { text: 'Назад', next: 2 },
      ],
    },
  ],

  // === ROYAL CASTLE NPCs ===
  king: [
    {
      text: 'Добро пожаловать, герой! Я — король Альдрик. Тёмный маг угрожает всему королевству. Только ты можешь остановить его!',
      choices: [
        { text: 'Я не подведу!', next: 1 },
        { text: 'Расскажите подробнее', next: 2 },
      ],
    },
    {
      text: 'Возьми это благословение — оно придаст сил в бою. Да хранит тебя свет!',
      choices: [
        { text: 'Благодарю, Ваше Величество!', action: 'king_blessing', next: null },
      ],
    },
    {
      text: 'Тёмный маг собрал армию в замке на севере. Пройди через лес, ущелье и пещеру. Собери три артефакта стихий — только с их силой можно одолеть его.',
      choices: [
        { text: 'Я отправляюсь!', next: 1 },
      ],
    },
  ],
  royal_merchant: [
    {
      text: 'Приветствую! Королевская лавка к вашим услугам. У нас лучшие зелья!',
      choices: [
        { text: 'Зелье HP (10$)', action: 'buy_potion', next: 0 },
        { text: 'Большое зелье (25$)', action: 'buy_big_potion', next: 0 },
        { text: 'Зелье x5 (40$)', action: 'buy_potion_pack', next: 0 },
        { text: 'Уйти', next: null },
      ],
    },
  ],
  royal_armorer: [
    {
      text: 'Королевская кузница! У меня есть и оружие, и доспехи. Что нужно?',
      choices: [
        { text: 'Оружие', next: 1 },
        { text: 'Доспехи', next: 2 },
        { text: 'Уйти', next: null },
      ],
    },
    {
      text: 'Выбирай оружие:',
      choices: [
        { text: 'Стальной меч (50$)', action: 'buy_steel_sword', next: 1 },
        { text: 'Копьё (40$)', action: 'buy_spear', next: 1 },
        { text: 'Лук (80$)', action: 'buy_bow', next: 1 },
        { text: 'Мифрил. меч (120$)', action: 'buy_mithril_sword', next: 1 },
        { text: 'Назад', next: 0 },
      ],
    },
    {
      text: 'Лучшие доспехи королевства:',
      choices: [
        { text: 'Жел. шлем (45$)', action: 'buy_armor_iron_helmet', next: 2 },
        { text: 'Жел. доспех (70$)', action: 'buy_armor_iron_chest', next: 2 },
        { text: 'Жел. поножи (50$)', action: 'buy_armor_iron_legs', next: 2 },
        { text: 'Мифрил...', next: 3 },
        { text: 'Назад', next: 0 },
      ],
    },
    {
      text: 'Мифриловые доспехи — для истинных героев!',
      choices: [
        { text: 'Миф. шлем (110$)', action: 'buy_armor_mithril_helmet', next: 3 },
        { text: 'Миф. доспех (160$)', action: 'buy_armor_mithril_chest', next: 3 },
        { text: 'Миф. поножи (120$)', action: 'buy_armor_mithril_legs', next: 3 },
        { text: 'Назад', next: 2 },
      ],
    },
  ],
  knight1: [
    {
      text: 'Рыцарь Гарет к вашим услугам! Совет: используй щит стихии Земли против боссов — он блокирует один удар.',
      choices: [{ text: 'Спасибо за совет!', next: null }],
    },
  ],
  knight2: [
    {
      text: 'Я — рыцарь Элара. Запомни: волки быстрые, но хрупкие. Бей первым, пока не окружили!',
      choices: [{ text: 'Буду помнить!', next: null }],
    },
  ],
  knight3: [
    {
      text: 'Борин-щитоносец. Совет: копьё бьёт дальше меча. Против големов — держи дистанцию и тыкай!',
      choices: [{ text: 'Хороший совет!', next: null }],
    },
  ],
  knight4: [
    {
      text: 'Рыцарь Лира. Не забывай покупать зелья перед каждой локацией. И проверяй чекпоинты — фиолетовые кристаллы!',
      choices: [{ text: 'Спасибо!', next: null }],
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
