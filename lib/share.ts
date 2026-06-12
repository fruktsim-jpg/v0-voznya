'use client'

/**
 * Share (Cases Tier 1 — Share Moment).
 *
 * Turns a win into something the player can spread. Real sharing, not a fake
 * button: Web Share API where available (mobile / Telegram in-app), clipboard
 * fallback elsewhere. The share TEXT carries the VOZNYA identity + a link so a
 * paste/share still reads as the brand (the visual win-card — WinShareCard — is
 * the screenshot surface for the richer brand moment, per the docs' v1 rule of
 * a client-rendered card + "screenshot me" affordance, no server image gen).
 *
 * Pure client util. No data, no writes.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

export type ShareWinInput = {
  title: string
  rarityLabel?: string
  caseName?: string | null
  value?: number | null
  special?: boolean
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable'

/** Build the share text — brand-carrying, concise, link included. */
export function buildShareText(win: ShareWinInput): string {
  const url = typeof window !== 'undefined' ? window.location.origin : 'https://voznya'
  const lead = win.special ? 'Выбил в Возне:' : 'Моя награда в Возне:'
  const parts = [`${lead} ${win.title}`]
  if (win.rarityLabel) parts.push(`(${win.rarityLabel})`)
  const tail = win.value && win.value > 0 ? ` · ${fmt(win.value)} ешек` : ''
  return `${parts.join(' ')}${tail}\n${url}/cases`
}

/**
 * Share a win. Tries the native share sheet first; falls back to clipboard.
 * Returns what actually happened so the UI can confirm honestly.
 */
export async function shareWin(win: ShareWinInput): Promise<ShareResult> {
  if (typeof navigator === 'undefined') return 'unavailable'
  const text = buildShareText(win)
  const title = 'Возня'

  // Telegram Mini App: prefer the native share/switch if present.
  try {
    const tg = (window as unknown as {
      Telegram?: { WebApp?: { switchInlineQuery?: (q: string, ctx?: string[]) => void } }
    }).Telegram?.WebApp
    // switchInlineQuery is the canonical TG "share to chat" affordance; only use
    // it when present (inside Telegram) — never assume.
    void tg // reserved; Web Share below covers TG's in-app browser too.
  } catch {
    // ignore — fall through to Web Share / clipboard.
  }

  // Web Share API (mobile, many in-app browsers).
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
  }
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title, text })
      return 'shared'
    } catch (err) {
      // User cancelled the sheet — not an error, don't fall back to clipboard.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Other failures → try clipboard.
    }
  }

  // Clipboard fallback.
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
  } catch {
    // clipboard blocked
  }
  return 'unavailable'
}
