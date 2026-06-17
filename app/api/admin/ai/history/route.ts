import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * AI response history viewer. Read-only list of `ai_messages` (short-term
 * memory: what the Drun said and what prompted it). Gated on ROLES_MANAGE.
 *
 * GET /api/admin/ai/history — recent messages, newest first.
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
    const messages = await query<{
      id: string
      channel: string
      role: string
      content: string
      user_id: string | null
      trigger_event_id: string | null
      created_at: string
    }>(
      `SELECT id, channel, role, content, user_id, trigger_event_id, created_at
         FROM ai_messages
        ORDER BY created_at DESC
        LIMIT 100`,
    )
    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}
