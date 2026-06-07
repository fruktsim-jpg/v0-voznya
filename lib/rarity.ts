/**
 * Единая система редкостей Возни (VOZNYA_UI_UX_V2_IMPLEMENTATION_PLAN §3,
 * VOZNYA_EVENTS_SYSTEM §3). Используется кейсами, подарками, достижениями,
 * бейджами и важностью событий. Чистый presentational-слой, без данных.
 */

export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'

export type RarityToken = {
  label: string
  /** Базовый цвет тира (border / text accent). */
  color: string
  /** CSS box-shadow для свечения (или '' для common). */
  glow: string
  /** Tailwind-классы текста/границы (используют произвольные значения). */
  textClass: string
  borderClass: string
}

export const RARITY_TOKENS: Record<Rarity, RarityToken> = {
  common: {
    label: 'Обычное',
    color: '#9ca3af',
    glow: '',
    textClass: 'text-[#9ca3af]',
    borderClass: 'border-white/10',
  },
  uncommon: {
    label: 'Необычное',
    color: '#22c55e',
    glow: '0 0 16px -4px rgba(34,197,94,0.45)',
    textClass: 'text-[#22c55e]',
    borderClass: 'border-[#22c55e]/40',
  },
  rare: {
    label: 'Редкое',
    color: '#3b82f6',
    glow: '0 0 18px -4px rgba(59,130,246,0.5)',
    textClass: 'text-[#3b82f6]',
    borderClass: 'border-[#3b82f6]/45',
  },
  epic: {
    label: 'Эпическое',
    color: '#8b5cf6',
    glow: '0 0 22px -3px rgba(139,92,246,0.55)',
    textClass: 'text-[#a855f7]',
    borderClass: 'border-[#8b5cf6]/55',
  },
  legendary: {
    label: 'Легендарное',
    color: '#f59e0b',
    glow: '0 0 28px -2px rgba(245,158,11,0.6)',
    textClass: 'text-[#f59e0b]',
    borderClass: 'border-[#f59e0b]/60',
  },
  mythic: {
    label: 'Мифическое',
    color: '#f5d142',
    glow: '0 0 34px -1px rgba(245,209,66,0.7)',
    textClass: 'text-[#f5d142]',
    borderClass: 'border-[#f5d142]/70',
  },
}

export function rarityToken(rarity: Rarity | null | undefined): RarityToken {
  return RARITY_TOKENS[rarity ?? 'common']
}

/** Гра­диент для топ-тиров (mythic / telegram gift). */
export const MYTHIC_GRADIENT =
  'linear-gradient(135deg, #8b5cf6 0%, #a855f7 40%, #f59e0b 100%)'
