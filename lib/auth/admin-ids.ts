import { query } from '@/lib/db'

/**
 * Bootstrap admin list — the SAME `ADMIN_IDS` env the bot uses for its
 * emergency superusers (comma-separated Telegram user ids, e.g. "111,222").
 *
 * This is ONLY used to gate the one-time owner bootstrap (see
 * `app/api/admin/bootstrap-owner`). Day-to-day access is decided purely by the
 * `admin_roles` table — being in ADMIN_IDS grants no panel rights on its own.
 */

/** Parse ADMIN_IDS ("1,2,3") into a list of positive integer user ids. */
export function parseAdminIds(): number[] {
  const raw = process.env.ADMIN_IDS ?? ''
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n > 0)
}

/** True if `uid` is listed in ADMIN_IDS (bot's emergency superuser list). */
export function isBootstrapAdmin(uid: number): boolean {
  return parseAdminIds().includes(uid)
}

/**
 * Owner bootstrap is allowed only while `admin_roles` is completely empty AND
 * the caller is in ADMIN_IDS. Once the first role exists, this returns false
 * forever — the bootstrap is a one-shot.
 */
export async function canBootstrapOwner(uid: number): Promise<boolean> {
  if (!isBootstrapAdmin(uid)) return false
  const rows = await query<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM admin_roles',
  )
  return Number(rows[0]?.n ?? 0) === 0
}
