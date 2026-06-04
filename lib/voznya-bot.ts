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
  { emoji: '🏆', title: 'Ачивки', description: '30 достижений с наградами' },
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
  { code: 'first_ezhka', emoji: '🌱', name: 'Первая ешка', description: 'Заработать первую ешку', category: 'economy', reward: 10, hidden: false },
  { code: 'thousandaire', emoji: '💰', name: 'Тысячник', description: 'Заработать 1 000 ешек', category: 'economy', reward: 100, hidden: false },
  { code: 'magnate', emoji: '💰', name: 'Магнат', description: 'Заработать 10 000 ешек', category: 'economy', reward: 400, hidden: false },

  // --- 🎰 Казино ---
  { code: 'ludoman', emoji: '🎰', name: 'Лудоман', description: 'Сыграть 10 раз в казино', category: 'casino', reward: 50, hidden: false },
  { code: 'casino_grandpa', emoji: '🎰', name: 'Казиношный дед', description: 'Сыграть 100 раз в казино', category: 'casino', reward: 150, hidden: false },

  // --- ⚔️ Дуэли ---
  { code: 'duelist', emoji: '⚔️', name: 'Дуэлянт', description: 'Выиграть 1 дуэль', category: 'duel', reward: 50, hidden: false },
  { code: 'gladiator', emoji: '⚔️', name: 'Гладиатор', description: 'Выиграть 25 дуэлей', category: 'duel', reward: 200, hidden: false },

  // --- 📦 Клады ---
  { code: 'treasure_hunter', emoji: '📦', name: 'Кладоискатель', description: 'Найти 1 клад', category: 'treasure', reward: 50, hidden: false },
  { code: 'treasure_master', emoji: '📦', name: 'Охотник за кладом', description: 'Найти 10 кладов', category: 'treasure', reward: 200, hidden: false },

  // --- 💍 Браки ---
  { code: 'true_love', emoji: '💍', name: 'Любовь существует', description: 'Заключить первый брак', category: 'marriage', reward: 50, hidden: false },

  // --- 🏳️ Номинации ---
  { code: 'nominee', emoji: '🏳️', name: 'Звезда дня', description: 'Стать «Пидором дня» 1 раз', category: 'nomination', reward: 25, hidden: false },
  { code: 'nominee_regular', emoji: '🏳️', name: 'Завсегдатай номинаций', description: 'Стать «Пидором дня» 10 раз', category: 'nomination', reward: 150, hidden: false },

  // --- 👑 Легенды Возни ---
  { code: 'apteka_magnate', emoji: '💊', name: 'Аптечный магнат', description: '500 успешных ферм', category: 'legend', reward: 400, hidden: false },
  { code: 'already_red', emoji: '🔥', name: 'Уже красный', description: 'Серия фермы 30 дней', category: 'legend', reward: 300, hidden: false },
  { code: 'voznya_started', emoji: '⚔️', name: 'Возня началась', description: '100 побед в дуэлях', category: 'legend', reward: 500, hidden: false },
  { code: 'cursed_suitcase', emoji: '📦', name: 'Ёбаный чемодан', description: 'Найти 50 кладов', category: 'legend', reward: 500, hidden: false },
  { code: 'nomination_king', emoji: '🏳️', name: 'Король номинаций', description: '50 раз «Пидор дня»', category: 'legend', reward: 500, hidden: false },
  { code: 'authority', emoji: '☢️', name: 'Авторитет', description: 'Заработать 25 000 ешек', category: 'legend', reward: 750, hidden: false },
  { code: 'catushka', emoji: '🎰', name: 'Пошла катушка', description: 'Сорвать джекпот в казино', category: 'legend', reward: 250, hidden: false },
  { code: 'last_dep', emoji: '🍺', name: 'Последний деп', description: 'Поставить всё в казино и проиграть', category: 'legend', reward: 50, hidden: false },
  { code: 'love_grave', emoji: '💍', name: 'Любовь до гроба', description: 'Прожить в браке 30 дней', category: 'legend', reward: 250, hidden: false },
  { code: 'mellstroy', emoji: '👑', name: 'Меллстрой Возни', description: 'Открыть все основные достижения', category: 'legend', reward: 1500, hidden: false },

  // --- 🤫 Секретные (скрыты до открытия) ---
  { code: 'ludik_secret', emoji: '🎰', name: 'Лудик', description: 'Проиграть крупную сумму в казино', category: 'secret', reward: 0, hidden: true },
  { code: 'no_luck', emoji: '💀', name: 'Не фартануло', description: 'Серия из 5 проигрышей в казино', category: 'secret', reward: 0, hidden: true },
  { code: 'bag', emoji: '⚔️', name: 'Мешок', description: 'Серия из 5 поражений в дуэлях', category: 'secret', reward: 0, hidden: true },
  { code: 'kladmen', emoji: '📦', name: 'Кладмен', description: 'Забрать клад почти мгновенно', category: 'secret', reward: 100, hidden: true },
  { code: 'ghost', emoji: '👻', name: 'Призрак Возни', description: 'Вернуться после долгого отсутствия', category: 'secret', reward: 50, hidden: true },
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
