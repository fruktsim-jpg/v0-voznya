import { NextResponse, type NextRequest } from 'next/server'
import { withTransaction } from '@/lib/db'
import { getSession } from '@/lib/auth/get-session'
import { isBootstrapAdmin } from '@/lib/auth/admin-ids'
import { writeAudit } from '@/lib/auth/admin-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/bootstrap-owner — one-time owner self-assignment.
 *
 * Lets the very first administrator grant themselves the `owner` role from the
 * browser, with NO psql / docker. Strict, self-disabling guards:
 *
 *   1. caller must have a valid session (logged in via Telegram);
 *   2. caller's uid must be in ADMIN_IDS (the bot's emergency superuser env);
 *   3. `admin_roles` must be EMPTY — the insert is guarded inside a transaction
 *      with the table locked, so it works exactly once. Any later call (the
 *      table is no longer empty) returns 409 and changes nothing.
 *
 * After the first owner exists this endpoint is permanently inert: further role
 * management goes through the normal admin tooling. The action is recorded in
 * `audit_log` (actor == target, action `role.bootstrap`).
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isBootstrapAdmin(session.uid)) {
    // Not in ADMIN_IDS — never allowed to bootstrap. Use 403 (not 404) only
    // because an authenticated user is already known to the system.
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      // Lock the table so two concurrent bootstrap calls can't both insert.
      // ACCESS EXCLUSIVE blocks any other reader/writer until COMMIT.
      await exec('LOCK TABLE admin_roles IN ACCESS EXCLUSIVE MODE')

      const existing = await exec<{ n: number }>(
        'SELECT COUNT(*)::int AS n FROM admin_roles',
      )
      if (Number(existing[0]?.n ?? 0) > 0) {
        // Bootstrap already happened (by anyone). One-shot is spent.
        throw Object.assign(new Error('bootstrap already done'), { http: 409 })
      }

      await exec(
        `INSERT INTO admin_roles (user_id, role, granted_by)
         VALUES ($1, 'owner', NULL)`,
        [session.uid],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: 'owner',
          action: 'role.bootstrap',
          targetUserId: session.uid,
          targetType: 'admin_role',
          targetId: String(session.uid),
          reason: 'first owner bootstrap from ADMIN_IDS',
          meta: { via: 'bootstrap_endpoint' },
          ip,
        },
        exec,
      )

      return { auditId }
    })

    return NextResponse.json({ ok: true, role: 'owner', ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
