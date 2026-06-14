'use client'

import { useApi } from '@/hooks/use-api'
import { Avatar } from '@/components/ds/avatar'
import { YouAreHere } from '@/components/live/you-are-here'
import type { ReputationLeader } from '@/lib/queries'

const PODIUM = ['#FFD700', '#C8D0DC', '#CD7F32']

/**
 * ReputationTop — самые уважаемые участники. Settings-grade: левый
 * eyebrow-заголовок, один плотный glass-список, реальные аватары, ранговый цвет
 * только у топ-3. Данные — агрегат поверх reputation_entries. Скрывается пустым.
 */
export function ReputationTop() {
  const { data, error } = useApi<ReputationLeader[]>('/api/reputation', 30_000)

  if (!error && data && data.length === 0) return null
  if (error && !data) return null

  return (
    <section id="top-rep" className="px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Топ по репутации
        </h2>

        <YouAreHere label="Твоё место по репутации" endpoint="/api/reputation/me" unit="репутации" />

        {!data ? (
          <div className="mt-3 space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="glass mt-3 overflow-hidden rounded-2xl border border-border">
            {data.map((u) => {
              const podium = u.rank <= 3 ? PODIUM[u.rank - 1] : null
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
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {u.name}
                  </span>
                  <span className="type-economy shrink-0 text-sm text-foreground">
                    +{u.reputation.toLocaleString('ru-RU')}
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
