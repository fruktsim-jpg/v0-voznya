'use client'

import { motion } from 'framer-motion'
import { titleForEarned, ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/lib/voznya-bot'
import { MMR_RANKS } from '@/lib/queries'
import { formatCurrency, formatDays, formatAchievements, formatMessages } from '@/lib/pluralize'

import Link from 'next/link'
import { PlayerLink } from '@/components/ui/player-link'
import { TelegramButton } from '@/components/voznya/telegram-button'
import { ProfileBreadcrumb } from '@/components/profile/profile-breadcrumb'
import { BackButton } from '@/components/profile/back-button'
import { PlayerNavigation } from '@/components/profile/player-navigation'
import { ShareButton } from '@/components/profile/share-button'
import { QuickLinks } from '@/components/profile/quick-links'
import { AchievementBadge, type AchievementRarity } from '@/components/profile/achievement-badge'
import type { PlayerProfile } from '@/lib/queries'

interface PlayerCardProps {
  profile: PlayerProfile
  isOwner?: boolean
}

const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length

function rarityFor(category: string): AchievementRarity {
  if (category === 'legend') return 'legend'
  if (category === 'secret') return 'secret'
  return 'normal'
}

export function PlayerCard({ profile, isOwner = false }: PlayerCardProps) {
  const title = titleForEarned(profile.totalEarned)
  const duelsTotal = profile.duelsWon + profile.duelsLost
  const winRate = duelsTotal > 0 ? Math.round((profile.duelsWon / duelsTotal) * 100) : 0

  // --- MMR: progress to next rank (display-only, derived from MMR_RANKS) ----
  const nextMmrRank =
    profile.mmr !== null && profile.mmrRank
      ? MMR_RANKS.find((r) => r.minMmr > profile.mmrRank!.minMmr) ?? null
      : null
  const mmrProgressPercent =
    profile.mmr !== null && profile.mmrRank && nextMmrRank
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((profile.mmr - profile.mmrRank.minMmr) /
                (nextMmrRank.minMmr - profile.mmrRank.minMmr)) *
                100,
            ),
          ),
        )
      : 100
  const mmrToNext =
    profile.mmr !== null && nextMmrRank ? Math.max(0, nextMmrRank.minMmr - profile.mmr) : 0

  // Unlocked achievement codes
  const unlockedCodes = new Set(profile.achievements.map((a) => a.code))

  // Group achievements by category. Secret category is included: locked secrets
  // render as mysteries (no spoilers), unlocked ones reveal fully.
  const achievementsByCategory = ACHIEVEMENT_CATEGORIES.map((category) => {
    const isSecretCat = category.code === 'secret'
    const items = ACHIEVEMENTS.filter((a) => a.category === category.code).map((a) => ({
      ...a,
      unlocked: unlockedCodes.has(a.code),
    }))
    return { ...category, isSecretCat, achievements: items }
  }).filter((cat) => cat.achievements.length > 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <ProfileBreadcrumb playerName={profile.firstName} />
      <BackButton />

      {/* ============================================================== */}
      {/* УРОВЕНЬ 1 — Личность: ник, титул, MMR-ранг, место              */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative overflow-hidden rounded-2xl border border-border p-5 sm:rounded-3xl sm:p-8"
      >
        {/* Ambient glow tied to MMR rank */}
        {profile.mmrRank && (
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        )}

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar — title emoji, with top-3 badge */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-4xl shadow-lg shadow-primary/20 sm:h-24 sm:w-24 sm:text-5xl">
            {title.emoji}
            {profile.rankInTop && profile.rankInTop <= 3 && (
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {profile.rankInTop}
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{profile.firstName}</h1>
              {isOwner && (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  Это ты
                </span>
              )}
            </div>

            {profile.username && (
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-2.5">
              {/* Титул (по заработку) */}
              <Link
                href="/live#titles"
                className="rounded-full bg-gradient-to-r from-primary/20 to-accent/20 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:from-primary/30 hover:to-accent/30 sm:text-sm"
              >
                {title.emoji} {title.name}
              </Link>
              {/* Ранг MMR (путь по миру) */}
              {profile.mmrRank && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground sm:text-sm">
                  {profile.mmrRank.emoji} {profile.mmrRank.name}
                </span>
              )}
              {profile.ranks.byMmr && (
                <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:text-sm">
                  #{profile.ranks.byMmr} по MMR
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* MMR — главный игровой блок (влияние / путь по миру)            */}
      {/* ============================================================== */}
      {profile.mmr !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-3 sm:mt-6"
        >
          <div className="glass relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.07] to-transparent p-5 sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="text-sm">🏆</span> Влияние · MMR
                </div>
                <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="text-3xl font-bold leading-none text-primary sm:text-5xl">
                    {profile.mmr.toLocaleString('ru-RU')}
                  </span>
                  {profile.mmrRank && (
                    <span className="text-base font-semibold text-foreground sm:text-lg">
                      {profile.mmrRank.emoji} {profile.mmrRank.name}
                    </span>
                  )}
                </div>
              </div>
              {profile.ranks.byMmr && (
                <div className="shrink-0 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-primary sm:text-2xl">
                    #{profile.ranks.byMmr}
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground sm:text-[10px]">
                    в топе
                  </div>
                </div>
              )}
            </div>

            {/* Прогресс до следующего ранга */}
            {nextMmrRank ? (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">
                    До {nextMmrRank.emoji} {nextMmrRank.name}
                  </span>
                  <span className="font-semibold text-foreground">
                    ещё {mmrToNext.toLocaleString('ru-RU')} MMR
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${mmrProgressPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-2.5 text-center text-xs font-medium text-primary sm:text-sm">
                🔥 Максимальный ранг Возни достигнут
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ============================================================== */}
      {/* УРОВЕНЬ 2 — Три оси: уважение / богатство / голос              */}
      {/* MMR = влияние, Репутация = уважение, Ешки = богатство.         */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-3 grid grid-cols-1 gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-4"
      >
        {/* Репутация — уважение сообщества (rose) */}
        {profile.reputation !== null && (
          <div className="glass rounded-2xl border border-rose-400/25 bg-gradient-to-br from-rose-400/[0.08] to-transparent p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-300/80">
              <span className="text-base">❤️</span> Уважение
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-200 sm:text-3xl">
              {profile.reputation.toLocaleString('ru-RU')}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
              Репутация{profile.ranks.byReputation ? ` · #${profile.ranks.byReputation}` : ''}
            </div>
          </div>
        )}

        {/* Ешки — богатство (amber/gold) */}
        <div className="glass rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.08] to-transparent p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300/80">
            <span className="text-base">🥚</span> Богатство
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-200 sm:text-3xl">
            {formatCurrency(profile.balance)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
            Ешки{profile.rankInTop ? ` · #${profile.rankInTop}` : ''} · заработано{' '}
            {formatCurrency(profile.totalEarned)}
          </div>
        </div>

        {/* Сообщения — голос в чате (sky/blue) */}
        {profile.messages > 0 && (
          <div className="glass rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-400/[0.08] to-transparent p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-300/80">
              <span className="text-base">💬</span> Голос
            </div>
            <div className="mt-2 text-2xl font-bold text-sky-200 sm:text-3xl">
              {profile.messages.toLocaleString('ru-RU')}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
              {formatMessages(profile.messages, false)}
              {profile.ranks.byMessages ? ` · #${profile.ranks.byMessages}` : ''}
            </div>
          </div>
        )}
      </motion.div>

      {/* ============================================================== */}
      {/* УРОВЕНЬ 3 — Игровая статистика (дуэли/ферма/клады/казино/...)  */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mt-3 sm:mt-6"
      >
        <div className="glass rounded-2xl border border-border p-4 sm:rounded-3xl sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground sm:text-base">
            <span className="text-lg sm:text-xl">🎮</span> Возня
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {/* Дуэли */}
            <StatTile emoji="⚔️" value={`${profile.duelsWon} / ${profile.duelsLost}`} label={`Дуэли · ${winRate}%`} />
            {/* Ферма */}
            <StatTile
              emoji="🌾"
              value={`${profile.farmStreak} / ${profile.maxFarmStreak}`}
              label={`Ферма · ${profile.farmSuccessCount}`}
            />
            {/* Клады */}
            <StatTile emoji="📦" value={profile.treasuresFound.toLocaleString('ru-RU')} label="Клады" />
            {/* Казино */}
            {profile.casinoGamesCount > 0 && (
              <StatTile emoji="🎰" value={profile.casinoGamesCount.toLocaleString('ru-RU')} label="Казино" />
            )}
            {/* Пидор дня */}
            {profile.pidorCount > 0 && (
              <StatTile emoji="🏳️" value={profile.pidorCount.toLocaleString('ru-RU')} label="Пидор дня" />
            )}
            {/* Достижения */}
            <StatTile
              emoji="🏆"
              value={`${profile.achievementsUnlocked} / ${TOTAL_ACHIEVEMENTS}`}
              label="Достижения"
            />
          </div>

          {/* Инвентарь — компактная строка, если есть */}
          {profile.inventory && profile.inventory.uniqueItems > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
              <StatTile emoji="🎒" value={profile.inventory.items.toLocaleString('ru-RU')} label="Предметов" />
              <StatTile
                emoji="✨"
                value={profile.inventory.uniqueItems.toLocaleString('ru-RU')}
                label="Уникальных"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Брак — отдельная карточка (связь с другим игроком) */}
      {profile.marriage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 sm:mt-6"
        >
          <div className="glass rounded-2xl border border-border p-4 sm:rounded-3xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-2xl">
                💍
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">В браке с</div>
                <PlayerLink
                  userId={profile.marriage.partnerId}
                  name={profile.marriage.partnerName}
                  className="block truncate text-base font-semibold text-foreground"
                />
                <div className="text-xs text-muted-foreground">{formatDays(profile.marriage.days)}</div>
              </div>
              <Link
                href="/live#families"
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                Семьи →
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================================== */}
      {/* Достижения — с разделением редкости                            */}
      {/* ============================================================== */}
      {profile.achievementsUnlocked > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-4 sm:mt-6"
        >
          <div className="glass rounded-2xl border border-border p-5 sm:rounded-3xl sm:p-8">
            <div className="mb-4 flex items-center gap-3 sm:mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-xl sm:h-12 sm:w-12 sm:text-2xl">
                🏆
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground sm:text-xl">Достижения</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {profile.achievementsUnlocked} из {TOTAL_ACHIEVEMENTS} открыто
                </p>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-6">
              {achievementsByCategory.map((category, catIndex) => {
                const unlockedInCategory = category.achievements.filter((a) => a.unlocked).length
                const sorted = [...category.achievements].sort(
                  (a, b) => Number(b.unlocked) - Number(a.unlocked),
                )

                return (
                  <div key={category.code}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-base sm:text-lg">{category.emoji}</span>
                      <h3 className="text-sm font-semibold text-foreground sm:text-base">
                        {category.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {unlockedInCategory}/{category.achievements.length}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {sorted.map((achievement, achIndex) => (
                        <AchievementBadge
                          key={achievement.code}
                          emoji={achievement.emoji}
                          name={achievement.name}
                          description={achievement.description}
                          unlocked={achievement.unlocked}
                          reward={achievement.reward}
                          rarity={rarityFor(achievement.category)}
                          mystery={category.isSecretCat && !achievement.unlocked}
                          index={catIndex * 10 + achIndex}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {profile.achievementsUnlocked < TOTAL_ACHIEVEMENTS && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-5 rounded-xl border border-border/50 bg-white/[0.02] p-4 text-center sm:mt-6"
              >
                <p className="text-xs text-muted-foreground sm:text-sm">
                  🎯 Ещё {TOTAL_ACHIEVEMENTS - profile.achievementsUnlocked}{' '}
                  {formatAchievements(TOTAL_ACHIEVEMENTS - profile.achievementsUnlocked, false)} ждут
                  тебя в боте
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Дата вступления */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-center text-xs text-muted-foreground sm:mt-6 sm:text-sm"
      >
        {profile.joinedAt ? 'В чате с ' : 'Участник с '}
        {new Date(profile.joinedAt ?? profile.createdAt).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </motion.div>

      <PlayerNavigation currentUserId={profile.userId} currentRank={profile.rankInTop} />
      <ShareButton userId={profile.userId} playerName={profile.firstName} />
      <QuickLinks />

      {/* CTA — играть в боте */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 sm:mt-6"
      >
        <div className="glass rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5 text-center sm:rounded-3xl sm:p-8">
          <div className="mb-3 text-3xl sm:mb-4 sm:text-4xl">🤖</div>
          <h3 className="mb-2 text-base font-bold text-foreground sm:text-lg">Играй в ВОЗНЮ</h3>
          <p className="mb-4 text-xs text-muted-foreground sm:mb-5 sm:text-sm">
            Зарабатывай ешки, расти в MMR и открывай достижения
          </p>
          <TelegramButton variant="secondary" />
        </div>
      </motion.div>
    </div>
  )
}

/** Компактная плитка игровой статистики (уровень 3). */
function StatTile({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="glass rounded-xl border border-border p-2.5 sm:p-3.5">
      <div className="flex items-center gap-2">
        <div className="text-lg sm:text-2xl">{emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-foreground sm:text-lg">{value}</div>
          <div className="truncate text-[9px] text-muted-foreground sm:text-xs">{label}</div>
        </div>
      </div>
    </div>
  )
}
