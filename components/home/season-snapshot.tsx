import Link from 'next/link'
import type { IdentitySeason } from '@/lib/home-context'

/**
 * Season Snapshot (VOZNYA REDESIGN — Home Hub, zone 4).
 *
 * First-class block (approved adjustment) answering "why does the season matter
 * now?": current division, rank, live countdown and the next meaningful step.
 * All DB-backed via the shared season slice. Renders nothing when season tables
 * are absent (the slice is null) — no fake season is shown.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

function countdown(endsAt: string | null): { label: string; urgent: boolean } | null {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return { label: `${days} дн до конца`, urgent: days <= 7 }
  const hours = Math.floor(ms / 3_600_000)
  return { label: `${hours} ч до конца`, urgent: true }
}

export function SeasonSnapshot({ season }: { season: IdentitySeason }) {
  const cd = countdown(season.endsAt)
  const pct = Math.round(season.ratio * 100)

  return (
    <section className="px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="glass overflow-hidden rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="label-eyebrow text-[#7C93FF]">Сезон</span>
              <span className="font-bold text-foreground">{season.name}</span>
            </div>
            {cd && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  cd.urgent
                    ? 'bg-[#EB4B4B]/15 text-[#ff8a8a]'
                    : 'bg-white/[0.06] text-foreground'
                }`}
              >
                ⏳ {cd.label}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              {season.division.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-foreground">
                  {season.division.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {fmt(season.seasonMmr)} MMR
                  {season.rank !== null ? ` · #${season.rank}` : ''}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #4B69FF, #8847FF)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {season.nextDivision
                ? `Ещё +${fmt(season.toNext)} MMR — и ты в ${season.nextDivision.name}.`
                : 'Высший дивизион достигнут. Держи позицию до конца сезона.'}
            </p>
            <Link
              href="/season"
              className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
            >
              Сезон
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
