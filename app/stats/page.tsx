import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { getPlayerProfile } from '@/lib/queries'
import { getPrestigeSummary } from '@/lib/prestige-summary'
import { getPlayerStats } from '@/lib/player-stats'
import { StatsView, type StatsViewData } from '@/components/stats/stats-view'
import { ScreenHeader } from '@/components/v2/screen-header'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Моя статистика — Возня',
  description: 'Кто я, как я расту и где стою среди всех в Возне.',
}

/**
 * Statistics — the player's personal identity surface (NOT a dashboard, NOT the
 * community /live page). Answers: Who am I → How do I compare → Am I growing →
 * What am I known for. Server component: reads the signed session, reuses the
 * profile + prestige read paths and the player-stats trajectory layer. All
 * read-only over the bot DB.
 */
export default async function StatsPage() {
  const session = await getSession()
  if (!session) redirect('/?auth=required')

  if (!isDbConfigured()) {
    return (
      <main className="relative min-h-svh overflow-x-hidden">
        <ScreenHeader icon="chart" title="Моя статистика" accent="teal" />
        <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            Статистика временно недоступна.
          </div>
        </div>
      </main>
    )
  }

  const profile = await getPlayerProfile(session.uid)
  if (!profile) {
    return (
      <main className="relative min-h-svh overflow-x-hidden">
        <ScreenHeader icon="chart" title="Моя статистика" accent="teal" />
        <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            Профиль ещё не сформирован — поиграй в Возню, и здесь появится твоя история.
          </div>
        </div>
      </main>
    )
  }

  const [prestige, stats] = await Promise.all([
    getPrestigeSummary(profile),
    getPlayerStats(session.uid, { balance: profile.balance, mmr: profile.mmr }),
  ])

  // Identity line: rank title + best standing, falling back gracefully.
  const best = prestige.standings[0]
  const identityBits: string[] = []
  if (profile.mmrRank?.name) identityBits.push(profile.mmrRank.name)
  if (best) identityBits.push(best.isFirst ? `№1 по «${best.label}»` : `Топ ${best.topPercent}% по «${best.label}»`)
  if (prestige.equippedTitle) identityBits.push(prestige.equippedTitle.name)
  const identityLine = identityBits.length ? identityBits.join(' · ') : 'Твоя история в Возне только начинается.'

  const data: StatsViewData = {
    name: profile.firstName || (profile.username ? `@${profile.username}` : `id${profile.userId}`),
    identityLine,
    story: stats.story,
    standings: prestige.standings,
    crownJewel: prestige.crownJewel,
    mastery: prestige.mastery,
    windowDays: stats.windowDays,
    wealth: stats.wealth,
    mmr: stats.mmr,
    voice: stats.voice,
  }

  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader icon="chart" title="Моя статистика" kicker="Кто ты и как растёшь" accent="teal" />
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <StatsView data={data} />
      </div>
    </main>
  )
}
