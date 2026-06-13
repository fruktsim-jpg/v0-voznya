import Link from 'next/link'
import { SectionTitle } from '@/components/ds/section-title'
import { VoznyaCoin, PrestigeSigil, Glyph } from '@/components/ds/icon'
import { prestigeForDivision } from '@/lib/ds/prestige'
import type { SeasonRace as SeasonRaceData } from '@/lib/home-context'
import type { WeeklyEarner } from '@/lib/queries'

/**
 * Season Race + Movers (VOZNYA REDESIGN — Home, zone 4: seasonal/economy world).
 *
 * SPECTATOR view of the season — the world's competition, not your progress bar
 * (that's Profile). Shows the season name + live countdown, the top of the
 * division ladder (who's winning the season), and "who's rising right now" via
 * real 7-day top earners (`getWeeklyTop`). Tracker / esports-standings energy.
 *
 * All DB-backed. The weekly movers window is real (transactions in last 7d), not
 * a fabricated trend. Self-hides cleanly when neither season nor movers exist.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')
// Podium tint for the top-3 ordinals — owned styling instead of medal emoji.
const PODIUM = ['#FFD700', '#C8D0DC', '#CD7F32']

function countdown(endsAt: string | null): { label: string; urgent: boolean } | null {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return { label: `${days} дн до конца сезона`, urgent: days <= 7 }
  const hours = Math.floor(ms / 3_600_000)
  return { label: `${hours} ч до конца сезона`, urgent: true }
}

export function SeasonRace({
  race,
  movers,
}: {
  race: SeasonRaceData | null
  movers: WeeklyEarner[]
}) {
  if (!race && movers.length === 0) return null
  const cd = race ? countdown(race.endsAt) : null

  return (
    <section className="px-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Season race */}
          {race && race.leaders.length > 0 && (
            <div className="glass overflow-hidden rounded-2xl border border-border p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionTitle eyebrow="Гонка сезона" size="md">
                  {race.name}
                </SectionTitle>
                {cd && (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      cd.urgent
                        ? 'bg-[#EB4B4B]/15 text-[#ff8a8a]'
                        : 'bg-white/[0.06] text-foreground'
                    }`}
                  >
                    <Glyph name="season" /> {cd.label}
                  </span>
                )}
              </div>

              <ol className="space-y-1.5">
                {race.leaders.map((l, i) => (
                  <li key={l.userId}>
                    <Link
                      href={`/profile/${l.userId}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.04]"
                    >
                      <span className="w-6 shrink-0 text-center">
                        {i < 3 ? (
                          <span className="type-stat text-sm font-bold" style={{ color: PODIUM[i] }}>
                            {i + 1}
                          </span>
                        ) : (
                          <span className="type-stat font-bold text-muted-foreground">{i + 1}</span>
                        )}
                      </span>
                      <PrestigeSigil tier={prestigeForDivision(l.division.name)} size="1.15em" className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {l.name}
                      </span>
                      <span className="shrink-0 type-stat text-sm text-muted-foreground">
                        {fmt(l.seasonMmr)} MMR
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              <Link
                href="/season"
                className="mt-3 inline-block rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
              >
                Вся таблица сезона
              </Link>
            </div>
          )}

          {/* Weekly movers — who's rising right now (real 7d window) */}
          {movers.length > 0 && (
            <div className="glass overflow-hidden rounded-2xl border border-border p-5">
              <SectionTitle eyebrow="За 7 дней" icon={<Glyph name="chart" />} size="md" className="mb-4">
                Кто поднимается
              </SectionTitle>
              <ol className="space-y-1.5">
                {movers.map((m, i) => (
                  <li key={m.userId}>
                    <Link
                      href={`/profile/${m.userId}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.04]"
                    >
                      <span className="w-6 shrink-0 text-center font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {m.name}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#22c55e]">
                        +<span className="type-economy">{fmt(m.earned)}</span> <VoznyaCoin tone="inherit" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                Заработано за последние 7 дней
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
