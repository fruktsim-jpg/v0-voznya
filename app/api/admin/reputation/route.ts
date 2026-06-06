import { NextResponse, type NextRequest } from 'next/server'
import { withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/reputation — grant or remove a player's social reputation.
 * Body: { userId, amount (>0), direction: "add"|"remove", reason? }
 *
 * The `reputation_entries` journal is the source of truth and constrains each
 * row to value ∈ {-1, +1} (one row = one ±1 vote). An admin adjustment of N is
 * therefore written as N signed rows via generate_series, with the admin as the
 * giver. The journal also forbids self-votes (giver <> target); admins acting on
 * other players are fine. Current reputation = SUM(value) over the journal, so
 * no projection column to keep in sync. The whole batch + audit row is one
 * transaction. Requires reputation.add / reputation.remove — owner/admin only.
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    userId?: number
    amount?: number
    direction?: 'add' | 'remove'
    reason?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const userId = Number(body.userId)
  const amount = Number(body.amount)
  const direction = body.direction
  const reason = (body.reason ?? '').toString().slice(0, 64) || null

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  // Cap the batch size: each unit is its own journal row, so keep it sane.
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100) {
    return NextResponse.json(
      { error: 'amount must be a positive integer (max 100)' },
      { status: 400 },
    )
  }
  if (direction !== 'add' && direction !== 'remove') {
    return NextResponse.json({ error: 'direction must be add or remove' }, { status: 400 })
  }
  // The journal forbids self-votes; an admin cannot adjust their own reputation.
  if (userId === session.uid) {
    return NextResponse.json({ error: 'cannot adjust your own reputation' }, { status: 409 })
  }

  const perm = direction === 'add' ? PERM.REPUTATION_ADD : PERM.REPUTATION_REMOVE
  if (!hasPermission(session.role, perm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const value = direction === 'add' ? 1 : -1
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

      // Write `amount` signed rows (value ∈ {-1,+1}) in one statement.
      await exec(
        `INSERT INTO reputation_entries (target_user_id, giver_user_id, value, reason)
         SELECT $1, $2, $3, $4 FROM generate_series(1, $5)`,
        [userId, session.uid, value, reason, amount],
      )

      const total = await exec<{ rep: string }>(
        `SELECT COALESCE(SUM(value), 0) AS rep
           FROM reputation_entries WHERE target_user_id = $1`,
        [userId],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: direction === 'add' ? 'reputation.add' : 'reputation.remove',
          targetUserId: userId,
          targetType: 'reputation',
          targetId: String(userId),
          amount: value * amount,
          reason,
          meta: { units: amount },
          ip,
        },
        exec,
      )

      return { reputation: Number(total[0].rep), auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
