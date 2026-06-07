import Link from 'next/link'
import { Card } from '@/components/v2/card'
import { Section } from '@/components/v2/section'
import { ActivityCard } from '@/components/v2/activity-card'
import { EmptyState } from '@/components/v2/empty-state'
import { AchievementsExperience } from '@/components/v2/achievements-experience'
import { rarityToken, type Rarity } from '@/lib/rarity'
import type { CommunityEvent } from '@/lib/events'

import type { PlayerProfile } from '@/lib/queries'


/**
 * Profile V3 (VOZNYA EXPERIENCE V3 — поверхность №2). Профиль показывает
 * ЛИЧНОСТЬ игрока, а не таблицу: Hero без скролла, Showcase (лучшее), достижения
 * с редкостью, титулы как статус, подарки, статистика и timeline активности.
 * Всё на РЕАЛЬНЫХ данных (PlayerProfile + getUserFeed). Server component,
 * mobile-first. Бережно деградирует для новичков. Новых API/таблиц нет.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

/** Псевдо-редкость достижения по награде (без новых систем): для визуала. */
function achievementRarity(reward: number): Rarity {
  if (reward >= 5000) return 'legendary'
  if (reward >= 2000) return 'epic'
  if (reward >= 500) return 'rare'
  if (reward >= 100) return 'uncommon'
  return 'common'
}

function sinceLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

