'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { NAV_ITEMS } from './nav-config'

/**
 * GlobalNav (Redesign V2, Stage 1) — основная навигация, управляемая конфигом
 * (`nav-config.tsx`). Достойна остального продукта: чистые line-иконки (SVG, не
 * эмодзи), единый стиль на mobile / tablet / desktop.
 *   - mobile: фиксированный нижний бар (app-feel);
 *   - sm+   : тот же набор плавающей таблеткой по центру снизу, с подписями.
 * Скрыта в админке (у неё свой shell). Поведение видимости и safe-area
 * полностью повторяет прежний BottomNav — глобальная замена без сюрпризов.
 *
 * Поддерживает href с якорем (#top-rich): сравнение активности идёт по pathname.
 */
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

export function GlobalNav() {
  const pathname = usePathname() || '/'
  if (pathname.startsWith('/admin')) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 sm:bottom-4" aria-label="Основная навигация">
      <div className="mx-auto flex max-w-lg items-stretch justify-around border-t border-white/10 bg-background/85 px-1 pb-[max(env(safe-area-inset-bottom),var(--tg-safe-bottom,0px))] backdrop-blur-xl sm:max-w-fit sm:gap-1 sm:rounded-full sm:border sm:px-2 sm:py-1.5 sm:pb-1.5 sm:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`group flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 transition active:scale-[0.96] sm:min-h-0 sm:flex-none sm:flex-row sm:gap-2 sm:px-3.5 ${
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
