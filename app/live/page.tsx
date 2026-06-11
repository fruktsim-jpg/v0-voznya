import type { Metadata } from 'next'
import { Glyph } from '@/components/ds/icon/glyph'
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
import { ScreenHeader } from '@/components/v2/screen-header'
import { LiveTabs } from '@/components/live/live-tabs'
import { CommunityActivity } from '@/components/v2/community-activity'
import { getCommunityFeed } from '@/lib/feed'

export const metadata: Metadata = {
  title: 'Живая статистика ВОЗНИ',
  description: 'Экономика, достижения и активность сообщества ВОЗНЯ в реальном времени.',
}

export const dynamic = 'force-dynamic'

/**
 * Live (App Redesign V1) — вместо километровой простыни из 12 секций: тонкий
 * title bar + 4 вкладки приложения. Серверные панели рендерятся как и раньше
 * (каждая сама тянет данные), LiveTabs только переключает видимость.
 *   • Статистика — живые цифры + лента событий + дейли (ядро «live»);
 *   • Топы — богачи, неделя, сообщения, семьи;
 *   • Экономика — экономическая панель;
 *   • Справочник — ачивки, титулы, фичи бота, команды.
 */
export default async function LivePage() {
  const feed = await getCommunityFeed(6)

  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader icon="flame" title="Live" />

      <LiveTabs
        tabs={[
          {
            id: 'stats',
            label: (
              <>
                <Glyph name="chart" /> Статистика
              </>
            ),
            content: (
              <>
                <LiveCommunityStats />
                <CommunityActivity
                  events={feed}
                  limit={6}
                  title="Прямо сейчас в Возне"
                  subtitle="Последние события сообщества"
                />
                <DailyPanel />
              </>
            ),
          },
          {
            id: 'tops',
            label: '🏆 Топы',
            content: (
              <>
                <TopRich />
                <WeeklyTop />
                <MessagesPanel />
                <FamiliesTop />
              </>
            ),
          },
          {
            id: 'economy',
            label: '💰 Экономика',
            content: <EconomyPanel />,
          },
          {
            id: 'reference',
            label: '📖 Справочник',
            content: (
              <>
                <AchievementsCatalog />
                <TitlesLadder />
                <BotFeatures />
                <CommandsExplorer />
              </>
            ),
          },
        ]}
      />

      <SiteFooter />
    </main>
  )
}
