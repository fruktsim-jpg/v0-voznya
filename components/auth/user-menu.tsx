'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TelegramLoginButton } from '@/components/auth/telegram-login-button'

type Summary =
  | { authenticated: false }
  | {
      authenticated: true
      userId: number
      registered: boolean
      name: string | null
      balance: number | null
      rank: number | null
    }

function formatEsh(n: number): string {
  return n.toLocaleString('ru-RU')
}

/**
 * Header auth control — makes the site feel like part of Возня rather than an
 * external service.
 *
 * - Logged out: branded "Войти через Telegram" button.
 * - Logged in: compact user block with the player's name, a "Мой профиль" link
 *   and a logout action. When the user is a registered player we also surface
 *   their ешки balance and leaderboard rank.
 *
 * Reads /api/me/summary on the client so the layout stays a server component.
 * That endpoint is read-only and never mutates the game state.
 */
export function UserMenu() {
  const [data, setData] = useState<Summary | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/me/summary')
      .then((r) => (r.ok ? (r.json() as Promise<Summary>) : Promise.reject()))
      .then((d) => {
        if (alive) setData(d)
      })
      .catch(() => {
        if (alive) setData({ authenticated: false })
      })
    return () => {
      alive = false
    }
  }, [])

  // Initial state — render a spacer to avoid layout flash.
  if (data === null) {
    return <div className="min-h-[40px]" aria-hidden />
  }

  if (!data.authenticated) {
    return <TelegramLoginButton />
  }

  const displayName = data.name?.trim() || 'Игрок'
  const initial = displayName.replace(/^@/, '').charAt(0).toUpperCase() || '👤'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/30 text-xs font-bold">
          {initial}
        </span>
        <span className="max-w-[8rem] truncate">{displayName}</span>
        {data.registered && data.balance !== null && (
          <span className="hidden rounded-full bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
            {formatEsh(data.balance)} 🥚
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away layer */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-xl backdrop-blur-md"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              {data.registered ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.balance !== null && <>{formatEsh(data.balance)} 🥚</>}
                  {data.rank !== null && <> · #{data.rank} в топе</>}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">Ещё не в игре</p>
              )}
            </div>

            <Link
              href={`/profile/${data.userId}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
            >
              👤 Мой профиль
            </Link>

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                Выйти
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
