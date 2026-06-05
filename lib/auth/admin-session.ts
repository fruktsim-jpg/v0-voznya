import { query } from '@/lib/db'
import { getSession } from './get-session'
import {
  hasPermission,
  isAdminRole,
  type AdminRole,
  type Permission,
} from './admin-permissions'

/**
 * Admin session layer for the panel.
 *
 * Reuses the existing JWT session (httpOnly cookie → uid == users.user_id) and
 * resolves the caller's admin role from `admin_roles`. No new auth, no new
 * tables. The bot and the site read the same `admin_roles` table, so a role
 * granted in Telegram works on the site immediately.
 */

export type AdminSession = {
  uid: number
  role: AdminRole
}

/** Returns the admin session, or null if not logged in / not an admin. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getSession()
  if (!session) return null

  const rows = await query<{ role: string }>(
    'SELECT role FROM admin_roles WHERE user_id = $1',
    [session.uid],
  )
  const role = rows[0]?.role
  if (!isAdminRole(role)) return null

  return { uid: session.uid, role }
}

/**
 * Guard for route handlers. Returns the admin session when the caller has the
 * required permission, otherwise an HTTP status to return:
 *   401 — no session, 403 — logged in but lacks the permission.
 */
export async function requirePermission(
  permission: Permission,
): Promise<{ session: AdminSession } | { error: number }> {
  const session = await getAdminSession()
  if (!session) return { error: 401 }
  if (!hasPermission(session.role, permission)) return { error: 403 }
  return { session }
}

type AuditInput = {
  actorUserId: number
  actorRole: AdminRole
  action: string
  targetUserId?: number | null
  targetType?: string | null
  targetId?: string | null
  amount?: number | null
  reason?: string | null
  meta?: Record<string, unknown> | null
  ip?: string | null
}

/**
 * Appends a row to `audit_log`. Call inside the same transaction as the action
 * it records when possible (see economy/inventory routes). Returns the new id.
 */
export async function writeAudit(
  input: AuditInput,
  exec: <T extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<T[]> = query,
): Promise<number> {
  const rows = await exec<{ id: number }>(
    `INSERT INTO audit_log
       (actor_user_id, actor_role, action, target_user_id, target_type,
        target_id, amount, reason, meta, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      input.actorUserId,
      input.actorRole,
      input.action,
      input.targetUserId ?? null,
      input.targetType ?? null,
      input.targetId ?? null,
      input.amount ?? null,
      input.reason ?? null,
      input.meta ? JSON.stringify(input.meta) : null,
      input.ip ?? null,
    ],
  )
  return rows[0].id
}
