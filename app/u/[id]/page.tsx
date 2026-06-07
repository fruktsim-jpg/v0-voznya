import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProfileV2 } from '@/components/v2/profile-v2'
import { getPlayerProfile } from '@/lib/queries'
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

  const activity = await getUserFeed(userId, 30)

  return (
    <ProfileV2
      data={{
        userId: profile.userId,
        name: profile.firstName,
        title: profile.mmrRank ? `${profile.mmrRank.emoji} ${profile.mmrRank.name}` : null,
        rank: profile.mmrRank?.name ?? null,
        mmr: profile.mmr,
        balance: profile.balance,
        totalEarned: profile.totalEarned,
        reputation: null,
        achievementsCount: profile.achievementsUnlocked,
        activity,
      }}
    />
  )
}
