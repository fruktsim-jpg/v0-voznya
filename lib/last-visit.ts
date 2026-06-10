'use client'

/**
 * Client-side "last visit" marker (VOZNYA REDESIGN — Home Hub).
 *
 * APPROVED DATA DECISION: the "While you were away" digest uses a browser-only
 * localStorage marker. There is NO server-side last-seen column and the website
 * must not write game tables, so this is intentionally client-only:
 *   - read-only against the bot DB,
 *   - per-device (not synced), which is acceptable for a re-engagement hook,
 *   - degrades to "Recent activity" when no marker exists yet.
 *
 * The marker is namespaced per user so switching accounts on one device does
 * not leak another user's "while away" window.
 */
const KEY_PREFIX = 'voznya:last-visit:'

function key(userId: number): string {
  return `${KEY_PREFIX}${userId}`
}

/** Reads the previous visit time (ms epoch), or null when none/unavailable. */
export function readLastVisit(userId: number): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key(userId))
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

/** Stores the current time as the latest visit. Best-effort, never throws. */
export function writeLastVisit(userId: number, when: number = Date.now()): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(userId), String(when))
  } catch {
    // Private mode / disabled storage — the digest simply degrades.
  }
}
