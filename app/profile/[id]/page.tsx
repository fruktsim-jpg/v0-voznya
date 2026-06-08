import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlayerProfile } from '@/lib/queries'
import { getUserFeed } from '@/lib/feed'
import { PlayerCard } from '@/components/profile/player-card'
import { SeasonBadge } from '@/components/profile/season-badge'
import { NotRegistered } from '@/components/auth/not-registered'

import { getSession } from '@/lib/auth/get-session'
import { getAdminSession } from '@/lib/auth/admin-session'
import { ACHIEVEMENTS } from '@/lib/voznya-bot'





interface ProfilePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const userId = parseInt(id, 10)
  
  if (isNaN(userId)) {
    return { title: 'Профиль не найден' }
  }

  const profile = await getPlayerProfile(userId)

  if (!profile) {
    return { title: 'Профиль не найден' }
  }

  const title = `${profile.firstName} | ВОЗНЯ`
  const description = `Профиль игрока ${profile.firstName}. Баланс: ${profile.balance} ешек, заработано: ${profile.totalEarned} ешек. ${profile.rankInTop ? `#${profile.rankInTop} в топе богачей.` : ''} ${profile.achievementsUnlocked} достижений из ${ACHIEVEMENTS.length}.`


  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `https://voznya.ru/profile/${userId}`,
      siteName: 'ВОЗНЯ',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: `/profile/${userId}`,
    },
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const userId = parseInt(id, 10)

  if (isNaN(userId)) {
    notFound()
  }

  const session = await getSession()
  const isOwner = session?.uid === userId

  // Show the admin shortcut only when the viewer owns this profile AND has an
  // admin role (any of owner/admin/moderator/support).
  const adminSession = isOwner ? await getAdminSession() : null
  const isAdmin = !!adminSession

  const profile = await getPlayerProfile(userId)


  if (!profile) {
    // A logged-in user looking at their own (non-existent) profile means they
    // authenticated via Telegram but never played — show a friendly hint
    // instead of a 404. The bot remains the only thing that creates users.
    if (isOwner) {
      return <NotRegistered />
    }
    notFound()
  }

  // Личная лента событий игрока — переносим сильную идею из ProfileV2 (Timeline)
  // в каноничный PlayerCard, не переписывая его. Деградирует к пустому списку.
  const activity = await getUserFeed(userId, 20)

  return (
    <div className="space-y-4">
      <SeasonBadge userId={userId} />
      <PlayerCard
        profile={profile}
        isOwner={isOwner}
        isAdmin={isAdmin}
        activity={activity}
      />
    </div>
  )

}




