import { getAdminSession } from '@/lib/auth/admin-session'
import { query } from '@/lib/db'


export const dynamic = 'force-dynamic'

type Counters = { players: number; items: number; purchases: number; gifts: number }
type AuditRow = {
  id: number
  actor_user_id: number
  actor_role: string | null
  action: string
  target_user_id: number | null
  amount: number | null
  reason: string | null
  created_at: string
}

/**
 * Dashboard: top-level counters + recent audit feed. Renders server-side using
 * the same queries as /api/admin/dashboard (gate is enforced by the layout).
 */
export default async function AdminDashboardPage() {
  // Layout already gated this; still resolve session for safety.
  const session = await getAdminSession()
  if (!session) return null


  const [players, items, purchases, gifts, recent] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
    query<{ count: string }>(
      'SELECT COALESCE(SUM(quantity), 0)::text AS count FROM inventory',
    ),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM purchase_history'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM gift_transactions'),
    query<AuditRow>(
      `SELECT id, actor_user_id, actor_role, action, target_user_id,
              amount, reason, created_at
         FROM audit_log ORDER BY created_at DESC LIMIT 20`,
    ),
  ])

  const counters: Counters = {
    players: Number(players[0]?.count ?? 0),
    items: Number(items[0]?.count ?? 0),
    purchases: Number(purchases[0]?.count ?? 0),
    gifts: Number(gifts[0]?.count ?? 0),
  }

  const cards = [
    { label: 'Игроки', value: counters.players },
    { label: 'Предметы (в инвентарях)', value: counters.items },
    { label: 'Покупки', value: counters.purchases },
    { label: 'Подарки', value: counters.gifts },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Дашборд</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {cards.map((c) => (
          <div
            key={c.label}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}
          >
            <div style={{ fontSize: 13, color: '#666' }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {c.value.toLocaleString('ru-RU')}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
        Последние действия
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#666' }}>
            <th style={{ padding: '6px 8px' }}>Время</th>
            <th style={{ padding: '6px 8px' }}>Актор</th>
            <th style={{ padding: '6px 8px' }}>Действие</th>
            <th style={{ padding: '6px 8px' }}>Цель</th>
            <th style={{ padding: '6px 8px' }}>Сумма</th>
            <th style={{ padding: '6px 8px' }}>Причина</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                {new Date(r.created_at).toLocaleString('ru-RU')}
              </td>
              <td style={{ padding: '6px 8px' }}>
                {r.actor_user_id} ({r.actor_role ?? '—'})
              </td>
              <td style={{ padding: '6px 8px' }}>
                <code>{r.action}</code>
              </td>
              <td style={{ padding: '6px 8px' }}>{r.target_user_id ?? '—'}</td>
              <td style={{ padding: '6px 8px' }}>{r.amount ?? '—'}</td>
              <td style={{ padding: '6px 8px', color: '#666' }}>{r.reason ?? '—'}</td>
            </tr>
          ))}
          {recent.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 12, color: '#999' }}>
                Пока нет записей.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
