import type { Metadata } from 'next'
import { AchievementsCatalog } from '@/components/live/achievements-catalog'
import { TitlesLadder } from '@/components/live/titles-ladder'
import { BotFeatures } from '@/components/live/bot-features'
import { CommandsExplorer } from '@/components/live/commands-explorer'
import { SiteFooter } from '@/components/voznya/site-footer'
import { ScreenHeader } from '@/components/v2/screen-header'

export const metadata: Metadata = {
  title: 'Справочник ВОЗНИ',
  description: 'Гид по миру Возни: достижения, титулы, возможности бота и команды.',
}

export const dynamic = 'force-dynamic'

/**
 * Guide (`/guide`) — справочник Возни. Это МАНУАЛ (как устроен мир: какие
 * достижения бывают, как растут титулы, что умеет бот, какие команды), а НЕ
 * «состояние мира сейчас» — поэтому он вынесен из Live, у которого теперь одна
 * идентичность. Чистый read-only справочный экран в языке Settings.
 */
export default function GuidePage() {
  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader icon="book" title="Справочник" kicker="Как устроен мир Возни" accent="indigo" />
      <div className="pb-24">
        <AchievementsCatalog />
        <TitlesLadder />
        <BotFeatures />
        <CommandsExplorer />
      </div>
      <SiteFooter />
    </main>
  )
}
