import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LiveCommunityStats } from '@/components/live/community-stats'
import { TopRich } from '@/components/live/top-rich'
import { WeeklyTop } from '@/components/live/weekly-top'

import { MessagesPanel } from '@/components/live/messages-panel'
import { FamiliesTop } from '@/components/live/families-top'
import { EconomyPanel } from '@/components/live/economy-panel'
import { AchievementsCatalog } from '@/components/live/achievements-catalog'
import { TitlesLadder } from '@/components/live/titles-ladder'
import { DailyPanel } from '@/components/live/daily-panel'
import { BotFeatures } from '@/components/live/bot-features'
import { CommandsExplorer } from '@/components/live/commands-explorer'
import { SiteFooter } from '@/components/voznya/site-footer'
import { ScrollToAnchor } from '@/components/live/scroll-to-anchor'
import { LiveNav } from '@/components/live/live-nav'
import { PageHero } from '@/components/v2/page-hero'
import { CommunityActivity } from '@/components/v2/community-activity'
import { getCommunityFeed } from '@/lib/feed'

export const metadata: Metadata = {
  title: 'Живая статистика ВОЗНИ',
  description: 'Экономика, достижения и активность сообщества ВОЗНЯ в реальном времени.',
}

export const dynamic = 'force-dynamic'

export default async function LivePage() {
  // Компактная лента событий — доказательство, что статистика живая.
  // Намеренно короткая (6 событий): статистика ниже остаётся главным контентом.
  const feed = await getCommunityFeed(6)

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <Suspense fallback={null}>
        <ScrollToAnchor />
      </Suspense>

      {/* Единый герой раздела (как Cases/Gifts/Casino) */}
      <PageHero
        badge="Обновляется в реальном времени"
        icon="🔥"
        title="Живая статистика"
        accent="ВОЗНИ"
        description="Экономика, достижения и активность сообщества в реальном времени."
      />

      <LiveNav />

      {/* Статистика — ядро страницы */}
      <LiveCommunityStats />

      {/* Доказательство «цифры живые»: компактный блок последних событий.
          НЕ доминирует — короткий тизер между статами и рейтингами. */}
      <CommunityActivity
        events={feed}
        limit={6}
        title="Прямо сейчас в Возне"
        subtitle="Последние события сообщества — статистика выше дышит в реальном времени"
      />

      <TopRich />
      <WeeklyTop />
      <MessagesPanel />
      <FamiliesTop />
      <EconomyPanel />
      <AchievementsCatalog />
      <TitlesLadder />
      <DailyPanel />
      <BotFeatures />
      <CommandsExplorer />
      <SiteFooter />
    </main>
  )
}


