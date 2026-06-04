'use client'

import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/voznya/animated-counter'
import { useApi } from '@/hooks/use-api'
import type { CommunityStats, MessageStats } from '@/lib/queries'

type CardData = { emoji: string; label: string; value: number }

export function LiveCommunityStats() {
  const { data, error } = useApi<CommunityStats>('/api/stats', 20_000)
  const { data: messages } = useApi<MessageStats>('/api/messages', 20_000)

  const cards: CardData[] = data
    ? [
        { emoji: '👥', label: 'Пользователей', value: data.users },
        { emoji: '💰', label: 'Ешек в обороте', value: data.eshInCirculation },
        ...(messages
          ? [{ emoji: '💬', label: 'Сообщений всего', value: messages.total }]
          : [{ emoji: '📦', label: 'Кладов найдено', value: data.treasuresFound }]),
        { emoji: '🏆', label: 'Получено ачивок', value: data.achievements },
        { emoji: '⚔️', label: 'Дуэлей', value: data.duels },
        { emoji: '🌾', label: 'Фермеров', value: data.farmers },
      ]
    : []

  return (
    <section className="px-6 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        {error && !data ? (
          <p className="text-center text-sm text-muted-foreground">Статистика временно недоступна</p>
        ) : !data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5 sm:h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {cards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="glass relative overflow-hidden rounded-2xl border border-border p-4 text-center sm:p-6"
              >
                <div className="text-2xl sm:text-3xl">{c.emoji}</div>
                <div className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                  <AnimatedCounter value={c.value} />
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
