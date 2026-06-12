import type { ReactNode } from 'react'
import { type Rarity } from '@/lib/rarity'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { ItemArt } from '@/components/ds/item-art'
import type { ItemClass } from '@/lib/item-art/model'

/**
 * CollectibleTile (V3 → P0 funnel) — ЕДИНЫЙ визуальный язык коллекционных
 * объектов Возни: достижения, подарки, награды кейсов, предметы инвентаря.
 * Один мир — одна карточка.
 *
 * P0: the object capsule now renders through <ItemArt>, the ONE art path. Pass
 * `code` / `itemClass` to get real/templated art; otherwise the `icon` glyph is
 * used as the fallback (so nothing regresses before assets land). Rarity still
 * drives border / glow / capsule. Server component.
 */
export function CollectibleTile({
  icon,
  code,
  itemClass,
  title,
  subtitle,
  rarity = 'common',
  badge,
  topRight,
  footer,
  locked = false,
  size = 'md',
}: {
  icon: ReactNode
  /** Item code — lets ItemArt resolve real/templated art for this object. */
  code?: string | null
  /** Item class — drives canonical glyph fallback + template lookup. */
  itemClass?: ItemClass | null
  title: string
  subtitle?: string
  rarity?: Rarity
  /** Показать бейдж редкости под капсулой. */
  badge?: boolean
  /** Метка в правом верхнем углу (например «Лимитка», «💎 джекпот»). */
  topRight?: ReactNode
  /** Нижняя строка: цена, шанс, значение и т.п. */
  footer?: ReactNode
  locked?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <article
      className="glass group relative flex flex-col items-center overflow-hidden rounded-3xl border border-border p-4 text-center transition hover:-translate-y-0.5 data-[locked=true]:opacity-50 data-[locked=true]:grayscale data-[locked=true]:hover:translate-y-0"
      data-locked={locked}
    >
      {topRight && <div className="absolute right-2 top-2 z-10">{topRight}</div>}

      {/* Object capsule — funnelled through the ONE art path (P0). */}
      <div className="relative mb-2">
        <ItemArt
          code={code}
          itemClass={itemClass}
          glyph={icon}
          rarity={rarity}
          locked={locked}
          size={size === 'sm' ? 'sm' : 'md'}
        />
      </div>

      <h3 className="relative line-clamp-1 text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && (
        <p className="relative mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{subtitle}</p>
      )}

      {badge && !locked && (
        <div className="relative mt-2">
          <RarityBadge rarity={rarity} />
        </div>
      )}

      {footer && <div className="relative mt-2 w-full">{footer}</div>}
    </article>
  )
}
