'use client'

import { useState } from 'react'
import { notifyBalanceChanged } from '@/lib/balance-events'
import { useCelebration } from '@/components/celebration/celebration-host'
import { tierFromRarity } from '@/lib/celebration'
import { resolveItemArt } from '@/lib/item-art/resolve'
import type { Rarity } from '@/lib/rarity'

/**
 * GiftBuyButton (Release 2.2) — рабочая кнопка покупки подарка в Магазине.
 *
 * Раньше карточка подарка была только витриной (server component без действия) —
 * купить было нельзя. Теперь кнопка бьёт в POST /api/gifts/buy → lib/shop-actions
 * (порт buy_gift): подарок списывает ешки и кладётся в инвентарь как pending.
 * После успеха обновляем баланс в шапке без F5 (P5) и предлагаем перейти в
 * инвентарь, где игрок решает судьбу предмета (хранить/продать/вывести).
 *
 * P1.5b — Desire Delivery: покупка теперь ПРАЗДНУЕТСЯ. Successful buy fires a
 * celebration showing the REAL purchased object (same ItemArt as everywhere),
 * so spending money produces a moment, not a text link.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

type BuyState = 'idle' | 'buying' | 'bought' | 'error'

export function GiftBuyButton({
  code,
  name,
  rarity,
  priceEshki,
  color,
  owned = false,
  affordable = null,
}: {
  code: string
  name?: string
  rarity?: Rarity
  priceEshki: number
  color: string
  /** Player already holds this gift (pending) — offer to view, not re-buy. */
  owned?: boolean
  /** Known affordability before the round-trip (null = unknown / guest). */
  affordable?: boolean | null
}) {
  const [state, setState] = useState<BuyState>('idle')
  const [msg, setMsg] = useState('')
  const { celebrate } = useCelebration()

  async function buy() {
    if (state === 'buying' || state === 'bought') return
    // Balance-aware: don't spend a round-trip on a purchase we know will fail.
    if (affordable === false) {
      setState('error')
      setMsg('Не хватает ешек')
      return
    }
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
        // The purchase becomes a MOMENT showing the real object (graceful glyph
        // fallback when no asset). Gifts are tradeable objects — worth a beat.
        const r: Rarity = rarity ?? 'rare'
        const art = resolveItemArt({ code, itemClass: 'gift', rarity: r }).src
        celebrate({
          kind: 'purchase',
          tier: tierFromRarity(r),
          title: data.giftName ?? name ?? 'Подарок',
          subtitle: '🎁 В инвентаре — реши его судьбу',
          glyph: '🎁',
          art: art ?? undefined,
          rarity: r,
          shareable: false,
        })
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

  if (state === 'bought' || owned) {
    return (
      <a
        href="/inventory"
        className="inline-flex w-full items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20"
      >
        {state === 'bought' ? '✅ Куплено · в инвентаре →' : 'В инвентаре →'}
      </a>
    )
  }

  const cantAfford = affordable === false

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={buy}
        disabled={state === 'buying' || cantAfford}
        className="w-full rounded-full border px-3 py-1.5 text-xs font-bold transition hover:brightness-110 disabled:opacity-40"
        style={{ borderColor: `${color}88`, color }}
      >
        {state === 'buying' ? '…' : cantAfford ? 'Не хватает ешек' : `Купить · ${fmt(priceEshki)}`}
      </button>
      {state === 'error' && (
        <span className="text-[10px] font-semibold text-red-300">{msg}</span>
      )}
    </div>
  )
}
