import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/cases/openings — recent case openings (the honesty ledger).
 * Optional filters: ?user=<id>&case=<item_code>&limit=<n>.
 *
 * Read-only. The opening ledger (`case_openings`) is append-only and written
 * solely by the bot's open_case(); the site never writes it. Each row carries a
 * `weight_snapshot`, so disputes are auditable even if odds later change.
 * Requires cases.view.
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.CASES_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const userId = sp.get('user') ? Number(sp.get('user')) : null
  const caseCode = sp.get('case')?.toString().trim() || null
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 50, 1), 200)

  const where: string[] = []
  const params: unknown[] = []
  if (userId != null && Number.isInteger(userId) && userId > 0) {
    params.push(userId)
    where.push(`o.user_id = $${params.length}`)
  }
  if (caseCode) {
    params.push(caseCode)
    where.push(`o.case_item_code = $${params.length}`)
  }
  params.push(limit)
  const limitIdx = params.length

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const openings = await query<{
      id: string
      user_id: string
      user_name: string | null
      case_item_code: string
      reward_kind: string
      reward_item_code: string | null
      reward_item_name: string | null
      amount: string | null
      qty: number
      roll: number
      weight_snapshot: unknown
      created_at: string
    }>(
      `SELECT o.id, o.user_id,
              COALESCE(u.first_name, u.username) AS user_name,
              o.case_item_code, o.reward_kind, o.reward_item_code,
              i.name AS reward_item_name, o.amount, o.qty, o.roll,
              o.weight_snapshot, o.created_at
         FROM case_openings o
         LEFT JOIN users u ON u.user_id = o.user_id
         LEFT JOIN inventory_items i ON i.code = o.reward_item_code
         ${whereSql}
        ORDER BY o.created_at DESC
        LIMIT $${limitIdx}`,
      params,
    )
    return NextResponse.json({ openings })
  } catch {
    return NextResponse.json({ openings: [] })
  }
}
