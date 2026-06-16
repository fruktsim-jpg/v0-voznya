import Link from 'next/link'
import { getAdminSession } from '@/lib/auth/admin-session'
import { query } from '@/lib/db'
import { PlayerSearch } from '@/components/admin/player-search'
import { AdminPageHeader } from '@/components/admin/ui'
import { StatCard, MetricGrid } from '@/components/admin/kit'
import { roleLabel } from '@/lib/admin-format'
import { formatCurrency } from '@/lib/pluralize'

export const dynamic = 'force-dynamic'

/**
 * Players landing — the entrance to Player Studio. Not a raw table: search on
 * top, then "recently opened" (distinct players recently acted on, from the
 * audit log) and "notable" (top balance + staff) as fast jump-offs. All
 * read-only and degrade to empty if a table is missing. The per-player screen
 * (Player Studio) is where the actual operator powers live.
 */

type MiniPlayer = {
  user_id: number
  first_name: string | null
  username: string | null
  balance: number
  role: string | null
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p
  } catch {
    return fallback
  }
}

export default async function PlayersLandingPage() {
  const session = await getAdminSession()
  if (!session) return null

  // Recently acted-on players (distinct targets from the audit log) — the
  // "pick up where I left off" list. Joined to users for display.
  const recent = await safe(
    query<MiniPlayer & { last_at: string }>(
      `SELECT u.user_id, u.first_name, u.username, u.balance, r.role,
              a.last_at
         FROM (
           SELECT target_user_id, MAX(created_at) AS last_at
             FROM audit_log
            WHERE target_user_id IS NOT NULL
            GROUP BY target_user_id
            ORDER BY last_at DESC
            LIMIT 8
         ) a
         JOIN users u ON u.user_id = a.target_user_id
         LEFT JOIN admin_roles r ON r.user_id = u.user_id
        ORDER BY a.last_at DESC`,
    ),
    [] as (MiniPlayer & { last_at: string })[],
  )

  // Notable players: biggest balances — the high-value accounts worth watching.
  const notable = await safe(
    query<MiniPlayer>(
      `SELECT u.user_id, u.first_name, u.username, u.balance, r.role
         FROM users u
         LEFT JOIN admin_roles r ON r.user_id = u.user_id
        ORDER BY u.balance DESC
        LIMIT 6`,
    ),
    [] as MiniPlayer[],
  )

  return (
    <div>
      <AdminPageHeader
        eyebrow="Player Studio"
        title="Игроки"
        subtitle="Найди игрока и открой Player Studio — баланс, премиум, подарки, кулдауны, инвентарь, репутация, достижения и история на одном экране."
      />

      <PlayerSearch />

      {(recent.length > 0 || notable.length > 0) && (
        <MetricGrid cols={3} className="mt-6">
          <StatCard
            label="Недавно открытые"
            value={recent.length.toLocaleString('ru-RU')}
            glyph="🕒"
            accent="indigo"
            caption="из журнала действий"
          />
          <StatCard
            label="Крупнейший баланс"
            value={notable.length > 0 ? formatCurrency(notable[0].balance) : '—'}
            glyph="👑"
            accent="gold"
            economy
            caption={notable.length > 0 ? (notable[0].first_name ?? `id ${notable[0].user_id}`) : undefined}
          />
          <StatCard
            label="В обзоре"
            value={notable.length.toLocaleString('ru-RU')}
            glyph="🎯"
            accent="pink"
            caption="высокоценные аккаунты"
          />
        </MetricGrid>
      )}

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Недавно открытые
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recent.map((p) => (
              <PlayerRow key={`r-${p.user_id}`} p={p} />
            ))}
          </div>
        </section>
      )}

      {notable.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Крупнейшие балансы
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {notable.map((p) => (
              <PlayerRow key={`n-${p.user_id}`} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PlayerRow({ p }: { p: MiniPlayer }) {
  return (
    <Link
      href={`/admin/players/${p.user_id}`}
      className="glass flex items-center gap-3 rounded-2xl border border-border p-3 transition hover:border-primary/40 hover:bg-primary/[0.06]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold text-foreground">
        {(p.first_name ?? p.username ?? '?').slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-foreground">
            {p.first_name ?? 'Без имени'}
          </span>
          {p.role && (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {roleLabel(p.role)}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {p.username ? `@${p.username} · ` : ''}id {p.user_id}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold text-amber-200">{formatCurrency(p.balance)}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">ешки</div>
      </div>
    </Link>
  )
}
