import { query } from '@/lib/db'


/**
 * Runs a scalar COUNT/SUM query and returns the number, or null if the
 * underlying table/column does not exist yet (deployment not fully migrated).
 * This keeps the dashboard rendering instead of 500-ing when a foundation
 * table (inventory / purchase_history / gift_transactions / reputation_entries
 * / mmr_entries / user_achievements) is missing on the target DB.
 */
export async function safeScalar(sql: string): Promise<number | null> {
  try {
    const rows = await query<{ v: string | null }>(sql)
    const v = rows[0]?.v
    return v == null ? 0 : Number(v)
  } catch {
    return null
  }
}

export type DashboardCounters = {
  players: number | null
  ezhki: number | null
  mmr: number | null
  reputation: number | null
  catalogItems: number | null
  achievementsGranted: number | null
  itemsInInventories: number | null
  auditRecords: number | null
}

export async function loadDashboardCounters(): Promise<DashboardCounters> {
  const [
    players,
    ezhki,
    mmr,
    reputation,
    catalogItems,
    achievementsGranted,
    itemsInInventories,
    auditRecords,
  ] = await Promise.all([
    safeScalar('SELECT COUNT(*)::text AS v FROM users'),
    safeScalar('SELECT COALESCE(SUM(balance), 0)::text AS v FROM users'),
    safeScalar('SELECT COALESCE(SUM(mmr), 0)::text AS v FROM users'),
    safeScalar('SELECT COALESCE(SUM(value), 0)::text AS v FROM reputation_entries'),
    safeScalar('SELECT COUNT(*)::text AS v FROM inventory_items'),
    safeScalar('SELECT COUNT(*)::text AS v FROM user_achievements'),
    safeScalar('SELECT COALESCE(SUM(quantity), 0)::text AS v FROM inventory'),
    safeScalar('SELECT COUNT(*)::text AS v FROM audit_log'),
  ])

  return {
    players,
    ezhki,
    mmr,
    reputation,
    catalogItems,
    achievementsGranted,
    itemsInInventories,
    auditRecords,
  }
}

export type RecentAuditRow = {
  id: number
  actor_user_id: number
  actor_role: string | null
  action: string
  target_user_id: number | null
  target_type: string | null
  target_id: string | null
  amount: number | null
  reason: string | null
  created_at: string
  actor_name: string | null
  target_name: string | null
}

/**
 * Recent audit feed, joined to users for display names. Returns [] if audit_log
 * is missing (un-migrated DB) so the dashboard still renders.
 */
export async function loadRecentAudit(limit = 15): Promise<RecentAuditRow[]> {
  try {
    return await query<RecentAuditRow>(
      `SELECT l.id, l.actor_user_id, l.actor_role, l.action, l.target_user_id,
              l.target_type, l.target_id, l.amount, l.reason, l.created_at,
              ua.first_name AS actor_name, ut.first_name AS target_name
         FROM audit_log l
         LEFT JOIN users ua ON ua.user_id = l.actor_user_id
         LEFT JOIN users ut ON ut.user_id = l.target_user_id
        ORDER BY l.created_at DESC
        LIMIT $1`,
      [limit],
    )
  } catch {
    return []
  }
}
