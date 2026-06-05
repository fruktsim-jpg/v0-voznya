import Link from 'next/link'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { PlayerActions } from './actions'

export const dynamic = 'force-dynamic'

type Profile = {
  user_id: number
  username: string | null
  first_name: string | null
  balance: number
  total_earned: number
  total_spent: number
  messages_count: number
  created_at: string
  role: string | null
}

const cell = { padding: '6px 8px' } as const
const th = { padding: '6px 8px', textAlign: 'left' as const, color: '#666' }

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getAdminSession()
  if (!session) return null

  const { id } = await params
  const userId = Number(id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return <p style={{ color: '#dc2626' }}>Некорректный id.</p>
  }

  const [profileRows, inventory, purchases, giftsOut, giftsIn] = await Promise.all([
    query<Profile>(
      `SELECT u.user_id, u.username, u.first_name, u.balance, u.total_earned,
              u.total_spent, u.messages_count, u.created_at, r.role
         FROM users u LEFT JOIN admin_roles r ON r.user_id = u.user_id
        WHERE u.user_id = $1`,
      [userId],
    ),
    query(
      `SELECT i.item_code, i.quantity, i.equipped, i.source, c.name, c.rarity
         FROM inventory i LEFT JOIN inventory_items c ON c.code = i.item_code
        WHERE i.user_id = $1 ORDER BY i.acquired_at DESC`,
      [userId],
    ),
    query(
      `SELECT id, item_code, price, quantity, source, created_at
         FROM purchase_history WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 50`,
      [userId],
    ),
    query(
      `SELECT id, kind, item_code, amount, recipient_user_id AS counterparty,
              'sent' AS direction, created_at
         FROM gift_transactions WHERE sender_user_id = $1
        ORDER BY created_at DESC LIMIT 50`,
      [userId],
    ),
    query(
      `SELECT id, kind, item_code, amount, sender_user_id AS counterparty,
              'received' AS direction, created_at
         FROM gift_transactions WHERE recipient_user_id = $1
        ORDER BY created_at DESC LIMIT 50`,
      [userId],
    ),
  ])

  if (profileRows.length === 0) {
    return (
      <div>
        <p>Игрок {userId} не найден.</p>
        <Link href="/admin/players" style={{ color: '#2563eb' }}>
          ← К поиску
        </Link>
      </div>
    )
  }

  const p = profileRows[0]
  const gifts = [...giftsOut, ...giftsIn].sort(
    (a, b) =>
      new Date(b.created_at as string).getTime() -
      new Date(a.created_at as string).getTime(),
  )

  const canEconomy =
    hasPermission(session.role, PERM.ECONOMY_ADD) ||
    hasPermission(session.role, PERM.ECONOMY_REMOVE)
  const canInventory =
    hasPermission(session.role, PERM.INVENTORY_GRANT) ||
    hasPermission(session.role, PERM.INVENTORY_REVOKE)

  return (
    <div>
      <Link href="/admin/players" style={{ color: '#2563eb', fontSize: 14 }}>
        ← К поиску
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '12px 0' }}>
        {p.first_name ?? `id${p.user_id}`}{' '}
        {p.username && <span style={{ color: '#666' }}>@{p.username}</span>}
      </h1>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        <Stat label="user_id" value={String(p.user_id)} />
        <Stat label="Баланс" value={Number(p.balance).toLocaleString('ru-RU')} />
        <Stat label="Роль" value={p.role ?? '—'} />
        <Stat label="Заработано" value={Number(p.total_earned).toLocaleString('ru-RU')} />
        <Stat label="Потрачено" value={Number(p.total_spent).toLocaleString('ru-RU')} />
        <Stat label="Сообщений" value={Number(p.messages_count).toLocaleString('ru-RU')} />
      </div>

      {(canEconomy || canInventory) && (
        <PlayerActions
          userId={p.user_id}
          canEconomy={canEconomy}
          canInventory={canInventory}
        />
      )}

      <Section title={`Инвентарь (${inventory.length})`}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Код</th>
              <th style={th}>Название</th>
              <th style={th}>Редкость</th>
              <th style={th}>Кол-во</th>
              <th style={th}>Экип.</th>
              <th style={th}>Источник</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((i, idx) => (
              <tr key={idx} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={cell}><code>{i.item_code as string}</code></td>
                <td style={cell}>{(i.name as string) ?? '—'}</td>
                <td style={cell}>{(i.rarity as string) ?? '—'}</td>
                <td style={cell}>{i.quantity as number}</td>
                <td style={cell}>{i.equipped ? '✓' : ''}</td>
                <td style={cell}>{i.source as string}</td>
              </tr>
            ))}
            {inventory.length === 0 && <Empty cols={6} />}
          </tbody>
        </table>
      </Section>

      <Section title={`Покупки (${purchases.length})`}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Время</th>
              <th style={th}>Предмет</th>
              <th style={th}>Цена</th>
              <th style={th}>Кол-во</th>
              <th style={th}>Источник</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((pu) => (
              <tr key={pu.id as number} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={cell}>
                  {new Date(pu.created_at as string).toLocaleString('ru-RU')}
                </td>
                <td style={cell}><code>{pu.item_code as string}</code></td>
                <td style={cell}>{Number(pu.price).toLocaleString('ru-RU')}</td>
                <td style={cell}>{pu.quantity as number}</td>
                <td style={cell}>{pu.source as string}</td>
              </tr>
            ))}
            {purchases.length === 0 && <Empty cols={5} />}
          </tbody>
        </table>
      </Section>

      <Section title={`Подарки (${gifts.length})`}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Время</th>
              <th style={th}>Направление</th>
              <th style={th}>Тип</th>
              <th style={th}>Предмет / сумма</th>
              <th style={th}>Контрагент</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map((g) => (
              <tr key={`${g.direction}-${g.id}`} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={cell}>
                  {new Date(g.created_at as string).toLocaleString('ru-RU')}
                </td>
                <td style={cell}>
                  {g.direction === 'sent' ? 'отправлен' : 'получен'}
                </td>
                <td style={cell}>{g.kind as string}</td>
                <td style={cell}>
                  {g.kind === 'item'
                    ? (g.item_code as string)
                    : Number(g.amount).toLocaleString('ru-RU')}
                </td>
                <td style={cell}>{(g.counterparty as number) ?? 'система'}</td>
              </tr>
            ))}
            {gifts.length === 0 && <Empty cols={5} />}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 }

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  )
}

function Empty({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: 12, color: '#999' }}>
        Пусто.
      </td>
    </tr>
  )
}
