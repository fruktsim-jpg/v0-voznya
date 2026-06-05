import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission } from '@/lib/auth/admin-session'
import { PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/audit — paginated audit_log viewer with filters.
 * Query: user (target or actor id), action (prefix), from, to (ISO dates),
 * limit, offset. Read-only; requires logs.view (moderator+).
 */
export async function GET(req: NextRequest) {
  const guard = await requirePermission(PERM.LOGS_VIEW)
  if ('error' in guard) {
    return NextResponse.json({ error: 'forbidden' }, { status: guard.error })
  }

  const sp = req.nextUrl.searchParams
  const userParam = sp.get('user')?.trim()
  const action = sp.get('action')?.trim()
  const from = sp.get('from')?.trim()
  const to = sp.get('to')?.trim()
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 50, 1), 200)
  const offset = Math.max(Number(sp.get('offset')) || 0, 0)

  const conditions: string[] = []
  const params: unknown[] = []

  if (userParam && /^\d+$/.test(userParam)) {
    params.push(Number(userParam))
    conditions.push(`(actor_user_id = $${params.length} OR target_user_id = $${params.length})`)
  }
  if (action) {
    params.push(`${action}%`)
    conditions.push(`action ILIKE $${params.length}`)
  }
  if (from) {
    params.push(from)
    conditions.push(`created_at >= $${params.length}`)
  }
  if (to) {
    params.push(to)
    conditions.push(`created_at <= $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit, offset)

  try {
    const rows = await query(
      `SELECT id, actor_user_id, actor_role, action, target_user_id,
              target_type, target_id, amount, reason, meta, ip, created_at
         FROM audit_log
         ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return NextResponse.json({ entries: rows, limit, offset })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
