'use client'

import { useEffect, useState, useCallback } from 'react'
import { humanizeAudit, roleLabel } from '@/lib/admin-format'

type Entry = {
  id: number
  actor_user_id: number
  actor_role: string | null
  action: string
  target_user_id: number | null
  target_type: string | null
  target_id: string | null
  amount: number | null
  reason: string | null
  ip: string | null
  created_at: string
}

/**
 * Audit viewer: filter audit_log by user, action and date range. Calls
 * GET /api/admin/audit (gated, logs.view / moderator+). Entries are humanized
 * into emoji + RU sentences instead of raw action codes.
 */
export default function AuditViewerPage() {
  const [user, setUser] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (user.trim()) params.set('user', user.trim())
      if (action.trim()) params.set('action', action.trim())
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/admin/audit?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setEntries(data.entries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }, [user, action, from, to])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inputClass =
    'rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2'

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-foreground sm:text-2xl">Аудит</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
        className="mb-5 flex flex-wrap gap-2"
      >
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="user_id"
          className={`${inputClass} w-32`}
        />
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="действие (напр. economy)"
          className={`${inputClass} flex-1`}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
        >
          {loading ? '…' : 'Фильтр'}
        </button>
      </form>

      {error && (
        <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {entries.length === 0 && !loading ? (
        <div className="glass rounded-2xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Нет записей.
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const h = humanizeAudit(e)
            return (
              <li
                key={e.id}
                className="glass flex items-start gap-3 rounded-2xl border border-border p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
                  {h.emoji}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-foreground">
                    {e.target_user_id ? `id ${e.target_user_id}` : 'Система'}
                  </span>{' '}
                  <span className={h.tone}>{h.text}</span>
                  {e.reason && <span className="text-muted-foreground"> · {e.reason}</span>}
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {roleLabel(e.actor_role)} id {e.actor_user_id} ·{' '}
                    {new Date(e.created_at).toLocaleString('ru-RU')}
                    {e.ip ? ` · ${e.ip}` : ''}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
