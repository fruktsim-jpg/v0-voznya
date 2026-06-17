/**
 * Catalog of bot systems, achievements, titles and commands.
 *
 * Synced with voznya-bot v1.3 (app/features/*, app/settings/*).
 * Source of truth: voznya-bot repository.
 */

export type BotSystem = {
  emoji: string
  title: string
  description: string
}

/** Real systems detected in the bot source code. */
export const BOT_SYSTEMS: BotSystem[] = [
  { emoji: '💰', title: 'Экономика', description: 'Баланс в ешках, заработок и траты' },
  { emoji: '🌾', title: 'Ферма', description: 'Доход раз в 4 часа и серии активности' },
  { emoji: '🎰', title: 'Казино', description: 'Ставки на удачу с джекпотом ×10' },
  { emoji: '⚔️', title: 'Дуэли', description: 'Бои на ешки один на один' },
  { emoji: '🏆', title: 'Ачивки', description: '34 достижения с наградами' },

  { emoji: '🎖', title: 'Титулы', description: '11 рангов по заработку' },
  { emoji: '📦', title: 'Клады', description: 'Клады Возни появляются в чате' },
  { emoji: '💍', title: 'Браки', description: 'Свадьбы, семьи и рейтинг семей' },
  { emoji: '👤', title: 'Профили', description: 'Личная статистика каждого участника' },
  { emoji: '🥇', title: 'Рейтинги', description: 'Топ богачей, недели и семей' },
]

export type Achievement = {
  code: string
  emoji: string
  name: string
  description: string
  category: string
  reward: number
  hidden: boolean
}

/** Achievement categories in display order — mirrors app/settings/achievements.py v1.3. */
export const ACHIEVEMENT_CATEGORIES = [
  { code: 'economy', emoji: '💰', name: 'Экономика' },
  { code: 'messages', emoji: '💬', name: 'Сообщения' },
  { code: 'cases', emoji: '📦', name: 'Кейсы' },
  { code: 'farm', emoji: '🌱', name: 'Ферма' },
  { code: 'gifts', emoji: '🎁', name: 'Подарки' },
  { code: 'spending', emoji: '💸', name: 'Траты' },
  { code: 'collection', emoji: '🗃', name: 'Коллекционер' },
  { code: 'season', emoji: '🏆', name: 'Сезон' },
  { code: 'casino', emoji: '🎰', name: 'Казино' },
  { code: 'duel', emoji: '⚔️', name: 'Дуэли' },
  { code: 'treasure', emoji: '📦', name: 'Клады' },
  { code: 'marriage', emoji: '💍', name: 'Браки' },
  { code: 'nomination', emoji: '🏳️', name: 'Номинации' },
  { code: 'legend', emoji: '👑', name: 'Легенды Возни' },
  { code: 'secret', emoji: '🤫', name: 'Секретные' },
] as const


