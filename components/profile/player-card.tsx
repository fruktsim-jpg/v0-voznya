'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { titleForEarned, ACHIEVEMENTS, TITLES } from '@/lib/voznya-bot'
import { MMR_RANKS } from '@/lib/mmr'

import { formatCurrency, formatDays } from '@/lib/pluralize'

import Link from 'next/link'
import { PlayerLink } from '@/components/ui/player-link'
import { TelegramButton } from '@/components/voznya/telegram-button'
import { ProfileBreadcrumb } from '@/components/profile/profile-breadcrumb'
import { PlayerNavigation } from '@/components/profile/player-navigation'

import { ShareButton } from '@/components/profile/share-button'
import { QuickLinks } from '@/components/profile/quick-links'
import { RankBadge, TitleBadge } from '@/components/prestige'
import { Glyph, type GlyphName } from '@/components/ds/icon'
import { prestigeForMmrRank } from '@/lib/ds/prestige'
import { rarityStyle } from '@/lib/inventory'
import { rarityToken } from '@/lib/rarity'
import { asRarity } from '@/lib/inventory-meta'
import { ItemArt } from '@/components/ds/item-art'
import { Donut, MiniBar } from '@/components/ds/donut'
import type { ItemClass } from '@/lib/item-art/model'
import { ActivityCard } from '@/components/v2/activity-card'
import { archetype, playStyle } from '@/lib/profile-narrative'
import type { PlayerProfile } from '@/lib/queries'
import type { CommunityEvent } from '@/lib/events'

/**
 * Элитный статус по месту в общем топе (по ешкам, profile.rankInTop).
 * Сдержанно, без Vegas: золото/серебро/бронза для #1–#3, мягкий акцент для топ-10.
 * `null` — обычный игрок (никакого спец-оформления).
 */
type EliteTier = {
  key: 'gold' | 'silver' | 'bronze' | 'top10'
  label: string
  medal: GlyphName
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
      medal: 'crown',
      ring: 'border-amber-300/60',
      glow: '0 0 60px -12px rgba(251,191,36,0.45)',
      avatar: 'from-amber-300/30 to-amber-500/20',
      accent: 'text-amber-200',
    }
  if (rank === 2)
    return {
      key: 'silver',
      label: 'Серебро Возни',
      medal: 'medal',
      ring: 'border-slate-200/50',
      glow: '0 0 50px -14px rgba(226,232,240,0.35)',
      avatar: 'from-slate-200/25 to-slate-400/15',
      accent: 'text-slate-100',
    }
  if (rank === 3)
    return {
      key: 'bronze',
      label: 'Бронза Возни',
      medal: 'medal',
      ring: 'border-orange-400/50',
      glow: '0 0 50px -14px rgba(251,146,60,0.32)',
      avatar: 'from-orange-400/25 to-amber-700/15',
      accent: 'text-orange-200',
    }
  return {
    key: 'top10',
    label: 'Топ-10 сообщества',
    medal: 'star',
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
  /**
   * E0.2 — «Витрина престижа» (PrestigeBanner). Это server-компонент, поэтому он
   * прокидывается СЛОТОМ, а не импортируется здесь: так профиль открывается
   * единой связкой «личность → где я стою» (standings — ЕДИНСТВЕННЫЙ владелец
   * #места), без второго конкурирующего hero сверху страницы.
   */
  prestigeSlot?: ReactNode
  /** E0.2 — сезонный бейдж (server). Живёт рядом с прогрессией, а не отдельной
   *  верхней полосой, чтобы не быть четвёртым повтором ранга над hero. */
  seasonSlot?: ReactNode
}



const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length

