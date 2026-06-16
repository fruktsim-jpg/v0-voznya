import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import {
  hasPermission,
  isAdminRole,
  PERM,
  type AdminRole,
} from '@/lib/auth/admin-permissions'
import {
  MOD_AUDIT_ACTION,
  WARN_MUTE_SECONDS,
  WARN_MUTE_THRESHOLD,
  WARN_TTL_SECONDS,
  type ModerationAction,
} from '@/lib/moderation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Player moderation from the admin panel (Player Studio).
 *
 * GET  /api/admin/moderation?userId= — current state + recent warnings.
 * POST /api/admin/moderation         — { userId, action, durationSeconds?, reason? }
 *   action: ban|unban|mute|unmute|warn|unwarn
 *
 * The site is NOT able to call Telegram directly, so it writes the desired
 * state into `user_moderation` / `mod_warnings` and sets `tg_pending = true`.
 * The bot's 1-minute reconcile tick reads pending rows and applies/lifts the
 * real Telegram restriction (voznya-bot moderation/enforcement.py). Mutes are
 * additionally enforced by the bot's message backstop immediately.
 *
 * Everything is gated on MODERATION_BAN (moderator+) and audited
 * (player.ban/unban/mute/unmute/warn/unwarn) into the shared `audit_log`.
 *
 * Admins/owners and other staff cannot be moderated from the panel (parity
 * with the bot's is_target_protected).
 */

const ACTIONS: ReadonlySet<string> = new Set<ModerationAction>([
  'ban',
  'unban',
  'mute',
  'unmute',
  'warn',
  'unwarn',
])

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.MODERATION_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const userId = Number(req.nextUrl.searchParams.get('userId'))
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }

  try {
    const stateRows = await query<{
      banned_until: string | null
      muted_until: string | null
      warn_count: number
      ban_reason: string | null
      mute_reason: string | null
    }>(
      `SELECT banned_until, muted_until, warn_count, ban_reason, mute_reason
         FROM user_moderation WHERE user_id = $1`,
      [userId],
    )
    const warnings = await query<{
      id: string
      reason: string | null
      active: boolean
      actor_user_id: string | null
      created_at: string
    }>(
      `SELECT id::text, reason, active, actor_user_id::text, created_at
         FROM mod_warnings WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 20`,
      [userId],
    )
    const s = stateRows[0]
    return NextResponse.json({
      state: {
        bannedUntil: s?.banned_until ?? null,
        mutedUntil: s?.muted_until ?? null,
        warnCount: s?.warn_count ?? 0,
        banReason: s?.ban_reason ?? null,
        muteReason: s?.mute_reason ?? null,
      },
      warnings: warnings.map((w) => ({
        id: Number(w.id),
        reason: w.reason,
        active: w.active,
        actorUserId: w.actor_user_id ? Number(w.actor_user_id) : null,
        createdAt: w.created_at,
      })),
    })
  } catch {
    // Tables missing on this DB — degrade to empty state.
    return NextResponse.json({
      state: {
        bannedUntil: null,
        mutedUntil: null,
        warnCount: 0,
        banReason: null,
        muteReason: null,
      },
      warnings: [],
    })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.MODERATION_BAN)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: {
    userId?: number
    action?: string
    durationSeconds?: number | null
    reason?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const userId = Number(body.userId)
  const action = (body.action ?? '').toString().trim()
  const reason = (body.reason ?? '').toString().slice(0, 500) || null
  // durationSeconds: a positive integer = temporary; null/0 = permanent.
  const durationRaw = body.durationSeconds
  const durationSeconds =
    durationRaw == null || Number(durationRaw) <= 0 ? null : Math.floor(Number(durationRaw))

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      // Target must exist and must not be protected staff (parity with bot).
      const target = await exec<{ role: string | null }>(
        `SELECT r.role
           FROM users u LEFT JOIN admin_roles r ON r.user_id = u.user_id
          WHERE u.user_id = $1`,
        [userId],
      )
      if (target.length === 0) {
        throw Object.assign(new Error('player not found'), { http: 404 })
      }
      const targetRole = target[0].role
      if (isAdminRole(targetRole) && (targetRole === 'owner' || targetRole === 'admin')) {
        throw Object.assign(new Error('target is protected staff'), { http: 403 })
      }

      const out = await applyModeration(exec, {
        action: action as ModerationAction,
        userId,
        durationSeconds,
        reason,
        actorUserId: session.uid,
      })

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role as AdminRole,
          action: MOD_AUDIT_ACTION[action as ModerationAction],
          targetUserId: userId,
          targetType: 'user',
          targetId: String(userId),
          reason,
          meta: { via: 'admin_panel', durationSeconds, ...out.meta },
          ip,
        },
        exec,
      )

      return { ...out.result, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}

