'use client'

import { motion } from 'framer-motion'
import { titleForEarned, ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/lib/voznya-bot'
import { formatCurrency, formatDays, formatWins, formatTreasures, formatDuels, formatFarms, formatAchievements } from '@/lib/pluralize'
import { PlayerLink } from '@/components/ui/player-link'
import { TelegramButton } from '@/components/voznya/telegram-button'
import { ProfileBreadcrumb } from '@/components/profile/profile-breadcrumb'
import { BackButton } from '@/components/profile/back-button'
import { PlayerNavigation } from '@/components/profile/player-navigation'
import { ShareButton } from '@/components/profile/share-button'
import { QuickLinks } from '@/components/profile/quick-links'
import { AchievementBadge } from '@/components/profile/achievement-badge'
import type { PlayerProfile } from '@/lib/queries'

interface PlayerCardProps {
  profile: PlayerProfile
}

export function PlayerCard({ profile }: PlayerCardProps) {
  const title = titleForEarned(profile.totalEarned)
  const duelsTotal = profile.duelsWon + profile.duelsLost
  const winRate = duelsTotal > 0 ? Math.round((profile.duelsWon / duelsTotal) * 100) : 0

  // Calculate progress to next title
  const titles = [
    { minEarned: 0, emoji: '🌱', name: 'Щавель' },
    { minEarned: 100, emoji: '🍑', name: 'Персик' },
    { minEarned: 250, emoji: '🥔', name: 'Картофель' },
    { minEarned: 500, emoji: '🐀', name: 'Гой' },
    { minEarned: 800, emoji: '🍺', name: 'Бурмалда' },
    { minEarned: 1200, emoji: '💊', name: 'Аптекарь' },
    { minEarned: 2000, emoji: '🎰', name: 'Лудик' },
    { minEarned: 3000, emoji: '⚔️', name: 'Возняк' },
    { minEarned: 4500, emoji: '🏆', name: 'Авторитет Возни' },
    { minEarned: 7000, emoji: '👑', name: 'Король Возни' },
    { minEarned: 12000, emoji: '☢️', name: 'Меллстрой' },
  ]

  const currentTitleIndex = titles.findIndex((t) => profile.totalEarned < t.minEarned) - 1
  const nextTitle = titles[currentTitleIndex + 1]
  const progressPercent = nextTitle
    ? Math.min(100, Math.round(((profile.totalEarned - titles[currentTitleIndex].minEarned) / (nextTitle.minEarned - titles[currentTitleIndex].minEarned)) * 100))
    : 100

  // Get unlocked achievement codes
  const unlockedCodes = new Set(profile.achievements.map(a => a.code))

  // Group achievements by category
  const achievementsByCategory = ACHIEVEMENT_CATEGORIES.map(category => ({
    ...category,
    achievements: ACHIEVEMENTS
      .filter(a => a.category === category.code && !a.hidden)
      .map(a => ({
        ...a,
        unlocked: unlockedCodes.has(a.code)
      }))
  })).filter(cat => cat.achievements.length > 0)

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-10">
      {/* Breadcrumb Navigation */}
      <ProfileBreadcrumb playerName={profile.firstName} />
      
      {/* Back Button */}
      <BackButton />
      
      {/* Header - Improved mobile spacing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl border border-border p-4 sm:rounded-3xl sm:p-8"
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar - Bot themed */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-4xl shadow-lg shadow-primary/20 sm:h-24 sm:w-24 sm:text-5xl">
            {title.emoji}
            {profile.rankInTop && profile.rankInTop <= 3 && (
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold">
                {profile.rankInTop}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{profile.firstName}</h1>
            {profile.username && (
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
              <div className="rounded-full bg-gradient-to-r from-primary/20 to-accent/20 px-3 py-1.5 text-xs font-semibold text-primary sm:px-4 sm:text-sm">
                {title.emoji} {title.name}
              </div>
              {profile.rankInTop && (
                <div className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:px-4 sm:text-sm">
                  #{profile.rankInTop} в топе
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress to next title */}
        {nextTitle && (
          <div className="mt-5 sm:mt-6">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">До {nextTitle.emoji} {nextTitle.name}</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(profile.totalEarned)} / {formatCurrency(nextTitle.minEarned)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary/50 to-primary"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Grid - Improved mobile layout */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-4">
        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-lg border border-border p-2 sm:rounded-xl sm:p-4"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="text-lg sm:text-2xl">💰</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-primary sm:text-xl truncate">{formatCurrency(profile.balance)}</div>
              <div className="text-[9px] text-muted-foreground sm:text-xs">Баланс</div>
            </div>
          </div>
        </motion.div>

        {/* Total Earned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-xl border border-border p-2.5 sm:p-4"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="text-lg sm:text-2xl">📈</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground sm:text-xl truncate">{formatCurrency(profile.totalEarned)}</div>
              <div className="text-[9px] text-muted-foreground sm:text-xs">Заработано</div>
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl border border-border p-2.5 sm:p-4"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="text-lg sm:text-2xl">🏆</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground sm:text-xl">
                {profile.achievementsUnlocked} / 30
              </div>
              <div className="text-[9px] text-muted-foreground sm:text-xs">Достижения</div>
            </div>
          </div>
        </motion.div>

        {/* Duels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-xl border border-border p-2.5 sm:p-4"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="text-lg sm:text-2xl">⚔️</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground sm:text-xl">
                {profile.duelsWon} / {profile.duelsLost}
              </div>
              <div className="text-[9px] text-muted-foreground sm:text-xs">
                Дуэли • {winRate}%
              </div>
            </div>
          </div>
        </motion.div>

        {/* Farm Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl border border-border p-2.5 sm:p-4"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="text-lg sm:text-2xl">🌾</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground sm:text-xl">
                {profile.farmStreak} / {profile.maxFarmStreak}
              </div>
              <div className="text-[9px] text-muted-foreground sm:text-xs truncate">
                Ферма • {profile.farmSuccessCount}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Treasures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-xl border border-border p-2.5 sm:p-4"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="text-lg sm:text-2xl">📦</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground sm:text-xl">{profile.treasuresFound}</div>
              <div className="text-[9px] text-muted-foreground sm:text-xs">Клады</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Additional Info - Improved mobile layout */}
      <div className="mt-3 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-4">
        {/* Marriage */}
        {profile.marriage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-lg border border-border p-3 sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">💍</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground sm:text-sm">В браке с</div>
                <PlayerLink
                  userId={profile.marriage.partnerId}
                  name={profile.marriage.partnerName}
                  className="text-base font-semibold text-foreground sm:text-lg"
                />
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {formatDays(profile.marriage.days)}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pidor */}
        {profile.pidorCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="glass rounded-xl border border-border p-4 sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">🏳️</div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground sm:text-sm">Пидор дня</div>
                <div className="text-base font-semibold text-foreground sm:text-lg">{profile.pidorCount} раз</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Casino */}
        {profile.casinoGamesCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-xl border border-border p-4 sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">🎰</div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground sm:text-sm">Игр в казино</div>
                <div className="text-base font-semibold text-foreground sm:text-lg">{profile.casinoGamesCount}</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Achievements Section - NEW! */}
      {profile.achievementsUnlocked > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mt-3 sm:mt-6"
        >
          <div className="glass rounded-xl border border-border p-3 sm:rounded-3xl sm:p-8">
            <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-lg sm:h-12 sm:w-12 sm:text-2xl">
                🏆
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground sm:text-xl">Достижения</h2>
                <p className="text-[10px] text-muted-foreground sm:text-sm">
                  {profile.achievementsUnlocked} из 30 открыто
                </p>
              </div>
            </div>

            {/* Achievement categories */}
            <div className="space-y-3 sm:space-y-6">
              {achievementsByCategory.map((category, catIndex) => {
                const unlockedInCategory = category.achievements.filter(a => a.unlocked).length
                if (unlockedInCategory === 0) return null

                return (
                  <div key={category.code}>
                    <div className="mb-2 flex items-center gap-1.5 sm:mb-3 sm:gap-2">
                      <span className="text-sm sm:text-lg">{category.emoji}</span>
                      <h3 className="text-xs font-semibold text-foreground sm:text-base">
                        {category.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground sm:text-xs">
                        {unlockedInCategory}/{category.achievements.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                      {category.achievements
                        .filter(a => a.unlocked)
                        .map((achievement, achIndex) => (
                          <AchievementBadge
                            key={achievement.code}
                            emoji={achievement.emoji}
                            name={achievement.name}
                            description={achievement.description}
                            unlocked={achievement.unlocked}
                            reward={achievement.reward}
                            index={catIndex * 10 + achIndex}
                          />
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Show locked achievements hint */}
            {profile.achievementsUnlocked < 30 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-3 rounded-xl border border-border/50 bg-white/[0.02] p-3 text-center sm:mt-6 sm:p-4"
              >
                <p className="text-[10px] text-muted-foreground sm:text-sm">
                  🎯 Ещё {30 - profile.achievementsUnlocked} {formatAchievements(30 - profile.achievementsUnlocked, false)} ждут тебя в боте!
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Member since */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-4 text-center text-xs text-muted-foreground sm:mt-6 sm:text-sm"
      >
        Участник с {new Date(profile.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
      </motion.div>

      {/* Player Navigation (Prev/Next) */}
      <PlayerNavigation 
        currentUserId={profile.userId} 
        currentRank={profile.rankInTop} 
      />
      
      {/* Share Button */}
      <ShareButton 
        userId={profile.userId} 
        playerName={profile.firstName} 
      />
      
      {/* Quick Links */}
      <QuickLinks />
      
      {/* Telegram Button - Bot integration CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-4 sm:mt-6"
      >
        <div className="glass rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5 text-center sm:rounded-3xl sm:p-8">
          <div className="mb-3 text-3xl sm:mb-4 sm:text-4xl">🤖</div>
          <h3 className="mb-2 text-base font-bold text-foreground sm:text-lg">
            Играй в ВОЗНЮ
          </h3>
          <p className="mb-4 text-xs text-muted-foreground sm:mb-5 sm:text-sm">
            Зарабатывай ешки, открывай достижения и поднимайся в рейтинге
          </p>
          <TelegramButton variant="secondary" />
        </div>
      </motion.div>
    </div>
  )
}
