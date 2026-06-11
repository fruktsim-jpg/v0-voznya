'use client'

/**
 * useReducedMotion (A1 Motion System) — platform-wide reduced-motion flag.
 *
 * Single source of truth so every motion surface (not just cases) respects the
 * OS / Telegram "reduce motion" preference. Returns `true` when motion should be
 * minimized. SSR-safe: starts `false`, hydrates after mount.
 */

import { useEffect, useState } from 'react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  return reduced
}
