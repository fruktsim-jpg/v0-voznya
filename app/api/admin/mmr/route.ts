import { NextResponse, type NextRequest } from 'next/server'
import { withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/mmr — award or deduct a player's game rating (MMR).
 * Body: { userId, amount (>0), direction: "add"|"remove", reason? }
 *
 * Atomic and mirrors the bot's `repositories.mmr.add_entry`: one append-only
 * row in the `mmr_entries` journal (source of truth) PLUS the denormalized
 * `users.mmr` projection (migration 0015) are updated in the same transaction,
 * alongside the audit row. MMR is allowed to go negative — there is no balance
 * floor on rating (unlike economy), matching the journal model.
 * Requires mmr.add (award) or mmr.remove (deduct) — owner/admin only.
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
  const reason = (body.reason ?? '').toString().slice(0, 128) || null

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive integer' }, { status: 400 })
  }
  if (direction !== 'add' && direction !== 'remove') {
    return NextResponse.json({ error: 'direction must be add or remove' }, { status: 400 })
  }

  const perm = direction === 'add' ? PERM.MMR_ADD : PERM.MMR_REMOVE
  if (!hasPermission(session.role, perm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const delta = direction === 'add' ? amount : -amount
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      // Lock the player row so the projection update is serialized.
      const users = await exec<{ mmr: string }>(
        'SELECT mmr FROM users WHERE user_id = $1 FOR UPDATE',
        [userId],
      )
      if (users.length === 0) {
        throw Object.assign(new Error('player not found'), { http: 404 })
      }

      // 1. Append-only journal row (source of truth).
      const entry = await exec<{ id: string }>(
        `INSERT INTO mmr_entries (player_id, amount, source, reason)
         VALUES ($1, $2, 'admin', $3) RETURNING id`,
        [userId, delta, reason],
      )

      // 2. Denormalized projection, kept in sync with the journal.
      const updated = await exec<{ mmr: string }>(
        `UPDATE users SET mmr = mmr + $2 WHERE user_id = $1 RETURNING mmr`,
        [userId, delta],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: direction === 'add' ? 'mmr.add' : 'mmr.remove',
          targetUserId: userId,
          targetType: 'mmr_entry',
          targetId: entry[0].id,
          amount: delta,
          reason,
          meta: { mmr_entry_id: Number(entry[0].id) },
          ip,
        },
        exec,
      )

      return { mmr: Number(updated[0].mmr), entryId: Number(entry[0].id), auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
