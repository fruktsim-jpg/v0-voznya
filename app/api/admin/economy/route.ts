import { NextResponse, type NextRequest } from 'next/server'
import { withTransaction } from '@/lib/db'
import {
  getAdminSession,
  writeAudit,
} from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/economy — credit or debit a player's balance.
 * Body: { userId, amount (>0), direction: "add"|"remove", reason? }
 *
 * Atomic: balance change + ledger row (transactions) + audit row are written
 * in one transaction. Balance lives in `users`; the ledger is `transactions`.
 * Requires economy.add (credit) or economy.remove (debit) — owner/admin only.
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    userId?: number
    amount?: number
    direction?: 'add' | 'remove' | 'set'
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
  const reason = (body.reason ?? '').toString().slice(0, 500) || null

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  if (direction !== 'add' && direction !== 'remove' && direction !== 'set') {
    return NextResponse.json({ error: 'direction must be add, remove or set' }, { status: 400 })
  }
  // add/remove need a positive amount; "set" is a target balance and allows 0.
  if (direction === 'set') {
    if (!Number.isInteger(amount) || amount < 0) {
      return NextResponse.json({ error: 'target must be a non-negative integer' }, { status: 400 })
    }
  } else if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive integer' }, { status: 400 })
  }

  // Permission is checked AFTER we know the signed delta (set can go either way).
  // For add/remove the sign is known now; for set it is resolved under the lock.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      // Lock the player row; resolve the signed delta for each mode.
      const users = await exec<{ balance: string }>(
        'SELECT balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId],
      )
      if (users.length === 0) {
        throw Object.assign(new Error('player not found'), { http: 404 })
      }
      const balance = BigInt(users[0].balance)

      let delta: bigint
      if (direction === 'set') {
        delta = BigInt(amount) - balance // delta-to-target; stays ledger-true
      } else if (direction === 'add') {
        delta = BigInt(amount)
      } else {
        if (balance < BigInt(amount)) {
          throw Object.assign(new Error('insufficient balance'), { http: 409 })
        }
        delta = -BigInt(amount)
      }

      // Permission by net sign: credit→economy.add, debit→economy.remove.
      if (delta !== BigInt(0)) {
        const perm = delta > BigInt(0) ? PERM.ECONOMY_ADD : PERM.ECONOMY_REMOVE
        if (!hasPermission(session.role, perm)) {
          throw Object.assign(new Error('forbidden'), { http: 403 })
        }
      }

      const auditAction =
        direction === 'set' ? 'economy.set' : direction === 'add' ? 'economy.add' : 'economy.remove'

      // No-op set (already at target): audit for traceability, no ledger row.
      if (delta === BigInt(0)) {
        const auditId = await writeAudit(
          {
            actorUserId: session.uid,
            actorRole: session.role,
            action: auditAction,
            targetUserId: userId,
            targetType: 'user',
            targetId: String(userId),
            amount: 0,
            reason,
            meta: { mode: direction, target: amount, noop: true },
            ip,
          },
          exec,
        )
        return { balance: balance.toString(), transactionId: null, auditId }
      }

      const deltaNum = Number(delta)
      const updated = await exec<{ balance: string }>(
        `UPDATE users
            SET balance = balance + $2,
                total_earned = total_earned + GREATEST($2, 0),
                total_spent = total_spent + GREATEST(-$2, 0)
          WHERE user_id = $1
        RETURNING balance`,
        [userId, deltaNum],
      )

      const tx = await exec<{ id: string }>(
        `INSERT INTO transactions (user_id, amount, reason, meta)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          userId,
          deltaNum,
          'admin',
          JSON.stringify({ via: 'admin_panel', actor: session.uid, mode: direction }),
        ],

      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: auditAction,
          targetUserId: userId,
          targetType: 'transaction',
          targetId: tx[0].id,
          amount: deltaNum,
          reason,
          meta: {
            transaction_id: Number(tx[0].id),
            ...(direction === 'set' ? { target: amount } : {}),
          },
          ip,
        },
        exec,
      )

      return { balance: updated[0].balance, transactionId: Number(tx[0].id), auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
