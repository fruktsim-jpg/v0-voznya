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

interface UserMenuProps {
  /** Public Telegram bot id, forwarded to the login button. */
  botId?: string | null
}

function formatEsh(n: number): string {
  return n.toLocaleString('ru-RU')
}

/**
 * Header auth control — keeps the site feeling like part of Возня.
 *
 * - Logged out: branded "Войти через Telegram" button.
 * - Logged in: compact trigger (avatar + name) opening a small dropdown with
 *   the player's name, "Мой профиль" and "Выйти". Balance/rank appear as one
 *   subtle line in the dropdown header for registered players only.
 *
 * Reads /api/me/summary on the client so the layout stays a server component.
 * That endpoint is read-only and never mutates the game state. Balance and rank
 * come from the SAME users table / ranking as the public profile page, so the
 * numbers match what /profile/{uid} shows.
 */
export function UserMenu({ botId }: UserMenuProps = {}) {
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
    return <div className="h-9 w-9" aria-hidden />
  }

  if (!data.authenticated) {
    return <TelegramLoginButton botId={botId} />
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
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 pl-1 pr-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/30 text-xs font-bold">
          {initial}
        </span>
        <span className="max-w-[6rem] truncate sm:max-w-[9rem]">{displayName}</span>
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
            className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur-md"
          >
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              {data.registered && (data.balance !== null || data.rank !== null) && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {data.balance !== null && <>{formatEsh(data.balance)} 🥚</>}
                  {data.balance !== null && data.rank !== null && <> · </>}
                  {data.rank !== null && <>#{data.rank} в топе</>}
                </p>
              )}
            </div>

            <Link
              href={`/profile/${data.userId}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
            >
              👤 Мой профиль
            </Link>

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                🚪 Выйти
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
