import type { ReactNode } from 'react'
import { Card } from '@/components/v2/card'

/**
 * Карточка статистики (StatCard) дизайн-системы V2.
 * Эмодзи/иконка + значение + подпись. Server component.
 */
export function StatCard({
  icon,
  value,
  label,
  hint,
  className = '',
}: {
  icon?: ReactNode
  value: ReactNode
  label: string
  hint?: string
  className?: string
}) {
  return (
    <Card className={`flex flex-col gap-1 ${className}`}>
      {icon && <div className="text-xl">{icon}</div>}
      <div className="text-2xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint && <div className="text-[11px] text-muted-foreground/70">{hint}</div>}
    </Card>
  )
}
