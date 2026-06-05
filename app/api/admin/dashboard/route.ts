import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission } from '@/lib/auth/admin-session'
import { PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/dashboard — top-level counters + recent audit feed.
 * Read-only; requires dashboard.view (every admin role has it).
 */
export async function GET() {
  const guard = await requirePermission(PERM.DASHBOARD_VIEW)
  if ('error' in guard) {
    return NextResponse.json({ error: 'forbidden' }, { status: guard.error })
  }

  try {
    const [players, items, purchases, gifts, recent] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
      query<{ count: string }>(
        'SELECT COALESCE(SUM(quantity), 0)::text AS count FROM inventory',
      ),
      query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM purchase_history',
      ),
      query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM gift_transactions',
      ),
      query(
        `SELECT id, actor_user_id, actor_role, action, target_user_id,
                amount, reason, created_at
           FROM audit_log
          ORDER BY created_at DESC
          LIMIT 20`,
      ),
    ])

    return NextResponse.json({
      counters: {
        players: Number(players[0]?.count ?? 0),
        items: Number(items[0]?.count ?? 0),
        purchases: Number(purchases[0]?.count ?? 0),
        gifts: Number(gifts[0]?.count ?? 0),
      },
      recentAudit: recent,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
