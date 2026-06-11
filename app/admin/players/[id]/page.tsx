import Link from 'next/link'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { rarityStyle, typeEmoji } from '@/lib/inventory'
import { roleLabel } from '@/lib/admin-format'
import { mmrRank } from '@/lib/mmr'
import { RankBadge } from '@/components/prestige'
import {
  loadPlayerDiagnostics,
  loadPlayerActivity,
} from '@/lib/player-analytics'
import { PlayerActions } from './actions'
import { PlayerGifts, type PlayerGift } from './player-gifts'
import { ActivityFeed } from './activity-feed'


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

type CaseOpeningRow = {
  case_item_code: string
  reward_kind: string
  reward_item_code: string | null
  amount: string | null
  qty: number
  created_at: string
  case_name: string | null
  reward_name: string | null
  reward_rarity: string | null
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

  const canGiftView = hasPermission(session.role, PERM.GIFT_VIEW)
  const canGiftManage = hasPermission(session.role, PERM.GIFT_MANAGE)
  const canCasesView = hasPermission(session.role, PERM.CASES_VIEW)

  const [mmrRows, repRows, inventory, gifts, caseOpenings] = await Promise.all([
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
    // Gift deliveries (purchases) for this player — newest first.
    canGiftView
      ? safe(
          query<PlayerGift>(
            `SELECT gt.idempotency_key,
                    gt.item_code,
                    gt.status,
                    (gt.meta->>'star_cost')::int          AS star_cost,
                    COALESCE((gt.meta->>'manual_delivery')::boolean, false) AS manual,
                    (gt.meta->>'manual_by_admin')::bigint  AS manual_by_admin,
                    gt.created_at,
                    gc.name                                AS gift_name,
                    gc.price_eshki                         AS price_eshki
               FROM gift_transactions gt
               LEFT JOIN gift_catalog gc ON gc.code = gt.item_code
              WHERE gt.kind = 'tg_gift' AND gt.recipient_user_id = $1
              ORDER BY gt.created_at DESC
              LIMIT 50`,
            [userId],
          ),
        )
      : Promise.resolve([] as PlayerGift[]),
    // Recent case openings (read-only history) for support/investigations.
    canCasesView
      ? safe(
          query<CaseOpeningRow>(
            `SELECT o.case_item_code, o.reward_kind, o.reward_item_code,
                    o.amount, o.qty, o.created_at,
                    cd.name AS case_name,
                    ii.name AS reward_name, ii.rarity AS reward_rarity
               FROM case_openings o
               LEFT JOIN case_definitions cd ON cd.item_code = o.case_item_code
               LEFT JOIN inventory_items ii ON ii.code = o.reward_item_code
              WHERE o.user_id = $1
              ORDER BY o.created_at DESC
              LIMIT 25`,
            [userId],
          ),
        )
      : Promise.resolve([] as CaseOpeningRow[]),
  ])

  // Diagnostics + unified activity feed (read-only, degrade to zeros/[]).
  const [diag, activity] = await Promise.all([
    loadPlayerDiagnostics(userId),
    loadPlayerActivity(userId, 80),
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

  // Balance/MMR/reputation live in PlayerActions (they update in place after an
  // action). Here we show only the read-only lifetime stats to avoid duplication.
  const stats: { emoji: string; label: string; value: string; tone: string }[] = [
    { emoji: '📈', label: 'Заработано', value: fmt(p.total_earned), tone: 'text-foreground' },
    { emoji: '📉', label: 'Потрачено', value: fmt(p.total_spent), tone: 'text-foreground' },
    { emoji: '💬', label: 'Сообщений', value: fmt(p.messages_count), tone: 'text-sky-200' },
  ]
  if (diag.starsBalance != null) {
    stats.push({
      emoji: '⭐',
      label: 'Stars',
      value: fmt(diag.starsBalance),
      tone: 'text-yellow-200',
    })
  }

  // Quick diagnostic metrics — the questions support asks most often.
  const quick: { emoji: string; label: string; value: string; tone: string }[] = [
    { emoji: '🎁', label: 'Кейсов открыто', value: fmt(diag.casesOpened), tone: 'text-foreground' },
    { emoji: '⭐', label: 'Premium выбито', value: fmt(diag.premiumWon), tone: 'text-yellow-200' },
    { emoji: '💎', label: 'Лимиток выбито', value: fmt(diag.limitedWon), tone: 'text-fuchsia-200' },
    { emoji: '🎰', label: 'Проиграно в казино', value: fmt(diag.casinoLost), tone: 'text-destructive-foreground' },
    { emoji: '🍀', label: 'Выиграно в казино', value: fmt(diag.casinoWon), tone: 'text-emerald-300' },
    { emoji: '🛒', label: 'Потрачено в магазине', value: fmt(diag.shopSpent), tone: 'text-amber-200' },
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
              {/* A4: operator reads the player's prestige WORLD at a glance,
                  not a raw MMR integer buried in the edit form. */}
              {mmr !== null && (
                <RankBadge emoji={mmrRank(mmr).emoji} name={mmrRank(mmr).name} size="sm" sub={<span className="font-mono">{mmr.toLocaleString('ru-RU')}</span>} />
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

      {/* Quick diagnostic metrics — top-of-card answers for support */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {quick.map((s) => (
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
            initialStats={{ balance: p.balance, mmr, reputation }}
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

      {/* Gifts — purchases + manual resolution of pending deliveries */}
      {canGiftView && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Подарки ({gifts.length})
          </h2>
          <PlayerGifts userId={p.user_id} initialGifts={gifts} canManage={canGiftManage} />
        </section>
      )}

      {/* Case openings — read-only history for support/investigations */}
      {canCasesView && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Открытия кейсов ({caseOpenings.length})
          </h2>
          {caseOpenings.length === 0 ? (
            <div className="glass rounded-2xl border border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Открытий кейсов нет.
            </div>
          ) : (
            <div className="space-y-2">
              {caseOpenings.map((o, idx) => {
                const reward =
                  o.reward_kind === 'currency'
                    ? `${fmt(Number(o.amount ?? 0))} ешек`
                    : `${o.reward_name ?? o.reward_item_code ?? 'предмет'}${o.qty > 1 ? ` ×${o.qty}` : ''}`
                const rs = o.reward_rarity ? rarityStyle(o.reward_rarity) : null
                return (
                  <div
                    key={`${o.case_item_code}-${idx}`}
                    className="glass flex items-center gap-3 rounded-2xl border border-border p-3"
                  >
                    <span className="text-xl">🎁</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {o.case_name ?? o.case_item_code}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        → {reward}
                        {rs ? ` · ${rs.label}` : ''}
                        {' · '}
                        {new Date(o.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Unified activity feed — all events on one filterable timeline */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          История ({activity.length})
        </h2>
        <ActivityFeed events={activity} />
      </section>
    </div>
  )
}


