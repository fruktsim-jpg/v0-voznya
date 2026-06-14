import type { Metadata } from 'next'
import { Glyph } from '@/components/ds/icon/glyph'
import { LiveCommunityStats } from '@/components/live/community-stats'
import { TopRich } from '@/components/live/top-rich'
import { WeeklyTop } from '@/components/live/weekly-top'
import { MessagesPanel } from '@/components/live/messages-panel'
import { FamiliesTop } from '@/components/live/families-top'
import { ReputationTop } from '@/components/live/reputation-top'
import { EconomyPanel } from '@/components/live/economy-panel'
import { SiteFooter } from '@/components/voznya/site-footer'
import { ScreenHeader } from '@/components/v2/screen-header'
import { LiveTabs } from '@/components/live/live-tabs'

export const metadata: Metadata = {
  title: 'Статистика ВОЗНИ',
  description: 'Статистика мира ВОЗНЯ: общая аналитика, экономика и лидерборды сообщества.',
}

export const dynamic = 'force-dynamic'

/**
 * Live / Статистика — две вкладки:
 *   1. Статистика — общая аналитика мира: community-stats + экономика.
 *   2. Лидерборды — все рейтинги: богачи / неделя / репутация / семьи / сообщения.
 * Живой поток событий убран отсюда (его место — пульс на главной). Справочник
 * вынесен в /guide.
 */
export default function LivePage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden pb-24">
      <ScreenHeader icon="pulse" title="Статистика" kicker="Состояние мира Возни" accent="teal" />

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
                <EconomyPanel />
              </>
            ),
          },
          {
            id: 'tops',
            label: (
              <>
                <Glyph name="trophy" /> Лидерборды
              </>
            ),
            content: (
              <>
                <TopRich />
                <WeeklyTop />
                <ReputationTop />
                <FamiliesTop />
                <MessagesPanel />
              </>
            ),
          },
        ]}
      />

      <SiteFooter />
    </main>
  )
}