/** Achievement catalog — mirrors app/settings/achievements.py v1.3. */
export const ACHIEVEMENTS: Achievement[] = [
  // --- 💰 Экономика ---
  { code: 'first_ezhka', emoji: '🌱', name: 'Первая ешка', description: 'Заработал первую ешку', category: 'economy', reward: 10, hidden: false },
  { code: 'thousandaire', emoji: '💰', name: 'Первая тысяча', description: 'Поднял 1 000 ешек за всё время', category: 'economy', reward: 100, hidden: false },
  { code: 'magnate', emoji: '💰', name: 'Магнат аптеки', description: 'Поднял 10 000 ешек за всё время', category: 'economy', reward: 400, hidden: false },

  // --- 💬 Сообщения ---
  { code: 'chatter_100', emoji: '💬', name: 'Разговорился', description: 'Написал 100 сообщений', category: 'messages', reward: 20, hidden: false },
  { code: 'chatter_1k', emoji: '💬', name: 'Болтун Возни', description: 'Написал 1 000 сообщений', category: 'messages', reward: 75, hidden: false },
  { code: 'chatter_5k', emoji: '💬', name: 'Голос двора', description: 'Написал 5 000 сообщений', category: 'messages', reward: 200, hidden: false },
  { code: 'chatter_10k', emoji: '💬', name: 'Старожил чата', description: 'Написал 10 000 сообщений', category: 'messages', reward: 400, hidden: false },
  { code: 'chatter_50k', emoji: '💬', name: 'Легенда трёпа', description: 'Написал 50 000 сообщений', category: 'messages', reward: 1000, hidden: false },

  // --- 📦 Кейсы ---
  { code: 'opener_10', emoji: '📦', name: 'Первый дроп', description: 'Открыл 10 кейсов', category: 'cases', reward: 40, hidden: false },
  { code: 'opener_50', emoji: '📦', name: 'Любитель кейсов', description: 'Открыл 50 кейсов', category: 'cases', reward: 120, hidden: false },
  { code: 'opener_100', emoji: '📦', name: 'Кейсовый маньяк', description: 'Открыл 100 кейсов', category: 'cases', reward: 250, hidden: false },
  { code: 'opener_500', emoji: '📦', name: 'Машина открытий', description: 'Открыл 500 кейсов', category: 'cases', reward: 700, hidden: false },

  // --- 🌱 Ферма ---
  { code: 'farmer_50', emoji: '🌱', name: 'Начинающий аптекарь', description: '50 удачных ферм', category: 'farm', reward: 40, hidden: false },
  { code: 'farmer_250', emoji: '🌿', name: 'Опытный аптекарь', description: '250 удачных ферм', category: 'farm', reward: 150, hidden: false },
  { code: 'farmer_1000', emoji: '🌾', name: 'Король грядки', description: '1 000 удачных ферм', category: 'farm', reward: 600, hidden: false },

  // --- 🎁 Подарки ---
  { code: 'gifted_1', emoji: '🎁', name: 'Получил подарок', description: 'Получил первый подарок', category: 'gifts', reward: 25, hidden: false },
  { code: 'gifted_10', emoji: '🎁', name: 'Любимчик Возни', description: 'Получил 10 подарков', category: 'gifts', reward: 100, hidden: false },
  { code: 'gifted_50', emoji: '🎁', name: 'Гора подарков', description: 'Получил 50 подарков', category: 'gifts', reward: 300, hidden: false },

  // --- 💸 Траты ---
  { code: 'spender_1k', emoji: '💸', name: 'Транжира', description: 'Потратил 1 000 ешек', category: 'spending', reward: 30, hidden: false },
  { code: 'spender_5k', emoji: '💸', name: 'Мот', description: 'Потратил 5 000 ешек', category: 'spending', reward: 100, hidden: false },
  { code: 'spender_25k', emoji: '💸', name: 'Кутёж по-аптечному', description: 'Потратил 25 000 ешек', category: 'spending', reward: 400, hidden: false },

  // --- 🗃 Коллекционер ---
  { code: 'collector_5', emoji: '🗃', name: 'Начало коллекции', description: 'Собрал 5 разных предметов', category: 'collection', reward: 50, hidden: false },
  { code: 'collector_10', emoji: '🗃', name: 'Коллекционер', description: 'Собрал 10 разных предметов', category: 'collection', reward: 150, hidden: false },
  { code: 'collector_25', emoji: '🗃', name: 'Хранитель Возни', description: 'Собрал 25 разных предметов', category: 'collection', reward: 500, hidden: false },

  // --- 🏆 Сезон ---
  { code: 'season_silver', emoji: '🥈', name: 'Серебро сезона', description: 'Достиг дивизиона Silver', category: 'season', reward: 50, hidden: false },
  { code: 'season_gold', emoji: '🥇', name: 'Золото сезона', description: 'Достиг дивизиона Gold', category: 'season', reward: 120, hidden: false },
  { code: 'season_platinum', emoji: '💠', name: 'Платина сезона', description: 'Достиг дивизиона Platinum', category: 'season', reward: 250, hidden: false },
  { code: 'season_diamond', emoji: '💎', name: 'Алмаз сезона', description: 'Достиг дивизиона Diamond', category: 'season', reward: 500, hidden: false },
  { code: 'season_master', emoji: '🏅', name: 'Мастер сезона', description: 'Достиг дивизиона Master', category: 'season', reward: 1000, hidden: false },

  // --- 🎰 Казино ---

  { code: 'ludoman', emoji: '🎰', name: 'Лудоман', description: 'Крутанул казино 10 раз', category: 'casino', reward: 50, hidden: false },
  { code: 'casino_grandpa', emoji: '🎰', name: 'Казиношный дед', description: 'Крутанул казино 100 раз', category: 'casino', reward: 150, hidden: false },

  // --- ⚔️ Дуэли ---
  { code: 'duelist', emoji: '⚔️', name: 'Дуэлянт', description: 'Забрал первую дуэль', category: 'duel', reward: 50, hidden: false },
  { code: 'gladiator', emoji: '⚔️', name: 'Возняшный боец', description: 'Выиграл 25 дуэлей', category: 'duel', reward: 200, hidden: false },

  // --- 📦 Клады ---
  { code: 'treasure_hunter', emoji: '📦', name: 'Кладоискатель', description: 'Поднял первый клад', category: 'treasure', reward: 50, hidden: false },
  { code: 'treasure_master', emoji: '📦', name: 'Охотник за закладками', description: 'Поднял 10 кладов', category: 'treasure', reward: 200, hidden: false },

  // --- 💍 Браки ---
  { code: 'true_love', emoji: '💍', name: 'Любовь существует', description: 'Сыграл первую свадьбу', category: 'marriage', reward: 50, hidden: false },
  { code: 'serial_groom', emoji: '💍', name: 'Серийный жених', description: 'Сыграл 5 свадеб', category: 'marriage', reward: 200, hidden: false },

  // --- 🏳️ Номинации ---
  { code: 'nominee', emoji: '🏳️', name: 'Звезда дня', description: 'Стал «Пидором дня» 1 раз', category: 'nomination', reward: 25, hidden: false },
  { code: 'nominee_regular', emoji: '🏳️', name: 'Завсегдатай номинаций', description: 'Стал «Пидором дня» 10 раз', category: 'nomination', reward: 150, hidden: false },

  // --- 👑 Легенды Возни ---
  { code: 'apteka_magnate', emoji: '💊', name: 'Аптечный магнат', description: '500 удачных ферм', category: 'legend', reward: 400, hidden: false },
  { code: 'already_red', emoji: '🔥', name: 'Уже красный', description: 'Серия фермы 30 дней', category: 'legend', reward: 300, hidden: false },
  { code: 'unburnable', emoji: '🌾', name: 'Несгораемый', description: 'Серия фермы 60 дней', category: 'legend', reward: 600, hidden: false },
  { code: 'voznya_started', emoji: '⚔️', name: 'Возня началась', description: '100 побед в дуэлях', category: 'legend', reward: 500, hidden: false },
  { code: 'war_machine', emoji: '⚔️', name: 'Машина возни', description: '250 побед в дуэлях', category: 'legend', reward: 900, hidden: false },
  { code: 'cursed_suitcase', emoji: '📦', name: 'Сколько я к тебе шёл', description: 'Поднял 50 кладов', category: 'legend', reward: 500, hidden: false },
  { code: 'radik_vault', emoji: '📦', name: 'Кладовая барыги', description: 'Поднял 100 кладов', category: 'legend', reward: 900, hidden: false },
  { code: 'nomination_king', emoji: '🏳️', name: 'Король номинаций', description: '50 раз «Пидор дня»', category: 'legend', reward: 500, hidden: false },
  { code: 'authority', emoji: '☢️', name: 'Аптечный авторитет', description: 'Поднял 25 000 ешек за всё время', category: 'legend', reward: 750, hidden: false },
  { code: 'suitcase_man', emoji: '🧳', name: 'Чемоданщик', description: 'Поднял 50 000 ешек за всё время', category: 'legend', reward: 1200, hidden: false },
  { code: 'overdose', emoji: '💉', name: 'Аптечный передоз', description: 'Поднял 100 000 ешек за всё время', category: 'legend', reward: 2000, hidden: false },
  { code: 'absolute_ludik', emoji: '🎰', name: 'Абсолютный лудик', description: 'Крутанул казино 500 раз', category: 'legend', reward: 700, hidden: false },
  { code: 'catushka', emoji: '🎰', name: 'Пошла катушка', description: 'Сорвал джекпот в казино', category: 'legend', reward: 250, hidden: false },
  { code: 'last_dep', emoji: '🍺', name: 'Последний деп', description: 'Поставил всё в казино и слил', category: 'legend', reward: 50, hidden: false },
  { code: 'love_grave', emoji: '💍', name: 'Любовь до гроба', description: 'Прожил в браке 30 дней', category: 'legend', reward: 250, hidden: false },
  { code: 'mellstroy', emoji: '👑', name: 'Меллстрой Возни', description: 'Открыть все основные достижения', category: 'legend', reward: 1500, hidden: false },

  // --- 🤫 Секретные (скрыты до открытия) ---
  { code: 'ludik_secret', emoji: '🎰', name: 'Лудик', description: 'Слил крупную сумму в казино', category: 'secret', reward: 0, hidden: true },
  { code: 'no_luck', emoji: '💀', name: 'Не фартануло', description: 'Серия из 5 проигрышей в казино', category: 'secret', reward: 0, hidden: true },
  { code: 'bag', emoji: '⚔️', name: 'Мешок', description: 'Серия из 5 поражений в дуэлях', category: 'secret', reward: 0, hidden: true },
  { code: 'kladmen', emoji: '📦', name: 'Кладмен', description: 'Забрал клад почти мгновенно', category: 'secret', reward: 100, hidden: true },
  { code: 'ghost', emoji: '👻', name: 'Призрак Возни', description: 'Вернулся после долгого отсутствия', category: 'secret', reward: 50, hidden: true },
]


