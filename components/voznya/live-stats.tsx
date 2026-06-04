'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Activity, ArrowRight } from 'lucide-react'
import { AnimatedCounter } from './animated-counter'
import { Reveal } from './reveal'
import type { CommunityStats } from '@/lib/queries'

type CardData = { emoji: string; label: string; value: number }

export function LiveStats() {
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [messages, setMessages] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => alive && setStats(data))
      .catch(() => alive && setError(true))
    fetch('/api/messages')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => alive && setMessages(data.total))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const cards: CardData[] = stats
    ? [
        { emoji: '👥', label: 'Пользователей бота', value: stats.users },
        { emoji: '💰', label: 'Ешек в обороте', value: stats.eshInCirculation },
        ...(messages !== null
          ? [{ emoji: '💬', label: 'Сообщений всего', value: messages }]
          : [{ emoji: '📦', label: 'Кладов найдено', value: stats.treasuresFound }]),
        { emoji: '🏆', label: 'Получено ачивок', value: stats.achievements },
        { emoji: '⚔️', label: 'Проведено дуэлей', value: stats.duels },
        { emoji: '🌾', label: 'Фермеров', value: stats.farmers },
      ]
    : []

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
        ) : !stats ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5 sm:h-32" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-5">
            {cards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
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

        <Reveal delay={0.1} className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/live"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_0_40px_-10px_rgba(139,92,246,0.9)] transition-transform hover:scale-[1.03] active:scale-95 sm:px-8 sm:py-4"
          >
            Вся статистика и топы
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
