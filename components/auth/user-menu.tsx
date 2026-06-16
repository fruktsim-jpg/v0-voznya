'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TelegramLoginButton } from '@/components/auth/telegram-login-button'
import { onBalanceChanged } from '@/lib/balance-events'
import { Glyph, type GlyphName } from '@/components/ds/icon'

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
      mmrRank?: { name: string; emoji: string } | null
      season?: { division?: { name: string } | null } | null
    }


interface UserMenuProps {
  /** Public Telegram bot id, forwarded to the login button (classic fallback). */
  botId?: string | null
  /** When true, the login button starts the Telegram OIDC flow. */
  oidcEnabled?: boolean
}

type AuthedSummary = Extract<Summary, { authenticated: true }>

/**
 * Player Control Center (E0.3)
 * ============================
 * The avatar dropdown is the player's *account*, not a second navigation menu.
 *
 * Hard rules enforced here (E0.3 + E0.4 "one info = one home"):
 *   - NO bottom-nav destinations are repeated. Главная/Кейсы/Инвентарь/Магазин/
 *     Лидеры/Профиль all live in the bottom nav; the menu never re-lists them as
 *     plain links (Профиль is reachable by tapping the identity header itself).
 *   - NO balance/#rank restatement. The shell pills own those numbers; the menu
 *     header shows *status* (MMR rank / division), which is identity, not a
 *     duplicated metric.
 *   - Navigation and utilities are not mixed. Sections are grouped and labelled:
 *     identity → Прогресс → Аккаунт → Выйти.
 *   - Owned glyphs only, no emoji chrome.
 *
 * Reads /api/me/summary on the client so the layout stays a server component.
 * That endpoint is read-only and never mutates game state.
 */

type MenuLink = { id: string; label: string; hint?: string; icon: GlyphName; href: string }
type MenuGroup = { id: string; label: string; items: MenuLink[] }

function MENU_GROUPS(data: AuthedSummary): MenuGroup[] {
  const groups: MenuGroup[] = [
    {
      id: 'progress',
      label: 'Прогресс',
      items: [
        { id: 'stats', label: 'Моя статистика', hint: 'Кто я и как расту', icon: 'chart', href: '/stats' },
        { id: 'season', label: 'Сезон', hint: 'Дивизион и титулы', icon: 'season', href: '/season' },
      ],
    },
  ]

  const account: MenuLink[] = [
    { id: 'settings', label: 'Настройки', hint: 'Аккаунт и предпочтения', icon: 'settings', href: '/settings' },
  ]
  if (data.isAdmin) {
    account.push({ id: 'admin', label: 'Командный центр', hint: 'Управление Возней', icon: 'shield', href: '/admin' })
  }
  groups.push({ id: 'account', label: 'Аккаунт', items: account })

  return groups
}


/**
 * Header auth control. Logged out → branded Telegram button. Logged in →
 * avatar trigger opening the Player Control Center described above.
 */
export function UserMenu({ botId, oidcEnabled }: UserMenuProps = {}) {
  const [data, setData] = useState<Summary | null>(null)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

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
  useEffect(() => onBalanceChanged(refresh), [refresh])

  // Close on Escape — premium menus respect the keyboard.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Initial state — render a spacer to avoid layout flash.
  if (data === null) {
    return <div className="h-9 w-9" aria-hidden />
  }

  if (!data.authenticated) {
    return <TelegramLoginButton botId={botId} oidcEnabled={oidcEnabled} />
  }

  const displayName = data.name?.trim() || 'Игрок'
  const initial = displayName.replace(/^@/, '').charAt(0).toUpperCase() || 'И'
  const profileHref = `/profile/${data.userId}`
  // Status line = identity (MMR rank / division), NOT balance/#rank (shell owns those).
  const statusBits = [data.mmrRank?.name, data.season?.division?.name].filter(Boolean) as string[]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group inline-flex h-9 items-center gap-2 rounded-full border border-primary/40 bg-primary/15 pl-1 pr-2.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-primary/60 hover:bg-primary/25 active:scale-[0.97]"
      >
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoUrl}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover shadow-inner ring-1 ring-white/15 transition group-hover:ring-primary/40"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground shadow-inner ring-1 ring-white/10">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[6rem] truncate sm:inline sm:max-w-[9rem]">{displayName}</span>
        <Glyph
          name="chevronUp"
          className={`hidden h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 sm:block ${open ? '' : 'rotate-180'}`}
        />
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
            ref={panelRef}
            role="menu"
            className="absolute right-0 z-50 mt-2 max-h-[calc(100svh-5rem)] w-[17rem] max-w-[calc(100vw-1.5rem)] origin-top-right animate-[menuIn_140ms_ease-out] overflow-y-auto rounded-2xl border border-border bg-background/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            {/* Identity header — the whole block is the link to my profile.
                This is how Профиль stays reachable WITHOUT duplicating the nav
                tab as a plain row. Shows status (rank/division), not balance. */}
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="group/id flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-primary/10"
            >
              {data.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.photoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover ring-1 ring-white/15"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-base font-bold text-primary-foreground ring-1 ring-white/10">
                  {initial}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{displayName}</span>
                <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  {statusBits.length > 0 ? (
                    <>
                      {data.mmrRank?.emoji && <span aria-hidden="true">{data.mmrRank.emoji}</span>}
                      {statusBits.join(' · ')}
                    </>
                  ) : (
                    'Мой профиль'
                  )}
                </span>
              </span>
              <Glyph
                name="chevronUp"
                className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground/60 transition-transform group-hover/id:translate-x-0.5"
              />
            </Link>

            {/* Grouped destinations — labelled sections, navigation kept apart
                from utilities. Only non-duplicated destinations appear. */}
            {MENU_GROUPS(data).map((group) => (
              <div key={group.id} className="mt-1.5">
                <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="group/row flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white/[0.03] text-muted-foreground transition-colors group-hover/row:border-primary/40 group-hover/row:text-primary">
                      <Glyph name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      {item.hint && (
                        <span className="block truncate text-[11px] text-muted-foreground">{item.hint}</span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            ))}

            <div className="mx-2 my-1.5 border-t border-border/60" />

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="group/out flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-200"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white/[0.03] transition-colors group-hover/out:border-rose-400/40 group-hover/out:text-rose-300">
                  <Glyph name="logout" className="h-4 w-4" />
                </span>
                Выйти
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