export type Title = {
  minEarned: number
  emoji: string
  name: string
}

/** Title ladder by total_earned — mirrors app/settings/titles.py v1.3. */
export const TITLES: Title[] = [
  { minEarned: 0, emoji: '🌱', name: 'Щавель' },
  { minEarned: 100, emoji: '🍑', name: 'Персик' },
  { minEarned: 250, emoji: '🥔', name: 'Картофель' },
  { minEarned: 500, emoji: '🐀', name: 'Гой' },
  { minEarned: 800, emoji: '🍺', name: 'Бурмалда' },
  { minEarned: 1200, emoji: '💊', name: 'Аптекарь' },
  { minEarned: 2000, emoji: '🎰', name: 'Лудик' },
  { minEarned: 3000, emoji: '⚔️', name: 'Возняк' },
  { minEarned: 4500, emoji: '🏆', name: 'Авторитет Возни' },
  { minEarned: 7000, emoji: '👑', name: 'Король Возни' },
  { minEarned: 12000, emoji: '☢️', name: 'Меллстрой' },
]

/** Returns the current title for a given total_earned amount. */
export function titleForEarned(earned: number): Title {
  let current = TITLES[0]
  for (const t of TITLES) {
    if (earned >= t.minEarned) current = t
    else break
  }
  return current
}

