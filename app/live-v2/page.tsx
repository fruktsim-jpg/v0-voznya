import type { Metadata } from 'next'
import Link from 'next/link'
import { Section } from '@/components/v2/section'
import { EventFeed } from '@/components/v2/event-feed'
import { EmptyState } from '@/components/v2/empty-state'
import { Card } from '@/components/v2/card'
import { UserBadge } from '@/components/v2/user-badge'
import { ActivityCard } from '@/components/v2/activity-card'
import { LiveTicker } from '@/components/v2/live-ticker'
import { AutoRefresh } from '@/components/v2/auto-refresh'
import { getCommunityFeed } from '@/lib/feed'
import { getCommunityStats, getTopRich, getWeeklyTop, getEconomy } from '@/lib/queries'
import type { CommunityEvent } from '@/lib/events'

export const metadata: Metadata = {
  title: 'Live · ВОЗНЯ',
  description: 'Что происходит в Возне прямо сейчас: события, кейсы, подарки, выигрыши, рейтинги.',
}

export const dynamic = 'force-dynamic'

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * Live Center (V3) — главный центр сайта. Отвечает на вопрос «что происходит в
 * Возне прямо сейчас»: живая лента, крупные события, кейсы, подарки, экономика,
 * рейтинги — всё на РЕАЛЬНЫХ данных (getCommunityFeed + lib/queries), без новых
 * API/таблиц. Авто-обновление каждые 30с. Существующий /live не тронут.
 */
export default async function LiveV2Page() {
  const [feed, top, weekly, stats, economy] = await Promise.all([
    getCommunityFeed(60),
    getTopRich(10),
    getWeeklyTop(7, 5),
    getCommunityStats(),
    getEconomy(),
  ])

  const is = (codes: CommunityEvent['code'][]) => (e: CommunityEvent) => codes.includes(e.code)
  const bigWins = feed.filter(is(['CASINO_BIG_WIN'])).slice(0, 5)
  const gifts = feed.filter(is(['GIFT_DELIVERED', 'GIFT_PLAYER', 'GIFT_PURCHASE'])).slice(0, 5)
  const cases = feed.filter(is(['CASE_OPEN', 'CASE_JACKPOT', 'CASE_GIFT_DROP'])).slice(0, 5)
  const rare = feed.filter((e) => e.rarity === 'legendary' || e.rarity === 'mythic').slice(0, 5)

  const liveMetrics = [
    { icon: '👥', value: stats.users, label: 'игроков' },
    { icon: '💰', value: economy.treasury, label: 'ешек в обороте' },
    { icon: '🏆', value: stats.achievements, label: 'достижений' },
    { icon: '🪙', value: stats.treasuresFound, label: 'кладов' },
    { icon: '⚔️', value: stats.duels, label: 'дуэлей' },
    { icon: '💍', value: stats.marriages, label: 'семей' },
  ]

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <AutoRefresh intervalMs={30_000} />

      {/* Hero «в эфире» */}
      <section className="relative px-6 pb-3 pt-24 text-center sm:pt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/20 blur-[120px]"
        />
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            В эфире · обновляется автоматически
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
            🔥 Возня <span className="text-gradient">прямо сейчас</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Живая лента сообщества: кейсы, подарки, выигрыши, достижения и рейтинги.
          </p>
        </div>
      </section>

      {/* Бегущая строка ярких событий */}
      <LiveTicker events={feed} />

      {/* Live-метрики */}
      <section className="px-4 pt-6 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {liveMetrics.map((m) => (
            <Card key={m.label} className="flex flex-col items-center gap-0.5 py-3 text-center">
              <span className="text-lg" aria-hidden="true">{m.icon}</span>
              <span className="text-lg font-bold text-foreground sm:text-xl">{fmt(m.value)}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</span>
            </Card>
          ))}
        </div>
      </section>

      {/* Основная раскладка: лента + сайдбар */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Лента событий */}
        <div className="lg:col-span-2">
          <Section title="Лента событий" subtitle="Вся жизнь сообщества в реальном времени" className="!px-0 !py-0">
            {feed.length === 0 ? (
              <EmptyState icon="🌙" title="Пока тихо" description="Скоро здесь будет жарко." />
            ) : (
              <EventFeed events={feed} />
            )}
          </Section>
        </div>

        {/* Сайдбар */}
        <aside className="mt-6 space-y-6 lg:mt-0">
          {/* Редкие события */}
          {rare.length > 0 && (
            <Section title="✨ Редкие события" className="!px-0 !py-0">
              <ul className="space-y-2">
                {rare.map((e) => (
                  <li key={e.id}><ActivityCard event={e} /></li>
                ))}
              </ul>
            </Section>
          )}

          {/* Крупные выигрыши */}
          {bigWins.length > 0 && (
            <Section title="🎰 Крупные выигрыши" className="!px-0 !py-0">
              <ul className="space-y-2">
                {bigWins.map((e) => (
                  <li key={e.id}><ActivityCard event={e} /></li>
                ))}
              </ul>
            </Section>
          )}

          {/* Подарки */}
          {gifts.length > 0 && (
            <Section title="🎁 Подарки" className="!px-0 !py-0">
              <ul className="space-y-2">
                {gifts.map((e) => (
                  <li key={e.id}><ActivityCard event={e} /></li>
                ))}
              </ul>
            </Section>
          )}

          {/* Открытия кейсов */}
          {cases.length > 0 && (
            <Section title="📦 Открытия кейсов" className="!px-0 !py-0">
              <ul className="space-y-2">
                {cases.map((e) => (
                  <li key={e.id}><ActivityCard event={e} /></li>
                ))}
              </ul>
            </Section>
          )}

          {/* Топ по богатству */}
          <Section title="🏆 Топ по богатству" className="!px-0 !py-0">
            {top.length === 0 ? (
              <EmptyState icon="🏅" title="Пока нет данных" />
            ) : (
              <Card className="space-y-2">
                {top.map((u) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">{u.rank}</span>
                    <div className="min-w-0 flex-1"><UserBadge name={u.name} userId={u.userId} size="sm" /></div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">{fmt(u.balance)}</span>
                  </div>
                ))}
              </Card>
            )}
          </Section>

          {/* Топ недели */}
          {weekly.length > 0 && (
            <Section title="📈 Заработали за неделю" className="!px-0 !py-0">
              <Card className="space-y-2">
                {weekly.map((u) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">{u.rank}</span>
                    <div className="min-w-0 flex-1"><UserBadge name={u.name} userId={u.userId} size="sm" /></div>
                    <span className="shrink-0 text-sm font-semibold text-emerald-300">+{fmt(u.earned)}</span>
                  </div>
                ))}
              </Card>
            </Section>
          )}

          <div className="pt-2 text-center">
            <Link href="/" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              ← Что такое Возня
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
