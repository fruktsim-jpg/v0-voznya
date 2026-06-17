import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * AI prompts admin API. Edits the SAME `ai_prompts` table the bot reads via
 * `app.features.drun.config` — the persona/world/observation/reaction prompts
 * are editable without deploy. Bot picks up changes within its cache TTL.
 *
 * GET  /api/admin/ai/prompts — list all prompts.
 * POST /api/admin/ai/prompts — upsert one prompt (name, body, description, enabled).
 *
 * Gated on ROLES_MANAGE (owner-only): the prompt is the narrator's voice.
 */

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const prompts = await query<{
      name: string
      body: string
      description: string | null
      enabled: boolean
      updated_at: string
    }>(
      `SELECT name, body, description, enabled, updated_at
         FROM ai_prompts ORDER BY name`,
    )
    return NextResponse.json({ prompts })
  } catch {
    return NextResponse.json({ prompts: [] })
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
    name?: string
    body?: string
    description?: string | null
    enabled?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const name = (body.name ?? '').toString().trim()
  const text = (body.body ?? '').toString()
  const description = (body.description ?? '').toString().slice(0, 512) || null
  const enabled = body.enabled !== false

  if (!name || name.length > 64) {
    return NextResponse.json({ error: 'invalid name' }, { status: 400 })
  }
  if (!text.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        sql: string,
        p?: unknown[],
      ) => (await client.query(sql, p as never[])).rows as T[]

      await exec(
        `INSERT INTO ai_prompts (name, body, description, enabled, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (name) DO UPDATE SET
           body = EXCLUDED.body,
           description = EXCLUDED.description,
           enabled = EXCLUDED.enabled,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [name, text, description, enabled, session.uid],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'ai.prompts.update',
          targetType: 'ai_prompt',
          targetId: name,
          meta: { enabled, length: text.length },
          ip,
        },
        exec,
      )

      return { name, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
