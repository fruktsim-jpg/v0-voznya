'use client'

import { useEffect, useRef } from 'react'
import { rarityToken } from '@/lib/rarity'
import type { ReelCell } from '@/lib/case-open-ux'
import type { CaseFx } from '@/lib/case-fx'

/**
 * CaseRoulette (Stage 3) — the "rolling" stage: a CS-style horizontal reel that
 * decelerates and centers the REAL winner under the marker. The winner is
 * already decided by the server (lib/cases-open via /api/cases/open) — this is
 * pure visualization of a settled result, never RNG.
 *
 * Performance: a single `transform: translateX` transition on the strip (one
 * compositor layer, no per-frame JS), edge fades via static gradients, and a
 * cheap marker glow. Selection haptics fire on a throttled timer aligned to the
 * ease-out so the deceleration is FELT without a rAF loop. Mobile-first.
 */

// Reel geometry (kept in sync with the cell width below).
const CELL_W = 96
const CELL_GAP = 8
const STRIDE = CELL_W + CELL_GAP
const REEL_LEN = 60
const WIN_INDEX = 50

export function CaseRoulette({
  reel,
  spinning,
  spinMs,
  fx,
  reducedMotion,
}: {
  reel: ReelCell[]
  spinning: boolean
  spinMs: number
  fx: CaseFx
  reducedMotion: boolean
}) {
  // Final offset centers WIN_INDEX under the marker, with a small jitter so it
  // doesn't always stop dead-center (feels more alive). Computed once per reel.
  const targetRef = useRef(0)
  if (targetRef.current === 0 && reel.length > 0) {
    const jitter = Math.floor((Math.random() - 0.5) * (CELL_W * 0.5))
    targetRef.current = WIN_INDEX * STRIDE + CELL_W / 2 + jitter
  }

  // Throttled selection haptics during deceleration. Tick rate slows over time
  // to mirror the ease-out — no rAF, just a decaying timeout chain.
  useEffect(() => {
    if (!spinning || reducedMotion) return
    let cancelled = false
    let elapsed = 0
    const start = 70
    const step = () => {
      if (cancelled) return
      fx.selection()
      // Interval grows as we approach the end (deceleration feel).
      const progress = Math.min(1, elapsed / spinMs)
      const interval = start + progress * progress * 520
      elapsed += interval
      if (elapsed < spinMs - 100) window.setTimeout(step, interval)
    }
    const id = window.setTimeout(step, start)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [spinning, spinMs, fx, reducedMotion])

  const offset = spinning ? targetRef.current : 0
  // Reduced motion: snap quickly instead of the long cinematic spin.
  const duration = reducedMotion ? 320 : spinMs

  return (
    <div className="relative h-[104px] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      {/* Edge darkening */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.9), transparent 16%, transparent 84%, rgba(0,0,0,0.9))',
        }}
      />
      {/* Center marker */}
      <span className="case-marker-glow pointer-events-none absolute left-1/2 top-0 z-30 h-full w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_12px_2px_rgba(245,209,66,0.8)]" />
      <span className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-amber-300" />
      <span className="pointer-events-none absolute bottom-0 left-1/2 z-30 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-amber-300" />

      {/* Strip (left:50% so cell centers line up with the marker) */}
      <div className="absolute left-1/2 top-1/2 -translate-y-1/2">
        <div
          className="flex"
          style={{
            gap: `${CELL_GAP}px`,
            transform: `translateX(-${offset}px)`,
            transition: spinning
              ? `transform ${duration}ms cubic-bezier(0.12, 0.66, 0.12, 1)`
              : 'none',
          }}
        >
          {reel.map((cell, i) => {
            const t = rarityToken(cell.rarity)
            const accent = cell.rarity !== 'common'
            return (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-xl border"
                style={{
                  width: CELL_W,
                  height: 84,
                  flex: '0 0 auto',
                  borderColor: `${t.color}88`,
                  background: `linear-gradient(180deg, ${t.color}22, transparent)`,
                  borderTop: `3px solid ${t.color}`,
                  boxShadow: accent ? `inset 0 -8px 16px -10px ${t.color}` : undefined,
                }}
              >
                <span className="text-3xl" aria-hidden="true">
                  {cell.icon}
                </span>
                <span className="mt-0.5 w-full truncate px-1 text-center text-[9px] text-muted-foreground">
                  {cell.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Build a reel that lands on `winCell` at the fixed WIN_INDEX (port). */
export function buildReel(pool: ReelCell[], winCell: ReelCell): ReelCell[] {
  const safe = pool.length > 0 ? pool : [{ rarity: 'common' as const, icon: '📦', label: '—' }]
  const arr: ReelCell[] = []
  for (let i = 0; i < REEL_LEN; i++) {
    if (i === WIN_INDEX) arr.push(winCell)
    else arr.push(safe[Math.floor(Math.random() * safe.length)])
  }
  return arr
}
