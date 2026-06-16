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

/** Build the destination link shared alongside the text. */
function shareUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://voznya'
  return `${origin}/cases`
}

type TelegramWebApp = {
  openTelegramLink?: (url: string) => void
  openLink?: (url: string) => void
}

function telegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  try {
    return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null
  } catch {
    return null
  }
}

/** Last-ditch clipboard copy for browsers without the async Clipboard API
 * (older Telegram in-app webviews block navigator.clipboard). Uses a hidden
 * textarea + execCommand. Returns true on success. */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/**
 * Share a win. Strategy, in order:
 *   1. Telegram Mini App → openTelegramLink('t.me/share/url') — the native
 *      "share to chat" dialog. This is THE path inside Telegram, where
 *      navigator.share is usually missing and clipboard is blocked (the
 *      reported "share does nothing" bug).
 *   2. Web Share API (mobile browsers / many in-app webviews).
 *   3. Async clipboard, then a legacy textarea copy.
 * Returns what actually happened so the UI can confirm honestly.
 */
export async function shareWin(win: ShareWinInput): Promise<ShareResult> {
  if (typeof navigator === 'undefined') return 'unavailable'
  const text = buildShareText(win)
  const title = 'Возня'

  // 1) Telegram Mini App — open the real share-to-chat dialog.
  const tg = telegramWebApp()
  if (tg && typeof tg.openTelegramLink === 'function') {
    try {
      const link =
        'https://t.me/share/url?url=' +
        encodeURIComponent(shareUrl()) +
        '&text=' +
        encodeURIComponent(text)
      tg.openTelegramLink(link)
      return 'shared'
    } catch {
      // fall through to Web Share / clipboard
    }
  }

  // 2) Web Share API (mobile, many in-app browsers).
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

  // 3) Clipboard fallback (async API, then legacy execCommand).
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
  } catch {
    // clipboard blocked — try legacy below
  }
  if (legacyCopy(text)) return 'copied'

  return 'unavailable'
}
