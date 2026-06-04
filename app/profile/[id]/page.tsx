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

  return {
    title: `${profile.firstName} — ВОЗНЯ`,
    description: `Профиль игрока ${profile.firstName}. Баланс: ${profile.balance} ешек, заработано: ${profile.totalEarned} ешек.`,
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
