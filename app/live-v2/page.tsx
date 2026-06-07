import type { Metadata } from 'next'
import { Section } from '@/components/v2/section'
import { EventFeed } from '@/components/v2/event-feed'
import { EmptyState } from '@/components/v2/empty-state'
import { MOCK_FEED } from '@/lib/events'

export const metadata: Metadata = {
  title: 'Live · ВОЗНЯ',
  description: 'Центр активности сообщества ВОЗНЯ: события, рейтинги и статистика.',
}

/**
 * Live Center V2 — FOUNDATION (VOZNYA_UI_UX_V2 §5). Phase 1: каркас + лента
 * событий (mock) + слоты под рейтинги/статистику (заполняются на след. этапах
 * реальными лоадерами из lib/queries.ts). Новый роут, существующий /live не
 * тронут. Никаких новых данных/БД/API.
 */
export default function LiveV2Page() {
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

      {/* Desktop: лента + слот рейтингов в 2 колонки; mobile: стек */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Лента (главное) */}
        <div className="lg:col-span-2">
          <Section title="Лента событий" subtitle="Кейсы, подарки, выигрыши и достижения" className="!px-0 !py-0">
            <EventFeed events={MOCK_FEED} />
          </Section>
        </div>

        {/* Слоты под рейтинги/статистику (заполнятся реальными данными позже) */}
        <aside className="mt-6 space-y-4 lg:mt-0">
          <Section title="Рейтинги" className="!px-0 !py-0">
            <EmptyState
              icon="🏅"
              title="Рейтинги переедут сюда"
              description="Топ по богатству, недельный топ, MMR и семьи — на следующем этапе."
            />
          </Section>
          <Section title="Пульс экономики" className="!px-0 !py-0">
            <EmptyState
              icon="📊"
              title="Статистика сообщества"
              description="Казна, активность и движение ешек — на следующем этапе."
            />
          </Section>
        </aside>
      </div>
    </main>
  )
}
