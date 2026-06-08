'use client'

import { useState } from 'react'
import { notifyBalanceChanged } from '@/lib/balance-events'

/**
 * GiftBuyButton (Release 2.2) — рабочая кнопка покупки подарка в Магазине.
 *
 * Раньше карточка подарка была только витриной (server component без действия) —
 * купить было нельзя. Теперь кнопка бьёт в POST /api/gifts/buy → lib/shop-actions
 * (порт buy_gift): подарок списывает ешки и кладётся в инвентарь как pending.
 * После успеха обновляем баланс в шапке без F5 (P5) и предлагаем перейти в
 * инвентарь, где игрок решает судьбу предмета (хранить/продать/вывести).
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

type BuyState = 'idle' | 'buying' | 'bought' | 'error'

export function GiftBuyButton({
  code,
  priceEshki,
  color,
}: {
  code: string
  priceEshki: number
  color: string
}) {
  const [state, setState] = useState<BuyState>('idle')
  const [msg, setMsg] = useState('')

  async function buy() {
    if (state === 'buying' || state === 'bought') return
    setState('buying')
    setMsg('')
    try {
      const res = await fetch('/api/gifts/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.status === 'ok') {
        setState('bought')
        setMsg('✅ В инвентаре')
        notifyBalanceChanged()
        return
      }
      setState('error')
      setMsg(
        res.status === 401
          ? 'Войди через Telegram'
          : data.status === 'not_enough'
            ? 'Не хватает ешек'
            : data.status === 'sold_out'
              ? 'Распродано'
              : data.status === 'inactive'
                ? 'Недоступно'
                : 'Не вышло, попробуй позже',
      )
    } catch {
      setState('error')
      setMsg('Сеть недоступна')
    }
  }

  if (state === 'bought') {
    return (
      <a
        href="/inventory"
        className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20"
      >
        ✅ В инвентаре →
      </a>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={buy}
        disabled={state === 'buying'}
        className="rounded-full border px-3 py-1 text-xs font-bold transition disabled:opacity-50"
        style={{ borderColor: `${color}88`, color }}
      >
        {state === 'buying' ? '…' : `Купить · ${fmt(priceEshki)}`}
      </button>
      {state === 'error' && (
        <span className="text-[10px] font-semibold text-red-300">{msg}</span>
      )}
    </div>
  )
}
