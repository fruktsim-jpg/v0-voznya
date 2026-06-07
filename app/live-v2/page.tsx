import type { Metadata } from 'next'
import Link from 'next/link'
import { Section } from '@/components/v2/section'
import { EventFeed } from '@/components/v2/event-feed'
import { EmptyState } from '@/components/v2/empty-state'
import { Card } from '@/components/v2/card'
import { UserBadge } from '@/components/v2/user-badge'
import { AutoRefresh } from '@/components/v2/auto-refresh'
import { getCommunityFeed } from '@/lib/feed'
import { getCommunityStats, getTopRich, getWeeklyTop, getEconomy } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Live · ВОЗНЯ',
  description: 'Живая статистика Возни: экономика, рейтинги, достижения, активность сообщества.',
}

export const dynamic = 'force-dynamic'

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * Live Center (V3, Polish Pass) — ЖИВАЯ СТАТИСТИКА Возни, не социальная лента.
 * Главный герой: цифры, экономика, топы, рейтинги, достижения, аналитика.
 * Event Feed остаётся, но вторичным слоем (сайдбар «прямо сейчас»). Всё на
 * реальных данных (lib/queries + getCommunityFeed). Авто-обновление 30с.
 */
export default async function LiveV2Page() {
  const [feed, top, weekly, stats, economy] = await Promise.all([
    getCommunityFeed(40),
    getTopRich(10),
    getWeeklyTop(7, 8),
    getCommunityStats(),
    getEconomy(),
  ])

  // Главные метрики масштаба сообщества.
  const headline = [
    { icon: '👥', value: stats.users, label: 'игроков' },
    { icon: '💰', value: economy.treasury, label: 'ешек в обороте' },
    { icon: '🏆', value: stats.achievements, label: 'достижений открыто' },
    { icon: '⚔️', value: stats.duels, label: 'дуэлей сыграно' },
    { icon: '🪙', value: stats.treasuresFound, label: 'кладов найдено' },
    { icon: '💍', value: stats.marriages, label: 'семей создано' },
    { icon: '🌾', value: economy.farmers, label: 'фермеров' },
    { icon: '📊', value: economy.avgBalance, label: 'средний баланс' },
  ]

  // Вторичный слой: только самые заметные события «прямо сейчас».
  const liveNow = feed.slice(0, 12)

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background pb-12">
      <AutoRefresh intervalMs={30_000} />

      {/* Hero — «живая статистика» */}
      <section className="relative px-6 pb-2 pt-20 text-center sm:pt-24">
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
            Живая статистика · обновляется автоматически
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
            Возня в <span className="text-gradient">цифрах</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Экономика, рейтинги, достижения и активность сообщества — в реальном времени.
          </p>
        </div>
      </section>

      {/* ГЛАВНОЕ: метрики масштаба */}
      <Section title="Масштаб сообщества" subtitle="Сводка по всей Возне">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {headline.map((m) => (
            <Card key={m.label} variant="elevated" className="flex flex-col items-center gap-0.5 py-5 text-center">
              <span className="text-xl" aria-hidden="true">{m.icon}</span>
              <span className="text-2xl font-bold text-foreground">{fmt(m.value)}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</span>
            </Card>
          ))}
        </div>
      </Section>

      {/* Рейтинги — основной контент */}
      <Section title="Рейтинги" subtitle="Кто впереди в Возне">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Топ по богатству */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">🏆 Богатейшие игроки</h3>
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
          </div>

          {/* Топ недели */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">📈 Заработали за неделю</h3>
            {weekly.length === 0 ? (
              <EmptyState icon="📈" title="Пока нет данных" />
            ) : (
              <Card className="space-y-2">
                {weekly.map((u) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">{u.rank}</span>
                    <div className="min-w-0 flex-1"><UserBadge name={u.name} userId={u.userId} size="sm" /></div>
                    <span className="shrink-0 text-sm font-semibold text-emerald-300">+{fmt(u.earned)}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      </Section>

      {/* Экономика — аналитический блок */}
      <Section title="Экономика" subtitle="Состояние ешек в сообществе">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Card className="flex flex-col items-center gap-0.5 py-4 text-center">
            <span className="text-lg" aria-hidden="true">🏦</span>
            <span className="text-lg font-bold text-foreground">{fmt(economy.treasury)}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">в обороте</span>
          </Card>
          <Card className="flex flex-col items-center gap-0.5 py-4 text-center">
            <span className="text-lg" aria-hidden="true">📊</span>
            <span className="text-lg font-bold text-foreground">{fmt(economy.avgBalance)}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">средний баланс</span>
          </Card>
          <Card className="flex flex-col items-center gap-0.5 py-4 text-center">
            <span className="text-lg" aria-hidden="true">💎</span>
            <span className="text-lg font-bold text-foreground">{fmt(economy.maxBalance)}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">макс. баланс</span>
          </Card>
          <Card className="flex flex-col items-center gap-0.5 py-4 text-center">
            <span className="text-lg" aria-hidden="true">🌾</span>
            <span className="text-lg font-bold text-foreground">{fmt(economy.farmers)}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">фермеров</span>
          </Card>
        </div>
        {economy.richest && (
          <Card variant="legendary" className="mt-3 flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">👑</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Богатейший игрок Возни</div>
              <div className="truncate font-semibold text-foreground">{economy.richest.name}</div>
            </div>
            <span className="shrink-0 font-bold text-amber-300">{fmt(economy.richest.balance)}</span>
          </Card>
        )}
      </Section>

      {/* ВТОРИЧНЫЙ СЛОЙ: лента «прямо сейчас» */}
      <Section
        title="Прямо сейчас"
        subtitle="Свежие события сообщества"
        action={
          <Link href="/" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Что такое Возня →
          </Link>
        }
      >
        {liveNow.length === 0 ? (
          <EmptyState icon="🌙" title="Пока тихо" description="Скоро здесь будет жарко." />
        ) : (
          <EventFeed events={liveNow} />
        )}
      </Section>
    </main>
  )
}
