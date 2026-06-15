'use client'

/**
 * TelegramProvider — the single Mini App runtime host, mounted once in the app
 * shell so EVERY content page (not just the /miniapp auth screen) has the
 * Telegram WebApp SDK active.
 *
 * Why this exists: the SDK script is loaded app-wide (layout.tsx), but the SDK
 * still needs to be told to `ready()` + `expand()`, and its viewport / safe-area
 * geometry has to be projected into CSS vars so the fixed shell stops colliding
 * with Telegram's own chrome. Previously this only ran on /miniapp, so haptics,
 * viewport sizing and safe areas were dead on every real screen after the
 * post-auth full-page redirect.
 *
 * Everything is best-effort and guarded: outside Telegram (plain web) every call
 * is a no-op and the app behaves exactly as before.
 */

import { useEffect } from 'react'

type ThemeParams = Record<string, string | undefined>

type SafeAreaInset = { top?: number; bottom?: number; left?: number; right?: number }

type TelegramWebApp = {
  ready?: () => void
  expand?: () => void
  isExpanded?: boolean
  viewportHeight?: number
  viewportStableHeight?: number
  colorScheme?: 'light' | 'dark'
  themeParams?: ThemeParams
  contentSafeAreaInset?: SafeAreaInset
  safeAreaInset?: SafeAreaInset
  disableVerticalSwipes?: () => void
  enableClosingConfirmation?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  onEvent?: (event: string, cb: () => void) => void
  offEvent?: (event: string, cb: () => void) => void
}

type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } }

function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return (window as TelegramWindow).Telegram?.WebApp ?? null
}

export function TelegramProvider() {
  useEffect(() => {
    const root = document.documentElement
    // Mark TG context so CSS/components can adapt (e.g. hide redundant in-page
    // back buttons). Removed automatically on unmount only in dev/HMR.
    let isTelegram = false

    const applyViewport = (wa: TelegramWebApp) => {
      // Project Telegram's live viewport + safe areas into CSS vars. The shell
      // contract (globals.css) falls back to env()/defaults when these are unset,
      // so this only ever tightens geometry inside Telegram.
      const h = wa.viewportStableHeight || wa.viewportHeight
      if (h && h > 0) root.style.setProperty('--tg-viewport-height', `${h}px`)

      const top = wa.contentSafeAreaInset?.top ?? wa.safeAreaInset?.top
      const bottom = wa.contentSafeAreaInset?.bottom ?? wa.safeAreaInset?.bottom
      if (typeof top === 'number') root.style.setProperty('--tg-safe-top', `${top}px`)
      if (typeof bottom === 'number') root.style.setProperty('--tg-safe-bottom', `${bottom}px`)
    }

    let wa = getWebApp()

    // The SDK script (layout.tsx) may not be parsed yet on first paint. Poll
    // briefly so init still runs once it lands, then stop.
    let tries = 0
    let pollId: ReturnType<typeof setInterval> | null = null
    let viewportHandler: (() => void) | null = null

    const init = (app: TelegramWebApp) => {
      isTelegram = true
      root.classList.add('is-telegram')
      try {
        app.ready?.()
        app.expand?.()
        // Prevent accidental swipe-to-close mid case-open / mid form.
        app.disableVerticalSwipes?.()
      } catch {
        // best-effort
      }
      applyViewport(app)
      viewportHandler = () => applyViewport(app)
      app.onEvent?.('viewportChanged', viewportHandler)
      app.onEvent?.('safeAreaChanged', viewportHandler)
      app.onEvent?.('contentSafeAreaChanged', viewportHandler)
    }

    if (wa) {
      init(wa)
    } else {
      pollId = setInterval(() => {
        tries += 1
        wa = getWebApp()
        if (wa) {
          if (pollId) clearInterval(pollId)
          pollId = null
          init(wa)
        } else if (tries > 20) {
          if (pollId) clearInterval(pollId)
          pollId = null
        }
      }, 100)
    }

    return () => {
      if (pollId) clearInterval(pollId)
      const app = getWebApp()
      if (app && viewportHandler) {
        app.offEvent?.('viewportChanged', viewportHandler)
        app.offEvent?.('safeAreaChanged', viewportHandler)
        app.offEvent?.('contentSafeAreaChanged', viewportHandler)
      }
      if (isTelegram) root.classList.remove('is-telegram')
    }
  }, [])

  return null
}
