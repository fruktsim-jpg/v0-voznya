'use client'

import { useApi } from '@/hooks/use-api'
import { formatCurrency } from '@/lib/pluralize'
import { Avatar } from '@/components/ds/avatar'
import type { WeeklyEarner } from '@/lib/queries'

const PODIUM = ['#E8B54D', '#C8D0DC', '#CD7F32']

/**
 * WeeklyTop — biggest earners of the last 7 days. Same Settings-quality list as
 * TopRich: left-aligned header, one dense glass list, real Avatar per row
 * (Telegram photo → initials), rank colour = podium only. Read-only.
 */
export function WeeklyTop() {
  const { data, error } = useApi<WeeklyEarner[]>('/api/top-weekly?limit=10', 30_000)

  return (
    <section id="top-weekly" className="px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Топ недели
        </h2>

        {error && !data ? (
          <p className="mt-4 text-sm text-muted-foreground">Рейтинг временно недоступен</p>
        ) : !data ? (
          <div className="mt-3 space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Пока нет активности за последние 7 дней</p>
        ) : (
          <div className="glass mt-3 overflow-hidden rounded-2xl border border-border">
            {data.map((u) => {
              const top3 = u.rank <= 3
              const podium = top3 ? PODIUM[u.rank - 1] : null
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
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {u.name}
                  </div>
                  <div
                    className="type-economy shrink-0 text-sm"
                    style={{ color: podium ?? 'var(--primary)' }}
                  >
                    +{formatCurrency(u.earned)}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
