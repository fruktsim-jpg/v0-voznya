'use client'

import { Avatar } from '@/components/ds/avatar'
import { formatDays } from '@/lib/pluralize'
import { useApi } from '@/hooks/use-api'
import type { Family } from '@/lib/queries'

const PODIUM = ['#FFD700', '#C8D0DC', '#CD7F32']

/**
 * FamiliesTop — крепчайшие браки сообщества. Settings-grade: левый
 * eyebrow-заголовок, один плотный glass-список, реальные аватары обоих супругов,
 * ранговый цвет только у топ-3.
 */
export function FamiliesTop() {
  const { data, error } = useApi<Family[]>('/api/families', 30_000)

  return (
    <section id="families" className="px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Рейтинг семей
        </h2>

        {error && !data ? (
          <p className="mt-4 text-sm text-muted-foreground">Рейтинг временно недоступен</p>
        ) : !data ? (
          <div className="mt-3 space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Пока нет браков в сообществе</p>
        ) : (
          <div className="glass mt-3 overflow-hidden rounded-2xl border border-border">
            {data.map((family) => {
              const podium = family.rank <= 3 ? PODIUM[family.rank - 1] : null
              return (
                <div
                  key={family.rank}
                  className="flex items-center gap-3 border-b border-border/50 px-3 py-2.5 last:border-0 sm:px-4"
                >
                  <span
                    className="type-stat w-6 shrink-0 text-center text-sm"
                    style={{ color: podium ?? 'var(--muted-foreground)' }}
                  >
                    {family.rank}
                  </span>
                  <div className="flex shrink-0 -space-x-2">
                    <Avatar src={family.user1Photo} name={family.user1Name} size="sm" />
                    <Avatar src={family.user2Photo} name={family.user2Name} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1 text-sm font-semibold">
                      <a href={`/profile/${family.user1Id}`} className="truncate text-foreground transition hover:text-primary">
                        {family.user1Name}
                      </a>
                      <span className="text-muted-foreground">+</span>
                      <a href={`/profile/${family.user2Id}`} className="truncate text-foreground transition hover:text-primary">
                        {family.user2Name}
                      </a>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDays(family.days)} вместе</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
