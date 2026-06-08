import Link from 'next/link'
import { Hero } from '@/components/voznya/hero'
import { LiveStats } from '@/components/voznya/live-stats'
import { QuickActions } from '@/components/v2/quick-actions'
import { CommunityActivity } from '@/components/v2/community-activity'
import { TopMembers } from '@/components/v2/top-members'

import { getCommunityFeed } from '@/lib/feed'

import { Platforms } from '@/components/voznya/platforms'
import { BotEcosystem } from '@/components/voznya/bot-ecosystem'
import { SiteFooter } from '@/components/voznya/site-footer'

export const dynamic = 'force-dynamic'

/**
 * Главная (App Redesign V1) — дашборд, а не лендинг. Сразу после Hero — быстрые
 * входы (QuickActions) в основные экраны приложения, затем живая статистика и
 * лента сообщества. Маркетинговые блоки (About, FinalCta, StickyCta) убраны:
 * человек уже внутри, его не надо «продавать». Экосистема (площадки + бот) —
 * один компактный блок внизу для тех, кто пришёл впервые.
 */
export default async function Page() {
  const feed = await getCommunityFeed(8)
  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <Hero />

      {/* Дашборд: куда идти прямо сейчас */}
      <QuickActions />

      {/* Масштаб сообщества — живые цифры */}
      <LiveStats />

      {/* Жизнь проекта: реальная лента */}
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

      {/* Экосистема (для новичков): площадки + бот — один блок внизу */}
      <Platforms />
      <BotEcosystem />

      <SiteFooter />
    </main>
  )
}
