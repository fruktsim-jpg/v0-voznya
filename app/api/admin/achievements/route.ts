import { NextResponse, type NextRequest } from 'next/server'
import { withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { ACHIEVEMENTS } from '@/lib/voznya-bot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_CODES = new Set(ACHIEVEMENTS.map((a) => a.code))

/**
 * POST /api/admin/achievements — grant or revoke an achievement for a player.
 * Body: { userId, code, action: "grant"|"revoke", reason? }
 *
 * Ownership is a single row in `user_achievements` (PK user_id+code). Grant is
 * an idempotent upsert (ON CONFLICT DO NOTHING); revoke deletes the row. The
 * code must exist in the shared ACHIEVEMENTS catalog. Reward ешки are NOT moved
 * here — this only toggles the unlock, matching the bot's catalog-driven model.
 * The toggle + audit row are one transaction.
 * Requires achievements.grant / achievements.revoke — owner/admin only.
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    userId?: number
    code?: string
    action?: 'grant' | 'revoke'
    reason?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const userId = Number(body.userId)
  const code = (body.code ?? '').toString().trim()
  const action = body.action
  const reason = (body.reason ?? '').toString().slice(0, 500) || null

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  if (!code || !VALID_CODES.has(code)) {
    return NextResponse.json({ error: 'unknown achievement code' }, { status: 400 })
  }
  if (action !== 'grant' && action !== 'revoke') {
    return NextResponse.json({ error: 'action must be grant or revoke' }, { status: 400 })
  }

  const perm = action === 'grant' ? PERM.ACHIEVEMENTS_GRANT : PERM.ACHIEVEMENTS_REVOKE
  if (!hasPermission(session.role, perm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      const users = await exec<{ user_id: string }>(
        'SELECT user_id FROM users WHERE user_id = $1',
        [userId],
      )
      if (users.length === 0) {
        throw Object.assign(new Error('player not found'), { http: 404 })
      }

      let changed: boolean
      if (action === 'grant') {
        const rows = await exec<{ user_id: string }>(
          `INSERT INTO user_achievements (user_id, code)
             VALUES ($1, $2)
           ON CONFLICT (user_id, code) DO NOTHING
           RETURNING user_id`,
          [userId, code],
        )
        changed = rows.length > 0
      } else {
        const rows = await exec<{ user_id: string }>(
          `DELETE FROM user_achievements
            WHERE user_id = $1 AND code = $2
          RETURNING user_id`,
          [userId, code],
        )
        changed = rows.length > 0
      }

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: action === 'grant' ? 'achievements.grant' : 'achievements.revoke',
          targetUserId: userId,
          targetType: 'achievement',
          targetId: code,
          reason,
          meta: { changed },
          ip,
        },
        exec,
      )

      return { changed, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
