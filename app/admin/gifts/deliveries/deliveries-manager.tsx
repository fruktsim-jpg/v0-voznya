'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Gift deliveries admin manager (client). Lists gift deliveries with a status
 * filter + per-player search, and lets an admin manually COMPLETE (mark as
 * delivered by hand) or REFUND (cancel + return ешки) a pending delivery.
 *
 * Every action calls /api/admin/gifts/deliveries (re-checks gift.manage, writes
 * audit) — the SAME business logic as the bot's complete_gift_manually /
 * refund_gift. One source of truth: the route mirrors the bot's ledger steps.
 */

export type AdminDelivery = {
  idempotency_key: string
  recipient_user_id: string
  item_code: string | null
  status: string
  quantity: number
  transaction_id: string | null
  star_cost: number | null
  manual: boolean
  created_at: string
  gift_name: string | null
  price_eshki: string | null
  recipient_name: string | null
  recipient_username: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ Ждёт выдачи',
  completed: '✅ Выдан',
  cancelled: '↩️ Возврат',
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'pending', label: '⏳ Ждут' },
  { value: 'completed', label: '✅ Выданы' },
  { value: 'cancelled', label: '↩️ Возвраты' },
  { value: 'all', label: 'Все' },
]

const fmt = (n: number) => n.toLocaleString('ru-RU')

function recipientLabel(d: AdminDelivery): string {
  const name = d.recipient_name || (d.recipient_username ? `@${d.recipient_username}` : null)
  return name ? `${name} (${d.recipient_user_id})` : d.recipient_user_id
}

/** Human "waiting for N" since purchase — helps triage the oldest pending. */
function waitedLabel(createdAt: string): string {
  const then = new Date(createdAt).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000))
  if (mins < 60) return `${mins} мин`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ч`
  const days = Math.floor(hours / 24)
  return `${days} дн`
}

/** Older pending = louder. Red after 24h, amber after 1h, muted otherwise. */
function waitedTone(createdAt: string): string {
  const then = new Date(createdAt).getTime()
  if (Number.isNaN(then)) return 'text-muted-foreground'
  const hours = (Date.now() - then) / 3600000
  if (hours >= 24) return 'text-destructive-foreground'
  if (hours >= 1) return 'text-amber-300'
  return 'text-muted-foreground'
}


export function DeliveriesManager({
  initialDeliveries,
  initialStatus,
  canManage,
}: {
  initialDeliveries: AdminDelivery[]
  initialStatus: string
  canManage: boolean
}) {
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>(initialDeliveries)
  const [status, setStatus] = useState(initialStatus)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const params = new URLSearchParams({ status })
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/admin/gifts/deliveries?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setDeliveries(Array.isArray(d.deliveries) ? d.deliveries : [])
      }
    } finally {
      setBusy(false)
    }
  }, [status, search])

  // Reload when the status tab changes (search runs on submit only).
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function act(d: AdminDelivery, action: 'complete' | 'refund') {
    if (busy) return
    const verb = action === 'complete' ? 'отметить выданным' : 'вернуть ешки и отменить'
    if (typeof window !== 'undefined' && !window.confirm(`Точно ${verb}?`)) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/gifts/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: d.idempotency_key, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setMsg({
        ok: true,
        text:
          action === 'complete'
            ? 'Подарок отмечен выданным. Статистика обновлена.'
            : `Возврат выполнен${data.refunded ? `: +${fmt(Number(data.refunded))} ешек` : ''}.`,
      })
      await load()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass rounded-2xl border border-border p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatus(t.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                status === t.value
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border bg-white/[0.04] text-foreground hover:border-primary/30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Поиск: ID, имя или @username"
            className="w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2"
          />
          <button
            type="button"
            disabled={busy}
            onClick={load}
            className="shrink-0 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
          >
            Найти
          </button>
        </div>
      </div>

      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
          {msg.text}
        </p>
      )}

      {deliveries.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-4 text-sm text-muted-foreground">
          Доставок не найдено.
        </div>
      ) : (
        <div className="space-y-2">
          {deliveries.map((d) => (
            <div
              key={d.idempotency_key}
              className="glass flex items-center gap-3 rounded-2xl border border-border p-3"
            >
              <span className="text-xl">🎁</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-foreground">
                    {d.gift_name || d.item_code || '—'}
                  </span>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {STATUS_LABEL[d.status] || d.status}
                  </span>
                  {d.manual && (
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      вручную
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  → {recipientLabel(d)}
                  {d.price_eshki ? ` · ${fmt(Number(d.price_eshki))} ешек` : ''}
                  {d.star_cost ? ` · ${d.star_cost}★` : ''}
                  {' · '}
                  {new Date(d.created_at).toLocaleString('ru-RU')}
                  {d.status === 'pending' && (
                    <span className={`ml-1 font-semibold ${waitedTone(d.created_at)}`}>
                      · ждёт {waitedLabel(d.created_at)}
                    </span>
                  )}
                </div>
              </div>
              {canManage && d.status === 'pending' && (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(d, 'complete')}
                    className="rounded-lg border border-emerald-400/40 px-2.5 py-1 text-[11px] text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-50"
                  >
                    Выдан
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(d, 'refund')}
                    className="rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] text-destructive-foreground transition hover:bg-destructive/20 disabled:opacity-50"
                  >
                    Возврат
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
