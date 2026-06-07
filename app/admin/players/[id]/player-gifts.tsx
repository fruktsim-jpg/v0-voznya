'use client'

import { useState } from 'react'

/**
 * Player gift deliveries block (client). Shows a player's gift purchases and
 * lets an admin resolve pending ones (manual complete / refund) right from the
 * player card. Reuses /api/admin/gifts/deliveries — the SAME logic as the bot
 * and the deliveries page. No new business logic here, only a player-scoped view.
 */

export type PlayerGift = {
  idempotency_key: string
  item_code: string | null
  status: string
  star_cost: number | null
  manual: boolean
  manual_by_admin: number | null
  created_at: string
  gift_name: string | null
  price_eshki: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ ждёт',
  completed: '✅ выдан',
  cancelled: '↩️ возврат',
}

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function PlayerGifts({
  userId,
  initialGifts,
  canManage,
}: {
  userId: number
  initialGifts: PlayerGift[]
  canManage: boolean
}) {
  const [gifts, setGifts] = useState<PlayerGift[]>(initialGifts)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function reload() {
    const res = await fetch(
      `/api/admin/gifts/deliveries?status=all&userId=${userId}`,
    )
    if (res.ok) {
      const d = await res.json()
      setGifts(Array.isArray(d.deliveries) ? d.deliveries : [])
    }
  }

  async function act(key: string, action: 'complete' | 'refund') {
    if (busy) return
    const verb = action === 'complete' ? 'отметить выданным' : 'вернуть ешки и отменить'
    if (typeof window !== 'undefined' && !window.confirm(`Точно ${verb}?`)) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/gifts/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: key, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setMsg({
        ok: true,
        text:
          action === 'complete'
            ? 'Подарок отмечен выданным.'
            : `Возврат выполнен${data.refunded ? `: +${fmt(Number(data.refunded))} ешек` : ''}.`,
      })
      await reload()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
          {msg.text}
        </p>
      )}
      {gifts.length === 0 ? (
        <div className="glass rounded-2xl border border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Покупок подарков нет.
        </div>
      ) : (
        gifts.map((g) => (
          <div
            key={g.idempotency_key}
            className="glass flex items-center gap-3 rounded-2xl border border-border p-3"
          >
            <span className="text-xl">🎁</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-foreground">
                  {g.gift_name || g.item_code || '—'}
                </span>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {STATUS_LABEL[g.status] || g.status}
                </span>
                {g.manual && (
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    вручную{g.manual_by_admin ? ` · #${g.manual_by_admin}` : ''}
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {g.price_eshki ? `${fmt(Number(g.price_eshki))} ешек` : ''}
                {g.star_cost ? ` · ${g.star_cost}★` : ''}
                {' · '}
                {new Date(g.created_at).toLocaleString('ru-RU')}
              </div>
            </div>
            {canManage && g.status === 'pending' && (
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(g.idempotency_key, 'complete')}
                  className="rounded-lg border border-emerald-400/40 px-2.5 py-1 text-[11px] text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  Выдан
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(g.idempotency_key, 'refund')}
                  className="rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] text-destructive-foreground transition hover:bg-destructive/20 disabled:opacity-50"
                >
                  Возврат
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
