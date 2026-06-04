'use client'

import { motion } from 'framer-motion'
import { useApi } from '@/hooks/use-api'
import type { Economy } from '@/lib/queries'

export function EconomyPanel() {
  const { data, error } = useApi<Economy>('/api/economy', 30_000)

  const cards: { emoji: string; label: string; value: string }[] = data
    ? [
        { emoji: '💰', label: 'Общая казна', value: `${data.treasury.toLocaleString('ru-RU')} ешек` },
        { emoji: '🏦', label: 'Средний баланс', value: `${data.avgBalance.toLocaleString('ru-RU')} ешек` },
        { emoji: '👑', label: 'Самый богатый', value: data.richest ? data.richest.name : '—' },
        { emoji: '💸', label: 'Максимальный баланс', value: `${data.maxBalance.toLocaleString('ru-RU')} ешек` },
        { emoji: '🌾', label: 'Фермеров', value: data.farmers.toLocaleString('ru-RU') },
      ]
    : []

  return (
    <section className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Экономика</span>
        </h2>

        {error && !data ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Данные экономики временно недоступны</p>
        ) : !data ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {cards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="glass relative overflow-hidden rounded-2xl border border-border p-4 sm:p-6"
              >
                <div className="text-2xl sm:text-3xl">{c.emoji}</div>
                <div className="mt-2 truncate text-lg font-bold text-foreground sm:text-xl">{c.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{c.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
