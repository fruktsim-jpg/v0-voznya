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
 *   - профиль и его якоря (#inventory / #achievements живут в PlayerCard);
 *   - кейсы / подарки — существующие страницы сайта;
 *   - админка — только при наличии роли.
 * Якоря профиля показываем лишь зарегистрированным игрокам (у незарегистрированных
 * карточки и этих секций нет).
 */
function MENU_ITEMS(data: AuthedSummary): MenuEntry[] {
  const profile = `/profile/${data.userId}`
  const items: MenuEntry[] = [
    { kind: 'link', id: 'profile', label: '👤 Профиль', href: profile },
  ]

  if (data.registered) {
    items.push(
      { kind: 'link', id: 'inventory', label: '🎒 Инвентарь', href: `${profile}#inventory` },
      { kind: 'link', id: 'achievements', label: '🏆 Достижения', href: `${profile}#achievements` },
    )
  }

  items.push(
    { kind: 'divider', id: 'd-shop' },
    { kind: 'link', id: 'cases', label: '📦 Кейсы', href: '/cases' },
    { kind: 'link', id: 'gifts', label: '🎁 Подарки', href: '/gifts' },
  )

  if (data.isAdmin) {
    items.push(
      { kind: 'divider', id: 'd-admin' },
      { kind: 'link', id: 'admin', label: '🛡 Админка', href: '/admin' },
    )
  }

  return items
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
export function UserMenu({ botId, oidcEnabled }: UserMenuProps = {}) {

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
    return <TelegramLoginButton botId={botId} oidcEnabled={oidcEnabled} />
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
        className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/50 bg-primary/20 pl-1 pr-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-primary/30"
      >
        {/* Stronger avatar: solid gradient + white initial so the account is
            clearly the main control on the right, not a faint dot. */}
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground shadow-inner">
          {initial}
        </span>
        <span className="max-w-[6rem] truncate sm:max-w-[9rem]">{displayName}</span>
        {/* Balance chip — самое ценное число под рукой. Только для
            зарегистрированных и только на sm+, чтобы не переполнять мобайл. */}
        {data.registered && data.balance !== null && (
          <span className="hidden items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-200 sm:inline-flex">
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
            className="absolute right-0 z-50 mt-2 max-h-[calc(100svh-5rem)] w-60 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur-md"
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

            {/* Профиль и его разделы. Для зарегистрированных игроков добавляем
                быстрые якоря в карточку профиля (инвентарь/достижения), которые
                реально существуют в PlayerCard. Магазинные разделы (кейсы,
                подарки) ведут на существующие страницы сайта. «Настройки»
                намеренно нет — для них нет страницы. */}
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
                🚪 Выйти
              </button>
            </form>
          </div>

        </>
      )}
    </div>
  )
}
