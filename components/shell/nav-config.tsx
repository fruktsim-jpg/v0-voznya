import type { ReactNode } from 'react'

/**
 * Единый источник правды для основной навигации (Redesign Master Plan §3.6).
 * Один конфиг → нижний бар на мобиле и плавающая таблетка на десктопе. Чтобы
 * добавить/переставить пункт, правят только этот массив.
 *
 * ВАЖНО (миграция Stage 1): все href ведут на УЖЕ существующие маршруты —
 * новые страницы в этом этапе не создаём.
 *  - «Лидеры» ведёт на существующую витрину топов (`/live#top-rich`) до тех пор,
 *    пока Stage 5 не построит выделенный `/leaderboards`.
 *  - «Профиль» ведёт на `/profile/me` (редирект на свой профиль).
 */
export type NavItem = {
  /** Стабильный ключ для React и подсветки. */
  id: string
  href: string
  label: string
  /** Line-иконка (SVG paths внутри 24×24 viewBox). */
  icon: ReactNode
  /** Активна ли вкладка для данного пути. */
  match: (pathname: string) => boolean
}

const I = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />,
  cases: (
    <>
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" />
      <path d="M3 8.5 12 13l9-4.5M12 13v7" />
    </>
  ),
  inventory: (
    <>
      <path d="M4 7h16v13H4zM4 7l2-3h12l2 3" />
      <path d="M9 11h6" />
    </>
  ),
  shop: (
    <>
      <rect x="3.5" y="9" width="17" height="11" rx="1.5" />
      <path d="M3.5 13h17M12 9v11M12 9c-2-3-6-3-6-.5 0 1.5 3 .5 6 .5zM12 9c2-3 6-3 6-.5 0 1.5-3 .5-6 .5z" />
    </>
  ),
  leaders: (
    <>
      <path d="M6 9H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2zM18 11h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-2z" />
      <path d="M9 5h6a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
    </>
  ),
}

/**
 * 6 пунктов (Redesign Master Plan §3.6): Главная · Кейсы · Инвентарь · Магазин ·
 * Лидеры · Профиль. Live сворачивается в пульс главной (ссылкой), Казино входит
 * как тайл будущего Play-хаба — так бар держит 6 пунктов.
 *
 * ┌─ E0.5 PLAY HUB READINESS (архитектура, не реализация) ───────────────────┐
 * │ Бар ДОЛЖЕН остаться 6 пунктов. Будущие игровые режимы НЕ добавляют вкладки.│
 * │                                                                           │
 * │ Слот `cases` — это будущий слот `play` («Играть»). Когда выйдет Play Hub: │
 * │   • id 'cases' → 'play', href '/cases' → '/play', label → «Играть»,       │
 * │     icon → джойстик/кости; match расширяется на /cases|/casino|/duels|... │
 * │   • /play становится хабом: Кейсы · Казино · Дуэли · Ивенты · Сезонные.   │
 * │   • /cases, /casino и т.д. живут ПОД /play, не как вкладки бара.          │
 * │ Итог: 5 будущих режимов входят через ОДИН пункт. Бар не растёт до 8–12.   │
 * │                                                                           │
 * │ Никаких изменений данных/маршрутов сейчас — только этот контракт, чтобы   │
 * │ будущая миграция была заменой одной строки, а не редизайном навигации.    │
 * └───────────────────────────────────────────────────────────────────────────┘
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', href: '/', label: 'Главная', icon: I.home, match: (p) => p === '/' },
  { id: 'cases', href: '/cases', label: 'Кейсы', icon: I.cases, match: (p) => p.startsWith('/cases') },
  { id: 'inventory', href: '/inventory', label: 'Инвентарь', icon: I.inventory, match: (p) => p.startsWith('/inventory') },
  { id: 'shop', href: '/gifts', label: 'Магазин', icon: I.shop, match: (p) => p.startsWith('/gifts') || p.startsWith('/shop') },
  { id: 'leaders', href: '/live#top-rich', label: 'Лидеры', icon: I.leaders, match: (p) => p.startsWith('/live') || p.startsWith('/leaderboards') || p.startsWith('/season') },
  { id: 'profile', href: '/profile/me', label: 'Профиль', icon: I.profile, match: (p) => p.startsWith('/profile') || p.startsWith('/u/') },
]
