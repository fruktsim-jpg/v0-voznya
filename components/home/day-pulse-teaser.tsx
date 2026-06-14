import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'
import type { WorldPulse } from '@/lib/world-pulse'

/**
 * DayPulseTeaser (Home) — compact "пульс дня" headline. Home shows the day's
 * heartbeat as a TEASER (3-4 inline numbers + link), while the full pulse bar +
 * moments live on Live. Replaces the old full CommunityStatsStrip on Home, which
 * duplicated Live's eternal community-stats. Self-hides when nothing happened.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

export function DayPulseTeaser({ pulse }: { pulse: WorldPulse }) {
  const items: { icon: GlyphName; value: number; label: string; tone: string }[] = [
    { icon: 'case', value: pulse.casesOpened, label: 'кейсов', tone: 'var(--accent-indigo)' },
    { icon: 'coin', value: pulse.eshWon, label: 'ешек', tone: 'var(--accent-gold)' },
    { icon: 'spark', value: pulse.jackpots, label: 'джекпотов', tone: 'var(--accent-red)' },
  ]
  if (pulse.activePlayers != null) {
    items.push({ icon: 'users', value: pulse.activePlayers, label: 'активных', tone: 'var(--accent-teal)' })
  }
  if (items.every((i) => i.value === 0)) return null

  return (
    <section className="px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <a
          href="/live"
          className="glass flex items-center gap-3 overflow-x-auto rounded-2xl border border-border px-4 py-3 transition hover:bg-white/[0.04]"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#22c55e]" />
            </span>
            За сутки
          </span>
          {items.map((it) => (
            <span key={it.label} className="flex shrink-0 items-baseline gap-1 text-sm">
              <Glyph name={it.icon} className="h-3.5 w-3.5 self-center" style={{ color: it.tone } as React.CSSProperties} />
              <span className="type-stat text-foreground">{fmt(it.value)}</span>
              <span className="text-xs text-muted-foreground">{it.label}</span>
            </span>
          ))}
          <span className="ml-auto shrink-0 text-xs font-medium text-primary">Весь мир →</span>
        </a>
      </div>
    </section>
  )
}
