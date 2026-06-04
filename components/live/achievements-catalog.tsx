'use client'

import { motion } from 'framer-motion'
import { useApi } from '@/hooks/use-api'
import type { AchievementsResult } from '@/lib/queries'

export function AchievementsCatalog() {
  const { data, error } = useApi<AchievementsResult>('/api/achievements', 30_000)

  return (
    <section className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Ачивки</span>
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          13 достижений с наградами в ешках. Цифра на карточке — сколько участников уже открыли.
        </p>

        {error && !data ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Достижения временно недоступны</p>
        ) : !data ? (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {data.items.map((a, i) => (
              <motion.div
                key={a.code}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: (i % 6) * 0.04 }}
                className="glass flex items-center gap-3.5 rounded-2xl border border-border p-4"
              >
                <div className="text-2xl sm:text-3xl">{a.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground sm:text-base">{a.name}</span>
                    {a.reward > 0 && (
                      <span className="shrink-0 text-xs font-medium text-primary">+{a.reward.toLocaleString('ru-RU')}</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                </div>
                <div className="shrink-0 text-center">
                  <div className="text-base font-bold text-foreground">{a.unlocked}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">открыли</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