type Exec = <T extends Record<string, unknown>>(text: string, p?: unknown[]) => Promise<T[]>

/**
 * Writes the desired moderation state and flags `tg_pending` so the bot applies
 * the real Telegram restriction. Returns audit meta + a small result payload.
 */
async function applyModeration(
  exec: Exec,
  args: {
    action: ModerationAction
    userId: number
    durationSeconds: number | null
    reason: string | null
    actorUserId: number
  },
): Promise<{ result: Record<string, unknown>; meta: Record<string, unknown> }> {
  const { action, userId, durationSeconds, reason, actorUserId } = args
  // until-expression: NULL for permanent / lift, now()+interval for temporary.
  const untilExpr =
    durationSeconds == null ? null : `now() + ($1 || ' seconds')::interval`

  switch (action) {
    case 'ban':
    case 'mute': {
      const col = action === 'ban' ? 'banned_until' : 'muted_until'
      const reasonCol = action === 'ban' ? 'ban_reason' : 'mute_reason'
      const rows = await exec<{ until: string | null }>(
        `INSERT INTO user_moderation (user_id, ${col}, ${reasonCol}, updated_by, tg_pending)
         VALUES ($2, ${untilExpr ?? 'NULL'}, $3, $4, true)
         ON CONFLICT (user_id) DO UPDATE
            SET ${col} = ${untilExpr ?? 'NULL'},
                ${reasonCol} = $3,
                updated_by = $4,
                tg_pending = true,
                updated_at = now()
         RETURNING ${col} AS until`,
        [String(durationSeconds ?? 0), userId, reason, actorUserId],
      )
      return { result: { until: rows[0]?.until ?? null }, meta: {} }
    }
    case 'unban':
    case 'unmute': {
      const col = action === 'unban' ? 'banned_until' : 'muted_until'
      const reasonCol = action === 'unban' ? 'ban_reason' : 'mute_reason'
      await exec(
        `INSERT INTO user_moderation (user_id, ${col}, ${reasonCol}, updated_by, tg_pending)
         VALUES ($1, NULL, NULL, $2, true)
         ON CONFLICT (user_id) DO UPDATE
            SET ${col} = NULL,
                ${reasonCol} = NULL,
                updated_by = $2,
                tg_pending = true,
                updated_at = now()`,
        [userId, actorUserId],
      )
      return { result: { lifted: true }, meta: {} }
    }
    case 'warn': {
      const expiresExpr =
        WARN_TTL_SECONDS > 0 ? `now() + (${WARN_TTL_SECONDS} || ' seconds')::interval` : 'NULL'
      await exec(
        `INSERT INTO mod_warnings (user_id, actor_user_id, reason, active, expires_at)
         VALUES ($1, $2, $3, true, ${expiresExpr})`,
        [userId, actorUserId, reason],
      )
      const countRows = await exec<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM mod_warnings WHERE user_id = $1 AND active`,
        [userId],
      )
      const count = Number(countRows[0]?.n ?? 0)

      // Threshold reached → auto-mute (same rule as the bot).
      const autoMute = count >= WARN_MUTE_THRESHOLD
      if (autoMute) {
        await exec(
          `INSERT INTO user_moderation
             (user_id, warn_count, updated_by, muted_until, mute_reason, tg_pending)
           VALUES ($1, $2, $3,
                   now() + (${WARN_MUTE_SECONDS} || ' seconds')::interval,
                   'авто-мьют по варнам', true)
           ON CONFLICT (user_id) DO UPDATE
              SET warn_count = $2,
                  updated_by = $3,
                  muted_until = now() + (${WARN_MUTE_SECONDS} || ' seconds')::interval,
                  mute_reason = 'авто-мьют по варнам',
                  tg_pending = true,
                  updated_at = now()`,
          [userId, count, actorUserId],
        )
      } else {
        await exec(
          `INSERT INTO user_moderation (user_id, warn_count, updated_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO UPDATE
              SET warn_count = $2, updated_by = $3, updated_at = now()`,
          [userId, count, actorUserId],
        )
      }
      return { result: { warnCount: count, autoMuted: autoMute }, meta: { count, autoMute } }
    }
    case 'unwarn': {
      const cleared = await exec<{ id: string }>(
        `UPDATE mod_warnings SET active = false
          WHERE user_id = $1 AND active RETURNING id`,
        [userId],
      )
      await exec(
        `INSERT INTO user_moderation (user_id, warn_count, updated_by)
         VALUES ($1, 0, $2)
         ON CONFLICT (user_id) DO UPDATE
            SET warn_count = 0, updated_by = $2, updated_at = now()`,
        [userId, actorUserId],
      )
      return { result: { cleared: cleared.length }, meta: { cleared: cleared.length } }
    }
  }
}
