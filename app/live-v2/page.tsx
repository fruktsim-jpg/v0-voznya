import type { Metadata } from 'next'
import { Section } from '@/components/v2/section'
import { EventFeed } from '@/components/v2/event-feed'
import { EmptyState } from '@/components/v2/empty-state'
import { Card } from '@/components/v2/card'
import { UserBadge } from '@/components/v2/user-badge'
import { getCommunityFeed } from '@/lib/feed'
import { getCommunityStats, getTopRich } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Live · ВОЗНЯ',
  description: 'Центр активности сообщества ВОЗНЯ: события, рейтинги и статистика.',
}

export const dynamic = 'force-dynamic'

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * Live Center V2 (VOZNYA_UI_UX_V2 §5) — РЕАЛЬНЫЕ данные из существующих лоадеров:
 * лента событий (lib/feed), топ по богатству и статистика сообщества
 * (lib/queries). Read-only, без новых API/таблиц. Существующий /live не тронут.
 */
export default async function LiveV2Page() {
  const [feed, top, stats] = await Promise.all([
    getCommunityFeed(40),
    getTopRich(10),
    getCommunityStats(),
  ])

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      {/* Hero «в эфире» */}
      <section className="relative px-6 pb-2 pt-24 text-center sm:pt-28">
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
            В эфире
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
            🔥 Центр активности <span className="text-gradient">ВОЗНИ</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Что происходит в сообществе прямо сейчас.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Лента событий (главное) */}
        <div className="lg:col-span-2">
          <Section title="Лента событий" subtitle="Кейсы, подарки, выигрыши и достижения" className="!px-0 !py-0">
            <EventFeed events={feed} />
          </Section>
        </div>

        {/* Рейтинги + статистика */}
        <aside className="mt-6 space-y-6 lg:mt-0">
          <Section title="Топ по богатству" className="!px-0 !py-0">
            {top.length === 0 ? (
              <EmptyState icon="🏅" title="Пока нет данных" />
            ) : (
              <Card className="space-y-2">
                {top.map((u) => (
                  <div key={u.userId} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                      {u.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <UserBadge name={u.name} userId={u.userId} size="sm" />
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {fmt(u.balance)}
                    </span>
                  </div>
                ))}
              </Card>
            )}
          </Section>

          <Section title="Пульс сообщества" className="!px-0 !py-0">
            <div className="grid grid-cols-2 gap-3">
              <Card className="flex flex-col gap-0.5">
                <span className="text-xl font-bold text-foreground">{fmt(stats.users)}</span>
                <span className="text-xs text-muted-foreground">игроков</span>
              </Card>
              <Card className="flex flex-col gap-0.5">
                <span className="text-xl font-bold text-foreground">{fmt(stats.eshInCirculation)}</span>
                <span className="text-xs text-muted-foreground">ешек в обороте</span>
              </Card>
              <Card className="flex flex-col gap-0.5">
                <span className="text-xl font-bold text-foreground">{fmt(stats.achievements)}</span>
                <span className="text-xs text-muted-foreground">достижений</span>
              </Card>
              <Card className="flex flex-col gap-0.5">
                <span className="text-xl font-bold text-foreground">{fmt(stats.marriages)}</span>
                <span className="text-xs text-muted-foreground">семей</span>
              </Card>
            </div>
          </Section>
        </aside>
      </div>
    </main>
  )
}