export function ProfileV2({
  profile,
  activity,
  achievementCounts,
  totalPlayers,
}: {
  profile: PlayerProfile
  activity: CommunityEvent[]
  achievementCounts?: Map<string, number>
  totalPlayers?: number
}) {

  const titleText = profile.cosmetics.title
    ? `${profile.cosmetics.title.emoji ?? ''} ${profile.cosmetics.title.name}`.trim()
    : profile.mmrRank
      ? `${profile.mmrRank.emoji} ${profile.mmrRank.name}`
      : 'Возняка'

  const since = sinceLabel(profile.joinedAt ?? profile.createdAt)
  const initial = profile.firstName.trim().charAt(0).toUpperCase() || '?'

  // Достижения с редкостью, сортированы по престижу.
  const achievements = [...profile.achievements]
    .map((a) => ({ ...a, rarity: achievementRarity(a.reward) }))
    .sort((x, y) => y.reward - x.reward)

  // Редкие предметы инвентаря (epic+ или title/frame).
  const rareItems = (profile.inventory?.list ?? []).filter(
    (i) => i.rarity === 'epic' || i.rarity === 'legendary' || i.rarity === 'rare',
  )

  // Подарки из ленты (полученные/подаренные/Telegram Gifts).
  const giftEvents = activity.filter(
    (e) => e.code === 'GIFT_DELIVERED' || e.code === 'GIFT_PLAYER' || e.code === 'GIFT_PURCHASE',
  )

  // Легендарные моменты для Showcase.
  const legendaryMoments = activity.filter(
    (e) => e.rarity === 'legendary' || e.rarity === 'mythic',
  )

  // Showcase: собираем лучшее, что есть. Каждая карточка — повод гордиться.
  const showcase: { icon: string; title: string; subtitle: string; rarity: Rarity }[] = []
  if (profile.mmrRank)
    showcase.push({
      icon: profile.mmrRank.emoji,
      title: profile.mmrRank.name,
      subtitle: profile.mmr != null ? `${fmt(profile.mmr)} MMR` : 'Ранг MMR',
      rarity: 'epic',
    })
  achievements.slice(0, 2).forEach((a) =>
    showcase.push({ icon: a.emoji, title: a.name, subtitle: 'Достижение', rarity: a.rarity }),
  )
  rareItems.slice(0, 2).forEach((i) =>
    showcase.push({
      icon: '🎖️',
      title: i.name,
      subtitle: 'Коллекция',
      rarity: (i.rarity as Rarity) ?? 'rare',
    }),
  )
  if (giftEvents.length > 0)
    showcase.push({
      icon: '🎁',
      title: `${giftEvents.length} подарков`,
      subtitle: 'Telegram Gifts',
      rarity: 'legendary',
    })
  if (legendaryMoments[0])
    showcase.push({
      icon: legendaryMoments[0].icon,
      title: 'Легендарный момент',
      subtitle: legendaryMoments[0].actor.name,
      rarity: 'legendary',
    })

  const stats = [
    { icon: '💰', value: profile.balance, label: 'баланс' },
    { icon: '📈', value: profile.totalEarned, label: 'всего заработано' },
    { icon: '🏆', value: profile.achievementsUnlocked, label: 'достижений' },
    { icon: '⚔️', value: profile.duelsWon, label: 'побед в дуэлях' },
    { icon: '🪙', value: profile.treasuresFound, label: 'кладов' },
    { icon: '🔥', value: profile.maxFarmStreak, label: 'макс. стрик' },
    { icon: '🎰', value: profile.casinoGamesCount, label: 'игр в казино' },
    { icon: '💬', value: profile.messages, label: 'сообщений' },
  ]

  const isNewbie = profile.achievementsUnlocked === 0 && activity.length === 0

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background pb-12">
      {/* ===== HERO ===== */}
      <section className="relative">
        {/* Обложка */}
        <div className="relative h-40 w-full overflow-hidden sm:h-52">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-500/15 to-transparent" />
          <div
            aria-hidden="true"
            className="absolute -top-16 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-[110px]"
          />
        </div>

        <div className="mx-auto -mt-16 max-w-4xl px-4 sm:-mt-20 sm:px-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
            {/* Аватар */}
            <div className="relative">
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-primary/20 text-4xl font-bold text-primary ring-4 ring-background sm:h-32 sm:w-32">
                {initial}
              </div>
            </div>

            {/* Имя + титул */}
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {profile.firstName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {titleText}
                </span>
                {profile.username && (
                  <span className="text-sm text-muted-foreground">@{profile.username}</span>
                )}
              </div>
              {since && (
                <p className="mt-1 text-xs text-muted-foreground">В Возне с {since}</p>
              )}
            </div>
          </div>

          {/* Ключевые показатели статуса — без скролла.
              MMR + место в рейтинге + баланс + достижения: статусность профиля. */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <HeroStat icon="🏅" value={profile.mmr != null ? fmt(profile.mmr) : '—'} label="MMR" accent />
            <HeroStat
              icon="📊"
              value={profile.rankInTop != null ? `#${fmt(profile.rankInTop)}` : '—'}
              label="место в топе"
            />
            <HeroStat icon="💰" value={fmt(profile.balance)} label="баланс" />
            <HeroStat icon="🏆" value={fmt(profile.achievementsUnlocked)} label="достижений" />
          </div>

        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {isNewbie ? (
          <Section title="Начало пути" className="!px-0">
            <EmptyState
              icon="🌱"
              title="Путь только начинается"
              description="Этот игрок недавно в Возне. Скоро здесь появятся достижения, подарки и история."
            />
          </Section>
        ) : (
          <>
            {/* ===== SHOWCASE ===== */}
            {showcase.length > 0 && (
              <Section title="Витрина" subtitle="Лучшее, чем гордится игрок" className="!px-0">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {showcase.slice(0, 6).map((s, idx) => {
                    const t = rarityToken(s.rarity)
                    return (
                      <Card
                        key={`${s.title}-${idx}`}
                        variant={s.rarity === 'common' ? 'default' : (s.rarity as never)}
                        className="flex flex-col items-center gap-1 py-5 text-center"
                      >
                        <span className="text-3xl" aria-hidden="true">
                          {s.icon}
                        </span>
                        <span
                          className="line-clamp-1 text-sm font-semibold"
                          style={{ color: t.color }}
                        >
                          {s.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{s.subtitle}</span>
                      </Card>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* ===== TITLES ===== */}
            <Section title="Титул и статус" subtitle="Статус игрока в сообществе" className="!px-0">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card variant="legendary" className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">
                    {profile.cosmetics.title?.emoji ?? profile.mmrRank?.emoji ?? '🏷️'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Текущий титул
                    </div>
                    <div className="truncate font-semibold text-foreground">
                      {profile.cosmetics.title?.name ?? profile.mmrRank?.name ?? 'Возняка'}
                    </div>
                  </div>
                </Card>
                <Card className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">🎖️</span>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Бейджи
                    </div>
                    {profile.cosmetics.badges.length > 0 ? (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {profile.cosmetics.badges.map((b) => (
                          <span key={b.code} className="text-xl" title={b.code}>
                            {b.emoji ?? '🏵️'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Пока нет бейджей</div>
                    )}
                  </div>
                </Card>
              </div>
            </Section>

            {/* ===== ACHIEVEMENTS (система статуса) ===== */}
            <AchievementsExperience
              owned={profile.achievements.map((a) => ({
                code: a.code,
                unlockedAt: a.unlockedAt,
              }))}
              globalCounts={achievementCounts}
              totalPlayers={totalPlayers}
            />


            {/* ===== GIFTS ===== */}
            {giftEvents.length > 0 && (
              <Section title="Подарки" subtitle="Telegram Gifts и подарки игроков" className="!px-0">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {giftEvents.slice(0, 6).map((g) => {
                    const t = rarityToken(g.rarity)
                    return (
                      <Card
                        key={g.id}
                        variant={g.rarity === 'common' ? 'default' : (g.rarity as never)}
                        className="flex flex-col items-center gap-1 py-5 text-center"
                      >
                        <span className="text-3xl" aria-hidden="true">{g.icon}</span>
                        <span className="text-sm font-semibold" style={{ color: t.color }}>
                          {g.value != null ? `${fmt(g.value)} ешек` : 'Подарок'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {g.target ? `→ ${g.target.name}` : g.actor.name}
                        </span>
                      </Card>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* ===== STATS ===== */}
            <Section title="Статистика" className="!px-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {stats.map((s) => (
                  <Card key={s.label} className="flex flex-col items-center gap-0.5 py-4 text-center">
                    <span className="text-lg" aria-hidden="true">{s.icon}</span>
                    <span className="text-lg font-bold text-foreground">{fmt(s.value)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </span>
                  </Card>
                ))}
              </div>
            </Section>

            {/* ===== TIMELINE ===== */}
            <Section title="История" subtitle="Путь игрока в Возне" className="!px-0">
              {activity.length === 0 ? (
                <EmptyState icon="📜" title="История пуста" description="Скоро здесь появятся события." />
              ) : (
                <ul className="space-y-2">
                  {activity.slice(0, 20).map((e) => (
                    <li key={e.id}>
                      <ActivityCard event={e} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}

        <div className="pt-4 text-center">
          <Link
            href="/live-v2"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← К жизни сообщества
          </Link>
        </div>
      </div>
    </main>
  )
}

function HeroStat({
  icon,
  value,
  label,
  accent = false,
}: {
  icon: string
  value: string
  label: string
  accent?: boolean
}) {
  return (
    <Card
      variant={accent ? 'epic' : 'default'}
      className="flex flex-col items-center gap-0.5 py-3 text-center"
    >
      <span className="text-base" aria-hidden="true">{icon}</span>
      <span className="text-lg font-bold text-foreground sm:text-xl">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </Card>
  )
}
