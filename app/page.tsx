import Link from 'next/link'
import { Hero } from '@/components/voznya/hero'
import { LiveStats } from '@/components/voznya/live-stats'
import { CommunityActivity } from '@/components/v2/community-activity'
import { TopMembers } from '@/components/v2/top-members'

import { getCommunityFeed } from '@/lib/feed'



import { Platforms } from '@/components/voznya/platforms'
import { BotEcosystem } from '@/components/voznya/bot-ecosystem'
import { About } from '@/components/voznya/about'
import { FinalCta } from '@/components/voznya/final-cta'

import { SiteFooter } from '@/components/voznya/site-footer'
import { StickyCta } from '@/components/voznya/sticky-cta'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const feed = await getCommunityFeed(8)
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      {/* Сообщество: масштаб — единый блок (LiveStats), без дубля CommunityPulse */}
      <Hero />
      <LiveStats />

      {/* Жизнь проекта: реальная лента (живой тизер, не ссылка) */}

      <CommunityActivity
        events={feed}
        limit={5}
        action={
          <Link
            href="/live"
            className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
          >
            Смотреть всё
          </Link>

        }
      />

      {/* Люди сообщества */}
      <TopMembers />

      {/* Экосистема: площадки, Telegram, бот */}
      <Platforms />
      <BotEcosystem />

      {/* Атмосфера (сжато) + конверсия */}
      <About />
      <FinalCta />
      <SiteFooter />
      <StickyCta />
    </main>

  )
}
