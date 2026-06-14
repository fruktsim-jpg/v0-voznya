import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'
import type { WorldPulse, HotToday } from '@/lib/world-pulse'

/**
 * WorldPulseBar — the top of Live's "Сейчас" tab: the day's heartbeat. Answers
 * "что происходит прямо сейчас" with REAL 24h aggregates (getWorldPulse) and the
 * day's two defining moments (deriveHotToday: biggest win + rarest drop).
 *
 * Server component, presentation only. Uses the existing Settings/Stats visual
 * language: flat glass tiles, semantic colour only. Self-hides metrics that have
 * no data (e.g. active players when the column is absent).
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

function PulseTile({ icon, value, label, tone }: { icon: GlyphName; value: string; label: string; tone: string }) {
  return (
    <div className="glass rounded-2xl border border-border p-3 text-center">
      <Glyph name={icon} className="mx-auto text-lg" style={{ color: tone } as React.CSSProperties} />
      <div className="mt-1 type-stat text-base text-foreground sm:text-lg">{value}</div>
      <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-xs">{label}</div>
    </div>
  )
}

export function WorldPulseBar({ pulse, hot }: { pulse: WorldPulse; hot: HotToday }) {
  const tiles: { icon: GlyphName; value: string; label: string; tone: string }[] = [
    { icon: 'case', value: fmt(pulse.casesOpened), label: 'кейсов за сутки', tone: 'var(--accent-indigo)' },
    { icon: 'coin', value: fmt(pulse.eshWon), label: 'ешек выиграно', tone: 'var(--accent-gold)' },
    { icon: 'spark', value: fmt(pulse.jackpots), label: 'джекпотов', tone: 'var(--accent-red)' },
  ]
  if (pulse.activePlayers != null) {
    tiles.push({ icon: 'users', value: fmt(pulse.activePlayers), label: 'активных игроков', tone: 'var(--accent-teal)' })
  }

  return (
    <section className="px-4 pt-2 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[#22c55e]" />
          </span>
          Пульс дня · за сутки
        </h2>

        <div className={`grid gap-2 ${tiles.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          {tiles.map((t) => (
            <PulseTile key={t.label} {...t} />
          ))}
        </div>

        {/* Момент дня — крупнейший выигрыш + редчайший дроп (deriveHotToday). */}
        {(hot.biggestWin || hot.rarestDrop) && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {hot.biggestWin && (
              <a
                href={`/profile/${hot.biggestWin.actorId}`}
                className="glass flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition hover:bg-white/[0.04]"
              >
                <Glyph name="trophy" className="h-5 w-5 shrink-0 text-accent-gold" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Момент дня · крупнейший выигрыш</div>
                  <div className="truncate text-sm font-semibold text-foreground">{hot.biggestWin.actorName}</div>
                </div>
                {hot.biggestWin.value != null && (
                  <span className="type-economy shrink-0 text-sm text-accent-gold">
                    +{fmt(hot.biggestWin.value)}
                  </span>
                )}
              </a>
            )}
            {hot.rarestDrop && (
              <a
                href={`/profile/${hot.rarestDrop.actorId}`}
                className="glass flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition hover:bg-white/[0.04]"
              >
                <Glyph name="sparkles" className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Редчайший дроп сегодня</div>
                  <div className="truncate text-sm font-semibold text-foreground">{hot.rarestDrop.actorName}</div>
                </div>
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
