import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Player cooldown operations (Player Studio).
 *
 * GET  /api/admin/cooldowns?userId= — current cooldowns (action + remaining sec).
 * POST /api/admin/cooldowns         — reset: { userId, action: 'farm'|'casino'|'duel'|'all', reason? }
 *
 * A cooldown is a row in the bot's `cooldowns` table (user_id, action,
 * available_at); the bot reads it live, so deleting the row instantly lets the
 * player act again — exactly what the bot's own `clear_cooldown` does
 * (voznya-bot/app/services/cooldowns.py). No economy impact; audited.
 *
 * Gated on PLAYERS_EDIT (moderator+). The action whitelist mirrors
 * balance.COOLDOWNS keys so the operator never types a raw value.
 */

// Known cooldown actions (mirror voznya-bot balance.COOLDOWNS). 'all' clears every row.
const KNOWN_ACTIONS = ['farm', 'casino', 'duel'] as const
type KnownAction = (typeof KNOWN_ACTIONS)[number]

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.PLAYERS_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const userId = Number(req.nextUrl.searchParams.get('userId'))
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  try {
    const rows = await query<{ action: string; remaining: string }>(
      `SELECT action,
              GREATEST(0, EXTRACT(EPOCH FROM (available_at - now())))::bigint::text AS remaining
         FROM cooldowns WHERE user_id = $1
        ORDER BY action`,
      [userId],
    )
    return NextResponse.json({
      cooldowns: rows.map((r) => ({ action: r.action, remaining: Number(r.remaining) })),
    })
  } catch {
    // cooldowns table missing on this DB — degrade to empty.
    return NextResponse.json({ cooldowns: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.PLAYERS_EDIT)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { userId?: number; action?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const userId = Number(body.userId)
  const action = (body.action ?? '').toString().trim()
  const reason = (body.reason ?? '').toString().slice(0, 500) || null

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  if (action !== 'all' && !KNOWN_ACTIONS.includes(action as KnownAction)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      const deleted =
        action === 'all'
          ? await exec<{ action: string }>(
              'DELETE FROM cooldowns WHERE user_id = $1 RETURNING action',
              [userId],
            )
          : await exec<{ action: string }>(
              'DELETE FROM cooldowns WHERE user_id = $1 AND action = $2 RETURNING action',
              [userId, action],
            )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'player.cooldown_reset',
          targetUserId: userId,
          targetType: 'cooldown',
          targetId: action,
          reason,
          meta: { action, cleared: deleted.map((d) => d.action) },
          ip,
        },
        exec,
      )

      return { cleared: deleted.map((d) => d.action), auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
