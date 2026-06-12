'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity } from 'lucide-react'
import { UserMenu } from '@/components/auth/user-menu'
import { prestigeForMmrRank } from '@/lib/ds/prestige'
import { Glyph, VoznyaCoin } from '@/components/ds/icon'
import { onBalanceChanged } from '@/lib/balance-events'

/**
 * UnifiedShell (Phase E0.1) — the SINGLE top bar of the Mini-App.
 *
 * Replaces the two stacked fixed bars (SiteHeader + PlayerContextBar) and the
 * `has-context-bar` body-class that hand-synced their combined height. There is
 * now ONE bar, ONE height token (`--shell-h`, see globals.css + shell-contract),
 * ONE safe-area contract.
 *
 * It TRANSFORMS between two states (the decision locked in EVO §3d):
 *   • IDLE (at top):     taller, transparent — the world/atmosphere shows through.
 *   • SCROLLED (>12px):  condensed, blurred, bordered — gets out of the way.
 * It never hides the balance and never splits into a second strip.
 *
 * §3e source-of-truth law — the permanent HUD carries ONLY the chrome-worthy set:
 *   avatar (UserMenu) · balance · ONE rank pill (#place) · search/stats.
 * Division / MMR / season place are NOT restated here — they live on Profile /
 * Season. A faint MMR-tier WASH "dresses" the bar in the player's standing
 * (atmosphere, not a duplicated number).
 *
 * Reads the same read-only `/api/me/summary` slice; the bot owns all writes.
 * Hidden in /admin (own shell) and for guests/unregistered (UserMenu still shows
 * the login button there).
 */
type MmrRank = { minMmr: number; emoji: string; name: string }
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
      mmr?: number | null
      mmrRank?: MmrRank | null
    }

function formatEsh(n: number): string {
  return n.toLocaleString('ru-RU')
}

export function UnifiedShell({
  botId,
  oidcEnabled,
}: {
  botId?: string | null
  oidcEnabled?: boolean
}) {
  const pathname = usePathname() || '/'
  const [scrolled, setScrolled] = useState(false)
  const [data, setData] = useState<Summary | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  const onAdmin = pathname.startsWith('/admin')

  // The registered-player identity cluster (balance + one rank pill) shows only
  // for authenticated, registered players outside admin.
  const player =
    !onAdmin && data && data.authenticated && data.registered
      ? (data as Extract<Summary, { authenticated: true }>)
      : null

  // B4 (prestige consumption): faint MMR-tier wash so the bar that follows the
  // player everywhere is "dressed" in their standing — atmosphere, NOT a datum.
  const tier = player?.mmrRank ? prestigeForMmrRank(player.mmrRank.name) : null
  const tierHigh = tier ? tier.index >= 2 : false

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[var(--shell-z)] pt-safe transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none ${
        scrolled
          ? 'border-b border-border bg-background/80 backdrop-blur-md'
          : 'border-b border-transparent'
      }`}
      style={
        tierHigh && !scrolled
          ? { background: `linear-gradient(90deg, ${tier!.color}10, transparent 55%)` }
          : undefined
      }
    >
      <div
        className="mx-auto flex max-w-6xl items-center justify-between px-safe transition-[height] duration-300 motion-reduce:transition-none sm:px-6"
        style={{ height: scrolled ? 'var(--shell-h-min)' : 'var(--shell-h)' }}
      >
        {/* Brand */}
        <Link
          href="/"
          className={`font-bold tracking-tight text-gradient transition-[font-size] duration-300 motion-reduce:transition-none ${
            scrolled ? 'text-base' : 'text-lg'
          }`}
        >
          ВОЗНЯ
        </Link>

        {/* Chrome cluster: stats · balance · one rank pill · avatar/menu */}
        <div className="flex items-center gap-2">
          {/* Search / Stats (desktop accent; mobile keeps Live in bottom nav). */}
          <Link
            href="/live"
            aria-label="Живая статистика"
            className="group hidden h-9 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20 sm:inline-flex"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Activity className="h-4 w-4 text-primary" />
            <span>Статистика</span>
          </Link>

          {/* ONE rank pill — the leaderboard place. The single rank in chrome
              (§3e); division/MMR are NOT restated here. */}
          {player && player.rank !== null && (
            <Link
              href="/live#top-rich"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              aria-label={`Место в топе: ${player.rank}`}
            >
              <Glyph name="trophy" className="text-accent-gold" />
              <span className="font-mono tabular-nums">#{player.rank}</span>
            </Link>
          )}

          {/* Balance — the one always-visible economic anchor. Lives ONCE, here. */}
          {player && player.balance !== null && (
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25"
              aria-label={`Баланс: ${formatEsh(player.balance)} ешек`}
            >
              <span className="font-mono tabular-nums">{formatEsh(player.balance)}</span>
              <VoznyaCoin tone="gold" />
            </Link>
          )}

          {/* Avatar + dropdown (logged in) / login button (guest). Balance chip
              was removed from this control — balance lives in the pill above. */}
          <UserMenu botId={botId} oidcEnabled={oidcEnabled} />
        </div>
      </div>
    </header>
  )
}
