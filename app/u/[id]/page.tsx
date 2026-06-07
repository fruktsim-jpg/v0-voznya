import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProfileV2 } from '@/components/v2/profile-v2'
import { getPlayerProfile, getAchievementsProgress, getCommunityStats } from '@/lib/queries'
import { getUserFeed } from '@/lib/feed'


export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Профиль · ВОЗНЯ',
}

/**
 * Профиль V2 (Steam-стиль) на РЕАЛЬНЫХ данных: getPlayerProfile (баланс, MMR,
 * достижения) + getUserFeed (личная активность). Read-only, без новых API/таблиц.
 * Существующий /profile/[id] не тронут — это параллельный V2-маршрут.
 */
export default async function ProfileV2Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = Number(id)
  if (!Number.isFinite(userId)) notFound()

  const profile = await getPlayerProfile(userId)
  if (!profile) notFound()

  // Личная лента + глобальная редкость достижений (для статусности).
  const [activity, achProgress, stats] = await Promise.all([
    getUserFeed(userId, 30),
    getAchievementsProgress(),
    getCommunityStats(),
  ])
  const achievementCounts = new Map(achProgress.items.map((i) => [i.code, i.unlocked]))

  return (
    <ProfileV2
      profile={profile}
      activity={activity}
      achievementCounts={achievementCounts}
      totalPlayers={stats.users}
    />
  )
}



