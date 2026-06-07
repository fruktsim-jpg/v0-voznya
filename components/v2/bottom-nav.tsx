'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Мобильная нижняя навигация V2 (VOZNYA_UI_UX_V2_IMPLEMENTATION_PLAN §9).
 * Telegram-first: фиксированная панель, скрыта на desktop (sm+). Главный
 * носитель app-ощущения. Разделы: Главная · Live · Кейсы · Подарки · Профиль.
 */

const ITEMS = [
  { href: '/', label: 'Главная', icon: '🏠', match: (p: string) => p === '/' },
  { href: '/live-v2', label: 'Live', icon: '🔥', match: (p: string) => p.startsWith('/live') },

  { href: '/cases', label: 'Кейсы', icon: '📦', match: (p: string) => p.startsWith('/cases') },
  { href: '/gifts', label: 'Подарки', icon: '🎁', match: (p: string) => p.startsWith('/gifts') },
  { href: '/profile/me', label: 'Профиль', icon: '👤', match: (p: string) => p.startsWith('/profile') },
]

export function BottomNav() {
  const pathname = usePathname() || '/'

  // Не показываем в админке.
  if (pathname.startsWith('/admin')) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/90 backdrop-blur-xl sm:hidden"
      aria-label="Основная навигация"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const active = item.match(pathname)
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
