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
      photoUrl?: string | null
      isAdmin?: boolean
    }


interface UserMenuProps {
  /** Public Telegram bot id, forwarded to the login button (classic fallback). */
  botId?: string | null
  /** When true, the login button starts the Telegram OIDC flow. */
  oidcEnabled?: boolean
}


function formatEsh(n: number): string {
  return n.toLocaleString('ru-RU')
}

type AuthedSummary = Extract<Summary, { authenticated: true }>
type MenuEntry =
  | { kind: 'link'; id: string; label: string; href: string }
  | { kind: 'divider'; id: string }

/**
 * Builds the dropdown entries from the user summary. Every link points to a
 * route that already exists (no invented pages):
 *   - Ð¿Ñ€Ð¾Ñ„Ð¸Ð»ÑŒ Ð¸ ÐµÐ³Ð¾ ÑÐºÐ¾Ñ€Ñ (#inventory / #achievements Ð¶Ð¸Ð²ÑƒÑ‚ Ð² PlayerCard);
 *   - ÐºÐµÐ¹ÑÑ‹ / Ð¿Ð¾Ð´Ð°Ñ€ÐºÐ¸ â€” ÑÑƒÑ‰ÐµÑÑ‚Ð²ÑƒÑŽÑ‰Ð¸Ðµ ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ñ‹ ÑÐ°Ð¹Ñ‚Ð°;
 *   - Ð°Ð´Ð¼Ð¸Ð½ÐºÐ° â€” Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð¿Ñ€Ð¸ Ð½Ð°Ð»Ð¸Ñ‡Ð¸Ð¸ Ñ€Ð¾Ð»Ð¸.
 * Ð¯ÐºÐ¾Ñ€Ñ Ð¿Ñ€Ð¾Ñ„Ð¸Ð»Ñ Ð¿Ð¾ÐºÐ°Ð·Ñ‹Ð²Ð°ÐµÐ¼ Ð»Ð¸ÑˆÑŒ Ð·Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ñ‹Ð¼ Ð¸Ð³Ñ€Ð¾ÐºÐ°Ð¼ (Ñƒ Ð½ÐµÐ·Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ñ‹Ñ…
 * ÐºÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÐ¸ Ð¸ ÑÑ‚Ð¸Ñ… ÑÐµÐºÑ†Ð¸Ð¹ Ð½ÐµÑ‚).
 */
function MENU_ITEMS(data: AuthedSummary): MenuEntry[] {
  const profile = `/profile/${data.userId}`
  const items: MenuEntry[] = [
    { kind: 'link', id: 'profile', label: 'ðŸ‘¤ ÐŸÑ€Ð¾Ñ„Ð¸Ð»ÑŒ', href: profile },
  ]

  if (data.registered) {
    items.push(
      { kind: 'link', id: 'inventory', label: 'ðŸŽ’ Ð˜Ð½Ð²ÐµÐ½Ñ‚Ð°Ñ€ÑŒ', href: `${profile}#inventory` },
      { kind: 'link', id: 'achievements', label: 'ðŸ† Ð”Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ', href: `${profile}#achievements` },
    )
  }

  items.push(
    { kind: 'divider', id: 'd-shop' },
    { kind: 'link', id: 'cases', label: 'ðŸ“¦ ÐšÐµÐ¹ÑÑ‹', href: '/cases' },
    { kind: 'link', id: 'gifts', label: 'ðŸŽ ÐŸÐ¾Ð´Ð°Ñ€ÐºÐ¸', href: '/gifts' },
  )

  if (data.isAdmin) {
    items.push(
      { kind: 'divider', id: 'd-admin' },
      { kind: 'link', id: 'admin', label: 'ðŸ›¡ ÐÐ´Ð¼Ð¸Ð½ÐºÐ°', href: '/admin' },
    )
  }

  return items
}


/**
 * Header auth control â€” keeps the site feeling like part of Ð’Ð¾Ð·Ð½Ñ.
 *
 * - Logged out: branded "Ð’Ð¾Ð¹Ñ‚Ð¸ Ñ‡ÐµÑ€ÐµÐ· Telegram" button.
 * - Logged in: compact trigger (avatar + name) opening a small dropdown with
 *   the player's name, "ÐœÐ¾Ð¹ Ð¿Ñ€Ð¾Ñ„Ð¸Ð»ÑŒ" and "Ð’Ñ‹Ð¹Ñ‚Ð¸". Balance/rank appear as one
 *   subtle line in the dropdown header for registered players only.
 *
 * Reads /api/me/summary on the client so the layout stays a server component.
 * That endpoint is read-only and never mutates the game state. Balance and rank
 * come from the SAME users table / ranking as the public profile page, so the
 * numbers match what /profile/{uid} shows.
 */
