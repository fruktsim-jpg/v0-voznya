import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import {
  OPERATIONS_KEYS,
  TOGGLE_BY_KEY,
  MODIFIER_BY_KEY,
} from '@/lib/admin/operations-registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Operations Center — global service toggles + modifiers.
 *
 * These are `app_settings` rows (the SAME store the bot reads via
 * app.settings.dynamic, ≤60s cache) — no new table, no migration. Writing here
 * is identical in mechanism to /api/admin/settings, but scoped to the
 * operations registry keys and audited as operations.* for a clean ops trail.
 *
 * HONESTY: many of these flags are `armed` (stored, but the bot does not read
 * them yet). The registry says which; the UI shows it. Writing an armed flag is
 * harmless — the row simply waits until the bot adds the corresponding
 * dynamic.get_* read. casino.min_bet/max_bet are the only keys read today.
 *
 * GET  /api/admin/operations — current values for all operations keys.
 * POST /api/admin/operations — { key, value } (toggle bool / modifier number).
 *
 * Read: ECONOMY_VIEW. Write: ROLES_MANAGE (owner) — these are platform-wide
 * levers, same bar as Settings.
 */

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.ECONOMY_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  try {
    const rows = await query<{ key: string; value: unknown; updated_at: string }>(
      `SELECT key, value, updated_at FROM app_settings WHERE key = ANY($1)`,
      [OPERATIONS_KEYS],
    )
    const values: Record<string, unknown> = {}
    const updatedAt: Record<string, string> = {}
    for (const r of rows) {
      values[r.key] = r.value
      updatedAt[r.key] = r.updated_at
    }
    return NextResponse.json({ values, updatedAt })
  } catch {
    // app_settings table missing — degrade to empty (registry defaults apply).
    return NextResponse.json({ values: {}, updatedAt: {} })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { key?: string; value?: unknown; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const key = (body.key ?? '').toString().trim()
  const reason = (body.reason ?? '').toString().slice(0, 500) || null

  const toggle = TOGGLE_BY_KEY.get(key)
  const modifier = MODIFIER_BY_KEY.get(key)
  if (!toggle && !modifier) {
    return NextResponse.json({ error: 'unknown operations key' }, { status: 400 })
  }

  // Validate the value against the lever's type.
  let value: boolean | number
  let category: string
  let action: string
  if (toggle) {
    if (typeof body.value !== 'boolean') {
      return NextResponse.json({ error: 'toggle value must be boolean' }, { status: 400 })
    }
    value = body.value
    category = 'operations.toggle'
    action = 'operations.toggle'
  } else {
    const n = Number(body.value)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ error: 'modifier must be a number 0..100' }, { status: 400 })
    }
    value = n
    category = 'operations.modifier'
    action = 'operations.modifier'
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const valueJson = JSON.stringify(value)

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      const prev = await exec<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key = $1 FOR UPDATE`,
        [key],
      )
      const oldValue = prev.length > 0 ? prev[0].value : null

      await exec(
        `INSERT INTO app_settings (key, value, category, description, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, $4, $5, now())
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           category = EXCLUDED.category,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [key, valueJson, category, (toggle ?? modifier)!.label, session.uid],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action,
          targetType: 'app_setting',
          targetId: key,
          reason,
          meta: { old: oldValue, new: value, enforcement: (toggle ?? modifier)!.enforcement },
          ip,
        },
        exec,
      )

      return { key, value, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
