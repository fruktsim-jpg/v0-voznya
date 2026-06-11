import type { ReactNode } from 'react'
import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'

/**
 * ScreenHeader (App Redesign V1) — тонкий title bar внутренних экранов вместо
 * большого маркетингового PageHero. Паттерн мобильного приложения: компактная
 * строка «иконка + заголовок» + опц. действие справа. Никаких text-6xl,
 * абзацев-описаний и пульсирующих бейджей — контент должен начинаться сразу.
 *
 * C2 (Icon Consumption): the leading icon is now a functional `Glyph` (owned
 * SVG, currentColor), not an emoji string — the screen titles are interface
 * language, not content. The glyph is tinted with the brand accent so the
 * header reads as a product surface, not a bot message.
 */
export function ScreenHeader({
  icon,
  title,
  action,
}: {
  /** Functional glyph for the screen (interface language, not an emoji). */
  icon?: GlyphName
  title: string
  /** Опциональное действие/ссылка справа. */
  action?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 pt-hero-safe pb-2 sm:px-6">
      {icon && <Glyph name={icon} className="shrink-0 text-[1.35rem] text-primary" />}
      <h1 className="flex-1 truncate text-xl font-bold tracking-tight text-foreground">{title}</h1>
      {action}
    </div>
  )
}
