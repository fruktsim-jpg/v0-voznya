'use client'

import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/voznya/animated-counter'
import { useApi } from '@/hooks/use-api'
import type { MessageStats } from '@/lib/queries'

const MEDALS = ['🥇', '🥈', '🥉']

function ActivityChart({ activity }: { activity: MessageStats['activity'] }) {
  if (activity.length === 0) return null
  const max = Math.max(...activity.map((a) => a.count), 1)
  return (
    <div className="glass rounded-2xl border border-border p-4 sm:p-6">
      <div className="mb-3 text-sm font-semibold text-foreground">Активность за 14 дней</div>
      <div className="flex h-32 items-end gap-1 sm:gap-1.5">
        {activity.map((a) => (
          <div key={a.day} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-gradient-to-t from-primary/40 to-primary transition-all"
              style={{ height: `${Math.max((a.count / max) * 100, 4)}%` }}
            />
            <span className="pointer-events-none absolute -top-6 hidden rounded bg-popover px-1.5 py-0.5 text-[10px] text-foreground group-hover:block">
              {a.count}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{activity[0]?.day.slice(5)}</span>
        <span>{activity[activity.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  )
}

export function MessagesPanel() {
  const { data } = useApi<MessageStats>('/api/messages', 30_000)

  // Hidden until the bot's message tracking (migration 0004) is live.
  if (!data) return null

  return (
    <section className="px-6 py-10 sm:py-14">
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
                    <div className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base">
                      {u.name}
                    </div>
                    <div className="shrink-0 text-sm font-bold text-primary sm:text-base">
                      {u.count.toLocaleString('ru-RU')} <span className="text-muted-foreground">сообщ.</span>
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