export function UserMenu({ botId, oidcEnabled }: UserMenuProps = {}) {

  const [data, setData] = useState<Summary | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/me/summary', { cache: 'no-store' })
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

  // Initial state â€” render a spacer to avoid layout flash.
  if (data === null) {
    return <div className="h-9 w-9" aria-hidden />
  }

  if (!data.authenticated) {
    return <TelegramLoginButton botId={botId} oidcEnabled={oidcEnabled} />
  }


  const displayName = data.name?.trim() || 'Ð˜Ð³Ñ€Ð¾Ðº'
  const initial = displayName.replace(/^@/, '').charAt(0).toUpperCase() || 'ðŸ‘¤'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/50 bg-primary/20 pl-1 pr-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-primary/30"
      >
        {/* Avatar: real Telegram photo when we have it, else gradient initial. */}
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover shadow-inner ring-1 ring-white/15"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground shadow-inner">
            {initial}
          </span>
        )}
        <span className="max-w-[6rem] truncate sm:max-w-[9rem]">{displayName}</span>
        {/* Balance chip â€” ÑÐ°Ð¼Ð¾Ðµ Ñ†ÐµÐ½Ð½Ð¾Ðµ Ñ‡Ð¸ÑÐ»Ð¾ Ð¿Ð¾Ð´ Ñ€ÑƒÐºÐ¾Ð¹. Ð¢Ð¾Ð»ÑŒÐºÐ¾ Ð´Ð»Ñ
            Ð·Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ñ‹Ñ… Ð¸ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð½Ð° sm+, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð½Ðµ Ð¿ÐµÑ€ÐµÐ¿Ð¾Ð»Ð½ÑÑ‚ÑŒ Ð¼Ð¾Ð±Ð°Ð¹Ð». */}
        {data.registered && data.balance !== null && (
          <span className="hidden items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-200 sm:inline-flex">
            {formatEsh(data.balance)} ðŸ¥š
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
            className="absolute right-0 z-50 mt-2 max-h-[calc(100svh-5rem)] w-60 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur-md"
          >
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              {data.registered && (data.balance !== null || data.rank !== null) && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {data.balance !== null && <>{formatEsh(data.balance)} ðŸ¥š</>}
                  {data.balance !== null && data.rank !== null && <> Â· </>}
                  {data.rank !== null && <>#{data.rank} Ð² Ñ‚Ð¾Ð¿Ðµ</>}
                </p>
              )}
            </div>

            {/* ÐŸÑ€Ð¾Ñ„Ð¸Ð»ÑŒ Ð¸ ÐµÐ³Ð¾ Ñ€Ð°Ð·Ð´ÐµÐ»Ñ‹. Ð”Ð»Ñ Ð·Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ñ‹Ñ… Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Ð´Ð¾Ð±Ð°Ð²Ð»ÑÐµÐ¼
                Ð±Ñ‹ÑÑ‚Ñ€Ñ‹Ðµ ÑÐºÐ¾Ñ€Ñ Ð² ÐºÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÑƒ Ð¿Ñ€Ð¾Ñ„Ð¸Ð»Ñ (Ð¸Ð½Ð²ÐµÐ½Ñ‚Ð°Ñ€ÑŒ/Ð´Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ), ÐºÐ¾Ñ‚Ð¾Ñ€Ñ‹Ðµ
                Ñ€ÐµÐ°Ð»ÑŒÐ½Ð¾ ÑÑƒÑ‰ÐµÑÑ‚Ð²ÑƒÑŽÑ‚ Ð² PlayerCard. ÐœÐ°Ð³Ð°Ð·Ð¸Ð½Ð½Ñ‹Ðµ Ñ€Ð°Ð·Ð´ÐµÐ»Ñ‹ (ÐºÐµÐ¹ÑÑ‹,
                Ð¿Ð¾Ð´Ð°Ñ€ÐºÐ¸) Ð²ÐµÐ´ÑƒÑ‚ Ð½Ð° ÑÑƒÑ‰ÐµÑÑ‚Ð²ÑƒÑŽÑ‰Ð¸Ðµ ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ñ‹ ÑÐ°Ð¹Ñ‚Ð°. Â«ÐÐ°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ¸Â»
                Ð½Ð°Ð¼ÐµÑ€ÐµÐ½Ð½Ð¾ Ð½ÐµÑ‚ â€” Ð´Ð»Ñ Ð½Ð¸Ñ… Ð½ÐµÑ‚ ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ñ‹. */}
            {MENU_ITEMS(data).map((item) =>
              item.kind === 'divider' ? (
                <div key={item.id} className="my-1 border-t border-border/60" />
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
                >
                  {item.label}
                </Link>
              ),
            )}

            <div className="my-1 border-t border-border/60" />

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                ðŸšª Ð’Ñ‹Ð¹Ñ‚Ð¸
              </button>
            </form>
          </div>

        </>
      )}
    </div>
  )
}
