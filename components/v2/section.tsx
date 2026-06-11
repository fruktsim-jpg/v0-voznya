import type { ReactNode } from 'react'

/**
 * Единый блок-секция дизайн-системы V2. Заголовок + опц. действие + контент.
 * Server component. Задаёт вертикальный ритм страниц.
 */
export function Section({
  title,
  subtitle,
  action,
  children,
  id,
  className = '',
}: {
  title?: ReactNode
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <section id={id} className={`px-4 py-6 sm:px-6 sm:py-8 ${className}`}>
      <div className="mx-auto max-w-5xl">
        {(title || action) && (
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              {title && (
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
