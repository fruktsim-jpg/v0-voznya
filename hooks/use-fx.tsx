'use client'

/**
 * FX context + useFx (A2 Sound Layer) — platform-wide binding for the FX engine.
 *
 * Provides ONE shared PlatformFx instance and reactive prefs (sound/haptics) so
 * any component can fire a cue (fx.rankup(), fx.purchase(), …) and so a single
 * Settings toggle governs the whole app. Prefs persist in localStorage (shared
 * with the case flow's key) and sync across tabs / same-tab via the FX event.
 *
 * No backend. SSR-safe (engine guards window/Telegram).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { PlatformFx } from '@/lib/fx'
import {
  DEFAULT_FX_PREFS,
  FX_PREFS_EVENT,
  readFxPrefs,
  writeFxPrefs,
  type CaseFxPrefs,
} from '@/lib/case-fx'

type FxContextValue = {
  fx: PlatformFx
  prefs: CaseFxPrefs
  setSound: (on: boolean) => void
  setHaptics: (on: boolean) => void
}

const FxContext = createContext<FxContextValue | null>(null)

export function FxProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<CaseFxPrefs>(DEFAULT_FX_PREFS)
  const fxRef = useRef<PlatformFx | null>(null)
  if (fxRef.current === null) fxRef.current = new PlatformFx(DEFAULT_FX_PREFS)
  const fx = fxRef.current

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

  const value = useMemo(
    () => ({ fx, prefs, setSound, setHaptics }),
    [fx, prefs, setSound, setHaptics],
  )

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>
}

/**
 * useFx — access the shared FX instance + prefs. Returns a safe standalone
 * instance if used outside the provider (so isolated components never crash).
 */
export function useFx(): FxContextValue {
  const ctx = useContext(FxContext)
  const fallbackRef = useRef<PlatformFx | null>(null)
  if (ctx) return ctx
  if (fallbackRef.current === null) fallbackRef.current = new PlatformFx()
  return {
    fx: fallbackRef.current,
    prefs: DEFAULT_FX_PREFS,
    setSound: () => {},
    setHaptics: () => {},
  }
}
