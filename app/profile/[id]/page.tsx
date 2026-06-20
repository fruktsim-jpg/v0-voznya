import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlayerProfile } from '@/lib/queries'
import { getPrestigeSummary } from '@/lib/prestige-summary'
import { getPersonalDrun } from '@/lib/drun-personal'
import { getUserFeed } from '@/lib/feed'
import { PersonalDrunCard } from '@/components/profile/personal-drun-card'
import { PlayerCard } from '@/components/profile/player-card'
import { PrestigeBanner } from '@/components/profile/prestige-banner'
import { SeasonBadge } from '@/components/profile/season-badge'
import { ProfileShowcase } from '@/components/profile/profile-showcase'
import { NotRegistered } from '@/components/auth/not-registered'
import { prestigeForMmrRank } from '@/lib/ds/prestige'

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

  // Личная лента событий игрока (Timeline) + витрина престижа (Phase D) +
  // "Тёмный друн о тебе" (Phase B — read-only Drun summary). Все независимы →
  // грузим параллельно, чтобы не складывать задержки. Personal Drun fail-silent:
  // null, если друн ничего не знает / БД без миграций → секция просто скрыта.
  const [activity, prestige, personalDrun] = await Promise.all([
    getUserFeed(userId, 20),
    getPrestigeSummary(profile),
    getPersonalDrun(userId),
  ])

  // E0.2 — тир-мир для окраски hero престижа (Bronze ≠ Diamond с первого
  // взгляда). Берём от MMR-ранга игрока; null-safe внутри хелпера.
  const heroTier = profile.mmrRank ? prestigeForMmrRank(profile.mmrRank.name) : null

  return (
    <div className="space-y-4 pt-header">
      <PlayerCard
        profile={profile}
        isOwner={isOwner}
        isAdmin={isAdmin}
        activity={activity}
        prestigeSlot={
          <PrestigeBanner
            summary={prestige}
            tier={
              heroTier
                ? {
                    color: heroTier.color,
                    gradient: heroTier.gradient,
                    glow: heroTier.glow,
                    aura: heroTier.aura,
                    index: heroTier.index,
                  }
                : null
            }
          />
        }
        seasonSlot={<SeasonBadge userId={userId} />}
        drunSlot={<PersonalDrunCard data={personalDrun} isOwner={isOwner} />}
      />
      {/* Track 1: витрина закреплённых предметов — только владельцу (пины в
          localStorage). Раньше этот шелф нигде на профиле не рендерился. */}
      {isOwner && <ProfileShowcase />}
    </div>
  )

}




