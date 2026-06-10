import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * SectionTitle (DS) — фирменный заголовок экрана/секции из визуального
 * референса Figma: тяжёлый, плотный, КАПСОМ (VAULTS · ARMORY · GLOBAL RANKING).
 * Опциональная «бровь» сверху (LIVE FEED / FEATURED DROP) и иконка слева.
 *
 * Единый источник правды для главного типографического жеста платформы —
 * чтобы все экраны читались как один продукт. Server component, без интерактива.
 */
export function SectionTitle({
  children,
  eyebrow,
  icon,
  size = 'md',
  as: Tag = 'h2',
  className = '',
}: {
  children: ReactNode
  /** Надзаголовок-бровь над титулом (капс, разрядка). */
  eyebrow?: ReactNode
  /** Иконка/эмодзи слева от титула. */
  icon?: ReactNode
  /** lg — заголовок экрана, md — заголовок секции. */
  size?: 'lg' | 'md'
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {eyebrow ? <span className="label-eyebrow">{eyebrow}</span> : null}
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white/[0.04] text-xl">
            {icon}
          </span>
        ) : null}
        <Tag
          className={cn(
            'section-title text-foreground',
            size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl',
          )}
        >
          {children}
        </Tag>
      </div>
    </div>
  )
}
