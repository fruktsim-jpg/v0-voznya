import type { CSSProperties, ReactNode } from 'react'
import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'
import { accentVar, type ScreenAccent } from '@/lib/screen-signature'

/**
 * ScreenHeader (App Redesign V1 → C3 Surface Modernization) — тонкий title bar
 * внутренних экранов вместо большого маркетингового PageHero. Паттерн мобильного
 * приложения: компактная строка «иконка + заголовок» + опц. действие справа.
 *
 * C2 (Icon Consumption): leading icon is a functional `Glyph`, not an emoji.
 *
 * C3 (Surface Modernization): the masthead now carries a per-screen *signature*
 * — an accent-tinted glyph tile, an optional kicker (eyebrow) line, and a thin
 * accent rule — so each screen reads as its own place (cases vs gifts vs live)
 * while staying inside one world. The accent is a semantic palette token
 * (lib/screen-signature), purely presentational. Defaults to brand violet when
 * no accent is given, matching pre-C3 behavior.
 */
export function ScreenHeader({
  icon,
  title,
  kicker,
  accent = 'violet',
  action,
}: {
  /** Functional glyph for the screen (interface language, not an emoji). */
  icon?: GlyphName
  title: string
  /** Optional eyebrow line that sets the screen's tone. */
  kicker?: string
  /** Semantic accent giving the screen its personality. */
  accent?: ScreenAccent
  /** Опциональное действие/ссылка справа. */
  action?: ReactNode
}) {
  const accentStyle = { '--screen-accent': accentVar(accent) } as CSSProperties
  return (
    <div
      className="mx-auto max-w-5xl px-4 pt-hero-safe pb-2 sm:px-6"
      style={accentStyle}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl border text-[1.2rem]"
            style={{
              color: 'var(--screen-accent)',
              borderColor: 'color-mix(in oklab, var(--screen-accent) 35%, transparent)',
              background: 'color-mix(in oklab, var(--screen-accent) 12%, transparent)',
            }}
          >
            <Glyph name={icon} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {kicker && (
            <p
              className="truncate text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'color-mix(in oklab, var(--screen-accent) 78%, white 10%)' }}
            >
              {kicker}
            </p>
          )}
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>
        {action}
      </div>
      <div
        className="mt-2 h-px w-full"
        style={{
          background:
            'linear-gradient(to right, color-mix(in oklab, var(--screen-accent) 55%, transparent), transparent 70%)',
        }}
      />
    </div>
  )
}
