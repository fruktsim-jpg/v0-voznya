import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission } from '@/lib/auth/admin-session'
import { PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/players?q=... — search players by user_id, username or name.
 * Read-only; requires players.view.
 */
export async function GET(req: NextRequest) {
  const guard = await requirePermission(PERM.PLAYERS_VIEW)
  if ('error' in guard) {
    return NextResponse.json({ error: 'forbidden' }, { status: guard.error })
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (!q) {
    return NextResponse.json({ players: [] })
  }

  try {
    const numeric = /^\d+$/.test(q) ? Number(q) : null
    const like = `%${q}%`
    const rows = await query(
      `SELECT u.user_id, u.username, u.first_name, u.balance, r.role
         FROM users u
         LEFT JOIN admin_roles r ON r.user_id = u.user_id
        WHERE ($1::bigint IS NOT NULL AND u.user_id = $1)
           OR u.username ILIKE $2
           OR u.first_name ILIKE $2
        ORDER BY (u.user_id = $1) DESC NULLS LAST, u.balance DESC
        LIMIT 25`,
      [numeric, like],
    )
    return NextResponse.json({ players: rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
