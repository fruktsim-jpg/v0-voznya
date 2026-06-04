'use client'

import { motion } from 'framer-motion'
import { titleForEarned } from '@/lib/voznya-bot'
import { formatCurrency, formatDays, formatWins, formatTreasures, formatDuels, formatFarms, formatAchievements } from '@/lib/pluralize'
import { PlayerLink } from '@/components/ui/player-link'
import { TelegramButton } from '@/components/voznya/telegram-button'
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

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl border border-border p-8"
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Avatar placeholder */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-5xl">
            {title.emoji}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-foreground">{profile.firstName}</h1>
            {profile.username && (
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <div className="rounded-full bg-primary/20 px-4 py-1.5 text-sm font-semibold text-primary">
                {title.emoji} {title.name}
              </div>
              {profile.rankInTop && (
                <div className="rounded-full bg-white/5 px-4 py-1.5 text-sm font-semibold text-muted-foreground">
                  #{profile.rankInTop} в топе
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress to next title */}
        {nextTitle && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
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

      {/* Stats Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl border border-border p-6"
        >
          <div className="text-2xl">💰</div>
          <div className="mt-2 text-2xl font-bold text-primary">{formatCurrency(profile.balance)}</div>
          <div className="mt-1 text-sm text-muted-foreground">Баланс</div>
        </motion.div>

        {/* Total Earned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl border border-border p-6"
        >
          <div className="text-2xl">📈</div>
          <div className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(profile.totalEarned)}</div>
          <div className="mt-1 text-sm text-muted-foreground">Всего заработано</div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl border border-border p-6"
        >
          <div className="text-2xl">🏆</div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {profile.achievementsUnlocked} / 30
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{formatAchievements(profile.achievementsUnlocked, false)}</div>
        </motion.div>

        {/* Duels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl border border-border p-6"
        >
          <div className="text-2xl">⚔️</div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {profile.duelsWon} / {profile.duelsLost}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Дуэли • {winRate}% побед
          </div>
        </motion.div>

        {/* Farm Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl border border-border p-6"
        >
          <div className="text-2xl">🌾</div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {profile.farmStreak} / {profile.maxFarmStreak}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Серия фермы • {formatFarms(profile.farmSuccessCount)}
          </div>
        </motion.div>

        {/* Treasures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-2xl border border-border p-6"
        >
          <div className="text-2xl">📦</div>
          <div className="mt-2 text-2xl font-bold text-foreground">{profile.treasuresFound}</div>
          <div className="mt-1 text-sm text-muted-foreground">{formatTreasures(profile.treasuresFound, false)}</div>
        </motion.div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Marriage */}
        {profile.marriage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl border border-border p-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">💍</div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">В браке с</div>
                <PlayerLink
                  userId={profile.marriage.partnerId}
                  name={profile.marriage.partnerName}
                  className="text-lg font-semibold text-foreground"
                />
                <div className="mt-1 text-sm text-muted-foreground">
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
            transition={{ delay: 0.45 }}
            className="glass rounded-2xl border border-border p-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏳️</div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Пидор дня</div>
                <div className="text-lg font-semibold text-foreground">{profile.pidorCount} раз</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Casino */}
        {profile.casinoGamesCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl border border-border p-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎰</div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Игр в казино</div>
                <div className="text-lg font-semibold text-foreground">{profile.casinoGamesCount}</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Member since */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 text-center text-sm text-muted-foreground"
      >
        Участник с {new Date(profile.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
      </motion.div>

      {/* Telegram Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-6 flex justify-center"
      >
        <TelegramButton variant="secondary" />
      </motion.div>
    </div>
  )
}
