import type { Metadata } from 'next'
import { LiveCommunityStats } from '@/components/live/community-stats'
import { TopRich } from '@/components/live/top-rich'
import { WeeklyTop } from '@/components/live/weekly-top'
import { MessagesPanel } from '@/components/live/messages-panel'
import { FamiliesTop } from '@/components/live/families-top'
import { ReputationTop } from '@/components/live/reputation-top'
import { EconomyPanel } from '@/components/live/economy-panel'
import { DailyPanel } from '@/components/live/daily-panel'
import { WorldPulseBar } from '@/components/live/world-pulse-bar'
import { SiteFooter } from '@/components/voznya/site-footer'
import { ScreenHeader } from '@/components/v2/screen-header'
import { CommunityActivity } from '@/components/v2/community-activity'
import { getCommunityFeed } from '@/lib/feed'
import { getWorldPulseSafe, deriveHotToday } from '@/lib/world-pulse'

export const metadata: Metadata = {
  title: 'Живая статистика ВОЗНИ',
  description: 'Состояние мира ВОЗНЯ прямо сейчас: пульс дня, моменты, рейтинги и экономика.',
}

export const dynamic = 'force-dynamic'

/**
 * Live — экран СОСТОЯНИЯ МИРА Возни. Главный вопрос: «что происходит прямо
 * сейчас?». Единая плотная лента-страница (без пустых вкладок, как iOS Settings):
 *   1. Пульс дня (24ч агрегаты) + момент дня + номинации дня;
 *   2. Живой поток событий;
 *   3. Кто правит — полные рейтинги;
 *   4. Экономика — состояние экономики + вечные community-stats.
 * Справочник вынесен в /guide. deriveHotToday/getWorldPulse живут в общем слое.
 */
export default async function LivePage() {
  const feed = await getCommunityFeed(40)
  const pulse = await getWorldPulseSafe()
  const hot = deriveHotToday(feed)

  return (
    <main className="relative min-h-svh overflow-x-hidden pb-24">
      <ScreenHeader icon="flame" title="Live" kicker="Возня прямо сейчас" accent="teal" />

      {/* Состояние мира сегодня */}
      <WorldPulseBar pulse={pulse} hot={hot} />
      <DailyPanel />

      {/* Живой поток */}
      <CommunityActivity
        events={feed}
        title="Живой поток"
        subtitle="Что происходит в сообществе прямо сейчас"
      />

      {/* Кто правит */}
      <TopRich />
      <WeeklyTop />
      <ReputationTop />
      <FamiliesTop />
      <MessagesPanel />

      {/* Состояние экономики */}
      <EconomyPanel />
      <LiveCommunityStats />

      <SiteFooter />
    </main>
  )
}
