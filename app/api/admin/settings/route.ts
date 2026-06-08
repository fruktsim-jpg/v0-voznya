import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * App settings admin API (Admin V2, Stage 9). Edits the SAME `app_settings`
 * table the bot reads via `app.settings.dynamic` — one source of truth, no
 * code/migration needed to change prices/weights/chances/cooldowns.
 *
 * GET  /api/admin/settings        — list all settings (grouped by category).
 * POST /api/admin/settings        — upsert one setting (key, value, category).
 * DELETE /api/admin/settings?key= — remove an override (revert to code default).
 *
 * Read gated on ECONOMY_VIEW; write/delete gated on ROLES_MANAGE (owner-only),
 * since these values directly drive the live economy. Bot picks up changes
 * within its cache TTL (~60s).
 */

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.ECONOMY_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const settings = await query<{
      key: string
      value: unknown
      category: string
      description: string | null
      updated_by: string | null
      updated_at: string
    }>(
      `SELECT key, value, category, description, updated_by, updated_at
         FROM app_settings
        ORDER BY category, key`,
    )
    return NextResponse.json({ settings })
  } catch {
    // Migration 0032 not applied yet — degrade to empty list.
    return NextResponse.json({ settings: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: {
    key?: string
    value?: unknown
    category?: string
    description?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const key = (body.key ?? '').toString().trim()
  const category = (body.category ?? 'general').toString().trim().slice(0, 64) || 'general'
  const description = (body.description ?? '').toString().slice(0, 512) || null

  if (!key || key.length > 128) {
    return NextResponse.json({ error: 'invalid key' }, { status: 400 })
  }
  if (body.value === undefined) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 })
  }
  // Value must be JSON-serializable; store as JSONB. Reject functions/undefined.
  let valueJson: string
  try {
    valueJson = JSON.stringify(body.value)
    if (valueJson === undefined) throw new Error('not serializable')
  } catch {
    return NextResponse.json({ error: 'value must be JSON-serializable' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      // Capture the previous value first so the audit can show old → new.
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
           description = EXCLUDED.description,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [key, valueJson, category, description, session.uid],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'settings.update',
          targetType: 'app_setting',
          targetId: key,
          meta: { old: oldValue, new: body.value, value: body.value, category },
          ip,
        },
        exec,
      )


      return { key, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const key = (new URL(req.url).searchParams.get('key') ?? '').trim()
  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      const deleted = await exec<{ key: string }>(
        'DELETE FROM app_settings WHERE key = $1 RETURNING key',
        [key],
      )
      if (deleted.length === 0) {
        throw Object.assign(new Error('setting not found'), { http: 404 })
      }

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'settings.delete',
          targetType: 'app_setting',
          targetId: key,
          meta: {},
          ip,
        },
        exec,
      )

      return { key, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
