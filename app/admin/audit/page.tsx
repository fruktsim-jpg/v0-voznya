'use client'

import { useEffect, useState, useCallback } from 'react'

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
 * Audit viewer: filter audit_log by user, action and date range.
 * Calls GET /api/admin/audit (gated, logs.view / moderator+).
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
      const res = await fetch(`/api/admin/audit?${params.toString()}`)
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

  const inputStyle = {
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
  } as const

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Аудит</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}
      >
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="user_id"
          style={inputStyle}
        />
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="действие (напр. economy)"
          style={inputStyle}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={inputStyle}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 16px',
            border: '1px solid #2563eb',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {loading ? '...' : 'Фильтр'}
        </button>
      </form>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#666' }}>
            <th style={{ padding: '6px 8px' }}>Время</th>
            <th style={{ padding: '6px 8px' }}>Актор</th>
            <th style={{ padding: '6px 8px' }}>Действие</th>
            <th style={{ padding: '6px 8px' }}>Цель</th>
            <th style={{ padding: '6px 8px' }}>Сумма</th>
            <th style={{ padding: '6px 8px' }}>Причина</th>
            <th style={{ padding: '6px 8px' }}>IP</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                {new Date(e.created_at).toLocaleString('ru-RU')}
              </td>
              <td style={{ padding: '6px 8px' }}>
                {e.actor_user_id} ({e.actor_role ?? '—'})
              </td>
              <td style={{ padding: '6px 8px' }}>
                <code>{e.action}</code>
              </td>
              <td style={{ padding: '6px 8px' }}>
                {e.target_user_id ?? e.target_id ?? '—'}
              </td>
              <td style={{ padding: '6px 8px' }}>{e.amount ?? '—'}</td>
              <td style={{ padding: '6px 8px', color: '#666' }}>{e.reason ?? '—'}</td>
              <td style={{ padding: '6px 8px', color: '#999' }}>{e.ip ?? '—'}</td>
            </tr>
          ))}
          {entries.length === 0 && !loading && (
            <tr>
              <td colSpan={7} style={{ padding: 12, color: '#999' }}>
                Нет записей.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
