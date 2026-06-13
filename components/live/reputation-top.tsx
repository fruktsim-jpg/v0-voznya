'use client'

import { motion } from 'framer-motion'
import { PlayerLink } from '@/components/ui/player-link'
import { useApi } from '@/hooks/use-api'
import { YouAreHere } from '@/components/live/you-are-here'
import type { ReputationLeader } from '@/lib/queries'

const PODIUM = ['#FFD700', '#C8D0DC', '#CD7F32']

/**
 * ReputationTop (Track 1 — surfacing) — публичный рейтинг по репутации.
 * Закрывает «мёртвую» ссылку `/live#top-rep` (prestige-banner вёл в никуда) и
 * выводит ранее невидимую систему репутации в общий список топов. Данные —
 * агрегат поверх reputation_entries (getTopReputation), новых таблиц нет.
 * Молча скрывается, если рейтинг пуст или недоступен.
 */
export function ReputationTop() {
  const { data, error } = useApi<ReputationLeader[]>('/api/reputation', 30_000)

  // Пока никто не получил репутацию — не показываем пустую секцию.
  if (!error && data && data.length === 0) return null
  if (error && !data) return null

  return (
    <section id="top-rep" className="px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
          <span className="text-gradient">Топ</span> по репутации
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Самые уважаемые участники сообщества
        </p>

        <YouAreHere label="Твоё место по репутации" endpoint="/api/reputation/me" unit="репутации" />

        {!data ? (
          <div className="mt-8 space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-2.5">
            {data.map((u, i) => {
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
                  <div className="flex w-9 shrink-0 justify-center">
                    <span
                      className="type-stat text-lg font-bold sm:text-xl"
                      style={{ color: top3 ? PODIUM[u.rank - 1] : 'var(--muted-foreground)' }}
                    >
                      {u.rank}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <PlayerLink
                      userId={u.userId}
                      name={u.name}
                      className="block truncate text-sm font-semibold text-foreground sm:text-base"
                    />
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-bold text-foreground sm:text-lg">
                      +{u.reputation.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      репутация
                    </div>
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
