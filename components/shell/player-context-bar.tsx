'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from '@/components/ds/avatar'
import { prestigeForDivision, prestigeForMmrRank } from '@/lib/ds/prestige'
import { onBalanceChanged } from '@/lib/balance-events'

/**
 * PlayerContextBar (VOZNYA REDESIGN — Home Hub) — the persistent, compact twin
 * of the Home identity hero. It is the always-visible "anchor of progression":
 * avatar + name + division + MMR rank + balance + leaderboard place.
 *
 * SHARED IDENTITY SYSTEM: this bar and the Home hero render from the SAME
 * read-only slice — `/api/me/summary` now returns the identity/progression
 * object built by `getIdentityProgression` (the same source Home uses). So the
 * bar and hero can never drift: one data source, one visual language (division
 * color, MMR format, streak). No new contracts, no writes — the bot owns `users`.
 * Updates live via `onBalanceChanged` (case/sell/buy) without an F5.
 *
 * Visibility: hidden in admin (own shell) and for guests/unregistered (they get
 * the onboarding landing). Body class `has-context-bar` compensates top padding
 * only while shown (see globals.css), so guests keep the original layout.
 */
type Division = { name: string; emoji: string; minMmr: number }
type MmrRank = { minMmr: number; emoji: string; name: string }
type Season = {
  name: string
  endsAt: string | null
  seasonMmr: number
  rank: number | null
  division: Division
  nextDivision: Division | null
  ratio: number
  toNext: number
}

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
      reputation?: number | null
      streak?: number
      season?: Season | null
    }

function formatEsh(n: number): string {
  return n.toLocaleString('ru-RU')
}

export function PlayerContextBar() {
  const pathname = usePathname() || '/'
  const [data, setData] = useState<Summary | null>(null)

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

  const visible =
    !pathname.startsWith('/admin') &&
    !!data &&
    data.authenticated &&
    data.registered

  // Toggle the global padding compensation only while the bar is visible.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('has-context-bar', visible)
    return () => {
      document.body.classList.remove('has-context-bar')
    }
  }, [visible])

  if (!visible) return null
  // Narrowing for TS: visible implies authenticated.
  const d = data as Extract<Summary, { authenticated: true }>

  const displayName = d.name?.trim() || 'Игрок'
  const profileHref = `/profile/${d.userId}`
  const season = d.season ?? null
  const progressPct = season ? Math.round(season.ratio * 100) : 0

  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={profileHref}
          className="flex min-w-0 items-center gap-2 transition hover:opacity-90"
          aria-label="Открыть профиль"
        >
          <Avatar src={d.photoUrl} name={displayName} size="sm" />
          <span className="hidden min-w-0 truncate text-sm font-semibold text-foreground sm:inline">
            {displayName}
          </span>
        </Link>

        {/* Division + progress (shared progression language with the hero).
            A4: division TIER WORLD colors the label + bar, so the bar that
            follows the player everywhere reflects their real standing. */}
        {season && (
          <Link
            href="/season"
            className="hidden min-w-0 items-center gap-2 sm:flex"
            aria-label={`Дивизион: ${season.division.name}`}
          >
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: prestigeForDivision(season.division.name).color }}
            >
              <span aria-hidden>{season.division.emoji}</span>
              {season.division.name}
            </span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${prestigeForDivision(season.division.name).color2}, ${prestigeForDivision(season.division.name).color})`,
                }}
              />
            </span>
          </Link>
        )}

        <div className="ml-auto flex items-center gap-2">
          {d.mmrRank && typeof d.mmr === 'number' && (
            <Link
              href={profileHref}
              className="hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-90 sm:inline-flex"
              style={{
                borderColor: `${prestigeForMmrRank(d.mmrRank.name).color}66`,
                color: prestigeForMmrRank(d.mmrRank.name).color,
                background: `${prestigeForMmrRank(d.mmrRank.name).color}12`,
              }}
              aria-label={`Ранг: ${d.mmrRank.name}`}
            >
              <span aria-hidden>{d.mmrRank.emoji}</span>
              <span className="font-mono tabular-nums">{formatEsh(d.mmr)}</span>
            </Link>
          )}
          {d.rank !== null && (
            <Link
              href="/live#top-rich"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              aria-label={`Место в топе: ${d.rank}`}
            >
              <span aria-hidden="true">🏆</span>
              <span className="font-mono tabular-nums">#{d.rank}</span>
            </Link>
          )}
          {d.balance !== null && (
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25"
              aria-label={`Баланс: ${formatEsh(d.balance)} ешек`}
            >
              <span className="font-mono tabular-nums">{formatEsh(d.balance)}</span>
              <span aria-hidden="true">🥚</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
