'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TelegramLoginButton } from '@/components/auth/telegram-login-button'

type Me =
  | { authenticated: false }
  | {
      authenticated: true
      userId: number
      username: string | null
      firstName: string | null
      registered: boolean
    }

/**
 * Header auth control.
 *
 * - Logged out: renders the Telegram Login Widget.
 * - Logged in: shows "Мой профиль" (links to /profile/{uid}) and "Выйти".
 *
 * Reads /api/auth/me on the client so the layout can stay a server component.
 */
export function UserMenu() {
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/auth/me')
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : Promise.reject()))
      .then((data) => {
        if (alive) setMe(data)
      })
      .catch(() => {
        if (alive) setMe({ authenticated: false })
      })
    return () => {
      alive = false
    }
  }, [])

  // Initial state — render nothing to avoid layout flash.
  if (me === null) {
    return <div className="min-h-[40px]" aria-hidden />
  }

  if (!me.authenticated) {
    return <TelegramLoginButton />
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/profile/${me.userId}`}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
      >
        👤 Мой профиль
      </Link>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Выйти
        </button>
      </form>
    </div>
  )
}
