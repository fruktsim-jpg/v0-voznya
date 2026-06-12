'use client'

import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/voznya/animated-counter'
import { PlayerLink } from '@/components/ui/player-link'
import { formatMessages } from '@/lib/pluralize'
import { useApi } from '@/hooks/use-api'
import { AreaTrend } from '@/components/ds/charts'
import type { MessageStats } from '@/lib/queries'

const MEDALS = ['🥇', '🥈', '🥉']

function ActivityChart({ activity }: { activity: MessageStats['activity'] }) {
  if (activity.length === 0) return null
  // Track 1: раньше здесь был самописный bar-div; теперь используем DS-чарт
  // AreaTrend (recharts, тёмная тема Возни) — тот же data, настоящий тренд с
  // осями и тултипом. Это включает ранее «мёртвый» components/ds/charts.
  const data = activity.map((a) => ({ day: a.day.slice(5), count: a.count }))
  return (
    <div className="glass rounded-2xl border border-border p-4 sm:p-6">
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

export function MessagesPanel() {
  const { data } = useApi<MessageStats>('/api/messages', 30_000)

  // Hidden until the bot's message tracking (migration 0004) is live.
  if (!data) return null

  return (
    <section id="top-messages" className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Сообщения</span>
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Активность чата сообщества</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          <div className="glass flex flex-col items-center justify-center rounded-2xl border border-border p-6 text-center">
            <div className="text-3xl">💬</div>
            <div className="mt-2 text-3xl font-bold text-foreground">
              <AnimatedCounter value={data.total} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">Сообщений всего</div>
          </div>
          <div className="sm:col-span-2">
            <ActivityChart activity={data.activity} />
          </div>
        </div>

        {data.top.length > 0 && (
          <>
            <h3 className="mt-10 text-center text-lg font-semibold text-foreground sm:text-xl">
              Топ по сообщениям
            </h3>
            <div className="mt-5 space-y-2.5">
              {data.top.map((u, i) => {
                const top3 = u.rank <= 3
                return (
                  <motion.div
                    key={u.rank}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.4, delay: i * 0.04 }}
                    className={`glass flex items-center gap-4 rounded-2xl border p-3.5 sm:p-4 ${
                      top3 ? 'border-primary/40 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex w-9 shrink-0 justify-center text-xl sm:text-2xl">
                      {top3 ? MEDALS[u.rank - 1] : <span className="text-sm font-bold text-muted-foreground">{u.rank}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <PlayerLink
                        userId={u.userId}
                        name={u.name}
                        className="truncate text-sm font-semibold text-foreground hover:text-primary sm:text-base"
                      />
                    </div>
                    <div className="shrink-0 text-sm font-bold text-primary sm:text-base">
                      {formatMessages(u.count)}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
