/**
 * Catalog of bot systems and commands.
 *
 * Generated from the actual voznya-bot source (app/features/*, app/settings/*).
 * Only systems that really exist in the bot are listed here — the bot has NO
 * levels and NO achievements systems, so those are intentionally absent.
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
  { emoji: '🎰', title: 'Казино', description: 'Ставки на удачу с джекпотом x10' },
  { emoji: '⚔️', title: 'Дуэли', description: 'Бои на ешки между участниками' },
  { emoji: '🪙', title: 'Клады', description: 'Клады Возни появляются в чате' },
  { emoji: '💍', title: 'Браки', description: 'Свадьбы, семьи и рейтинг семей' },
  { emoji: '👤', title: 'Профили', description: 'Личная статистика каждого участника' },
  { emoji: '🏆', title: 'Рейтинги', description: 'Топ богачей и самых долгих семей' },
]

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
      { command: '/профиль', description: 'Твоя статистика: баланс, серии, дуэли, клады' },
      { command: '/баланс', description: 'Показать текущий баланс' },
    ],
  },
  {
    emoji: '💰',
    title: 'Экономика',
    commands: [
      { command: '/ферма', description: 'Получить ешки (раз в 4 часа)' },
      { command: '/топ', description: 'Рейтинг богачей сообщества' },
    ],
  },
  {
    emoji: '🎰',
    title: 'Игры',
    commands: [
      { command: '/казино сумма', description: 'Испытать удачу (раз в час)' },
      { command: '/снять', description: 'Забрать клад Возни, когда он появится' },
    ],
  },
  {
    emoji: '⚔️',
    title: 'Дуэли',
    commands: [
      { command: '/бой @username ставка', description: 'Вызвать игрока на дуэль' },
      { command: '/го', description: 'Принять вызов на дуэль' },
    ],
  },
  {
    emoji: '🏳️‍🌈',
    title: 'Номинации',
    commands: [
      { command: '/пидор', description: 'Пидор дня' },
      { command: '/пара', description: 'Пара дня' },
    ],
  },
  {
    emoji: '💍',
    title: 'Семья',
    commands: [
      { command: '/жениться @username', description: 'Сделать предложение' },
      { command: '/да', description: 'Согласиться на брак' },
      { command: '/брак', description: 'Информация о браке' },
      { command: '/развод', description: 'Развестись' },
      { command: '/подтвердить', description: 'Подтвердить развод' },
      { command: '/семьи', description: 'Рейтинг самых долгих семей' },
    ],
  },
]
