'use client'

// Tiny client-side pub/sub so the header balance updates in REAL TIME (P5)
// after a case open / sell / shop buy — без F5. The UserMenu subscribes and
// re-fetches /api/me/summary; any action that changes the balance fires
// notifyBalanceChanged(). A websocket is overkill at this scale (per the spec),
// a cache-invalidate event is enough.
//
// SSR-safe: guards window access so importing in a server bundle is harmless.

const EVENT = 'voznya:balance-changed'

/** Notify all listeners that the player's balance may have changed. */
export function notifyBalanceChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT))
}

/** Subscribe to balance-change events. Returns an unsubscribe function. */
export function onBalanceChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
