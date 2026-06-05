'use client'

import { motion } from 'framer-motion'
import { useApi } from '@/hooks/use-api'
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENTS } from '@/lib/voznya-bot'
import type { AchievementsResult } from '@/lib/queries'

export function AchievementsCatalog() {
  const { data, error } = useApi<AchievementsResult>('/api/achievements', 30_000)

  // Group achievements by category
  const achievementsByCategory = ACHIEVEMENT_CATEGORIES.map((cat) => ({
    ...cat,
    achievements: ACHIEVEMENTS.filter((a) => a.category === cat.code),
  }))

  // Count unlocked achievements per code
  const unlockedCounts = new Map<string, number>()
  if (data) {
    data.items.forEach((item) => {
      unlockedCounts.set(item.code, item.unlocked)
    })
  }

  return (
    <section id="achievements" className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Ачивки</span>
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          30 достижений с наградами в ешках. Цифра на карточке — сколько участников уже открыли.
        </p>

        {error && !data ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Достижения временно недоступны</p>
        ) : !data ? (
          <div className="mt-8 space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 w-32 animate-pulse rounded bg-white/5" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-20 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {achievementsByCategory.map((category, catIndex) => {
              // Special handling for secret achievements
              const isSecret = category.code === 'secret'
              const secretUnlocked = isSecret
                ? category.achievements.filter((a) => unlockedCounts.get(a.code) ?? 0 > 0)
                : []

              return (
                <div key={category.code}>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.4, delay: catIndex * 0.05 }}
                    className="mb-4 flex items-center gap-2"
                  >
                    <span className="text-2xl">{category.emoji}</span>
                    <h3 className="text-lg font-bold text-foreground sm:text-xl">{category.name}</h3>
                  </motion.div>

                  {isSecret ? (
                    // Secret achievements: show only unlocked ones
                    secretUnlocked.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                        {secretUnlocked.map((a, i) => (
                          <AchievementCard
                            key={a.code}
                            achievement={a}
                            unlocked={unlockedCounts.get(a.code) ?? 0}
                            index={i}
                          />
                        ))}
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="glass rounded-2xl border border-border p-6 text-center"
                      >
                        <div className="text-3xl">🤫</div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Секретные достижения скрыты до открытия
                        </p>
                      </motion.div>
                    )
                  ) : (
                    // Regular achievements: show all
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      {category.achievements.map((a, i) => (
                        <AchievementCard
                          key={a.code}
                          achievement={a}
                          unlocked={unlockedCounts.get(a.code) ?? 0}
                          index={i}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function AchievementCard({
  achievement,
  unlocked,
  index,
}: {
  achievement: (typeof ACHIEVEMENTS)[0]
  unlocked: number
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: (index % 6) * 0.04 }}
      className="glass flex items-center gap-3.5 rounded-2xl border border-border p-4"
    >
      <div className="text-2xl sm:text-3xl">{achievement.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground sm:text-base">
            {achievement.name}
          </span>
          {achievement.reward > 0 && (
            <span className="shrink-0 text-xs font-medium text-primary">
              +{achievement.reward.toLocaleString('ru-RU')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{achievement.description}</p>
      </div>
      <div className="shrink-0 text-center">
        <div className="text-base font-bold text-foreground">{unlocked}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">открыли</div>
      </div>
    </motion.div>
  )
}
