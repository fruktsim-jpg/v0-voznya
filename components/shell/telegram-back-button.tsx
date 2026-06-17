'use client'

/**
 * TelegramBackButton — wires Telegram's NATIVE back button to client navigation.
 *
 * In a Mini App the platform back button is the expected way to go back; relying
 * only on in-page chrome feels foreign. This shows the native button on every
 * non-root screen and hides it on the primary nav destinations (where "back"
 * would leave the app). Pressing it runs router.back(), falling back to the home
 * route when there's no history (e.g. opened via a deep link).
 *
 * Best-effort + SSR-safe: outside Telegram every call is a no-op, so plain-web
 * behavior is unchanged (the app keeps its own in-page back affordances).
 */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type TelegramBackButton = {
  show?: () => void
  hide?: () => void
  onClick?: (cb: () => void) => void
  offClick?: (cb: () => void) => void
}

type TelegramWebApp = { BackButton?: TelegramBackButton }
type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } }

function getBackButton(): TelegramBackButton | null {
  if (typeof window === 'undefined') return null
  return (window as TelegramWindow).Telegram?.WebApp?.BackButton ?? null
}

// Primary nav destinations (mirror of nav-config). On these, the native back
// button is hidden — going "back" from a root would exit the Mini App.
const ROOT_PATHS = new Set(['/', '/cases', '/inventory', '/gifts', '/live', '/profile/me'])

function isRoot(pathname: string): boolean {
  if (ROOT_PATHS.has(pathname)) return true
  // Treat the canonical roots' bare sections as roots too (e.g. /profile alone).
  return pathname === '/profile'
}

export function TelegramBackButton() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const btn = getBackButton()
    if (!btn) return

    const handler = () => {
      // history.length > 1 means we have somewhere to go back to in-app.
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back()
      } else {
        router.push('/')
      }
    }

    if (isRoot(pathname)) {
      btn.hide?.()
      return
    }

    btn.onClick?.(handler)
    btn.show?.()
    return () => {
      btn.offClick?.(handler)
      btn.hide?.()
    }
  }, [pathname, router])

  return null
}
