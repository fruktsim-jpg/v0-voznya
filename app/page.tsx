import Link from 'next/link'
import { Hero } from '@/components/voznya/hero'
import { LiveStats } from '@/components/voznya/live-stats'
import { QuickActions } from '@/components/v2/quick-actions'
import { CommunityActivity } from '@/components/v2/community-activity'
import { TopMembers } from '@/components/v2/top-members'

import { getCommunityFeed } from '@/lib/feed'
import { getSession } from '@/lib/auth/get-session'
import { getHomeContext } from '@/lib/home-context'
import { HomeHub } from '@/components/home/home-hub'

import { Platforms } from '@/components/voznya/platforms'
import { BotEcosystem } from '@/components/voznya/bot-ecosystem'
import { SiteFooter } from '@/components/voznya/site-footer'

export const dynamic = 'force-dynamic'

/**
 * Главная (VOZNYA REDESIGN — «VOZNYA Right Now», world-first).
 *
 * Home — это окно в живой мир VOZNYA, а НЕ профиль на главной. Он отвечает:
 * что происходит в сообществе прямо сейчас, что я пропустил, что горячо, кто
 * побеждает — идентичность и прогрессия живут в Профиле и в постоянном
 * shell-баре. Поведение зависит от того, кто пришёл:
 *
 *  - Зарегистрированный игрок → Home Hub (`components/home/home-hub.tsx`):
 *    тонкий личный якорь + живая лента мира + «пока тебя не было» + что горячо +
 *    гонка сезона/кто поднимается + масштаб сообщества + элита. Данные — только
 *    чтение из БД бота через `getHomeContext`.
 *  - Гость / незарегистрированный → прежний лендинг-онбординг (Hero, быстрые
 *    входы, экосистема): его задача — показать продукт и завести внутрь.
 *
 * READ-ONLY: страница ничего не пишет в игровые таблицы — бот владеет записью.
 */
export default async function Page() {
  const session = await getSession()
  const ctx = await getHomeContext(session?.uid ?? null)

  // Registered player → world-first living command center.
  if (ctx.player) {
    return (
      <main className="relative min-h-svh overflow-x-hidden bg-background">
        <HomeHub ctx={ctx} />
        <SiteFooter />
      </main>
    )
  }

  // Guest / not-yet-registered → onboarding landing (unchanged direction).
  const feed = ctx.worldFeed.length > 0 ? ctx.worldFeed : await getCommunityFeed(8)
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
