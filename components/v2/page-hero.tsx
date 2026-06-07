import type { ReactNode } from 'react'

/**
 * PageHero — единый герой-блок разделов Возни (Cases / Gifts / Casino и др.).
 * Повторяет каноничный паттерн страницы `/live`: радиальное свечение, крупный
 * заголовок с `text-gradient`, единые отступы и типографика. Цель — чтобы все
 * разделы читались как один продукт, а не как отдельные сайты. Server component.
 */
export function PageHero({
  badge,
  icon,
  title,
  accent,
  description,
}: {
  /** Текст «живой» плашки над заголовком (например «Экономика · кейсы»). */
  badge?: string
  /** Эмодзи-герой над заголовком. */
  icon?: string
  /** Основная часть заголовка. */
  title: string
  /** Акцентная часть заголовка (рисуется градиентом), например «Возни». */
  accent?: string
  description?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden px-6 pb-6 pt-24 text-center sm:pt-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/20 blur-[120px]"
      />
      <div className="relative mx-auto max-w-3xl">
        {badge && (
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {badge}
          </span>
        )}
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          {icon && <span className="mr-2">{icon}</span>}
          {title} {accent && <span className="text-gradient">{accent}</span>}
        </h1>
        {description && (
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg">
            {description}
          </p>
        )}
      </div>
    </section>
  )
}
