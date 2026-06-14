'use client'

import { useApi } from '@/hooks/use-api'
import { titleForEarned, TITLES } from '@/lib/voznya-bot'
import { Avatar } from '@/components/ds/avatar'
import { TitleBadge } from '@/components/prestige'
import { CoinAmount } from '@/components/ds/icon'
import { YouAreHere } from '@/components/live/you-are-here'
import type { RichUser } from '@/lib/queries'

// Podium tint for the top-3 ordinals only — a thin accent, not a card wash.
const PODIUM = ['#E8B54D', '#C8D0DC', '#CD7F32']

/**
 * TopRich — the richest players. Rebuilt to Settings quality (visual reset): a
 * left-aligned section header (not a centered marketing title), one dense glass
 * list (not stagger-animated gradient cards), and a REAL avatar per row
 * (Telegram photo → initials fallback via the shared Avatar). Rank colour means
 * podium standing only. Read-only.
 */
export function TopRich() {
  const { data, error } = useApi<RichUser[]>('/api/top-rich?limit=10', 30_000)

  return (
    <section id="top-rich" className="px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Топ богачей
        </h2>

        <YouAreHere label="Твоё место по богатству" endpoint="/api/top-rich/me" />

        {error && !data ? (
          <p className="mt-4 text-sm text-muted-foreground">Рейтинг временно недоступен</p>
        ) : !data ? (
          <div className="mt-3 space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Пока никого нет в рейтинге</p>
        ) : (
          <div className="glass mt-3 overflow-hidden rounded-2xl border border-border">
            {data.map((u) => {
              const top3 = u.rank <= 3
              const podium = top3 ? PODIUM[u.rank - 1] : null
              const title = titleForEarned(u.totalEarned)
              const titleIndex = Math.max(0, TITLES.findIndex((x) => x.name === title.name))
              return (
                <a
                  key={u.rank}
                  href={`/profile/${u.userId}`}
                  className="flex items-center gap-3 border-b border-border/50 px-3 py-2.5 transition last:border-0 hover:bg-white/[0.03] sm:px-4"
                >
                  <span
                    className="type-stat w-6 shrink-0 text-center text-sm"
                    style={{ color: podium ?? 'var(--muted-foreground)' }}
                  >
                    {u.rank}
                  </span>
                  <Avatar src={u.photoUrl} name={u.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{u.name}</div>
                    <div className="mt-0.5">
                      <TitleBadge
                        emoji={title.emoji}
                        name={title.name}
                        index={titleIndex}
                        total={TITLES.length}
                        size="sm"
                      />
                    </div>
                  </div>
                  <CoinAmount value={u.balance} size="sm" className="shrink-0 text-foreground" />
                </a>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
