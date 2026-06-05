import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlayerProfile } from '@/lib/queries'
import { PlayerCard } from '@/components/profile/player-card'

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
  const description = `Профиль игрока ${profile.firstName}. Баланс: ${profile.balance} ешек, заработано: ${profile.totalEarned} ешек. ${profile.rankInTop ? `#${profile.rankInTop} в топе богачей.` : ''} ${profile.achievementsUnlocked} достижений из 30.`

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

  const profile = await getPlayerProfile(userId)

  if (!profile) {
    notFound()
  }

  return <PlayerCard profile={profile} />
}
