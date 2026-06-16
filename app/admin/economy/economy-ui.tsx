import Link from 'next/link'
import { StatCard, type StatAccent } from '@/components/ds/stat-card'

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
  /** Акцент из палитры — подсветит число и верхнюю кромку. */
  accent?: StatAccent
}

export function StatGrid({ cards }: { cards: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {cards.map((c) => (
        <StatCard
          key={c.label}
          label={c.label}
          value={c.value}
          glyph={c.emoji}
          caption={c.hint}
          accent={c.accent ?? 'default'}
        />
      ))}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="section-title mb-3 text-base text-foreground sm:text-lg">{children}</h2>
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

/**
 * FlowBars — компактный двусторонний бар-чарт «создано/сожжено» по дням.
 * Заменяет сырую таблицу: создано тянется вверх (teal), сожжено вниз (rose),
 * нетто читается по перевесу. Hover-тултип через нативный <title>. Чистый SVG,
 * без зависимостей — server-friendly.
 */
export function FlowBars({
  daily,
}: {
  daily: { day: string; minted: number; burned: number; net: number }[]
}) {
  const max = Math.max(1, ...daily.map((d) => Math.max(d.minted, d.burned)))
  return (
    <div className="glass rounded-2xl border border-border bg-gradient-to-b from-white/[0.04] to-transparent p-4">
      <div className="flex items-end gap-1.5" style={{ height: 160 }}>
        {daily.map((d) => {
          const up = (d.minted / max) * 70
          const down = (d.burned / max) * 70
          return (
            <div key={d.day} className="group flex flex-1 flex-col items-center justify-center gap-0.5">
              <div className="flex w-full flex-col items-center justify-end" style={{ height: '50%' }}>
                <div
                  className="w-full max-w-[18px] rounded-t bg-[var(--accent-teal)] transition group-hover:brightness-125"
                  style={{ height: `${up}%` }}
                  title={`${d.day}\nсоздано +${fmt(d.minted)}`}
                />
              </div>
              <div className="h-px w-full bg-white/10" />
              <div className="flex w-full flex-col items-center justify-start" style={{ height: '50%' }}>
                <div
                  className="w-full max-w-[18px] rounded-b bg-[var(--accent-red)] transition group-hover:brightness-125"
                  style={{ height: `${down}%` }}
                  title={`${d.day}\nсожжено −${fmt(d.burned)}`}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent-teal)]" /> создано
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent-red)]" /> сожжено
        </span>
      </div>
    </div>
  )
}

// --- Economy health (operator verdict, derived from already-loaded data) -----

type DailyFlow = { day: string; minted: number; burned: number; net: number }
type SourceFlow = { reason: string; minted: number; burned: number; net: number }

/**
 * EconomyHealth — a single operator read: "is the economy healthy?" Derived
 * purely from the 14-day daily flow + 30-day sources already loaded by the page
 * (no new queries). Shows inflation pressure (net over the window vs current
 * mass), a 7d-vs-prior-7d trend, and the top generator / top sink.
 */
export function EconomyHealth({
  daily,
  sources,
  totalEshki,
}: {
  daily: DailyFlow[]
  sources: SourceFlow[]
  totalEshki: number | null
}) {
  const net14 = daily.reduce((s, d) => s + d.net, 0)
  const last7 = daily.slice(-7).reduce((s, d) => s + d.net, 0)
  const prev7 = daily.slice(-14, -7).reduce((s, d) => s + d.net, 0)
  // Inflation pressure = net minted over the window relative to current supply.
  const supply = totalEshki ?? 0
  const pressure = supply > 0 ? net14 / supply : 0
  const trendUp = last7 > prev7

  const band =
    Math.abs(pressure) < 0.05
      ? { label: 'Здоровая', tone: 'text-emerald-300', ring: 'border-emerald-400/30 from-emerald-400/[0.08]' }
      : pressure >= 0.05
        ? { label: 'Инфляция', tone: 'text-rose-300', ring: 'border-rose-400/30 from-rose-400/[0.08]' }
        : { label: 'Дефляция', tone: 'text-sky-300', ring: 'border-sky-400/30 from-sky-400/[0.08]' }

  const topGenerator = [...sources].sort((a, b) => b.minted - a.minted)[0]
  const topSink = [...sources].sort((a, b) => b.burned - a.burned)[0]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className={`glass rounded-2xl border bg-gradient-to-br to-transparent p-4 ${band.ring}`}>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Состояние</div>
        <div className={`mt-1 text-2xl font-bold ${band.tone}`}>{band.label}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground/70">
          давление {fmtSigned(Math.round(pressure * 1000) / 10)}% массы / 14д
        </div>
      </div>
      <div className="glass rounded-2xl border border-border from-white/[0.04] bg-gradient-to-br to-transparent p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Тренд (7д vs 7д)</div>
        <div className={`mt-1 text-2xl font-bold ${trendUp ? 'text-rose-300' : 'text-emerald-300'}`}>
          {trendUp ? '↑ растёт' : '↓ сжимается'}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground/70">
          {fmtSigned(last7)} против {fmtSigned(prev7)}
        </div>
      </div>
      <div className="glass rounded-2xl border border-emerald-400/20 from-emerald-400/[0.06] bg-gradient-to-br to-transparent p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Главный генератор</div>
        <div className="mt-1 truncate text-lg font-bold text-emerald-300">{topGenerator?.reason ?? '—'}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground/70">+{fmt(topGenerator?.minted ?? 0)} за 30д</div>
      </div>
      <div className="glass rounded-2xl border border-rose-400/20 from-rose-400/[0.06] bg-gradient-to-br to-transparent p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Главный сток</div>
        <div className="mt-1 truncate text-lg font-bold text-rose-300">{topSink?.reason ?? '—'}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground/70">−{fmt(topSink?.burned ?? 0)} за 30д</div>
      </div>
    </div>
  )
}
