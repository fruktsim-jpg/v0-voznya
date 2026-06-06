import Link from 'next/link'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { rarityStyle, typeEmoji } from '@/lib/inventory'
import { roleLabel } from '@/lib/admin-format'
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

type InventoryRow = {
  item_code: string
  quantity: number
  equipped: boolean
  source: string
  name: string | null
  rarity: string | null
  type: string | null
}

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
    return <p className="text-destructive-foreground">Некорректный id.</p>
  }

  // Player profile + a couple of journal totals (graceful on un-migrated DBs).
  const profileRows = await query<Profile>(
    `SELECT u.user_id, u.username, u.first_name, u.balance, u.total_earned,
            u.total_spent, u.messages_count, u.created_at, r.role
       FROM users u LEFT JOIN admin_roles r ON r.user_id = u.user_id
      WHERE u.user_id = $1`,
    [userId],
  )

  if (profileRows.length === 0) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-center">
        <p className="text-foreground">Игрок {userId} не найден.</p>
        <Link href="/admin" className="mt-2 inline-block text-sm text-primary hover:underline">
          ← К поиску
        </Link>
      </div>
    )
  }

  const safe = async <T,>(p: Promise<T[]>): Promise<T[]> => {
    try {
      return await p
    } catch {
      return []
    }
  }

  const [mmrRows, repRows, inventory] = await Promise.all([
    safe(query<{ mmr: string | null }>('SELECT mmr FROM users WHERE user_id = $1', [userId])),
    safe(
      query<{ rep: string | null }>(
        'SELECT COALESCE(SUM(value), 0) AS rep FROM reputation_entries WHERE target_user_id = $1',
        [userId],
      ),
    ),
    safe(
      query<InventoryRow>(
        `SELECT i.item_code, i.quantity, i.equipped, i.source, c.name, c.rarity, c.type
           FROM inventory i LEFT JOIN inventory_items c ON c.code = i.item_code
          WHERE i.user_id = $1 ORDER BY i.acquired_at DESC`,
        [userId],
      ),
    ),
  ])

  const p = profileRows[0]
  const mmr = mmrRows[0]?.mmr != null ? Number(mmrRows[0].mmr) : null
  const reputation = repRows[0]?.rep != null ? Number(repRows[0].rep) : null

  const canEconomy =
    hasPermission(session.role, PERM.ECONOMY_ADD) ||
    hasPermission(session.role, PERM.ECONOMY_REMOVE)
  const canInventory =
    hasPermission(session.role, PERM.INVENTORY_GRANT) ||
    hasPermission(session.role, PERM.INVENTORY_REVOKE)
  const canMmr =
    hasPermission(session.role, PERM.MMR_ADD) || hasPermission(session.role, PERM.MMR_REMOVE)
  const canReputation =
    hasPermission(session.role, PERM.REPUTATION_ADD) ||
    hasPermission(session.role, PERM.REPUTATION_REMOVE)
  const canAchievements =
    hasPermission(session.role, PERM.ACHIEVEMENTS_GRANT) ||
    hasPermission(session.role, PERM.ACHIEVEMENTS_REVOKE)

  const fmt = (n: number) => n.toLocaleString('ru-RU')

  const stats: { emoji: string; label: string; value: string; tone: string }[] = [
    { emoji: '💰', label: 'Баланс', value: fmt(p.balance), tone: 'text-amber-200' },
    { emoji: '🏆', label: 'MMR', value: mmr == null ? '—' : fmt(mmr), tone: 'text-primary' },
    {
      emoji: '❤️',
      label: 'Репутация',
      value: reputation == null ? '—' : fmt(reputation),
      tone: 'text-rose-200',
    },
    { emoji: '📈', label: 'Заработано', value: fmt(p.total_earned), tone: 'text-foreground' },
    { emoji: '📉', label: 'Потрачено', value: fmt(p.total_spent), tone: 'text-foreground' },
    { emoji: '💬', label: 'Сообщений', value: fmt(p.messages_count), tone: 'text-sky-200' },
  ]

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-block text-sm text-primary hover:underline">
        ← К поиску
      </Link>

      {/* Header */}
      <div className="glass relative overflow-hidden rounded-2xl border border-border p-5 sm:rounded-3xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-2xl font-bold text-foreground">
            {(p.first_name ?? p.username ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                {p.first_name ?? `id${p.user_id}`}
              </h1>
              {p.role && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {roleLabel(p.role)}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {p.username ? `@${p.username} · ` : ''}id {p.user_id} · в чате с{' '}
              {new Date(p.created_at).toLocaleDateString('ru-RU')}
            </div>
            <Link
              href={`/profile/${p.user_id}`}
              className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
            >
              Публичный профиль →
            </Link>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl border border-border p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">{s.emoji}</span>
              <div className="min-w-0">
                <div className={`text-lg font-bold ${s.tone}`}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {(canEconomy || canInventory || canMmr || canReputation || canAchievements) && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Действия
          </h2>
          <PlayerActions
            userId={p.user_id}
            canEconomy={canEconomy}
            canInventory={canInventory}
            canMmr={canMmr}
            canReputation={canReputation}
            canAchievements={canAchievements}
          />
        </section>
      )}

      {/* Inventory — rarity-colored cards */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Инвентарь ({inventory.length})
        </h2>
        {inventory.length === 0 ? (
          <div className="glass rounded-2xl border border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Инвентарь пуст.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {inventory.map((i, idx) => {
              const rs = rarityStyle(i.rarity ?? 'common')
              return (
                <div
                  key={`${i.item_code}-${idx}`}
                  className={`rounded-2xl border p-3 ${rs.className}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeEmoji(i.type ?? '')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {i.name ?? i.item_code}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {rs.label}
                        {i.quantity > 1 ? ` · ×${i.quantity}` : ''}
                        {i.equipped ? ' · экип.' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 truncate text-[10px] text-muted-foreground">
                    <code>{i.item_code}</code> · {i.source}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
