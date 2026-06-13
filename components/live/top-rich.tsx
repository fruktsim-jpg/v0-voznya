'use client'

import { motion } from 'framer-motion'
import { useApi } from '@/hooks/use-api'
import { titleForEarned, TITLES } from '@/lib/voznya-bot'
import { PlayerLink } from '@/components/ui/player-link'
import { TitleBadge } from '@/components/prestige'
import { CoinAmount } from '@/components/ds/icon'
import { prestigeForTitleIndex } from '@/lib/ds/prestige'
import { YouAreHere } from '@/components/live/you-are-here'
import type { RichUser } from '@/lib/queries'

// Podium tint for the top-3 ordinals — owned styling instead of medal emoji.
const PODIUM = ['#FFD700', '#C8D0DC', '#CD7F32']

export function TopRich() {
  const { data, error } = useApi<RichUser[]>('/api/top-rich?limit=10', 30_000)

  return (
    <section id="top-rich" className="px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="type-display text-center text-xl sm:text-2xl">
          <span className="text-gradient">Топ</span> богачей
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Самые богатые участники по балансу ешек</p>

        <YouAreHere label="Твоё место по богатству" />

        {error && !data ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Рейтинг временно недоступен</p>
        ) : !data ? (
          <div className="mt-8 space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Пока никого нет в рейтинге</p>
        ) : (
          <div className="mt-8 space-y-2.5">
            {data.map((u, i) => {
              const top3 = u.rank <= 3
              const title = titleForEarned(u.totalEarned)
              // B4: the row is dressed in the player's TITLE tier world.
              const tier = prestigeForTitleIndex(
                Math.max(0, TITLES.findIndex((x) => x.name === title.name)),
                TITLES.length,
              )
              return (
                <motion.div
                  key={u.rank}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="glass flex items-center gap-4 rounded-2xl border p-3.5 sm:p-4"
                  style={{
                    borderColor: `${tier.color}${top3 ? '66' : '2e'}`,
                    background: top3 ? `linear-gradient(100deg, ${tier.color}14, transparent 60%)` : undefined,
                  }}
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
                    <PlayerLink userId={u.userId} name={u.name} className="truncate text-sm font-semibold text-foreground sm:text-base block" />
                    <div className="mt-1">
                      <TitleBadge
                        emoji={title.emoji}
                        name={title.name}
                        index={Math.max(0, TITLES.findIndex((x) => x.name === title.name))}
                        total={TITLES.length}
                        size="sm"
                      />
                    </div>
                  </div>
                  <CoinAmount value={u.balance} size="md" className="shrink-0 text-foreground" />
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
