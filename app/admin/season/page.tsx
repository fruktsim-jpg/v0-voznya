import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import Link from 'next/link'
import {
  getActiveSeason,
  getDivisionCounts,
  getSeasonLeaderboard,
} from '@/lib/season'
import { SeasonManager } from './season-manager'

export const dynamic = 'force-dynamic'

/**
 * Управление сезоном (admin). Старт/финал сезона + обзор: распределение по
 * дивизионам и топ по сезонному MMR. Просмотр — mmr.view, управление — mmr.add.
 */
export default async function AdminSeasonPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.MMR_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра сезона.
      </div>
    )
  }

  const canManage = hasPermission(session.role, PERM.MMR_ADD)

  const [active, divisions, leaders] = await Promise.all([
    getActiveSeason(),
    getDivisionCounts(),
    getSeasonLeaderboard(25),
  ])

  const daysLeft = active
    ? Math.max(
        0,
        Math.ceil(
          (new Date(active.endsAt).getTime() - Date.now()) / 86_400_000,
        ),
      )
    : 0

  const maxDiv = Math.max(1, ...divisions.map((d) => d.players))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
          🏆 Сезон
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Управление сезоном прогрессии: старт, завершение с раздачей наград,
          обзор дивизионов и топа по сезонному MMR.
        </p>
      </div>

      <SeasonManager
        active={
          active
            ? {
                id: active.id,
                name: active.name,
                endsAt: active.endsAt,
                daysLeft,
              }
            : null
        }
        canManage={canManage}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Распределение по дивизионам
        </h2>
        <div className="glass rounded-2xl border border-border p-4">
          <div className="space-y-2">
            {divisions.map((d) => (
              <div key={d.division.name} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">
                    {d.division.emoji} {d.division.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({d.division.minMmr}+ MMR)
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {d.players} игроков
                  </span>
                </div>
                <div className="mt-0.5 h-2 rounded bg-white/[0.05]">
                  <div
                    className="h-2 rounded bg-primary/70"
                    style={{ width: `${(d.players / maxDiv) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Топ по сезонному MMR
        </h2>
        {leaders.length === 0 ? (
          <div className="glass rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            Пока никто не набрал сезонный MMR.
          </div>
        ) : (
          <div className="glass overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Игрок</th>
                  <th className="px-3 py-2 font-semibold">Дивизион</th>
                  <th className="px-3 py-2 text-right font-semibold">MMR</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((r, i) => (
                  <tr
                    key={r.userId}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/players/${r.userId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.name || (r.username ? `@${r.username}` : `id${r.userId}`)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {r.division.emoji} {r.division.name}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">
                      {r.seasonMmr.toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
