'use client'

import { useState } from 'react'
import type { WonReward } from '@/lib/case-open-ux'
import { sellGift, withdrawGift } from '@/lib/gift-delivery'

/**
 * GiftChoice (Stage 3) — decide the fate of a won Telegram Gift right in the
 * reveal: Keep (already in inventory) / Sell for N (instant +ешки) / Withdraw
 * (real delivery request). Network calls + status handling are delegated to the
 * SHARED lib/gift-delivery helper (the single source of truth shared with the
 * inventory inspect sheet), so behavior can't drift between the two surfaces.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

type ChoiceState = 'idle' | 'selling' | 'withdrawing' | 'sold' | 'withdrawn' | 'error'

export function GiftChoice({ won }: { won: WonReward }) {
  const [state, setState] = useState<ChoiceState>('idle')
  const [msg, setMsg] = useState('')
  const busy = state === 'selling' || state === 'withdrawing'
  const done = state === 'sold' || state === 'withdrawn'

  if (!won.deliveryKey) return null
  const deliveryKey = won.deliveryKey

  async function onSell() {
    if (busy) return
    setState('selling')
    setMsg('')
    const r = await sellGift(deliveryKey)
    if (r.ok) {
      setState('sold')
      setMsg(`Продано +${fmt(r.amount ?? won.sellAmount ?? 0)} ешек`)
    } else {
      setState('error')
      setMsg(r.message)
    }
  }

  async function onWithdraw() {
    if (busy) return
    setState('withdrawing')
    setMsg('')
    const r = await withdrawGift(deliveryKey, won.isPremium)
    if (r.ok) {
      setState('withdrawn')
      setMsg(r.message)
    } else {
      setState('error')
      setMsg(r.message)
    }
  }

  if (done) {
    return (
      <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-2.5 text-center text-xs font-semibold text-emerald-300">
        {msg}
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        <a
          href="/inventory"
          className="rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-xs font-bold text-foreground transition hover:bg-white/10 active:scale-[0.98]"
        >
          Оставить
        </a>
        <button
          onClick={onSell}
          disabled={busy || won.sellAmount == null}
          className="rounded-xl border border-amber-400/50 bg-amber-400/10 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20 active:scale-[0.98] disabled:opacity-50"
        >
          {state === 'selling' ? '…' : won.sellAmount != null ? `Продать ${fmt(won.sellAmount)}` : 'Продать'}
        </button>
        <button
          onClick={onWithdraw}
          disabled={busy}
          className="rounded-xl border border-primary/50 bg-primary/10 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/20 active:scale-[0.98] disabled:opacity-50"
        >
          {state === 'withdrawing' ? '…' : won.isPremium ? 'Активировать' : 'Вывести'}
        </button>
      </div>
      {state === 'error' && <p className="text-center text-[11px] text-red-300">{msg}</p>}
    </div>
  )
}
