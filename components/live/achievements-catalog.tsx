'use client'

import { motion } from 'framer-motion'
import { useApi } from '@/hooks/use-api'
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENTS } from '@/lib/voznya-bot'
import type { AchievementsResult } from '@/lib/queries'
import { achievementRarity } from '@/lib/achievements-ux'
import { rarityToken, type Rarity } from '@/lib/rarity'

type ProgressResult = {
  authenticated: boolean
  progress: { unlockedCodes: string[] } | null
}

export function AchievementsCatalog() {
  const { data, error } = useApi<AchievementsResult>('/api/achievements', 30_000)
  // Personal layer: which of these has THE SIGNED-IN player unlocked. Guests /
  // DB-down get null and the catalog renders exactly as before (global only).
  const { data: me } = useApi<ProgressResult>('/api/me/progress', 30_000)
  const mine = me?.progress ? new Set(me.progress.unlockedCodes) : null

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
  const totalPlayers = data?.totalPlayers ?? 0

  // Personal tally — only the non-secret, real catalog counts toward "mine"
  // (secret ones still light up individually when owned).
  const mineCount = mine ? ACHIEVEMENTS.filter((a) => mine.has(a.code)).length : 0

  return (
    <section id="achievements" className="px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
          <span className="text-gradient">Ачивки</span>
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {ACHIEVEMENTS.length} достижений с наградами в ешках. Цвет — редкость; цифра — сколько участников открыли.
        </p>

        {mine && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-primary">Твой прогресс</span>
              <span className="text-foreground">
                {mineCount} / {ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${ACHIEVEMENTS.length ? (mineCount / ACHIEVEMENTS.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

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
              // FIX (Track 1): операторная приоритетность — раньше было
              // `unlockedCounts.get(a.code) ?? 0 > 0`, что парсится как
              // `?? (0 > 0)` и ломало фильтр секреток. Скобки чинят это.
              const secretUnlocked = isSecret
                ? category.achievements.filter((a) => (unlockedCounts.get(a.code) ?? 0) > 0)
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
                            totalPlayers={totalPlayers}
                            owned={mine ? mine.has(a.code) : null}
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
                          totalPlayers={totalPlayers}
                          owned={mine ? mine.has(a.code) : null}
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
  totalPlayers,
  owned,
  index,
}: {
  achievement: (typeof ACHIEVEMENTS)[0]
  unlocked: number
  totalPlayers: number
  /** Has the signed-in player unlocked this? null = unknown (guest / DB down). */
  owned: boolean | null
  index: number
}) {
  // Wire achievements-ux engine: редкость = награда + глобальная редкость.
  const rarity: Rarity = achievementRarity(achievement.reward, { unlocked, totalPlayers })
  const t = rarityToken(rarity)
  const globalPct = totalPlayers > 0 && unlocked > 0 ? unlocked / totalPlayers : null
  const isRare = rarity === 'epic' || rarity === 'legendary' || rarity === 'mythic'

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: (index % 6) * 0.04 }}
      className={`glass relative flex items-center gap-3.5 rounded-2xl border p-4 ${t.borderClass} ${
        owned === true
          ? 'ring-1 ring-emerald-400/50'
          : owned === false
            ? 'opacity-55 saturate-50'
            : ''
      }`}
      style={{ boxShadow: isRare && owned !== false ? t.glow || undefined : undefined }}
    >
      {owned === true && (
        <span
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-[11px] text-emerald-300"
          title="Открыто тобой"
          aria-label="Открыто тобой"
        >
          ✓
        </span>
      )}
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
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${t.textClass}`}>
            {t.label}
          </span>
          {globalPct != null && globalPct < 0.08 && (
            <span className="rounded-full bg-white/5 px-1.5 py-px text-[10px] text-muted-foreground">
              редкое · {globalPct < 0.01 ? '<1' : Math.round(globalPct * 100)}%
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-center">
        <div className="text-base font-bold text-foreground">{unlocked}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">открыли</div>
      </div>
    </motion.div>
  )
}
