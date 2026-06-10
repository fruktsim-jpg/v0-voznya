'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CaseView } from '@/lib/cases-ux'
import {
  failureMessage,
  kindIcon,
  toWonReward,
  type OpenResponse,
  type ReelCell,
  type WonReward,
} from '@/lib/case-open-ux'
import { notifyBalanceChanged } from '@/lib/balance-events'
import { useCaseFx } from '@/hooks/use-case-fx'
import { CaseRoulette, buildReel } from '@/components/cases/case-roulette'
import { RewardReveal } from '@/components/cases/reward-reveal'
import { GiftChoice } from '@/components/cases/gift-choice'
import { caseCostLabel } from '@/components/cases/case-meta'

/**
 * CaseOpeningFlow (Stage 3) — the full opening experience, orchestrated as a
 * small state machine: idle → spinning → revealed (→ error). The OPENING ITSELF
 * IS FROZEN: it POSTs /api/cases/open and renders the server's REAL reward
 * (open_case in the bot/shared DB remains the single writer — CSPRNG, balance,
 * ledger, gift pending pipeline). The reel only visualizes a settled result.
 *
 * Stage 3 adds: anticipation + rarity-scaled reveal (RewardReveal), sound +
 * haptics (useCaseFx — asset-free until registered), a duplicate indicator
 * (session-local won-code tally; no backend), and a clean "open again" loop.
 */

const SPIN_MS = 5000

type Phase = 'idle' | 'spinning' | 'revealed' | 'error'

export function CaseOpeningFlow({ caseView }: { caseView: CaseView }) {
  const c = caseView
  const { fx, reducedMotion } = useCaseFx()

  const [phase, setPhase] = useState<Phase>('idle')
  const [won, setWon] = useState<WonReward | null>(null)
  const [error, setError] = useState('')
  const [reel, setReel] = useState<ReelCell[]>([])
  const [spinning, setSpinning] = useState(false)
  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const rafs = useRef<number[]>([])
  const mounted = useRef(true)

  // Session-local duplicate tally: how many of each reward code we've seen in
  // THIS opening session. Pure UX hint — ownership truth stays in the inventory.
  const seenCodes = useRef<Map<string, number>>(new Map())
  const [dupInfo, setDupInfo] = useState<{ duplicate: boolean; owned: number }>({
    duplicate: false,
    owned: 0,
  })

  const costLabel = caseCostLabel(c)

  // Reel fill pool — built from the case's REAL reward list (weight→frequency).
  const pool = useMemo<ReelCell[]>(() => {
    const cells = c.rewardsView.map((r) => ({
      rarity: r.rarity,
      icon: kindIcon(r.rewardKind, r.isJackpot),
      label: r.label,
    }))
    return cells.length > 0 ? cells : [{ rarity: 'common' as const, icon: '📦', label: '—' }]
  }, [c.rewardsView])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    rafs.current.forEach((r) => cancelAnimationFrame(r))
    rafs.current = []
  }

  // Cancel any pending spin timeout / RAF when the flow unmounts (e.g. the user
  // dismisses the detail sheet mid-spin) so no state update fires on a dead
  // component.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimers()
    }
  }, [])

  const open = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    clearTimers()
    setPhase('spinning')
    setWon(null)
    setError('')
    setSpinning(false)

    fx.sound('open')
    fx.tap('medium')

    try {
      const res = await fetch('/api/cases/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseItemCode: c.itemCode }),
      })
      const data: OpenResponse = await res.json().catch(() => ({}))

      if (!res.ok || data.status !== 'ok') {
        setError(failureMessage(res.status, data))
        setPhase('error')
        busy.current = false
        return
      }

      // Balance may have changed (cost + currency reward) — refresh header now.
      notifyBalanceChanged()

      const w = toWonReward(data)

      // Duplicate tally (session-local).
      const code = data.rewardItemCode ?? `${w.kind}:${w.title}`
      const prev = seenCodes.current.get(code) ?? 0
      const ownedNow = prev + w.qty
      seenCodes.current.set(code, ownedNow)
      const isCollectible = w.kind === 'item' || w.kind === 'tg_gift'
      setDupInfo({ duplicate: isCollectible && prev > 0, owned: ownedNow })

      const winCell: ReelCell = { rarity: w.rarity, icon: w.icon, label: w.title }
      setReel(buildReel(pool, winCell))

      fx.sound('rolling')

      // Start the deceleration on the next frame so the transition fires.
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          if (mounted.current) setSpinning(true)
        })
        rafs.current.push(raf2)
      })
      rafs.current.push(raf1)

      const revealDelay = reducedMotion ? 360 : SPIN_MS + 120
      const id = window.setTimeout(() => {
        if (!mounted.current) return
        setWon(w)
        setPhase('revealed')
        fx.reveal(w.rarity, w.isJackpot || w.isPremium)
        busy.current = false
      }, revealDelay)
      timers.current.push(id)
    } catch {
      setError('Сеть недоступна. Попробуй ещё раз.')
      setPhase('error')
      busy.current = false
    }
  }, [c.itemCode, pool, fx, reducedMotion])

  // ---- REVEAL ----
  if (phase === 'revealed' && won) {
    return (
      <div className="space-y-3">
        <RewardReveal
          won={won}
          duplicate={dupInfo.duplicate}
          ownedQty={dupInfo.owned}
          reducedMotion={reducedMotion}
        />

        {/* Gift fate (frozen API): Keep / Sell / Withdraw */}
        {won.kind === 'tg_gift' && won.deliveryKey && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Судьба подарка
            </p>
            <GiftChoice won={won} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <a
            href="/inventory"
            className="rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-sm font-bold text-foreground transition hover:bg-white/10 active:scale-[0.98]"
          >
            Инвентарь
          </a>
          <button
            onClick={open}
            className="rounded-xl border border-primary/50 bg-primary/10 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20 active:scale-[0.98]"
          >
            Ещё · {costLabel}
          </button>
        </div>
      </div>
    )
  }

  // ---- SPINNING ----
  if (phase === 'spinning') {
    return (
      <div className="space-y-3">
        <CaseRoulette
          reel={reel}
          spinning={spinning}
          spinMs={SPIN_MS}
          fx={fx}
          reducedMotion={reducedMotion}
        />
        <p className="text-center text-xs font-semibold">
          <span className="case-text-shimmer">Открываем…</span>
        </p>
      </div>
    )
  }

  // ---- IDLE / ERROR ----
  return (
    <div className="space-y-2">
      <button
        onClick={open}
        className="case-cta-pulse w-full rounded-2xl border border-primary/50 bg-primary/15 py-3 text-sm font-bold text-primary transition hover:bg-primary/25 active:scale-[0.98]"
      >
        Открыть кейс · {costLabel}
      </button>
      {phase === 'error' && <p className="text-center text-xs text-red-300">{error}</p>}
    </div>
  )
}
