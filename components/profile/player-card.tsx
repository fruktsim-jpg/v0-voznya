'use client'

import { motion } from 'framer-motion'
import { titleForEarned, ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/lib/voznya-bot'
import { MMR_RANKS } from '@/lib/mmr'

import { formatCurrency, formatDays, formatAchievements, formatMessages } from '@/lib/pluralize'

import Link from 'next/link'
import { PlayerLink } from '@/components/ui/player-link'
import { TelegramButton } from '@/components/voznya/telegram-button'
import { ProfileBreadcrumb } from '@/components/profile/profile-breadcrumb'
import { PlayerNavigation } from '@/components/profile/player-navigation'

import { ShareButton } from '@/components/profile/share-button'
import { QuickLinks } from '@/components/profile/quick-links'
import { AchievementBadge, type AchievementRarity } from '@/components/profile/achievement-badge'
import { InventoryShowcase } from '@/components/profile/inventory-showcase'
import { ActivityCard } from '@/components/v2/activity-card'
import { CollectibleTile } from '@/components/v2/collectible'
import type { Rarity } from '@/lib/rarity'
import type { PlayerProfile } from '@/lib/queries'
import type { CommunityEvent } from '@/lib/events'

/** Псевдо-редкость достижения по награде (для витрины «Чем крут»). */
function achievementShowcaseRarity(reward: number): Rarity {
  if (reward >= 5000) return 'legendary'
  if (reward >= 2000) return 'epic'
  if (reward >= 500) return 'rare'
  if (reward >= 100) return 'uncommon'
  return 'common'
}

const RARITY_PRESTIGE: Record<string, number> = {
  mythic: 6,
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
}

/**
 * Элитный статус по месту в общем топе (по ешкам, profile.rankInTop).
 * Сдержанно, без Vegas: золото/серебро/бронза для #1–#3, мягкий акцент для топ-10.
 * `null` — обычный игрок (никакого спец-оформления).
 */
type EliteTier = {
  key: 'gold' | 'silver' | 'bronze' | 'top10'
  label: string
  medal: string
  /** Класс рамки карточки личности. */
  ring: string
  /** Цвет свечения (inline, мягкое). */
  glow: string
  /** Градиент аватара. */
  avatar: string
  /** Цвет текста-акцента ленты. */
  accent: string
}

function eliteTierFor(rank: number | null): EliteTier | null {
  if (!rank || rank > 10) return null
  if (rank === 1)
    return {
      key: 'gold',
      label: 'Легенда сообщества',
      medal: '👑',
      ring: 'border-amber-300/60',
      glow: '0 0 60px -12px rgba(251,191,36,0.45)',
      avatar: 'from-amber-300/30 to-amber-500/20',
      accent: 'text-amber-200',
    }
  if (rank === 2)
    return {
      key: 'silver',
      label: 'Серебро Возни',
      medal: '🥈',
      ring: 'border-slate-200/50',
      glow: '0 0 50px -14px rgba(226,232,240,0.35)',
      avatar: 'from-slate-200/25 to-slate-400/15',
      accent: 'text-slate-100',
    }
  if (rank === 3)
    return {
      key: 'bronze',
      label: 'Бронза Возни',
      medal: '🥉',
      ring: 'border-orange-400/50',
      glow: '0 0 50px -14px rgba(251,146,60,0.32)',
      avatar: 'from-orange-400/25 to-amber-700/15',
      accent: 'text-orange-200',
    }
  return {
    key: 'top10',
    label: 'Топ-10 сообщества',
    medal: '⭐',
    ring: 'border-primary/45',
    glow: '0 0 44px -16px rgba(139,92,246,0.3)',
    avatar: 'from-primary/25 to-accent/20',
    accent: 'text-primary',
  }
}



interface PlayerCardProps {
  profile: PlayerProfile
  isOwner?: boolean
  isAdmin?: boolean
  /** Личная лента событий игрока (Timeline). Опционально — без неё блок скрыт. */
  activity?: CommunityEvent[]
}



const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length

function rarityFor(category: string): AchievementRarity {
  if (category === 'legend') return 'legend'
  if (category === 'secret') return 'secret'
  return 'normal'
}

export function PlayerCard({
  profile,
  isOwner = false,
  isAdmin = false,
  activity = [],
}: PlayerCardProps) {


  const title = titleForEarned(profile.totalEarned)
  const duelsTotal = profile.duelsWon + profile.duelsLost
  const winRate = duelsTotal > 0 ? Math.round((profile.duelsWon / duelsTotal) * 100) : 0

  // Элитный статус по месту в общем топе (#1–#3 медали, топ-10 — мягкий акцент).
  const elite = eliteTierFor(profile.rankInTop)


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

  // ----------------------------------------------------------------------
  // SHOWCASE («Чем крут») — компактная витрина: только ЛУЧШЕЕ. Максимум 3
  // плитки. Идея перенесена из ProfileV2, но НЕ дублирует статус-блоки выше
  // (MMR/титул/место/репутация/брак остаются главными). Берём: редчайшее
  // достижение (по награде) + самый редкий предмет инвентаря + уникальный титул.
  // Скрывается целиком, если хвастаться нечем.
  // ----------------------------------------------------------------------
  const showcase: { icon: string; title: string; subtitle: string; rarity: Rarity }[] = []

  const topAchievement = [...profile.achievements].sort((a, b) => b.reward - a.reward)[0]
  if (topAchievement) {
    showcase.push({
      icon: topAchievement.emoji,
      title: topAchievement.name,
      subtitle: 'Достижение',
      rarity: achievementShowcaseRarity(topAchievement.reward),
    })
  }

  const rarestItem = (profile.inventory?.list ?? [])
    .filter((i) => (RARITY_PRESTIGE[i.rarity] ?? 1) >= 3) // rare и выше
    .sort((a, b) => (RARITY_PRESTIGE[b.rarity] ?? 1) - (RARITY_PRESTIGE[a.rarity] ?? 1))[0]
  if (rarestItem) {
    showcase.push({
      icon: '🎖️',
      title: rarestItem.name,
      subtitle: 'Коллекция',
      rarity: (rarestItem.rarity as Rarity) ?? 'rare',
    })
  }

  if (profile.cosmetics.title) {
    showcase.push({
      icon: profile.cosmetics.title.emoji ?? '🏷️',
      title: profile.cosmetics.title.name,
      subtitle: 'Уникальный титул',
      rarity: 'legendary',
    })
  }

  const showcaseItems = showcase.slice(0, 3)

  return (

    <div className="mx-auto max-w-4xl px-4 pt-header pb-10 sm:px-6">
      <ProfileBreadcrumb playerName={profile.firstName} />


      {/* ============================================================== */}
      {/* УРОВЕНЬ 1 — Личность: ник, титул, MMR-ранг, место              */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass relative overflow-hidden rounded-2xl border p-5 sm:rounded-3xl sm:p-8 ${
          elite ? elite.ring : 'border-border'
        }`}
        style={elite ? { boxShadow: elite.glow } : undefined}
      >
        {/* Ambient glow tied to MMR rank */}
        {profile.mmrRank && (
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        )}

        {/* Лента элитного статуса (#1–#3 / топ-10) — сразу даёт «это легенда». */}
        {elite && (
          <div className="mb-4 flex items-center justify-center gap-2 sm:justify-start">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${elite.ring} ${elite.accent}`}
            >
              <span className="text-sm">{elite.medal}</span>
              {elite.label}
              <span className="opacity-70">· #{profile.rankInTop}</span>
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar — title emoji; элитная рамка/медаль для топ-игроков */}
          <div
            className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl shadow-lg shadow-primary/20 sm:h-24 sm:w-24 sm:text-5xl ${
              elite ? elite.avatar : 'from-primary/20 to-accent/20'
            } ${elite ? 'ring-2 ring-inset ' + elite.ring : ''}`}
          >
            {title.emoji}
            {profile.rankInTop && profile.rankInTop <= 10 && (
              <div
                className={`absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow-md ${
                  elite ? elite.accent : 'text-primary-foreground'
                } bg-background/90 border ${elite ? elite.ring : 'border-primary'}`}
              >
                {profile.rankInTop === 1 ? '👑' : profile.rankInTop}
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
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                >
                  🛡 Админка
                </Link>
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
      {/* ВИТРИНА «Чем крут» — только лучшее (≤3). Перенос идеи Showcase  */}
      {/* из ProfileV2. Ниже статус-блоков, чтобы НЕ ослаблять MMR/титул/ */}
      {/* место/репутацию/брак. Скрыта, если хвастаться нечем.            */}
      {/* ============================================================== */}
      {showcaseItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mt-3 sm:mt-6"
        >
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground sm:text-base">
            <span className="text-lg sm:text-xl">✨</span> Чем крут
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {showcaseItems.map((s, i) => (
              <CollectibleTile
                key={`${s.title}-${i}`}
                icon={s.icon}
                title={s.title}
                subtitle={s.subtitle}
                rarity={s.rarity}
                size="sm"
              />
            ))}
          </div>
        </motion.div>
      )}

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
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* Инвентарь — read-only витрина предметов (если есть)            */}
      {/* ============================================================== */}
      {profile.inventory && profile.inventory.list.length > 0 && (
        <div id="inventory" className="scroll-mt-24">
          <InventoryShowcase
            items={profile.inventory.list}
            totalItems={profile.inventory.items}
            uniqueItems={profile.inventory.uniqueItems}
            delay={0.2}
          />
        </div>
      )}


      {/* Брак — часть личности игрока (одна из уникальных систем Возни). */}
      {profile.marriage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 sm:mt-6"
        >
          <div className="glass relative overflow-hidden rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-400/[0.08] to-transparent p-4 sm:rounded-3xl sm:p-6">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-rose-400/15 blur-3xl" />
            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/15 text-2xl shadow-lg shadow-rose-500/10 sm:h-14 sm:w-14 sm:text-3xl">
                💍
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-300/80">
                  <span>❤️</span> Связан узами с
                </div>
                <PlayerLink
                  userId={profile.marriage.partnerId}
                  name={profile.marriage.partnerName}
                  className="block truncate text-lg font-bold text-rose-100 sm:text-xl"
                />
                <div className="text-xs text-muted-foreground">
                  Вместе уже {formatDays(profile.marriage.days)}
                </div>
              </div>
              <Link
                href="/live#families"
                className="shrink-0 text-xs font-medium text-rose-200 transition hover:text-rose-100 hover:underline"
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
          id="achievements"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-4 scroll-mt-24 sm:mt-6"
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

      {/* ============================================================== */}
      {/* История — личная лента событий игрока (Timeline из ProfileV2). */}
      {/* ============================================================== */}
      {activity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mt-4 sm:mt-6"
        >
          <div className="glass rounded-2xl border border-border p-5 sm:rounded-3xl sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-xl sm:h-12 sm:w-12 sm:text-2xl">
                📜
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground sm:text-xl">История</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">Путь игрока в Возне</p>
              </div>
            </div>
            <ul className="space-y-2">
              {activity.slice(0, 15).map((e) => (
                <li key={e.id}>
                  <ActivityCard event={e} />
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

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
