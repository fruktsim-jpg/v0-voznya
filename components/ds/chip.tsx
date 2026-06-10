'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Chip (DS) — таблетка-фильтр / переключатель таба. Используется в фильтрах
 * инвентаря, лентах, скоупах лидербордов. Client component (интерактив).
 * Управляемый: родитель держит выбранное значение.
 */
export function Chip({
  children,
  active = false,
  onClick,
  count,
  icon,
  className = '',
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  /** Опц. счётчик справа (например, число событий в категории). */
  count?: number
  icon?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.97]',
        active
          ? 'border-primary/50 bg-primary/15 text-foreground'
          : 'border-border bg-white/[0.03] text-muted-foreground hover:border-primary/30 hover:text-foreground',
        className,
      )}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            'ml-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums',
            active ? 'bg-primary/30 text-foreground' : 'bg-white/10 text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/**
 * ChipGroup — горизонтальный ряд чипов со скроллом на мобиле (без видимого
 * скроллбара). Контейнер для Chip.
 */
export function ChipGroup({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}
