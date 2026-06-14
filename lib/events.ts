/**
 * Нормализованная модель события (VOZNYA_EVENTS_SYSTEM §2): типы, фильтры,
 * копирайтинг и хелперы времени. Реальный источник ленты — `lib/feed.ts`
 * (`getCommunityFeed`, читает БД). Здесь только presentational-слой.
 */


import type { Rarity } from '@/lib/rarity'
import type { ItemClass } from '@/lib/item-art/model'
import type { GlyphName } from '@/components/ds/icon/glyph'

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
  /**
   * Реальный код предмета/подарка, фигурирующего в событии (если есть), чтобы
   * лента/тикер/«пока тебя не было» показывали ТОТ ЖЕ объект, что и кейс/
   * инвентарь — через общий ItemArt. null для событий без предмета (MMR, брак).
   */
  itemCode?: string | null
  /** Канонический класс предмета для резолва арта (null → glyph-фолбэк). */
  itemClass?: ItemClass | null
  /** Имя предмета (для подписи «выбил X»), если доступно. */
  itemName?: string | null
}

/**
 * Event code → canonical ItemClass for art resolution. Only case/gift events
 * reference a concrete item; everything else (MMR, marriage, treasure, casino)
 * has no item object, so it stays glyph-only.
 */
export function eventItemClass(code: EventCode): ItemClass | null {
  switch (code) {
    case 'CASE_GIFT_DROP':
    case 'GIFT_DELIVERED':
    case 'GIFT_PLAYER':
    case 'GIFT_PURCHASE':
      return 'gift'
    case 'CASE_OPEN':
    case 'CASE_JACKPOT':
      return 'collectible'
    default:
      return null
  }
}

/**
 * Event code → owned Glyph (SVG icon), replacing raw emoji in the feed so the
 * live stream reads as one premium product, not a mix of emoji.
 */
export function eventGlyph(code: EventCode): GlyphName {
  switch (code) {
    case 'CASE_OPEN':
      return 'case'
    case 'CASE_JACKPOT':
      return 'spark'
    case 'CASE_GIFT_DROP':
    case 'GIFT_DELIVERED':
    case 'GIFT_PURCHASE':
    case 'GIFT_PLAYER':
      return 'gift'
    case 'ACHIEVEMENT_UNLOCKED':
      return 'trophy'
    case 'MMR_RANK_UP':
      return 'chevronUp'
    case 'MARRIAGE_CREATED':
      return 'heart'
    case 'CASINO_BIG_WIN':
      return 'dice'
    case 'TREASURE_FOUND':
      return 'vault'
    default:
      return 'spark'
  }
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

/**
 * Heat tiering (LF-1) — the emotional weight of an event, derived honestly from
 * what it IS (code) and its real value/rarity. The Live Feed uses this to make
 * a jackpot LOUD and a routine action QUIET, so the stream feels like "the world
 * is doing something interesting", not "rows are being added".
 *
 *   - 'headline' → rare, world-stopping moments: jackpots, big casino wins,
 *     legendary/mythic drops, new families. Rendered large with glow.
 *   - 'notable'  → above-the-noise: rare drops, rank-ups, high-value events.
 *   - 'ambient'  → routine activity: ordinary case opens, small gifts. Compact.
 *
 * No fabrication: every input is a real, timestamped event field.
 */
export type EventHeat = 'headline' | 'notable' | 'ambient'

const HEADLINE_CODES: ReadonlySet<EventCode> = new Set([
  'CASE_JACKPOT',
  'CASINO_BIG_WIN',
  'MARRIAGE_CREATED',
])
const NOTABLE_CODES: ReadonlySet<EventCode> = new Set([
  'CASE_GIFT_DROP',
  'MMR_RANK_UP',
  'TREASURE_FOUND',
])

const HEADLINE_RARITIES: ReadonlySet<Rarity> = new Set(['legendary', 'mythic'] as Rarity[])
const NOTABLE_RARITIES: ReadonlySet<Rarity> = new Set(['epic', 'rare'] as Rarity[])

export function eventHeat(e: CommunityEvent): EventHeat {
  // Code-driven moments dominate: a jackpot is always a headline.
  if (HEADLINE_CODES.has(e.code)) return 'headline'
  // A legendary/mythic drop is a headline regardless of code.
  if (HEADLINE_RARITIES.has(e.rarity)) return 'headline'
  // High-value payouts punch up a tier even if the code is ordinary.
  if ((e.value ?? 0) >= 100_000) return 'headline'

  if (NOTABLE_CODES.has(e.code)) return 'notable'
  if (NOTABLE_RARITIES.has(e.rarity)) return 'notable'
  if ((e.value ?? 0) >= 10_000) return 'notable'

  return 'ambient'
}
