'use client'

import { motion } from 'framer-motion'
import { PlayerLink } from '@/components/ui/player-link'
import { formatDays } from '@/lib/pluralize'
import { useApi } from '@/hooks/use-api'
import type { Family } from '@/lib/queries'

const MEDALS = ['🥇', '🥈', '🥉']

export function FamiliesTop() {
  const { data, error } = useApi<Family[]>('/api/families', 30_000)

  if (error || !data || data.length === 0) return null

  return (
    <section className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">💍 Рейтинг семей</span>
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Самые крепкие браки сообщества
        </p>

        <div className="mt-8 space-y-2.5">
          {data.map((family, i) => {
            const top3 = family.rank <= 3
            return (
              <motion.div
                key={family.rank}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className={`glass flex items-center gap-4 rounded-2xl border p-3.5 sm:p-4 ${
                  top3 ? 'border-primary/40 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex w-9 shrink-0 justify-center text-xl sm:text-2xl">
                  {top3 ? (
                    MEDALS[family.rank - 1]
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{family.rank}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold sm:text-base">
                    <PlayerLink
                      userId={family.user1Id}
                      name={family.user1Name}
                      className="text-foreground hover:text-primary"
                    />
                    <span className="text-muted-foreground">💕</span>
                    <PlayerLink
                      userId={family.user2Id}
                      name={family.user2Name}
                      className="text-foreground hover:text-primary"
                    />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                    {formatDays(family.days)} вместе
                  </div>
                </div>
                <div className="shrink-0 text-xl sm:text-2xl">💍</div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
