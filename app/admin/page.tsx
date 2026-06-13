import Link from 'next/link'
import { getAdminSession } from '@/lib/auth/admin-session'
import { loadRecentAudit } from '@/lib/admin-stats'
import { loadPulse } from '@/lib/command-center-pulse'
import { loadEconomyOverview, loadGiftsOverview } from '@/lib/economy-analytics'
import { query } from '@/lib/db'
import { CommandCenterPulse } from '@/components/admin/command-center-pulse'
import { WorldState, type WorldStateData } from '@/components/admin/world-state'
import { PlayerSearch } from '@/components/admin/player-search'
import { humanizeAudit, roleLabel } from '@/lib/admin-format'

export const dynamic = 'force-dynamic'

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p
  } catch {
    return fallback
  }
}

/**
 * Command Center home — the owner's screen. Reads top-to-bottom as a cockpit:
 *   1. WorldState — the living platform in four glances (economy/players/season/gifts).
 *   2. Pulse — what needs you now, action-first (deep findings + action chips).
 *   3. Player search — the highest-frequency tool.
 *   4. Recent activity — the audit tail, demoted.
 * The old flat 8-counter grid was removed: WorldState answers the same questions
 * with hierarchy, and Pulse answers "what to do" — no duplicate "here are totals".
 */
export default async function AdminDashboardPage() {
  const session = await getAdminSession()
  if (!session) return null

  const [recent, pulse, eco, gifts, seasonRows] = await Promise.all([
    safe(loadRecentAudit(12), []),
    loadPulse(),
    safe(loadEconomyOverview(), {
      totalEshki: null, players: null, activePlayers7d: null,
      avgBalance: null, mintedToday: null, burnedToday: null, netToday: null,
    }),
    safe(loadGiftsOverview(), null),
    safe(
      query<{ name: string; ends_at: string | null; is_active: boolean }>(
        `SELECT name, ends_at, is_active FROM seasons WHERE is_active = true ORDER BY started_at DESC LIMIT 1`,
      ),
      [] as { name: string; ends_at: string | null; is_active: boolean }[],
    ),
  ])

  const season = seasonRows[0]
  const daysLeft = season?.ends_at
    ? Math.ceil((new Date(season.ends_at).getTime() - Date.now()) / 86_400_000)
    : null

  const world: WorldStateData = {
    economy: {
      totalEshki: eco.totalEshki,
      netToday: eco.netToday,
      activePlayers7d: eco.activePlayers7d,
    },
    players: { total: eco.players, active7d: eco.activePlayers7d },
    season: { name: season?.name ?? null, daysLeft, active: !!season },
    gifts: {
      pending: gifts?.pending ?? null,
      completed: gifts?.completed ?? null,
    },
  }

  return (
    <div className="space-y-7">
      {/* Hero: state of the world */}
      <section>
        <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Командный центр</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Состояние VOZNYA одним взглядом — и что требует твоего внимания.
        </p>
        <WorldState data={world} />
      </section>

      {/* What needs you now */}
      <section>
        <CommandCenterPulse report={pulse} />
      </section>

      {/* Search — the primary tool */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Найти игрока
        </h2>
        <PlayerSearch />
      </section>

      {/* Recent activity — demoted tail */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Последние действия
          </h2>
          <Link href="/admin/audit" className="text-xs font-medium text-primary hover:underline">
            Весь аудит →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="glass rounded-2xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Пока нет записей.
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => {
              const h = humanizeAudit(r)
              return (
                <li
                  key={r.id}
                  className="glass flex items-center gap-3 rounded-2xl border border-border p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
                    {h.emoji}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold text-foreground">
                      {r.target_name ?? (r.target_user_id ? `id ${r.target_user_id}` : 'Система')}
                    </span>{' '}
                    <span className={h.tone}>{h.text}</span>
                    {r.reason && <span className="text-muted-foreground"> · {r.reason}</span>}
                    <div className="text-[11px] text-muted-foreground">
                      {roleLabel(r.actor_role)} {r.actor_name ?? `id ${r.actor_user_id}`} ·{' '}
                      {new Date(r.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
