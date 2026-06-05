import crypto from 'crypto'
import { query } from '@/lib/db'

/**
 * Account-link layer for Telegram OIDC.
 *
 * Telegram's OIDC `sub` is an opaque identifier, NOT the Telegram user id (see
 * lib/auth/oidc.ts). The real users.user_id is resolved through the
 * `account_links` table, which the bot fills once the user proves ownership by
 * opening a deep-link and pressing Start.
 *
 * This module is the ONLY place the site writes to the database, and it writes
 * to a single auth-only table (`oidc_link_requests`). The game tables
 * (`users`, balances, profiles, ...) remain strictly read-only.
 */

/** How long a pending link request stays valid. */
const LINK_REQUEST_TTL_SECONDS = 15 * 60 // 15 minutes

/**
 * Resolve the linked Telegram user id for a given OIDC `sub`, or null when the
 * account has not been linked yet. Read-only.
 */
export async function getUserIdBySub(sub: string): Promise<number | null> {
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM account_links WHERE oidc_sub = $1`,
    [sub],
  )
  const raw = rows[0]?.user_id
  if (raw === undefined) return null
  // user_id is a Telegram id (<= 2^52) — safe to use as a JS number here.
  const uid = Number(raw)
  return Number.isInteger(uid) && uid > 0 ? uid : null
}

/**
 * Create a one-time link request for an unlinked `sub` and return its token.
 *
 * The token is short and URL-safe so it fits Telegram's 64-char start payload
 * (`t.me/<bot>?start=link_<token>`). Writes to the auth-only
 * `oidc_link_requests` table; never touches game tables.
 */
export async function createLinkRequest(sub: string): Promise<string> {
  const token = crypto.randomBytes(18).toString('base64url') // 24 chars
  await query(
    `INSERT INTO oidc_link_requests (token, oidc_sub, expires_at)
     VALUES ($1, $2, now() + make_interval(secs => $3))`,
    [token, sub, LINK_REQUEST_TTL_SECONDS],
  )
  return token
}
