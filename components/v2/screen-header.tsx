import type { ReactNode } from 'react'

/**
 * ScreenHeader (App Redesign V1) — тонкий title bar внутренних экранов вместо
 * большого маркетингового PageHero. Паттерн мобильного приложения: компактная
 * строка «иконка + заголовок» + опц. действие справа. Никаких text-6xl,
 * абзацев-описаний и пульсирующих бейджей — контент должен начинаться сразу.
 */
export function ScreenHeader({
  icon,
  title,
  action,
}: {
  icon?: string
  title: string
  /** Опциональное действие/ссылка справа. */
  action?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 pt-hero-safe pb-2 sm:px-6">
      {icon && <span className="text-xl" aria-hidden="true">{icon}</span>}
      <h1 className="flex-1 truncate text-xl font-bold tracking-tight text-foreground">{title}</h1>
      {action}
    </div>
  )
}
