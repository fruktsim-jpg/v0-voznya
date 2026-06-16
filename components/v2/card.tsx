import type { ReactNode } from 'react'
import { rarityToken, type Rarity } from '@/lib/rarity'

/**
 * Базовая карточка дизайн-системы V2 (VOZNYA_UI_UX_V2_IMPLEMENTATION_PLAN §3).
 * Варианты: default · elevated · rare · epic · legendary (по редкости).
 * Server component (без интерактива). Использует существующий `.glass`.
 *
 * PREMIUM PASS: к стеклу добавлены два «дорогих» приёма, общие для всего сайта —
 *   1) верхний specular-хайлайт (inset 0 1px 0 rgba(255,255,255,.06)) — тонкая
 *      светлая кромка сверху, как на матовом стекле/металле;
 *   2) едва заметный вертикальный градиент (from-white/[0.04] → transparent),
 *      дающий объём вместо плоской заливки.
 * `interactive` добавляет лёгкий подъём + усиление кромки на hover (для кликабельных
 * карточек витрин/списков). Это ровно те приёмы, что делают модалку редактора
 * наград «премиальной» — теперь они в одном месте на весь продукт.
 */

export type CardVariant =
  | 'default'
  | 'elevated'
  | 'rare'
  | 'epic'
  | 'legendary'

const VARIANT_TO_RARITY: Record<Exclude<CardVariant, 'default' | 'elevated'>, Rarity> = {
  rare: 'rare',
  epic: 'epic',
  legendary: 'legendary',
}

/** Inset top highlight that reads as polished glass — shared across all cards. */
const SPECULAR = 'inset 0 1px 0 rgba(255,255,255,0.06)'

export function Card({
  children,
  variant = 'default',
  className = '',
  interactive = false,
  gradient = true,
  as: Tag = 'div',
}: {
  children: ReactNode
  variant?: CardVariant
  className?: string
  /** Adds hover lift + brighter edge for clickable cards. */
  interactive?: boolean
  /** Faint top→bottom sheen for depth (on by default; off for dense lists). */
  gradient?: boolean
  as?: 'div' | 'article' | 'li' | 'section'
}) {
  const base = 'relative rounded-2xl border p-4 transition duration-200'
  const sheen = gradient ? 'bg-gradient-to-b from-white/[0.05] to-transparent' : ''
  const hover = interactive
    ? 'hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_12px_36px_-14px_rgba(0,0,0,0.7)] active:translate-y-0'
    : ''

  // Канон: стеклянные поверхности профиля/Live используют `border-border`.
  let border = 'border-border'
  let boxShadow: string | undefined = SPECULAR

  if (variant === 'elevated') {
    border = 'border-white/15'
    boxShadow = `${SPECULAR}, 0 8px 30px -12px rgba(0,0,0,0.6)`
  } else if (variant !== 'default') {
    const token = rarityToken(VARIANT_TO_RARITY[variant])
    border = token.borderClass
    boxShadow = token.glow ? `${SPECULAR}, ${token.glow}` : SPECULAR
  }

  return (
    <Tag className={`glass ${base} ${sheen} ${border} ${hover} ${className}`} style={{ boxShadow }}>
      {children}
    </Tag>
  )
}
