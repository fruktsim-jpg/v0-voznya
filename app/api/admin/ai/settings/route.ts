import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * AI settings admin API. Edits the SAME `ai_settings` table the bot reads via
 * `app.features.drun.config` — one source of truth, no deploy/migration to
 * change provider/model/key/temperature/enabled. Bot picks up changes within
 * its cache TTL (~30s) or immediately on the next /internal/ai/test call.
 *
 * GET  /api/admin/ai/settings — list all AI settings.
 * POST /api/admin/ai/settings — upsert one setting (key, value).
 *
 * Gated on ROLES_MANAGE (owner-only): these values hold the API key and drive
 * the live narrator. The api_key value is masked on read.
 */

const MASKED = '••••••••'

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const rows = await query<{ key: string; value: unknown; updated_at: string }>(
      `SELECT key, value, updated_at FROM ai_settings ORDER BY key`,
    )
    // Never leak the API key back to the browser; show a masked placeholder.
    const settings = rows.map((r) =>
      r.key === 'api_key' || r.key === 'image_api_key'
        ? { ...r, value: r.value ? MASKED : '' }
        : r,
    )
    return NextResponse.json({ settings })
  } catch {
    // Migration 0045 not applied yet — degrade to empty list.
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

  let body: { key?: string; value?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const key = (body.key ?? '').toString().trim()
  if (!key || key.length > 64) {
    return NextResponse.json({ error: 'invalid key' }, { status: 400 })
  }
  if (body.value === undefined) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 })
  }
  // Ignore masked api_key writes: the admin didn't actually change the key.
  if ((key === 'api_key' || key === 'image_api_key') && body.value === MASKED) {
    return NextResponse.json({ ok: true, key, skipped: true })
  }

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

      await exec(
        `INSERT INTO ai_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, now())
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [key, valueJson, session.uid],
      )

      // Audit, masking the secret so it never lands in the audit log.
      const auditValue =
        key === 'api_key' || key === 'image_api_key' ? '***set***' : body.value
      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'ai.settings.update',
          targetType: 'ai_setting',
          targetId: key,
          meta: { value: auditValue },
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
