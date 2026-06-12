'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CaseView } from '@/lib/cases-ux'
import { Glyph } from '@/components/ds/icon/glyph'
import {
  failureMessage,
  kindIcon,
  rewardKindClass,
  toWonReward,
  type OpenResponse,
  type ReelCell,
  type WonReward,
} from '@/lib/case-open-ux'
import { notifyBalanceChanged } from '@/lib/balance-events'
import { useCaseFx } from '@/hooks/use-case-fx'
import { useCelebration } from '@/components/celebration/celebration-host'
import { tierFromRarity } from '@/lib/celebration'
import { isHighTier } from '@/lib/case-open-ux'
import { resolveItemArt } from '@/lib/item-art/resolve'
import { CaseRoulette, buildReel } from '@/components/cases/case-roulette'
import { RewardReveal } from '@/components/cases/reward-reveal'
import { GiftChoice } from '@/components/cases/gift-choice'
import { OwnershipConfirm } from '@/components/cases/ownership-confirm'
import { caseCostLabel } from '@/components/cases/case-meta'
import { rarityToken } from '@/lib/rarity'
import { shareWin } from '@/lib/share'

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
  const { celebrate } = useCelebration()

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

  // Inline share state (for the calm reveals that don't trigger the full-screen
  // moment — every win is still shareable from the afterglow).
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'copied' | 'shared'>('idle')

  const onShareInline = useCallback(async () => {
    if (!won || shareState === 'sharing') return
    setShareState('sharing')
    const res = await shareWin({
      title: won.title,
      rarityLabel: rarityToken(won.rarity).label,
      caseName: c.name,
      value: won.value,
      special: won.isJackpot || won.isPremium,
    })
    if (res === 'copied') setShareState('copied')
    else if (res === 'shared') setShareState('shared')
    else setShareState('idle')
  }, [won, shareState, c.name])

  const costLabel = caseCostLabel(c)

  // Reel fill pool — built from the case's REAL reward list (weight→frequency).
  // Carries code/itemClass so reel cells resolve the same authored art as the
  // storefront drop-list, not just an emoji.
  const pool = useMemo<ReelCell[]>(() => {
    const cells = c.rewardsView.map((r) => ({
      rarity: r.rarity,
      icon: kindIcon(r.rewardKind, r.isJackpot),
      label: r.label,
      code: r.rewardItemCode ?? null,
      itemClass: rewardKindClass(r.rewardKind, r.rewardItemCode),
    }))
    return cells.length > 0
      ? cells
      : [{ rarity: 'common' as const, icon: '📦', label: '—', code: null, itemClass: null }]
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
    setShareState('idle')

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

      const winCell: ReelCell = {
        rarity: w.rarity,
        icon: w.icon,
        label: w.title,
        code: w.code,
        itemClass: w.itemClass,
      }
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

        // A3: only BIG drops earn a full-screen MOMENT (epic+ / jackpot /
        // premium). Common/rare keep the calm inline reveal — anti-fatigue.
        const special = w.isJackpot || w.isPremium
        if (special || isHighTier(w.rarity)) {
          // Resolve the real authored art for the full-screen moment; falls back
          // to the kind glyph when no asset exists yet (graceful, no broken img).
          const art = resolveItemArt({
            code: w.code,
            itemClass: w.itemClass,
            rarity: w.rarity,
          }).src
          celebrate({
            kind: 'drop',
            tier: tierFromRarity(w.rarity, special),
            title: w.title,
            subtitle: special ? 'Редчайший дроп!' : 'Отличная награда',
            glyph: w.icon,
            art: art ?? undefined,
            rarity: w.rarity,
            shareable: true,
            share: {
              title: w.title,
              rarityLabel: rarityToken(w.rarity).label,
              caseName: c.name,
              value: w.value,
              special,
            },
            flavor: w.qty > 1 ? `×${w.qty}` : undefined,
          })
        }
        busy.current = false
      }, revealDelay)
      timers.current.push(id)
    } catch {
      setError('Сеть недоступна. Попробуй ещё раз.')
      setPhase('error')
      busy.current = false
    }
  }, [c.itemCode, pool, fx, reducedMotion, celebrate])

  // ---- REVEAL ----
  if (phase === 'revealed' && won) {
    const isCurrency = won.kind === 'currency'
    return (
      <div className="space-y-3">
        <RewardReveal
          won={won}
          duplicate={dupInfo.duplicate}
          ownedQty={dupInfo.owned}
          reducedMotion={reducedMotion}
        />

        {/* Ownership confirmation — the win is YOURS, stated in-place (no forced
            trip to inventory). Currency merges into balance, so it's skipped. */}
        <OwnershipConfirm won={won} />

        {/* Gift fate (frozen API): Keep / Sell / Withdraw */}
        {won.kind === 'tg_gift' && won.deliveryKey && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Судьба подарка
            </p>
            <GiftChoice won={won} />
          </div>
        )}

        {/* AFTER-opening: the itch. If the case still holds a bigger dream than
            what dropped, nudge toward chasing it; "Ещё" is the primary action. */}
        {c.topReward && won && c.topReward.label !== won.title && (
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <Glyph name="spark" className="h-3 w-3 text-accent-indigo" />
            в кейсе всё ещё ждёт{' '}
            <span className="font-semibold text-foreground">{c.topReward.label}</span>
          </p>
        )}

        {/* Primary actions: Share the win + open again (the next-itch CTA). */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onShareInline}
            disabled={shareState === 'sharing'}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-bold text-foreground transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-60"
          >
            <Glyph
              name={shareState === 'copied' ? 'check' : 'share'}
              className="h-4 w-4"
            />
            {shareState === 'copied'
              ? 'Скопировано'
              : shareState === 'shared'
                ? 'Отправлено'
                : shareState === 'sharing'
                  ? '…'
                  : 'Поделиться'}
          </button>
          <button
            onClick={open}
            className="case-cta-pulse flex items-center justify-center gap-1.5 rounded-xl border border-primary/60 bg-primary/20 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/30 active:scale-[0.98]"
          >
            <Glyph name="refresh" className="h-4 w-4" />
            Ещё · {costLabel}
          </button>
        </div>

        {/* Inventory is now a quiet destination, not a co-equal exit — the win
            already lives there; we confirmed it above. */}
        {!isCurrency && (
          <a
            href="/inventory"
            className="flex items-center justify-center gap-1.5 py-0.5 text-center text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Glyph name="vault" className="h-3.5 w-3.5" />
            Открыть хранилище
          </a>
        )}
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
