import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import {
  loadCaseLiveStats,
  loadBiggestDrops,
  loadLatestDrops,
  type CaseLiveStats,
  type NotableDrop,
} from '@/lib/economy-analytics'
import { CasesManager, type AdminCase } from './cases-manager'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => n.toLocaleString('ru-RU')

function dropLabel(d: NotableDrop): string {
  if (d.rewardKind === 'currency') return `${fmt(d.amount ?? 0)} ешек`
  const name = d.rewardItemName ?? d.rewardItemCode ?? 'предмет'
  return d.qty > 1 ? `${name} ×${d.qty}` : name
}


/**
 * Cases admin page. Server component: gates on cases.view, loads the case
 * definitions (degrading to an empty list if migration 0016 is not applied),
 * and hands them to the client manager. All mutations go through the
 * /api/admin/cases routes, which re-check permissions and write audit rows.
 *
 * The case OPENING logic is never here — it lives only in the bot's
 * open_case(). This page manages definitions and drop-lists, and shows odds.
 */
export default async function AdminCasesPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.CASES_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра кейсов.
      </div>
    )
  }

  const canManage = hasPermission(session.role, PERM.CASES_MANAGE)

  let cases: AdminCase[] = []
  try {
    cases = await query<AdminCase>(
      `SELECT d.item_code, d.name, d.description, d.open_cost_kind,
              d.open_cost_amount::int AS open_cost_amount,
              d.consumes_key, d.is_active, d.season_code,
              COUNT(r.id)::int AS reward_count,
              COALESCE(SUM(r.weight), 0)::int AS total_weight
         FROM case_definitions d
         LEFT JOIN case_rewards r ON r.case_item_code = d.item_code
        GROUP BY d.id
        ORDER BY d.is_active DESC, d.name`,
    )
  } catch {
    cases = []
  }

  // Live stats over the openings ledger (read-only; degrade to empty/[]).
  const [liveStats, biggest, latest] = await Promise.all([
    loadCaseLiveStats(),
    loadBiggestDrops(8),
    loadLatestDrops(12),
  ])

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Кейсы</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Управление кейсами и их дроп-листами. Шансы считаются из весов. Открытие
        кейсов выполняет только бот — здесь только настройка и история.
      </p>

      {/* Live per-case stats from the openings ledger */}
      <div className="mb-6 overflow-x-auto rounded-2xl border border-border glass">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Кейс</th>
              <th className="px-3 py-2 text-right">Сегодня</th>
              <th className="px-3 py-2 text-right">Всего</th>
              <th className="px-3 py-2 text-right">Потрачено</th>
              <th className="px-3 py-2 text-right">Факт. RTP</th>
              <th className="px-3 py-2 text-right">Premium</th>
              <th className="px-3 py-2 text-right">Лимитки</th>
              <th className="px-3 py-2 text-right">Джекпоты</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">
                  Нет данных по открытиям.
                </td>
              </tr>
            ) : (
              cases.map((c) => {
                const s: CaseLiveStats | undefined = liveStats.get(c.item_code)
                return (
                  <tr key={c.item_code} className="border-b border-border/50">
                    <td className="px-3 py-2 text-foreground">{c.name}</td>
                    <td className="px-3 py-2 text-right">{fmt(s?.openingsToday ?? 0)}</td>
                    <td className="px-3 py-2 text-right">{fmt(s?.openingsTotal ?? 0)}</td>
                    <td className="px-3 py-2 text-right">{fmt(s?.eshkiSpent ?? 0)}</td>
                    <td className="px-3 py-2 text-right">
                      {s?.actualRtp == null ? '—' : `${(s.actualRtp * 100).toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(s?.premiumDrops ?? 0)}</td>
                    <td className="px-3 py-2 text-right">{fmt(s?.limitedDrops ?? 0)}</td>
                    <td className="px-3 py-2 text-right">{fmt(s?.jackpotDrops ?? 0)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Самые дорогие выпадения
          </h2>
          {biggest.length === 0 ? (
            <p className="text-xs text-muted-foreground">Пока пусто.</p>
          ) : (
            <ul className="space-y-1.5">
              {biggest.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">
                    {d.caseCode} · id{d.userId}
                  </span>
                  <span className="shrink-0 font-semibold text-emerald-300">
                    {dropLabel(d)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-2xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Последние редкие выпадения
          </h2>
          {latest.length === 0 ? (
            <p className="text-xs text-muted-foreground">Пока пусто.</p>
          ) : (
            <ul className="space-y-1.5">
              {latest.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">
                    {d.isJackpot ? '💎 ' : d.isLimited ? '🎁 ' : '⭐ '}
                    {d.caseCode} · id{d.userId}
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {dropLabel(d)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <CasesManager initialCases={cases} canManage={canManage} />
    </div>
  )
}


