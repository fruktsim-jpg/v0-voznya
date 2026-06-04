/**
 * Catalog of bot systems, achievements, titles and commands.
 *
 * Generated from the actual voznya-bot source (app/features/*, app/settings/*).
 * Kept in sync with the bot — only real, existing systems are listed here.
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
  { emoji: '🏆', title: 'Ачивки', description: '13 достижений с наградами' },
  { emoji: '🎖', title: 'Титулы', description: '10 рангов — растут вместе с балансом' },
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
  reward: number
}

/** Achievement catalog — mirrors app/settings/achievements.py. */
export const ACHIEVEMENTS: Achievement[] = [
  { code: 'first_ezhka', emoji: '🌱', name: 'Первая ешка', description: 'Заработать первую ешку', reward: 10 },
  { code: 'farmer', emoji: '💊', name: 'Фермер', description: '10 успешных ферм', reward: 50 },
  { code: 'baron', emoji: '💊', name: 'Барон', description: '100 успешных ферм', reward: 200 },
  { code: 'ludoman', emoji: '🎰', name: 'Лудоман', description: '10 игр в казино', reward: 100 },
  { code: 'casino_grandpa', emoji: '🎰', name: 'Казиношный дед', description: '100 игр в казино', reward: 300 },
  { code: 'duelist', emoji: '⚔️', name: 'Дуэлянт', description: '1 победа в дуэли', reward: 100 },
  { code: 'gladiator', emoji: '⚔️', name: 'Гладиатор', description: '25 побед в дуэлях', reward: 500 },
  { code: 'thousandaire', emoji: '💰', name: 'Тысячник', description: 'Заработать 1 000 ешек', reward: 250 },
  { code: 'magnate', emoji: '💰', name: 'Магнат', description: 'Заработать 10 000 ешек', reward: 1000 },
  { code: 'treasure_hunter', emoji: '📦', name: 'Кладоискатель', description: 'Найти 1 клад', reward: 100 },
  { code: 'treasure_master', emoji: '📦', name: 'Охотник за кладом', description: 'Найти 10 кладов', reward: 400 },
  { code: 'true_love', emoji: '💍', name: 'Любовь существует', description: 'Заключить первый брак', reward: 50 },
  { code: 'legend', emoji: '🏆', name: 'Легенда Возни', description: 'Получить все достижения', reward: 1000 },
]

export type Title = {
  minBalance: number
  emoji: string
  name: string
}

/** Title ladder by balance — mirrors app/settings/titles.py. */
export const TITLES: Title[] = [
  { minBalance: 0, emoji: '🌱', name: 'Щавель' },
  { minBalance: 100, emoji: '🍑', name: 'Персик' },
  { minBalance: 250, emoji: '🐀', name: 'Гой' },
  { minBalance: 500, emoji: '🍺', name: 'Бурмалда' },
  { minBalance: 1000, emoji: '💊', name: 'Аптекарь' },
  { minBalance: 2500, emoji: '🎰', name: 'Лудоман' },
  { minBalance: 5000, emoji: '⚔️', name: 'Возняк' },
  { minBalance: 10000, emoji: '🏆', name: 'Авторитет Возни' },
  { minBalance: 25000, emoji: '👑', name: 'Король Возни' },
  { minBalance: 50000, emoji: '☢️', name: 'Легенда Возни' },
]

/** Returns the current title for a given balance. */
export function titleForBalance(balance: number): Title {
  let current = TITLES[0]
  for (const t of TITLES) {
    if (balance >= t.minBalance) current = t
    else break
  }
  return current
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
