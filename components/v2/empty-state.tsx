import type { ReactNode } from 'react'

/**
 * Пустой экран (EmptyState) дизайн-системы V2. Иконка + текст + опц. действие.
 * Server component. Используется вместо «нет данных».
 */
export function EmptyState({
  icon = '✨',
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`glass flex flex-col items-center rounded-3xl border border-white/10 px-6 py-10 text-center ${className}`}
    >
      <div className="mb-3 text-3xl opacity-80">{icon}</div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
