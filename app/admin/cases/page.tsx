import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { query } from '@/lib/db'
import { CasesManager, type AdminCase } from './cases-manager'

export const dynamic = 'force-dynamic'

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

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">Кейсы</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Управление кейсами и их дроп-листами. Шансы считаются из весов. Открытие
        кейсов выполняет только бот — здесь только настройка и история.
      </p>
      <CasesManager initialCases={cases} canManage={canManage} />
    </div>
  )
}
