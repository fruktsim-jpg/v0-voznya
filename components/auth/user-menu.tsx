'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { TelegramLoginButton } from '@/components/auth/telegram-login-button'
import { onBalanceChanged } from '@/lib/balance-events'
import { VoznyaCoin, Glyph, type GlyphName } from '@/components/ds/icon'

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
  | { kind: 'link'; id: string; label: string; icon: GlyphName; href: string }
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
    { kind: 'link', id: 'profile', label: 'Профиль', icon: 'profile', href: profile },
    { kind: 'link', id: 'season', label: 'Сезон', icon: 'season', href: '/season' },
  ]


  if (data.registered) {
    items.push(
      { kind: 'link', id: 'inventory', label: 'Инвентарь', icon: 'inventory', href: '/inventory' },
      { kind: 'link', id: 'achievements', label: 'Достижения', icon: 'trophy', href: `${profile}#achievements` },
    )
  }

  items.push(
    { kind: 'divider', id: 'd-shop' },
    { kind: 'link', id: 'cases', label: 'Кейсы', icon: 'case', href: '/cases' },
    { kind: 'link', id: 'gifts', label: 'Магазин', icon: 'shop', href: '/gifts' },
  )


  if (data.isAdmin) {
    items.push(
      { kind: 'divider', id: 'd-admin' },
      { kind: 'link', id: 'admin', label: 'Админка', icon: 'shield', href: '/admin' },
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

  // Re-fetch the summary (balance/rank). Called on mount AND whenever a balance
  // changing action fires notifyBalanceChanged() — so the header chip updates in
  // real time after a case open / sell / shop buy, без F5 (P5).
  const refresh = useCallback(() => {
    let alive = true
    fetch('/api/me/summary', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Summary>) : Promise.reject()))
      .then((d) => {
        if (alive) setData(d)
      })
      .catch(() => {
        if (alive) setData((prev) => prev ?? { authenticated: false })
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => refresh(), [refresh])

  // Live balance updates: any action that changes eshki dispatches the event.
  useEffect(() => onBalanceChanged(refresh), [refresh])


  // Initial state — render a spacer to avoid layout flash.
  if (data === null) {
    return <div className="h-9 w-9" aria-hidden />
  }

  if (!data.authenticated) {
    return <TelegramLoginButton botId={botId} oidcEnabled={oidcEnabled} />
  }


  const displayName = data.name?.trim() || 'Игрок'
  const initial = displayName.replace(/^@/, '').charAt(0).toUpperCase() || 'И'

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
        {/* Имя прячем на мобиле: в шапке важнее баланс (он живёт в отдельной
            пилюле shell). */}
        <span className="hidden max-w-[6rem] truncate sm:inline sm:max-w-[9rem]">{displayName}</span>
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
                  {data.balance !== null && <><span className="type-economy">{formatEsh(data.balance)}</span> <VoznyaCoin tone="muted" /></>}
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
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
                >
                  <Glyph name={item.icon} className="shrink-0 text-base text-muted-foreground" />
                  {item.label}
                </Link>
              ),
            )}

            <div className="my-1 border-t border-border/60" />

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                <Glyph name="logout" className="shrink-0 text-base" />
                Выйти
              </button>
            </form>
          </div>

        </>
      )}
    </div>
  )
}
