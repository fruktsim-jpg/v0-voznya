'use client'

import { motion } from 'framer-motion'
import { useApi } from '@/hooks/use-api'
import { formatCurrency } from '@/lib/pluralize'
import { PlayerLink } from '@/components/ui/player-link'
import type { WeeklyEarner } from '@/lib/queries'

const PODIUM = ['#FFD700', '#C8D0DC', '#CD7F32']

export function WeeklyTop() {
  const { data, error } = useApi<WeeklyEarner[]>('/api/top-weekly?limit=10', 30_000)

  return (
    <section id="top-weekly" className="px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
          Топ <span className="text-gradient">недели</span>
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Больше всех заработали за последние 7 дней</p>

        {error && !data ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Рейтинг временно недоступен</p>
        ) : !data ? (
          <div className="mt-8 space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Пока нет активности за последние 7 дней</p>
        ) : (
        <div className="mt-8 space-y-2.5">
          {data.map((u, i) => {
            const top3 = u.rank <= 3
            const podium = top3 ? PODIUM[u.rank - 1] : null
            return (
              <motion.div
                key={u.rank}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="glass flex items-center gap-4 rounded-2xl border p-3.5 sm:p-4"
                style={{
                  borderColor: podium ? `${podium}66` : 'rgba(255,255,255,0.08)',
                  background: podium
                    ? `linear-gradient(100deg, ${podium}14, transparent 60%)`
                    : undefined,
                }}
              >
                <div className="flex w-9 shrink-0 justify-center">
                  <span
                    className="text-lg font-extrabold sm:text-xl"
                    style={{ color: podium ?? 'var(--muted-foreground)' }}
                  >
                    {u.rank}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <PlayerLink userId={u.userId} name={u.name} className="truncate text-sm font-semibold text-foreground sm:text-base block" />
                </div>
                <div
                  className="shrink-0 text-sm font-bold sm:text-base"
                  style={{ color: podium ?? 'var(--primary)' }}
                >
                  +{formatCurrency(u.earned)}
                </div>
              </motion.div>
            )
          })}
        </div>
        )}
      </div>
    </section>
  )
}
