import Link from 'next/link'
import { Avatar } from '@/components/ds/avatar'
import { CurrencyDisplay } from '@/components/ds/currency-display'
import type { IdentityProgression } from '@/lib/home-context'

/**
 * Home Identity / Progression Hero (VOZNYA REDESIGN — Home Hub, zone 1).
 *
 * Answers "Who am I?" + "What is my progression?". Expanded twin of the shell
 * PlayerContextBar — both consume the SAME identity slice (`getIdentityProgression`
 * / `/api/me/summary`) so they can never drift.
 *
 * HONESTY: every value is DB-backed. Title/cosmetics are NOT implemented, so we
 * render an explicit "future" affordance rather than a fake title. Second
 * currency (gems) is intentionally NOT passed to CurrencyDisplay.
 */
const fmt = (n: number) => n.toLocaleString('ru-RU')

function seasonCountdown(endsAt: string | null): string | null {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return `${days} дн`
  const hours = Math.floor(ms / 3_600_000)
  return `${hours} ч`
}

export function IdentityHero({ identity }: { identity: IdentityProgression }) {
  const name = identity.name?.trim() || 'Игрок'
  const season = identity.season
  const countdown = seasonCountdown(season?.endsAt ?? null)
  const progressPct = season ? Math.round(season.ratio * 100) : 0

  return (
    <section className="pt-hero-safe px-4 pb-2 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div
          className="glass relative overflow-hidden rounded-3xl border border-border p-5 sm:p-6"
          style={{
            backgroundImage:
              'radial-gradient(120% 120% at 0% 0%, rgba(136,71,255,0.16), transparent 55%), radial-gradient(120% 120% at 100% 0%, rgba(75,105,255,0.14), transparent 55%)',
          }}
        >
          {/* Identity row */}
          <div className="flex items-start gap-4">
            <Link href={`/profile/${identity.userId}`} aria-label="Открыть профиль">
              <Avatar src={identity.photoUrl} name={name} size="xl" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="section-title truncate text-2xl text-foreground sm:text-3xl">
                  {name}
                </h1>
                {/* Title is a future slot — cosmetics are not implemented. */}
                <span className="rounded-full border border-dashed border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  титул скоро
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                {identity.mmrRank && identity.mmr !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 font-semibold text-foreground">
                    <span aria-hidden>{identity.mmrRank.emoji}</span>
                    {identity.mmrRank.name}
                    <span className="font-mono text-xs text-muted-foreground">
                      {fmt(identity.mmr)} MMR
                    </span>
                  </span>
                )}
                {identity.rank !== null && (
                  <Link
                    href="/live#top-rich"
                    className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 font-semibold text-foreground transition hover:bg-white/10"
                  >
                    <span aria-hidden>🏆</span>
                    <span className="font-mono">#{identity.rank}</span>
                  </Link>
                )}
                {identity.reputation !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 font-semibold text-foreground">
                    <span aria-hidden>⭐</span>
                    <span className="font-mono">{fmt(identity.reputation)}</span>
                  </span>
                )}
                {identity.streak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EB4B4B]/12 px-2.5 py-1 font-semibold text-[#ff8a8a]">
                    <span aria-hidden>🔥</span>
                    {identity.streak} дн
                  </span>
                )}
              </div>
            </div>

            <div className="hidden shrink-0 sm:block">
              {identity.balance !== null && (
                <CurrencyDisplay esh={identity.balance} />
              )}
            </div>
          </div>

          {/* Season / division progression */}
          {season && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {season.division.emoji}
                  </span>
                  <span className="font-semibold text-foreground">
                    {season.division.name}
                  </span>
                  {season.rank !== null && (
                    <span className="font-mono text-xs text-muted-foreground">
                      #{season.rank} в сезоне
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{season.name}</span>
                  {countdown && (
                    <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-medium text-foreground">
                      ⏳ {countdown}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(90deg, #4B69FF, #8847FF)',
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                {season.nextDivision ? (
                  <span>
                    До {season.nextDivision.name}: +{fmt(season.toNext)} MMR
                  </span>
                ) : (
                  <span>Максимальный дивизион</span>
                )}
                <span className="font-mono">{progressPct}%</span>
              </div>
            </div>
          )}

          {/* Mobile balance row */}
          <div className="mt-4 sm:hidden">
            {identity.balance !== null && (
              <CurrencyDisplay esh={identity.balance} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
