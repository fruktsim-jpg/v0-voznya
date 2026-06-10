'use client'

// useCaseFx (Stage 3) — React binding for the case FX engine (lib/case-fx.ts).
//
// Provides a stable CaseFx instance, the current prefs (reactive across tabs /
// same-tab), setters that future Settings UI can call, and a `reducedMotion`
// flag so the opening flow can shorten / skip animation for users who ask for
// it (accessibility + low-end devices). No backend — prefs live in localStorage.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CaseFx,
  DEFAULT_FX_PREFS,
  FX_PREFS_EVENT,
  readFxPrefs,
  writeFxPrefs,
  type CaseFxPrefs,
} from '@/lib/case-fx'

export function useCaseFx() {
  const [prefs, setPrefs] = useState<CaseFxPrefs>(DEFAULT_FX_PREFS)
  const [reducedMotion, setReducedMotion] = useState(false)
  const fxRef = useRef<CaseFx | null>(null)
  if (fxRef.current === null) fxRef.current = new CaseFx(DEFAULT_FX_PREFS)
  const fx = fxRef.current

  // Hydrate prefs after mount + keep in sync (avoids SSR mismatch).
  useEffect(() => {
    const sync = () => {
      const next = readFxPrefs()
      setPrefs(next)
      fx.setPrefs(next)
    }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener(FX_PREFS_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(FX_PREFS_EVENT, sync)
    }
  }, [fx])

  // Respect the OS / Telegram reduced-motion preference.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  const setSound = useCallback(
    (on: boolean) => {
      const next = { ...readFxPrefs(), sound: on }
      writeFxPrefs(next)
      setPrefs(next)
      fx.setPrefs(next)
    },
    [fx],
  )

  const setHaptics = useCallback(
    (on: boolean) => {
      const next = { ...readFxPrefs(), haptics: on }
      writeFxPrefs(next)
      setPrefs(next)
      fx.setPrefs(next)
    },
    [fx],
  )

  return useMemo(
    () => ({ fx, prefs, reducedMotion, setSound, setHaptics }),
    [fx, prefs, reducedMotion, setSound, setHaptics],
  )
}
