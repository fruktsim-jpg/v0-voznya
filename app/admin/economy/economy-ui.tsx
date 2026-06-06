import Link from 'next/link'

/**
 * Shared presentational helpers for the Economic Control Center pages.
 * Pure UI, no data access. Server-component friendly (no client hooks).
 */

export const fmt = (n: number | null | undefined): string =>
  n == null ? '—' : Math.round(n).toLocaleString('ru-RU')

export const fmtSigned = (n: number | null | undefined): string => {
  if (n == null) return '—'
  const s = Math.round(n).toLocaleString('ru-RU')
  return n > 0 ? `+${s}` : s
}

export const fmtPct = (ratio: number | null | undefined): string =>
  ratio == null ? '—' : `${(ratio * 100).toFixed(1)}%`

const TABS: { href: string; label: string; emoji: string }[] = [
  { href: '/admin/economy', label: 'Экономика', emoji: '💹' },
  { href: '/admin/economy/cases', label: 'Кейсы', emoji: '🎁' },
  { href: '/admin/economy/casino', label: 'Казино', emoji: '🎰' },
  { href: '/admin/economy/gifts', label: 'Подарки', emoji: '🎀' },
]

export function EconomyTabs({ active }: { active: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-1.5">
      {TABS.map((t) => {
        const isActive = t.href === active
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              isActive
                ? 'rounded-full border border-primary/40 bg-primary/[0.12] px-3 py-1.5 text-xs font-semibold text-primary sm:text-sm'
                : 'rounded-full border border-border bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/[0.08] sm:text-sm'
            }
          >
            {t.emoji} {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

export type Stat = {
  emoji: string
  label: string
  value: string
  tone?: string
  hint?: string
}

export function StatGrid({ cards }: { cards: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`glass rounded-2xl border bg-gradient-to-br to-transparent p-4 ${
            c.tone ?? 'border-border from-white/[0.04]'
          }`}
        >
          <div className="text-xl sm:text-2xl">{c.emoji}</div>
          <div className="mt-2 text-xl font-bold text-foreground sm:text-2xl">
            {c.value}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
            {c.label}
          </div>
          {c.hint && (
            <div className="mt-1 text-[10px] leading-tight text-muted-foreground/70">
              {c.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
