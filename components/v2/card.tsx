import type { ReactNode } from 'react'
import { rarityToken, type Rarity } from '@/lib/rarity'

/**
 * Базовая карточка дизайн-системы V2 (VOZNYA_UI_UX_V2_IMPLEMENTATION_PLAN §3).
 * Варианты: default · elevated · rare · epic · legendary (по редкости).
 * Server component (без интерактива). Использует существующий `.glass`.
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

export function Card({
  children,
  variant = 'default',
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  variant?: CardVariant
  className?: string
  as?: 'div' | 'article' | 'li' | 'section'
}) {
  const base =
    'glass rounded-2xl border p-4 transition duration-200'
  // Канон: стеклянные поверхности профиля/Live используют `border-border`.
  // Держим тот же токен, чтобы карточки витрин читались как часть продукта.
  let border = 'border-border'
  let style: React.CSSProperties | undefined

  if (variant === 'elevated') {
    border = 'border-white/15'

    style = { boxShadow: '0 8px 30px -12px rgba(0,0,0,0.6)' }
  } else if (variant !== 'default') {
    const token = rarityToken(VARIANT_TO_RARITY[variant])
    border = token.borderClass
    style = { boxShadow: token.glow || undefined }
  }

  return (
    <Tag className={`${base} ${border} ${className}`} style={style}>
      {children}
    </Tag>
  )
}
