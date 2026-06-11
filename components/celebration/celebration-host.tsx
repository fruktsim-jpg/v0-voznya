'use client'

/**
 * Celebration host (A3) — the single place the platform's MOMENTS are rendered.
 *
 * Exposes two ways to trigger a celebration:
 *   1. useCelebration().celebrate(c)  — from any React component.
 *   2. celebrate(c)                   — imperative bus (works anywhere, incl.
 *                                        outside React), via a window event.
 *
 * The host:
 *   - QUEUES celebrations so two events never stack (one moment at a time —
 *     anti-fatigue);
 *   - fires the matching FX cue (A2) when each moment opens;
 *   - renders the full-screen CelebrationOverlay (A3) and advances the queue on
 *     dismiss.
 *
 * Mounted once in PlatformProviders. Presentation only.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { celebrationRarity, ceremonyChannel, type Celebration } from '@/lib/celebration'
import { CelebrationOverlay } from '@/components/celebration/celebration-overlay'
import { CelebrationMini } from '@/components/celebration/celebration-mini'
import { toast } from '@/components/ds/toast'
import { useFx } from '@/hooks/use-fx'

const CELEBRATE_EVENT = 'voznya:celebrate'

/** Imperative trigger — fire from anywhere (even non-React code). */
export function celebrate(c: Celebration): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<Celebration>(CELEBRATE_EVENT, { detail: c }))
}

type CelebrationContextValue = { celebrate: (c: Celebration) => void }
const CelebrationContext = createContext<CelebrationContextValue | null>(null)

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Celebration | null>(null)
  const queue = useRef<Celebration[]>([])
  const { fx } = useFx()

  const fireFx = useCallback(
    (c: Celebration) => {
      const rarity = celebrationRarity(c)
      switch (c.kind) {
        case 'rankup':
          fx.rankup()
          break
        case 'division':
          fx.division()
          break
        case 'season':
          fx.season()
          break
        case 'achievement':
          fx.achievement()
          break
        case 'purchase':
          fx.purchase()
          break
        case 'collection':
          fx.celebrate(rarity, c.tier === 'mythic')
          break
        case 'drop':
        default:
          fx.celebrate(rarity, c.tier === 'mythic')
          break
      }
    },
    [fx],
  )

  /**
   * Toast channel: non-blocking. Fire the sound + a sonner line and return —
   * it never occupies the single full/mini "moment" slot, so a stream of small
   * events (purchases, common drops) can't back up the queue behind a takeover.
   */
  const fireToast = useCallback(
    (c: Celebration) => {
      fireFx(c)
      toast(c.title, { description: c.subtitle })
    },
    [fireFx],
  )

  const enqueue = useCallback(
    (c: Celebration) => {
      // Anti-fatigue routing (C5): only mini/full compete for the screen slot.
      if (ceremonyChannel(c) === 'toast') {
        fireToast(c)
        return
      }
      setCurrent((cur) => {
        if (cur) {
          queue.current.push(c)
          return cur
        }
        fireFx(c)
        return c
      })
    },
    [fireFx, fireToast],
  )

  const dismiss = useCallback(() => {
    setCurrent(() => {
      const next = queue.current.shift() ?? null
      if (next) fireFx(next)
      return next
    })
  }, [fireFx])

  // Bridge the imperative window event into React state.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Celebration>).detail
      if (detail) enqueue(detail)
    }
    window.addEventListener(CELEBRATE_EVENT, handler as EventListener)
    return () => window.removeEventListener(CELEBRATE_EVENT, handler as EventListener)
  }, [enqueue])

  return (
    <CelebrationContext.Provider value={{ celebrate: enqueue }}>
      {children}
      {current &&
        (ceremonyChannel(current) === 'mini' ? (
          <CelebrationMini celebration={current} onDismiss={dismiss} />
        ) : (
          <CelebrationOverlay celebration={current} onDismiss={dismiss} />
        ))}
    </CelebrationContext.Provider>
  )
}

export function useCelebration(): CelebrationContextValue {
  const ctx = useContext(CelebrationContext)
  // Fallback to the imperative bus if used outside the provider.
  return ctx ?? { celebrate }
}