export function PlayerCard({
  profile,
  isOwner = false,
  isAdmin = false,
  activity = [],
  prestigeSlot = null,
  seasonSlot = null,
}: PlayerCardProps) {


  const title = titleForEarned(profile.totalEarned)
  const duelsTotal = profile.duelsWon + profile.duelsLost
  const winRate = duelsTotal > 0 ? Math.round((profile.duelsWon / duelsTotal) * 100) : 0

  // Narrative layer (derived from existing fields): archetype line + play-style
  // verdict. Turns the profile into a character, not a metric dump.
  const arch = archetype(profile)
  const style = playStyle(profile)

  // Экономический портрет: доля заработанного, ушедшая в траты.
  const burnPct =
    profile.totalEarned > 0
      ? Math.min(100, Math.round((profile.totalSpent / profile.totalEarned) * 100))
      : null

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

  // A4 prestige: the MMR rank's TIER WORLD drives the hero block's color/glow,
  // so Архидрун's block feels nothing like Залётный's. Null-safe (stone fallback).
  const mmrTier = profile.mmrRank ? prestigeForMmrRank(profile.mmrRank.name) : null

  // ----------------------------------------------------------------------
  // D5 Achievements (COMPACT, motivating — not a wall). Profile shows only the
  // most recent unlocks + the rarest (highest-reward) ones, then links into the
  // bot for the full set. The full categorized list is intentionally NOT here.
  // ----------------------------------------------------------------------
  const recentAchievements = [...profile.achievements]
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
    .slice(0, 3)
  const rareAchievements = [...profile.achievements]
    .sort((a, b) => b.reward - a.reward)
    .slice(0, 3)
  const achPercent =
    TOTAL_ACHIEVEMENTS > 0
      ? Math.round((profile.achievementsUnlocked / TOTAL_ACHIEVEMENTS) * 100)
      : 0

  // ----------------------------------------------------------------------
  // D6 Collection (COMPACT highlights — points toward Inventory, never replaces
  // it). Just the rarest few owned items + totals + a link to /inventory.
  // ----------------------------------------------------------------------
  const collectionHighlights = [...(profile.inventory?.list ?? [])]
    .sort((a, b) => {
      const ra = rarityStyle(a.rarity).order
      const rb = rarityStyle(b.rarity).order
      if (ra !== rb) return rb - ra
      if (a.equipped !== b.equipped) return a.equipped ? -1 : 1
      return a.name.localeCompare(b.name, 'ru')
    })
    .slice(0, 4)

  return (

    <div className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
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
              <span className="text-sm"><Glyph name={elite.medal} /></span>
              {elite.label}
              <span className="opacity-70">· #{profile.rankInTop}</span>
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar — реальное Telegram-фото, если есть (photoUrl); иначе
              эмодзи титула. Элитная рамка/медаль топ-игроков сохраняется
              поверх в любом случае. A4: тир-мир по MMR добавляет ауру/свечение —
              высокий ранг сияет ещё до чтения подписи. */}
          <div className="relative shrink-0">
            {mmrTier && mmrTier.index >= 2 && (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -inset-2 rounded-3xl blur-lg ${mmrTier.animated ? 'ds-prestige-aura' : ''}`}
                style={{ background: mmrTier.aura }}
              />
            )}
            <div
              className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br text-4xl shadow-lg shadow-primary/20 sm:h-24 sm:w-24 sm:text-5xl ${
                elite ? elite.avatar : 'from-primary/20 to-accent/20'
              } ${elite ? 'ring-2 ring-inset ' + elite.ring : ''}`}
              style={
                !elite && mmrTier
                  ? { boxShadow: mmrTier.index >= 3 ? mmrTier.glow || undefined : undefined }
                  : undefined
              }
            >
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                title.emoji
              )}
              {profile.rankInTop && profile.rankInTop <= 10 && (
                <div
                  className={`absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow-md ${
                    elite ? elite.accent : 'text-primary-foreground'
                  } bg-background/90 border ${elite ? elite.ring : 'border-primary'}`}
                >
                  {profile.rankInTop === 1 ? <Glyph name="crown" className="text-accent-gold" /> : profile.rankInTop}
                </div>
              )}
            </div>
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="type-display text-2xl text-foreground sm:text-3xl">{profile.firstName}</h1>

              {isOwner && (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  Это ты
                </span>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                >
                  <Glyph name="shield" className="h-3.5 w-3.5" /> Админка
                </Link>
              )}
            </div>


            {profile.username && (
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            )}

            {/* Дата вступления — тихая строка в hero (E0.2), а не отдельный
                осиротевший блок посреди страницы. */}
            <p className="mt-1 text-[11px] text-muted-foreground/80 sm:text-xs">
              {profile.joinedAt ? 'В чате с ' : 'Участник с '}
              {new Date(profile.joinedAt ?? profile.createdAt).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-2.5">
              {/* Архетип — главный ответ «чем отличается этот игрок». Производное
                  от уже загруженных полей (богатство/дуэли/казино/голос/ранги). */}
              <span className="inline-flex flex-col rounded-xl border border-primary/30 bg-primary/[0.07] px-3 py-1.5 text-left">
                <span className="text-sm font-bold text-foreground">{arch.label}</span>
                <span className="text-[11px] text-muted-foreground">{arch.sub}</span>
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-2.5">
              <Link href="/live#titles" className="transition-transform hover:-translate-y-0.5">
                <TitleBadge
                  emoji={title.emoji}
                  name={title.name}
                  index={Math.max(0, TITLES.findIndex((x) => x.name === title.name))}
                  total={TITLES.length}
                  size="lg"
                />
              </Link>
              {/* Ранг MMR (путь по миру) — тир-мир по рангу. Само ЧИСЛО места
                  (#по MMR) здесь НЕ печатаем: единственный владелец #места —
                  блок Standings в витрине престижа (E0.2, dedup 4→1). */}
              {profile.mmrRank && (
                <RankBadge emoji={profile.mmrRank.emoji} name={profile.mmrRank.name} size="lg" />
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* ВИТРИНА ПРЕСТИЖА (E0.2) — ЕДИНСТВЕННЫЙ hero «где я стою».        */}
      {/* Standings внутри — единственный владелец #места. Раньше это был  */}
      {/* отдельный блок на странице ВЫШЕ личности (второй конкурирующий    */}
      {/* hero); теперь идёт сразу после личности, единой связкой.          */}
      {/* ============================================================== */}
      {prestigeSlot && <div className="mt-3 sm:mt-6">{prestigeSlot}</div>}

      {/* ============================================================== */}
      {/* ПРОГРЕССИЯ — «куда я расту»: MMR + путь до следующего ранга.     */}
      {/* E0.2: место (#) и второй MMR-бейдж убраны — их владелец Standings.*/}
      {/* Рядом живёт сезонный бейдж (а не отдельной верхней полосой).      */}
      {/* ============================================================== */}
      {(profile.mmr !== null || seasonSlot) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-3 grid gap-3 sm:mt-6 sm:gap-4"
        >
          {profile.mmr !== null && (
          <div
            className="glass relative overflow-hidden rounded-2xl border p-5 sm:rounded-3xl sm:p-7"
            style={{
              borderColor: mmrTier ? `${mmrTier.color}55` : undefined,
              background: mmrTier
                ? `linear-gradient(135deg, ${mmrTier.color}14, transparent 70%)`
                : undefined,
              boxShadow: mmrTier && mmrTier.index >= 3 ? mmrTier.glow || undefined : undefined,
            }}
          >
            {/* Tier-world aura wash for high tiers (diamond+). */}
            {mmrTier && mmrTier.index >= 4 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
                style={{ background: mmrTier.aura }}
              />
            )}
            <div className="min-w-0">
              <div className="label-eyebrow flex items-center gap-2">
                <Glyph name="trophy" className="text-accent-gold" /> Влияние · MMR
              </div>
              <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span
                  className="type-stat text-3xl leading-none sm:text-5xl"
                  style={{ color: mmrTier ? mmrTier.color : undefined }}
                >
                  {profile.mmr.toLocaleString('ru-RU')}
                </span>
              </div>
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
                    className="h-full rounded-full"
                    style={{
                      background: mmrTier
                        ? `linear-gradient(90deg, ${mmrTier.color}99, ${mmrTier.color})`
                        : 'linear-gradient(90deg, hsl(var(--primary)/0.6), hsl(var(--primary)))',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-2.5 text-center text-xs font-medium text-primary sm:text-sm">
                <Glyph name="flame" className="h-4 w-4" /> Максимальный ранг Возни достигнут
              </div>
            )}
          </div>
          )}

          {/* Сезон — живёт в прогрессии, не отдельной верхней полосой (E0.2). */}
          {seasonSlot}
        </motion.div>
      )}

      {/* ============================================================== */}
      {/* Оси ценности (КОМПАКТНО, E0.2) — уважение / богатство / голос.   */}
      {/* Раньше это были три hero-карты, конкурировавшие с витриной по     */}
      {/* визуальному весу. Теперь — лёгкая контекст-полоса: позиции (#)    */}
      {/* живут в Standings, здесь только абсолютные значения «что есть».   */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-3 grid grid-cols-3 gap-2.5 sm:mt-5 sm:gap-3"
      >
        {/* Богатство — на чужом профиле это богатство ВЛАДЕЛЬЦА (в шелле —
            баланс ЗРИТЕЛЯ), поэтому это не дубль хрома, а часть личности. */}
        <ValueAxis
          glyph="coin"
          tone="text-amber-200"
          label="Богатство"
          value={formatCurrency(profile.balance)}
          rank={profile.rankInTop}
        />
        {profile.reputation !== null && (
          <ValueAxis
            glyph="heart"
            tone="text-rose-200"
            label="Уважение"
            value={profile.reputation.toLocaleString('ru-RU')}
            rank={profile.ranks.byReputation}
          />
        )}
        {profile.messages > 0 && (
          <ValueAxis
            glyph="message"
            tone="text-sky-200"
            label="Голос"
            value={profile.messages.toLocaleString('ru-RU')}
            rank={profile.ranks.byMessages}
          />
        )}
      </motion.div>

      {/* ============================================================== */}
      {/* ЭКОНОМИКА И ИГРА — экономический портрет + КАК он играет.       */}
      {/* Вывод (playStyle) сверху — интерпретация стиля, а не сырые цифры.*/}
      {/* Использует ранее не отображавшиеся totalSpent и pidorCount.     */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mt-3 sm:mt-6"
      >
        <div className="glass rounded-2xl border border-border p-4 sm:rounded-3xl sm:p-6">
          <h2 className="section-title mb-3 flex items-center gap-2 text-base text-foreground sm:text-lg">
            <Glyph name="swords" className="text-primary" /> Экономика и игра
          </h2>

          {/* Вывод о стиле игры — короткая интерпретация, не таблица. */}
          {style.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {style.map((line) => (
                <p
                  key={line}
                  className="flex items-start gap-2 rounded-xl border border-border bg-white/[0.02] px-3 py-2 text-[13px] text-foreground"
                >
                  <Glyph name="spark" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Экономический портрет: заработано vs потрачено как кольцо состава
              (gold=заработок / teal=экономия-остаток), с burn% в центре. */}
          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4">
            <div className="flex items-center justify-center rounded-xl border border-border bg-white/[0.02] p-3">
              <Donut
                size={120}
                stroke={14}
                segments={[
                  { value: profile.totalSpent, color: 'var(--accent-gold)', label: 'Потрачено' },
                  {
                    value: Math.max(0, profile.totalEarned - profile.totalSpent),
                    color: 'var(--accent-teal)',
                    label: 'Остаток',
                  },
                ]}
                center={
                  <>
                    <span className="type-stat text-xl leading-none text-foreground">
                      {burnPct != null ? `${burnPct}%` : '—'}
                    </span>
                    <span className="label-eyebrow mt-1 text-[9px]">оборота</span>
                  </>
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-1 sm:gap-3">
              <StatTile
                glyph="chart"
                value={formatCurrency(profile.totalEarned)}
                label="Заработано всего"
              />
              <StatTile
                glyph="wallet"
                value={formatCurrency(profile.totalSpent)}
                label={burnPct != null ? `Потрачено · ${burnPct}% оборота` : 'Потрачено всего'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {/* Дуэли — победы/поражения + winrate (с мини-баром доли побед) */}
            <div className="glass rounded-xl border border-border p-2.5 sm:p-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-9 sm:w-9">
                  <Glyph name="swords" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground sm:text-lg">
                    {profile.duelsWon} / {profile.duelsLost}
                  </div>
                  <div className="truncate text-[9px] text-muted-foreground sm:text-xs">
                    Дуэли · {winRate}%
                  </div>
                </div>
              </div>
              {duelsTotal > 0 && (
                <MiniBar
                  value={winRate / 100}
                  color="var(--accent-teal)"
                  height={6}
                  className="mt-2"
                />
              )}
            </div>
            {/* Ферма — текущий/макс стрик */}
            <StatTile
              glyph="sprout"
              value={`${profile.farmStreak} / ${profile.maxFarmStreak}`}
              label={`Ферма · ${profile.farmSuccessCount}`}
            />
            {/* Клады */}
            <StatTile
              glyph="vault"
              value={profile.treasuresFound.toLocaleString('ru-RU')}
              label="Клады"
            />
            {/* Казино */}
            {profile.casinoGamesCount > 0 && (
              <StatTile
                glyph="dice"
                value={profile.casinoGamesCount.toLocaleString('ru-RU')}
                label="Казино"
              />
            )}
            {/* Пидор дня — фановый identity-маркер (pidorCount раньше не показывался). */}
            {profile.pidorCount > 0 && (
              <StatTile
                glyph="flame"
                value={`×${profile.pidorCount.toLocaleString('ru-RU')}`}
                label="Пидор дня"
              />
            )}
          </div>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* D6 — Коллекция (КОМПАКТНО). Только самое редкое + счётчики и     */}
      {/* ссылка в Инвентарь. Профиль ведёт в Инвентарь, не заменяет его. */}
      {/* ============================================================== */}
      {profile.inventory && profile.inventory.list.length > 0 && (
        <motion.div
          id="inventory"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 scroll-mt-24 sm:mt-6"
        >
          <div className="glass rounded-2xl border border-border p-4 sm:rounded-3xl sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="section-title flex items-center gap-2 text-base text-foreground sm:text-lg">
                <Glyph name="inventory" className="text-primary" /> Коллекция
              </h2>
              <span className="text-[11px] text-muted-foreground sm:text-xs">
                {profile.inventory.uniqueItems.toLocaleString('ru-RU')} видов ·{' '}
                {profile.inventory.items.toLocaleString('ru-RU')} шт.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {collectionHighlights.map((item) => {
                const tok = rarityToken(asRarity(item.rarity))
                return (
                  <div
                    key={item.itemCode}
                    className="relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center"
                    style={{
                      borderColor: item.rarity !== 'common' ? `${tok.color}55` : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Funnelled through ItemArt (P0): real/templated art when
                        available, class glyph fallback today. Replaces the
                        legacy typeEmoji + rarityStyle path. */}
                    <ItemArt
                      code={item.itemCode}
                      itemClass={item.type as ItemClass}
                      rarity={asRarity(item.rarity)}
                      size="sm"
                      className="!h-11 !w-11 !rounded-lg !text-2xl"
                    />
                    <span className="line-clamp-1 w-full text-xs font-semibold text-foreground">
                      {item.name}
                    </span>
                    <span className="label-eyebrow text-[10px]">
                      {tok.label}
                    </span>
                    {item.equipped && (
                      <span className="absolute right-1.5 top-1.5 rounded-full border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        надето
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {isOwner && (
              <Link
                href="/inventory"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white/[0.03] py-2.5 text-xs font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-primary/40 sm:text-sm"
              >
                <Glyph name="inventory" className="h-4 w-4" />
                Весь инвентарь
                <Glyph name="chevronUp" className="h-3.5 w-3.5 rotate-90" />
              </Link>
            )}
          </div>
        </motion.div>
      )}


      {/* ============================================================== */}
      {/* D4 — Социальная личность: брак/семья (уникальная система Возни). */}
      {/* ============================================================== */}
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/15 text-rose-200 shadow-lg shadow-rose-500/10 sm:h-14 sm:w-14">
                <Glyph name="heart" className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-300/80">
                  Связан узами с
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
      {/* D5 — Достижения (КОМПАКТНО, мотивирующе). Прогресс + недавние +  */}
      {/* редкие. Полная стена ушла — за остальным игрок идёт в бота.     */}
      {/* ============================================================== */}
      {profile.achievementsUnlocked > 0 && (
        <motion.div
          id="achievements"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-3 scroll-mt-24 sm:mt-6"
        >
          <div className="glass rounded-2xl border border-border p-4 sm:rounded-3xl sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="section-title flex items-center gap-2 text-base text-foreground sm:text-lg">
                <Glyph name="medal" className="text-accent-gold" /> Достижения
              </h2>
              <span className="text-[11px] text-muted-foreground sm:text-xs">
                {profile.achievementsUnlocked} из {TOTAL_ACHIEVEMENTS} · {achPercent}%
              </span>
            </div>

            <MiniBar value={achPercent / 100} color="var(--accent-gold)" height={6} />

            {recentAchievements.length > 0 && (
              <div className="mt-4">
                <p className="label-eyebrow mb-2">
                  Недавно открыто
                </p>
                <div className="space-y-2">
                  {recentAchievements.map((a) => (
                    <AchievementRow key={a.code} achievement={a} />
                  ))}
                </div>
              </div>
            )}

            {rareAchievements.length > 0 && (
              <div className="mt-4">
                <p className="label-eyebrow mb-2">
                  Самые ценные
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rareAchievements.map((a) => (
                    <span
                      key={a.code}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-medium text-amber-200"
                      title={a.description}
                    >
                      <span aria-hidden="true">{a.emoji}</span>
                      <span className="max-w-[10rem] truncate">{a.name}</span>
                      {a.reward > 0 && <span className="opacity-70">+{a.reward}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.achievementsUnlocked < TOTAL_ACHIEVEMENTS && (
              <p className="mt-4 text-center text-[11px] text-muted-foreground sm:text-xs">
                Ещё {TOTAL_ACHIEVEMENTS - profile.achievementsUnlocked} ждут тебя в боте
              </p>
            )}
          </div>
        </motion.div>
      )}

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
          <div className="glass rounded-2xl border border-border p-4 sm:rounded-3xl sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Glyph name="pulse" className="text-primary" />
              <h2 className="section-title text-base text-foreground sm:text-lg">История</h2>
              <span className="text-[11px] text-muted-foreground sm:text-xs">· путь в Возне</span>
            </div>
            <ul className="space-y-2">
              {activity.slice(0, 5).map((e, i) => (
                <li key={`${e.id}-${i}`}>
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

      {/* CTA — играть в боте. Только на СВОём профиле / гостю: на чужом
          профиле «играй сам» нерелевантен (смотришь чужую личность). */}
      {isOwner && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 sm:mt-6"
      >
        <div className="glass rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5 text-center sm:rounded-3xl sm:p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary sm:mb-4">
            <Glyph name="spark" className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-base font-bold text-foreground sm:text-lg">Играй в ВОЗНЮ</h3>
          <p className="mb-4 text-xs text-muted-foreground sm:mb-5 sm:text-sm">
            Зарабатывай ешки, расти в MMR и открывай достижения
          </p>
          <TelegramButton variant="secondary" />
        </div>
      </motion.div>
      )}
    </div>
  )
}

/** Компактная ось ценности (E0.2) — лёгкая контекст-плитка, без hero-веса.
 *  Теперь несёт #место в соответствующем ладдере (ranks.*), если оно известно —
 *  абсолютное значение + позиция = «насколько он богат/активен/уважаем». */
function ValueAxis({
  glyph,
  tone,
  label,
  value,
  rank,
}: {
  glyph: GlyphName
  tone: string
  label: string
  value: string
  rank?: number | null
}) {
  return (
    <div className="glass rounded-xl border border-border bg-white/[0.02] p-3 text-center sm:p-3.5">
      <span className={`label-eyebrow flex items-center justify-center gap-1.5`}>
        <Glyph name={glyph} className={`h-3.5 w-3.5 ${tone}`} /> {label}
      </span>
      <div className={`mt-1 type-stat text-lg sm:text-2xl ${tone}`}>{value}</div>
      {rank != null && (
        <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">#{rank} в Возне</div>
      )}
    </div>
  )
}

/** Компактная плитка личной статистики (D3) — иконка из owned-системы. */
function StatTile({ glyph, value, label }: { glyph: GlyphName; value: string; label: string }) {  return (
    <div className="glass rounded-xl border border-border p-2.5 sm:p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-9 sm:w-9">
          <Glyph name={glyph} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-foreground sm:text-lg">{value}</div>
          <div className="truncate text-[9px] text-muted-foreground sm:text-xs">{label}</div>
        </div>
      </div>
    </div>
  )
}

/** Компактная строка недавнего достижения (D5). Эмодзи самого ачивмента
 *  сохраняем — это его собственная идентичность, не «хром» интерфейса. */
function AchievementRow({
  achievement,
}: {
  achievement: { emoji: string; name: string; description: string; reward: number }
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] p-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-lg">
        <span aria-hidden="true">{achievement.emoji}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{achievement.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{achievement.description}</p>
      </div>
      {achievement.reward > 0 && (
        <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
          +{achievement.reward}
        </span>
      )}
    </div>
  )
}
