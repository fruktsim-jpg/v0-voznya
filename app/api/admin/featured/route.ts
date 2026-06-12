import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { featuredSlotSchema, firstZodError } from '@/lib/admin/schemas'
import { isContentStatus } from '@/lib/admin/lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Featured Slots admin API. One authored model for every hero surface
 * (HOME/SHOP/CASES/PLAY/CASINO/SEASON _HERO) — no more heuristic "featured
 * item". Pattern A audited writes; bot untouched. Read side: lib/featured.ts.
 *
 *   GET    /api/admin/featured       — list (content.view)
 *   POST   /api/admin/featured       — create/update a slot (content.manage)
 *   PATCH  /api/admin/featured       — status transition by id (content.publish)
 *   DELETE /api/admin/featured?id=   — delete a slot (content.manage)
 */

function ipOf(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.CONTENT_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  try {
    const slots = await query(
      `SELECT id, surface, ref_type, ref_code, title, subtitle, priority,
              status, available_from, available_until, updated_at
         FROM featured_slots
        ORDER BY surface, priority, updated_at DESC`,
    )
    return NextResponse.json({ slots })
  } catch {
    return NextResponse.json({ slots: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.CONTENT_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = featuredSlotSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 })
  }
  const f = parsed.data
  const ip = ipOf(req)

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      const rows = await exec<{ id: number }>(
        `INSERT INTO featured_slots
           (surface, ref_type, ref_code, title, subtitle, priority, status,
            available_from, available_until, created_by, updated_by,
            created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10, now(), now())
         RETURNING id`,
        [
          f.surface,
          f.refType,
          f.refCode,
          f.title,
          f.subtitle,
          f.priority,
          f.status,
          f.availableFrom,
          f.availableUntil,
          session.uid,
        ],
      )
      const id = rows[0].id
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'featured.create',
          targetType: 'featured_slot',
          targetId: String(id),
          meta: { surface: f.surface, refType: f.refType, refCode: f.refCode, status: f.status },
          ip,
        },
        exec,
      )
      return { id }
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.CONTENT_PUBLISH)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  let body: { id?: number; status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const id = Number(body.id)
  const status = (body.status ?? '').toString().trim()
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!isContentStatus(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  const ip = ipOf(req)
  try {
    await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]
      const upd = await exec<{ id: number }>(
        'UPDATE featured_slots SET status = $2, updated_by = $3, updated_at = now() WHERE id = $1 RETURNING id',
        [id, status, session.uid],
      )
      if (upd.length === 0) throw Object.assign(new Error('slot not found'), { http: 404 })
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: `featured.status.${status}`,
          targetType: 'featured_slot',
          targetId: String(id),
          meta: { status },
          ip,
        },
        exec,
      )
    })
    return NextResponse.json({ ok: true, id, status })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.CONTENT_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const ip = ipOf(req)
  try {
    await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]
      const del = await exec<{ id: number }>(
        'DELETE FROM featured_slots WHERE id = $1 RETURNING id',
        [id],
      )
      if (del.length === 0) throw Object.assign(new Error('slot not found'), { http: 404 })
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'featured.delete',
          targetType: 'featured_slot',
          targetId: String(id),
          ip,
        },
        exec,
      )
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
