'use client'

/**
 * AnimatedCounter (A1 Motion System) — numbers ROLL UP instead of appearing.
 *
 * Why it matters emotionally: a balance, MMR, or win that counts up feels EARNED
 * and alive; a static number feels inert. Used for balances, rewards, stats,
 * leaderboard figures.
 *
 * - eases out (fast → settle), matching the platform decelerate feel;
 * - reduced-motion / SSR → renders the final value instantly (no animation);
 * - animates only when the value actually changes (and only counts UP by
 *   default; set `from` to control the start);
 * - formats with ru-RU grouping + tabular-nums so digits don't jitter.
 */

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function AnimatedCounter({
  value,
  from,
  durationMs = 900,
  className,
  format = (n: number) => Math.round(n).toLocaleString('ru-RU'),
  prefix,
  suffix,
}: {
  value: number
  /** Start value for the first animation (default 0). */
  from?: number
  durationMs?: number
  className?: string
  format?: (n: number) => string
  prefix?: string
  suffix?: string
}) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  const raf = useRef<number | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    // First mount: animate from `from` (or 0) to value once; afterwards animate
    // from the previous value so updates feel continuous.
    const start = mounted.current ? prev.current : from ?? 0
    const end = value
    prev.current = value
    mounted.current = true

    if (reduced || start === end || durationMs <= 0) {
      setDisplay(end)
      return
    }

    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs)
      setDisplay(start + (end - start) * easeOut(p))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, durationMs])

  return (
    <span className={`tabular-nums ${className ?? ''}`}>
      {prefix}
      {format(display)}
      {suffix}
    </span>
  )
}
