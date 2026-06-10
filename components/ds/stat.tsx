import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Stat (DS) — единичный показатель: метка, значение и опц. дельта/спарклайн.
 * Базовый кирпич статистических панелей (Home pulse, Inventory summary, Admin
 * KPI). Server component. Значение моноширинное — числа выравниваются по сетке.
 */
export function Stat({
  label,
  value,
  icon,
  delta,
  hint,
  align = 'left',
  className = '',
}: {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  /** Изменение: положительное — зелёное, отрицательное — красное. */
  delta?: { value: ReactNode; direction: 'up' | 'down' | 'flat' }
  hint?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  const deltaColor =
    delta?.direction === 'up'
      ? 'text-[#22c55e]'
      : delta?.direction === 'down'
        ? 'text-[#ef4444]'
        : 'text-muted-foreground'
  const deltaArrow =
    delta?.direction === 'up' ? '▲' : delta?.direction === 'down' ? '▼' : '•'

  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      <div
        className={cn(
          'flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground',
          align === 'center' && 'justify-center',
        )}
      >
        {icon && <span aria-hidden="true">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-mono text-lg font-bold tabular-nums text-foreground">
          {value}
        </span>
        {delta && (
          <span className={cn('text-xs font-semibold', deltaColor)}>
            <span aria-hidden="true">{deltaArrow}</span> {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
