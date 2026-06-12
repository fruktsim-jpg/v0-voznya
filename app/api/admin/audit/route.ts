import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * CC Foundation — audit trail reader. Returns recent `audit_log` rows for a
 * given target (type + id), powering the shared <AuditTrail> primitive that any
 * editor can drop in. Gated on content.view (audit is content-level metadata).
 *
 *   GET /api/admin/audit?type=item_asset&id=relic_zwolle
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (
    !hasPermission(session.role, PERM.CONTENT_VIEW) &&
    !hasPermission(session.role, PERM.LOGS_VIEW)
  ) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const type = req.nextUrl.searchParams.get('type')?.trim()
  const id = req.nextUrl.searchParams.get('id')?.trim()
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 20, 100)

  try {
    const rows = await query<{
      id: number
      actor_user_id: number
      actor_role: string | null
      action: string
      target_type: string | null
      target_id: string | null
      meta: unknown
      created_at: string
    }>(
      `SELECT id, actor_user_id, actor_role, action, target_type, target_id,
              meta, created_at
         FROM audit_log
        WHERE ($1::text IS NULL OR target_type = $1)
          AND ($2::text IS NULL OR target_id = $2)
        ORDER BY created_at DESC
        LIMIT $3`,
      [type || null, id || null, limit],
    )
    return NextResponse.json({ entries: rows })
  } catch {
    return NextResponse.json({ entries: [] })
  }
}
