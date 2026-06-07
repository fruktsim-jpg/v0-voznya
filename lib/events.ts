/**
 * Нормализованная модель события (VOZNYA_EVENTS_SYSTEM §2) + mock-данные для
 * UI-фундамента Phase 1. РЕАЛЬНОГО источника тут нет — это presentational mock,
 * чтобы строить Event Feed без БД/API/realtime. Позже `getCommunityFeed` будет
 * читать существующие таблицы (см. VOZNYA_EVENTS_SYSTEM §10), сигнатура та же.
 */

import type { Rarity } from '@/lib/rarity'

export type EventCode =
  | 'CASE_OPEN'
  | 'CASE_JACKPOT'
  | 'CASE_GIFT_DROP'
  | 'GIFT_PURCHASE'
  | 'GIFT_DELIVERED'
  | 'GIFT_PLAYER'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'MMR_RANK_UP'
  | 'MARRIAGE_CREATED'
  | 'CASINO_BIG_WIN'
  | 'TREASURE_FOUND'

export type EventActor = { id: number; name: string; avatar?: string | null }

export type CommunityEvent = {
  id: string
  code: EventCode
  actor: EventActor
  target?: EventActor | null
  /** Числовое значение события (ешки/сумма) для отображения. */
  value?: number | null
  rarity: Rarity
  /** ISO-строка времени события. */
  occurredAt: string
  /** Готовая иконка/эмодзи для карточки. */
  icon: string
}

/** Категории-фильтры ленты (VOZNYA_EVENTS_SYSTEM §5). */
export const EVENT_FILTERS = [
  { key: 'all', label: 'Всё' },
  { key: 'cases', label: 'Кейсы', codes: ['CASE_OPEN', 'CASE_JACKPOT', 'CASE_GIFT_DROP'] },
  { key: 'gifts', label: 'Подарки', codes: ['GIFT_PURCHASE', 'GIFT_DELIVERED', 'GIFT_PLAYER'] },
  { key: 'casino', label: 'Казино', codes: ['CASINO_BIG_WIN'] },
  { key: 'achievements', label: 'Достижения', codes: ['ACHIEVEMENT_UNLOCKED', 'MMR_RANK_UP'] },
  { key: 'social', label: 'Сообщество', codes: ['MARRIAGE_CREATED', 'TREASURE_FOUND'] },
] as const

export type EventFilterKey = (typeof EVENT_FILTERS)[number]['key']

/** Текст действия по событию (RU копии из VOZNYA_EVENTS_SYSTEM §5). */
export function eventText(e: CommunityEvent): string {
  switch (e.code) {
    case 'CASE_GIFT_DROP':
      return 'выбил Telegram Gift из кейса'
    case 'CASE_JACKPOT':
      return 'сорвал джекпот в кейсе'
    case 'CASE_OPEN':
      return 'открыл кейс и забрал награду'
    case 'GIFT_DELIVERED':
      return `получил подарок${e.target ? ` от ${e.target.name}` : ''}`
    case 'GIFT_PLAYER':
      return `подарил подарок${e.target ? ` игроку ${e.target.name}` : ''}`
    case 'GIFT_PURCHASE':
      return 'купил подарок'
    case 'ACHIEVEMENT_UNLOCKED':
      return 'получил достижение'
    case 'MMR_RANK_UP':
      return 'поднялся до нового ранга'
    case 'MARRIAGE_CREATED':
      return `создал семью${e.target ? ` с ${e.target.name}` : ''}`
    case 'CASINO_BIG_WIN':
      return 'сорвал крупный выигрыш в казино'
    case 'TREASURE_FOUND':
      return 'нашёл клад'
    default:
      return 'совершил действие'
  }
}

/** Mock-лента для Phase 1 (демонстрирует common / rare / epic / legendary). */
export const MOCK_FEED: CommunityEvent[] = [
  {
    id: 'e1',
    code: 'CASE_GIFT_DROP',
    actor: { id: 1, name: 'Артём' },
    rarity: 'mythic',
    value: null,
    occurredAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    icon: '🎁',
  },
  {
    id: 'e2',
    code: 'CASE_JACKPOT',
    actor: { id: 2, name: 'Лена' },
    rarity: 'legendary',
    value: 5000,
    occurredAt: new Date(Date.now() - 11 * 60_000).toISOString(),
    icon: '💎',
  },
  {
    id: 'e3',
    code: 'MMR_RANK_UP',
    actor: { id: 3, name: 'Влад' },
    rarity: 'epic',
    occurredAt: new Date(Date.now() - 23 * 60_000).toISOString(),
    icon: '⬆️',
  },
  {
    id: 'e4',
    code: 'GIFT_PLAYER',
    actor: { id: 4, name: 'Маша' },
    target: { id: 5, name: 'Костя' },
    rarity: 'rare',
    occurredAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    icon: '💝',
  },
  {
    id: 'e5',
    code: 'CASINO_BIG_WIN',
    actor: { id: 6, name: 'Денис' },
    rarity: 'epic',
    value: 12000,
    occurredAt: new Date(Date.now() - 55 * 60_000).toISOString(),
    icon: '🎰',
  },
  {
    id: 'e6',
    code: 'MARRIAGE_CREATED',
    actor: { id: 7, name: 'Игорь' },
    target: { id: 8, name: 'Оля' },
    rarity: 'rare',
    occurredAt: new Date(Date.now() - 70 * 60_000).toISOString(),
    icon: '💍',
  },
  {
    id: 'e7',
    code: 'ACHIEVEMENT_UNLOCKED',
    actor: { id: 9, name: 'Саша' },
    rarity: 'uncommon',
    occurredAt: new Date(Date.now() - 95 * 60_000).toISOString(),
    icon: '🏆',
  },
  {
    id: 'e8',
    code: 'CASE_OPEN',
    actor: { id: 10, name: 'Никита' },
    rarity: 'common',
    value: 150,
    occurredAt: new Date(Date.now() - 130 * 60_000).toISOString(),
    icon: '📦',
  },
  {
    id: 'e9',
    code: 'TREASURE_FOUND',
    actor: { id: 11, name: 'Юля' },
    rarity: 'uncommon',
    value: 800,
    occurredAt: new Date(Date.now() - 160 * 60_000).toISOString(),
    icon: '🪙',
  },
]

/** Относительное время «N мин/ч назад» (RU). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин назад`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ч назад`
  const d = Math.floor(h / 24)
  return `${d} дн назад`
}
