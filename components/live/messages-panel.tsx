'use client'

import { AnimatedCounter } from '@/components/voznya/animated-counter'
import { Avatar } from '@/components/ds/avatar'
import { formatMessages } from '@/lib/pluralize'
import { useApi } from '@/hooks/use-api'
import { AreaTrend } from '@/components/ds/charts'
import type { MessageStats } from '@/lib/queries'

const PODIUM = ['#FFD700', '#C8D0DC', '#CD7F32']

function ActivityChart({ activity }: { activity: MessageStats['activity'] }) {
  if (activity.length === 0) return null
  const data = activity.map((a) => ({ day: a.day.slice(5), count: a.count }))
  return (
    <div className="glass rounded-2xl border border-border p-4">
      <div className="mb-3 text-sm font-semibold text-foreground">Активность за 14 дней</div>
      <AreaTrend
        data={data}
        xKey="day"
        yKey="count"
        height={140}
        format={(v) => v.toLocaleString('ru-RU')}
      />
    </div>
  )
}

/**
 * MessagesPanel — активность чата. Settings-grade: левый eyebrow-заголовок,
 * компактная строка «всего» + тренд, плотный список топа с реальными аватарами.
 * Скрыт, пока трекинг сообщений бота не развёрнут.
 */
export function MessagesPanel() {
  const { data } = useApi<MessageStats>('/api/messages', 30_000)

  if (!data) return null

  return (
    <section id="top-messages" className="px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Сообщения
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass flex items-center gap-3 rounded-2xl border border-border p-4">
            <div className="min-w-0">
              <div className="type-stat text-2xl text-foreground">
                <AnimatedCounter value={data.total} />
              </div>
              <div className="text-xs text-muted-foreground">сообщений всего</div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <ActivityChart activity={data.activity} />
          </div>
        </div>

        {data.top.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Топ по сообщениям
            </h3>
            <div className="glass overflow-hidden rounded-2xl border border-border">
              {data.top.map((u) => {
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
                      {formatMessages(u.count)}
                    </span>
                  </a>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
