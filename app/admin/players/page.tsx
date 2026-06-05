'use client'

import { useState } from 'react'
import Link from 'next/link'

type Player = {
  user_id: number
  username: string | null
  first_name: string | null
  balance: number
  role: string | null
}

/**
 * Player search: by user_id, username, or first name. Calls
 * GET /api/admin/players?q=... (gated server-side).
 */
export default function PlayersSearchPage() {
  const [q, setQ] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/players?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка поиска')
      setPlayers(data.players ?? [])
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Игроки</h1>

      <form onSubmit={search} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="user_id, username или имя"
          style={{
            flex: 1,
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
          }}
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
          {loading ? '...' : 'Найти'}
        </button>
      </form>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {players.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#666' }}>
              <th style={{ padding: '6px 8px' }}>user_id</th>
              <th style={{ padding: '6px 8px' }}>Имя</th>
              <th style={{ padding: '6px 8px' }}>Username</th>
              <th style={{ padding: '6px 8px' }}>Баланс</th>
              <th style={{ padding: '6px 8px' }}>Роль</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.user_id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 8px' }}>
                  <Link href={`/admin/players/${p.user_id}`} style={{ color: '#2563eb' }}>
                    {p.user_id}
                  </Link>
                </td>
                <td style={{ padding: '6px 8px' }}>{p.first_name ?? '—'}</td>
                <td style={{ padding: '6px 8px' }}>
                  {p.username ? `@${p.username}` : '—'}
                </td>
                <td style={{ padding: '6px 8px' }}>
                  {Number(p.balance).toLocaleString('ru-RU')}
                </td>
                <td style={{ padding: '6px 8px' }}>{p.role ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {searched && players.length === 0 && !loading && (
        <p style={{ color: '#999' }}>Ничего не найдено.</p>
      )}
    </div>
  )
}
