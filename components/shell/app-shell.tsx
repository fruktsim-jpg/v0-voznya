import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/voznya/site-header'
import { PlayerContextBar } from '@/components/shell/player-context-bar'
import { GlobalNav } from '@/components/shell/global-nav'

/**
 * AppShell (Redesign V2, Stage 1) — единая «обёртка» Мини-аппа: фиксированная
 * шапка, постоянный Player Context Bar и основная навигация. Заменяет прямую
 * композицию SiteHeader + BottomNav в `app/layout.tsx`, не меняя поведения:
 *
 *  - SiteHeader остаётся прежним (логотип, статистика, UserMenu, scroll-blur);
 *  - PlayerContextBar — новая полоса под шапкой (баланс/ранг), сам решает свою
 *    видимость (скрыт у гостей/незарегистрированных/в админке) и компенсирует
 *    верхние отступы через класс body.has-context-bar (см. globals.css);
 *  - GlobalNav — конфиг-навигация (нижний бар / десктоп-таблетка), скрыта в
 *    админке — как и прежний BottomNav;
 *  - нижний отступ контента `pb-16 sm:pb-0` сохранён 1-в-1, чтобы контент не
 *    прятался под нижним баром на мобиле.
 *
 * Чисто презентационный слой: данные/маршруты/контракты не трогаются.
 */
export function AppShell({
  children,
  botId,
  oidcEnabled,
}: {
  children: ReactNode
  botId?: string | null
  oidcEnabled?: boolean
}) {
  return (
    <>
      <SiteHeader botId={botId} oidcEnabled={oidcEnabled} />
      <PlayerContextBar />

      {/* Отступ снизу на мобиле, чтобы контент не прятался под GlobalNav. */}
      <div className="pb-16 sm:pb-0">{children}</div>

      <GlobalNav />
    </>
  )
}
