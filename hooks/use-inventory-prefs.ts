'use client'

// Client-only inventory PREFERENCES (VOZNYA Stage 2 — Inventory Redesign).
//
// Favorites + Showcase pins live entirely in localStorage. This is intentional:
// Stage 2's STRICT RULES forbid backend / DB / API changes. These prefs are the
// UX foundation for future profile showcases, leaderboards and player cards —
// when a backend lands (future stage) the same hook surface can be re-pointed
// at an API without touching any consumer component.
//
// No `pg`, no fetch, SSR-safe (guards `window`). Cross-tab + same-tab sync via a
// storage event + a custom event, mirroring lib/balance-events.ts.

import { useCallback, useEffect, useState } from 'react'

const FAV_KEY = 'voznya.inv.favorites.v1'
const SHOWCASE_KEY = 'voznya.inv.showcase.v1'
const SYNC_EVENT = 'voznya:inv-prefs'

/** Max items a player can pin to their showcase (profile card slots). */
export const SHOWCASE_SLOTS = 6

function read(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(key: string, ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(ids))
    window.dispatchEvent(new CustomEvent(SYNC_EVENT))
  } catch {
    // storage full / disabled — degrade silently (prefs are non-critical).
  }
}

function usePersistentIds(key: string) {
  const [ids, setIds] = useState<string[]>([])

  // Hydrate after mount (avoids SSR/client mismatch).
  useEffect(() => {
    setIds(read(key))
    const sync = () => setIds(read(key))
    window.addEventListener('storage', sync)
    window.addEventListener(SYNC_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(SYNC_EVENT, sync)
    }
  }, [key])

  const set = useCallback(
    (next: string[]) => {
      setIds(next)
      write(key, next)
    },
    [key],
  )

  return [ids, set] as const
}

export function useFavorites() {
  const [ids, set] = usePersistentIds(FAV_KEY)
  const isFavorite = useCallback((id: string) => ids.includes(id), [ids])
  const toggle = useCallback(
    (id: string) => set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    [ids, set],
  )
  // Drop ids that no longer exist in the live inventory (e.g. a gift was sold /
  // withdrawn / gifted). Only writes when something actually changed, so it is
  // safe to call on every inventory change.
  const reconcile = useCallback(
    (liveIds: Set<string>) => {
      const next = ids.filter((id) => liveIds.has(id))
      if (next.length !== ids.length) set(next)
    },
    [ids, set],
  )
  return { favorites: ids, isFavorite, toggle, reconcile, count: ids.length }
}

export function useShowcase() {
  const [ids, set] = usePersistentIds(SHOWCASE_KEY)
  const isPinned = useCallback((id: string) => ids.includes(id), [ids])
  const full = ids.length >= SHOWCASE_SLOTS
  const toggle = useCallback(
    (id: string) => {
      if (ids.includes(id)) {
        set(ids.filter((x) => x !== id))
      } else if (ids.length < SHOWCASE_SLOTS) {
        set([...ids, id])
      }
      // Silently no-op when full — UI surfaces the limit.
    },
    [ids, set],
  )
  // Prune pins whose item is gone so consumed gifts don't keep occupying slots
  // (which would otherwise keep `full`/`count` inflated against empty slots).
  const reconcile = useCallback(
    (liveIds: Set<string>) => {
      const next = ids.filter((id) => liveIds.has(id))
      if (next.length !== ids.length) set(next)
    },
    [ids, set],
  )
  return { pinned: ids, isPinned, toggle, reconcile, count: ids.length, full, slots: SHOWCASE_SLOTS }
}
