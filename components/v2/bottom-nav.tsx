'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Основная навигация V3 (Polish Pass). Достойна остального сайта: чистые
 * line-иконки (SVG, не эмодзи), единый стиль на mobile / tablet / desktop.
 * — mobile: фиксированный нижний бар (app-feel);
 * — sm+ : тот же набор пунктов плавающей таблеткой по центру снизу,
 *   с подписями, чтобы навигация читалась и на планшете/десктопе.
 * Скрыта в админке.
 */

type Item = { href: string; label: string; icon: ReactNode; match: (p: string) => boolean }

const I = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  ),
  live: <path d="M4 12h3l2 6 4-14 2 8h5" />,
  cases: (
    <>
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" />
      <path d="M3 8.5 12 13l9-4.5M12 13v7" />
    </>
  ),
  gifts: (
    <>
      <rect x="3.5" y="9" width="17" height="11" rx="1.5" />
      <path d="M3.5 13h17M12 9v11M12 9c-2-3-6-3-6-.5 0 1.5 3 .5 6 .5zM12 9c2-3 6-3 6-.5 0 1.5-3 .5-6 .5z" />
    </>
  ),
  casino: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1.2" />
      <circle cx="15" cy="15" r="1.2" />
      <circle cx="15" cy="9" r="1.2" />
      <circle cx="9" cy="15" r="1.2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
    </>
  ),
}

// Профиль намеренно НЕ дублируется здесь: вход в профиль и его разделы живёт
// в меню пользователя (верхний правый угол). Так нижний бар не повторяет то,
// что уже доступно сверху, и держит 5 пунктов вместо 6 — просторнее на мобиле.
const ITEMS: Item[] = [
  { href: '/', label: 'Главная', icon: I.home, match: (p) => p === '/' },
  { href: '/live', label: 'Live', icon: I.live, match: (p) => p.startsWith('/live') },

  { href: '/cases', label: 'Кейсы', icon: I.cases, match: (p) => p.startsWith('/cases') },
  { href: '/gifts', label: 'Подарки', icon: I.gifts, match: (p) => p.startsWith('/gifts') },
  { href: '/casino', label: 'Казино', icon: I.casino, match: (p) => p.startsWith('/casino') },
]


function NavIcon({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function BottomNav() {
  const pathname = usePathname() || '/'
  if (pathname.startsWith('/admin')) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 sm:bottom-4"
      aria-label="Основная навигация"
    >
      <div
        className="mx-auto flex max-w-md items-stretch justify-around border-t border-white/10 bg-background/85 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:max-w-fit sm:gap-1 sm:rounded-full sm:border sm:px-2 sm:py-1.5 sm:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]"
      >
        {ITEMS.map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`group flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 transition sm:flex-none sm:flex-row sm:gap-2 sm:px-4 ${
                active
                  ? 'text-primary sm:bg-primary/15'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <NavIcon active={active}>{item.icon}</NavIcon>
              <span className="text-[10px] font-medium sm:text-sm">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
