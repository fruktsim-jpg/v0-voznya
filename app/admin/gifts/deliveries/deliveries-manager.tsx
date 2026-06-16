'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminModal } from '@/components/admin/kit'

/**
 * Gift deliveries admin manager (client) — the delivery CENTER (Admin V2 P0).
 * Lists gift deliveries with status + source filters, period stats, per-player
 * search, and lets an admin COMPLETE (mark delivered by hand), REFUND (cancel +
 * return ешки) or RETRY (ask the bot to attempt the real Telegram sendGift
 * again) a pending/failed delivery.
 *
 * Every action calls /api/admin/gifts/deliveries (re-checks gift.manage, writes
 * audit). complete/refund mirror the bot's service.py 1:1; retry calls the bot's
 * internal API (the only process holding the token + Stars). One source of truth.
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
  gift_type: string | null
  source: string | null
  attempts: number | null
  last_error: string | null
  gifted_to: string | null
  transaction_eshki: string | null
}

export type DeliveryStats = {
  total: number
  completed: number
  pending: number
  cancelled: number
  failed: number
  premium: number
  limited: number
}

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ Ждёт выдачи',
  completed: '✅ Выдан',
  cancelled: '↩️ Возврат',
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'pending', label: '⏳ Ждут' },
  { value: 'failed', label: '⚠️ Ошибки' },
  { value: 'completed', label: '✅ Выданы' },
  { value: 'cancelled', label: '↩️ Возвраты' },
  { value: 'all', label: 'Все' },
]

const SOURCE_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Любой источник' },
  { value: 'case', label: '🎁 Кейс' },
  { value: 'shop', label: '🛒 Магазин' },
  { value: 'gifted', label: '🤝 Другу' },
  { value: 'admin', label: '🛡 Админ' },
]

const PERIOD_TABS: { value: string; label: string }[] = [
  { value: '24h', label: '24ч' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'all', label: 'Всё время' },
]

const fmt = (n: number) => n.toLocaleString('ru-RU')

function sourceLabel(d: AdminDelivery): string {
  if (d.gift_type === 'admin') return '🛡 Админ'
  if (d.gifted_to) return '🤝 Другу'
  if (d.source === 'case') return '🎁 Кейс'
  return '🛒 Магазин'
}

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
  initialStats,
  canManage,
}: {
  initialDeliveries: AdminDelivery[]
  initialStatus: string
  initialStats: DeliveryStats | null
  canManage: boolean
}) {
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>(initialDeliveries)
  const [stats, setStats] = useState<DeliveryStats | null>(initialStats)
  const [status, setStatus] = useState(initialStatus)
  const [source, setSource] = useState('')
  const [period, setPeriod] = useState('all')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const params = new URLSearchParams({ status, period })
      if (source) params.set('source', source)
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/admin/gifts/deliveries?${params.toString()}`)
      if (res.ok) {
        const d = await res.json()
        setDeliveries(Array.isArray(d.deliveries) ? d.deliveries : [])
        if (d.stats) setStats(d.stats)
      }
    } finally {
      setBusy(false)
    }
  }, [status, source, period, search])

  // Reload when a filter changes (search runs on submit only).
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, source, period])

  async function act(d: AdminDelivery, action: 'complete' | 'refund' | 'retry') {
    if (busy) return
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
      let text: string
      if (action === 'complete') {
        text = 'Подарок отмечен выданным. Статистика обновлена.'
      } else if (action === 'refund') {
        text = `Возврат выполнен${data.refunded ? `: +${fmt(Number(data.refunded))} ешек` : ''}.`
      } else {
        // retry → bot result status
        const map: Record<string, string> = {
          completed: 'Подарок выдан автоматически ✅',
          pending: 'Пока не удалось — осталось в очереди, бот повторит.',
          cancelled: 'Постоянная ошибка — оформлен возврат.',
        }
        text = map[data.status] || `Результат: ${data.status}`
      }
      setMsg({ ok: true, text })
      await load()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  // Confirm gate (replaces window.confirm) — these mutate balances/inventory, so
  // they go through AdminModal like the gifts/cases delete confirms.
  const [pending, setPending] = useState<{ d: AdminDelivery; action: 'complete' | 'refund' | 'retry' } | null>(null)
  const confirmText = (action: 'complete' | 'refund' | 'retry') =>
    action === 'complete'
      ? 'Отметить подарок выданным вручную? Статус сменится на «выдан».'
      : action === 'refund'
        ? 'Вернуть ешки игроку и отменить выдачу? Это движение баланса (необратимо).'
        : 'Попробовать выдать ещё раз через бота?'

  async function runPending() {
    if (!pending) return
    const { d, action } = pending
    setPending(null)
    await act(d, action)
  }

  const statCards: { label: string; value: number; tone: string }[] = stats
    ? [
        { label: 'Всего', value: stats.total, tone: 'text-foreground' },
        { label: 'Выдано', value: stats.completed, tone: 'text-emerald-300' },
        { label: 'Ждут', value: stats.pending, tone: 'text-amber-300' },
        { label: 'Ошибки', value: stats.failed, tone: 'text-destructive-foreground' },
        { label: 'Возвраты', value: stats.cancelled, tone: 'text-sky-200' },
        { label: 'Premium', value: stats.premium, tone: 'text-yellow-200' },
        { label: 'Лимитки', value: stats.limited, tone: 'text-fuchsia-200' },
      ]
    : []

  return (
    <div className="space-y-4">
      {/* Period stats */}
      {stats && (
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PERIOD_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPeriod(t.value)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  period === t.value
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
            {statCards.map((c) => (
              <div key={c.label} className="glass rounded-xl border border-border p-2.5 text-center">
                <div className={`text-base font-bold ${c.tone}`}>{fmt(c.value)}</div>
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {SOURCE_TABS.map((t) => (
            <button
              key={t.value || 'any'}
              type="button"
              onClick={() => setSource(t.value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                source === t.value
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]'
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
            placeholder="Поиск: ID, имя, @username, подарок или delivery key"
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
          {deliveries.map((d) => {
            const isFailed = d.status === 'pending' && (d.attempts ?? 0) > 0
            return (
              <div
                key={d.idempotency_key}
                className="glass flex items-start gap-3 rounded-2xl border border-border p-3"
              >
                <span className="text-xl">🎁</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-foreground">
                      {d.gift_name || d.item_code || '—'}
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {isFailed ? '⚠️ Ошибка выдачи' : STATUS_LABEL[d.status] || d.status}
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {sourceLabel(d)}
                    </span>
                    {d.manual && (
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        вручную
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    →{' '}
                    <Link
                      href={`/admin/players/${d.recipient_user_id}`}
                      className="text-primary hover:underline"
                    >
                      {recipientLabel(d)}
                    </Link>
                    {d.gifted_to ? ` · подарок: ${d.gifted_to}` : ''}
                    {d.price_eshki ? ` · ${fmt(Number(d.price_eshki))} ешек` : ''}
                    {d.star_cost ? ` · ${d.star_cost}★` : ''}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    <code>{d.idempotency_key}</code>
                    {' · '}
                    {new Date(d.created_at).toLocaleString('ru-RU')}
                    {d.status === 'pending' && (
                      <span className={`ml-1 font-semibold ${waitedTone(d.created_at)}`}>
                        · ждёт {waitedLabel(d.created_at)}
                      </span>
                    )}
                    {(d.attempts ?? 0) > 0 && (
                      <span className="ml-1 text-destructive-foreground">
                        · попыток: {d.attempts}
                      </span>
                    )}
                  </div>
                  {isFailed && d.last_error && (
                    <div className="mt-0.5 truncate text-[10px] text-destructive-foreground">
                      Ошибка: {d.last_error}
                    </div>
                  )}
                </div>
                {canManage && d.status === 'pending' && (
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPending({ d, action: 'retry' })}
                      className="rounded-lg border border-primary/40 px-2.5 py-1 text-[11px] text-primary transition hover:bg-primary/15 disabled:opacity-50"
                    >
                      Повторить
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPending({ d, action: 'complete' })}
                      className="rounded-lg border border-emerald-400/40 px-2.5 py-1 text-[11px] text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-50"
                    >
                      Выдан
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPending({ d, action: 'refund' })}
                      className="rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] text-destructive-foreground transition hover:bg-destructive/20 disabled:opacity-50"
                    >
                      Возврат
                    </button>
                  </div>
                )}
                {d.status !== 'pending' && (
                  <Link
                    href={`/admin/players/${d.recipient_user_id}`}
                    className="shrink-0 self-center rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-white/[0.06]"
                  >
                    Профиль
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}

      <AdminModal
        open={pending !== null}
        title={
          pending?.action === 'refund'
            ? 'Вернуть и отменить?'
            : pending?.action === 'complete'
              ? 'Отметить выданным?'
              : 'Повторить выдачу?'
        }
        tone={pending?.action === 'refund' ? 'danger' : 'default'}
        confirmLabel={busy ? '…' : 'Подтвердить'}
        busy={busy}
        onClose={() => !busy && setPending(null)}
        onConfirm={runPending}
      >
        {pending && confirmText(pending.action)}
      </AdminModal>
    </div>
  )
}
