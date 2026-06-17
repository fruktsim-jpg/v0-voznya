import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * AI long-term memory viewer. Read-only list of `ai_memories` (facts the Drun
 * remembers about players/the world). Gated on ROLES_MANAGE (owner-only).
 *
 * GET /api/admin/ai/memory — recent memories, highest weight first.
 */
export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const memories = await query<{
      id: string
      subject_id: string | null
      kind: string
      fact: string
      weight: number
      source: string | null
      created_at: string
      expires_at: string | null
    }>(
      `SELECT id, subject_id, kind, fact, weight, source, created_at, expires_at
         FROM ai_memories
        ORDER BY weight DESC, created_at DESC
        LIMIT 200`,
    )
    return NextResponse.json({ memories })
  } catch {
    return NextResponse.json({ memories: [] })
  }
}
