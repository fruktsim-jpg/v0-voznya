'use client'

import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/voznya/animated-counter'
import { useApi } from '@/hooks/use-api'
import type { CommunityStats } from '@/lib/queries'

const CARDS: { emoji: string; label: string; key: keyof CommunityStats }[] = [
  { emoji: '👥', label: 'Пользователей', key: 'users' },
  { emoji: '💰', label: 'Ешек в обороте', key: 'eshInCirculation' },
  { emoji: '⚔️', label: 'Дуэлей', key: 'duels' },
  { emoji: '🌾', label: 'Фермеров', key: 'farmers' },
  { emoji: '🪙', label: 'Кладов найдено', key: 'treasuresFound' },
  { emoji: '💍', label: 'Браков', key: 'marriages' },
]

export function LiveCommunityStats() {
  const { data, error } = useApi<CommunityStats>('/api/stats', 20_000)

  return (
    <section className="px-6 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {error && !data ? (
          <p className="text-center text-sm text-muted-foreground">Статистика временно недоступна</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {CARDS.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="glass relative overflow-hidden rounded-2xl border border-border p-4 text-center sm:p-6"
              >
                <div className="text-2xl sm:text-3xl">{c.emoji}</div>
                <div className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                  {data ? (
                    <AnimatedCounter value={data[c.key]} />
                  ) : (
                    <span className="inline-block h-7 w-16 animate-pulse rounded-md bg-white/10 align-middle sm:h-8" />
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{c.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