/** @deprecated Use titleForEarned instead. Kept for backward compatibility. */
export function titleForBalance(balance: number): Title {
  // Fallback: treat balance as earned for now
  return titleForEarned(balance)
}

export type BotCommand = {
  command: string
  description: string
}

export type CommandGroup = {
  emoji: string
  title: string
  commands: BotCommand[]
}

/** Command catalog grouped by real bot features. */
export const COMMAND_GROUPS: CommandGroup[] = [
  {
    emoji: '👤',
    title: 'Профиль',
    commands: [
      { command: '/профиль', description: 'Карточка с балансом, титулом, сериями и статистикой' },
      { command: '/баланс', description: 'Сколько у тебя ешек прямо сейчас' },
      { command: '/ачивки', description: 'Твои достижения и что ещё можно открыть' },
    ],
  },
  {
    emoji: '💰',
    title: 'Заработок',
    commands: [
      { command: '/ферма', description: 'Собрать ешки — доступно раз в 4 часа' },
      { command: '/казино сумма', description: 'Поставить на удачу, шанс на джекпот ×10 (раз в час)' },
      { command: '/снять', description: 'Забрать клад Возни, когда он выпадает в чате' },
    ],
  },
  {
    emoji: '⚔️',
    title: 'Дуэли',
    commands: [
      { command: '/бой @ник ставка', description: 'Вызвать игрока на дуэль на ешки' },
      { command: '/го', description: 'Принять вызов на дуэль' },
    ],
  },
  {
    emoji: '🏆',
    title: 'Рейтинги',
    commands: [
      { command: '/топ', description: 'Топ-10 самых богатых' },
      { command: '/топнеделя', description: 'Кто больше всех заработал за 7 дней' },
      { command: '/семьи', description: 'Самые крепкие семьи сообщества' },
    ],
  },
  {
    emoji: '🏳️‍🌈',
    title: 'Номинации дня',
    commands: [
      { command: '/пидор', description: 'Выбрать Пидора дня' },
      { command: '/пара', description: 'Выбрать Пару дня' },
    ],
  },
  {
    emoji: '💍',
    title: 'Семья',
    commands: [
      { command: '/жениться @ник', description: 'Сделать предложение' },
      { command: '/да', description: 'Согласиться на брак' },
      { command: '/брак', description: 'Информация о вашем браке' },
      { command: '/развод', description: 'Подать на развод' },
      { command: '/подтвердить', description: 'Подтвердить развод' },
    ],
  },
]
