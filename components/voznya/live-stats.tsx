'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { AnimatedCounter } from './animated-counter'
import { Reveal } from './reveal'
import type { CommunityStats } from '@/lib/queries'

type Card = { emoji: string; label: string; key: keyof CommunityStats }

const CARDS: Card[] = [
  { emoji: '👥', label: 'Пользователей бота', key: 'users' },
  { emoji: '💰', label: 'Ешек в обороте', key: 'eshInCirculation' },
  { emoji: '🏆', label: 'Получено ачивок', key: 'achievements' },
  { emoji: '⚔️', label: 'Проведено дуэлей', key: 'duels' },
  { emoji: '🌾', label: 'Фермеров', key: 'farmers' },
  { emoji: '📦', label: 'Кладов найдено', key: 'treasuresFound' },
]

export function LiveStats() {
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => alive && setStats(data))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  return (
    <section className="relative px-6 py-12 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-primary/15 blur-[110px]"
      />
      <div className="relative mx-auto max-w-5xl">
        <Reveal className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Сейчас в ВОЗНЕ
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="mt-5 text-center text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            <span className="text-gradient">Живая</span> статистика
          </h2>
        </Reveal>

        {error ? (
          <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Activity className="h-4 w-4" /> Статистика временно недоступна
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-5">
            {CARDS.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="glass relative overflow-hidden rounded-2xl border border-border p-4 text-center sm:p-6"
              >
                <div className="text-2xl sm:text-3xl">{c.emoji}</div>
                <div className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                  {stats ? (
                    <AnimatedCounter value={stats[c.key]} />
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
