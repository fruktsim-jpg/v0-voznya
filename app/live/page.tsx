import type { Metadata } from 'next'
import { Glyph } from '@/components/ds/icon/glyph'
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
import { LiveTabs } from '@/components/live/live-tabs'
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
 * сейчас?». Открывается не на статистике и не на лидербордах, а на «Сейчас»:
 *   • Сейчас      — пульс дня (24ч агрегаты) + момент дня + номинации + поток;
 *   • Кто правит  — полные рейтинги (богачи/неделя/уважение/семьи/сообщения);
 *   • Экономика   — состояние экономики + вечные community-stats.
 * Справочник вынесен в /guide (мануал ≠ «сейчас»). deriveHotToday/getWorldPulse
 * живут в общем слое (lib/world-pulse) и используются и тут, и на Home.
 */
export default async function LivePage() {
  const feed = await getCommunityFeed(40)
  const pulse = await getWorldPulseSafe()
  const hot = deriveHotToday(feed)

  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader icon="flame" title="Live" kicker="Возня прямо сейчас" accent="teal" />

      <LiveTabs
        tabs={[
          {
            id: 'now',
            label: (
              <>
                <Glyph name="pulse" /> Сейчас
              </>
            ),
            content: (
              <>
                <WorldPulseBar pulse={pulse} hot={hot} />
                <DailyPanel />
                <CommunityActivity
                  events={feed}
                  title="Живой поток"
                  subtitle="Что происходит в сообществе прямо сейчас"
                />
              </>
            ),
          },
          {
            id: 'tops',
            label: (
              <>
                <Glyph name="trophy" /> Кто правит
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
          {
            id: 'economy',
            label: (
              <>
                <Glyph name="vault" /> Экономика
              </>
            ),
            content: (
              <>
                <EconomyPanel />
                <LiveCommunityStats />
              </>
            ),
          },
        ]}
      />

      <SiteFooter />
    </main>
  )
}
