import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { collectionSchema, firstZodError } from '@/lib/admin/schemas'
import { isContentStatus } from '@/lib/admin/lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Collections admin API (Collections Foundation, Pattern A — audited catalog
 * writes; bot untouched). Items are born collection-aware (inventory_items.
 * collection_code), and this manages the authored parent records.
 *
 *   GET    /api/admin/collections        — list (content.view)
 *   POST   /api/admin/collections        — create/update (content.manage)
 *   PATCH  /api/admin/collections        — status transition (content.publish)
 *   DELETE /api/admin/collections?code=  — delete (content.manage)
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
    const collections = await query(
      `SELECT c.code, c.name, c.description, c.kind, c.season_code,
              c.sort_order, c.status, c.updated_at,
              (SELECT count(*) FROM inventory_items i WHERE i.collection_code = c.code)::int AS item_count
         FROM collections c
        ORDER BY c.sort_order, c.name`,
    )
    return NextResponse.json({ collections })
  } catch {
    return NextResponse.json({ collections: [] })
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
  const parsed = collectionSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 })
  }
  const c = parsed.data
  const ip = ipOf(req)

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      const existing = await exec<{ id: number }>(
        'SELECT id FROM collections WHERE code = $1',
        [c.code],
      )
      const isUpdate = existing.length > 0

      await exec(
        `INSERT INTO collections
           (code, name, description, kind, season_code, sort_order, status,
            created_by, updated_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8, now(), now())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           kind = EXCLUDED.kind,
           season_code = EXCLUDED.season_code,
           sort_order = EXCLUDED.sort_order,
           status = EXCLUDED.status,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [
          c.code,
          c.name,
          c.description ?? null,
          c.kind,
          c.seasonCode,
          c.sortOrder,
          c.status,
          session.uid,
        ],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: isUpdate ? 'collection.update' : 'collection.create',
          targetType: 'collection',
          targetId: c.code,
          meta: { kind: c.kind, status: c.status },
          ip,
        },
        exec,
      )
      return { code: c.code, isUpdate, auditId }
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
  let body: { code?: string; status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const code = (body.code ?? '').toString().trim()
  const status = (body.status ?? '').toString().trim()
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })
  if (!isContentStatus(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  const ip = ipOf(req)
  try {
    await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]
      const upd = await exec<{ code: string }>(
        'UPDATE collections SET status = $2, updated_by = $3, updated_at = now() WHERE code = $1 RETURNING code',
        [code, status, session.uid],
      )
      if (upd.length === 0) throw Object.assign(new Error('collection not found'), { http: 404 })
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: `collection.status.${status}`,
          targetType: 'collection',
          targetId: code,
          meta: { status },
          ip,
        },
        exec,
      )
    })
    return NextResponse.json({ ok: true, code, status })
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
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })
  const ip = ipOf(req)
  try {
    await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      // Guard: don't orphan items silently.
      const inUse = await exec<{ n: number }>(
        'SELECT count(*)::int AS n FROM inventory_items WHERE collection_code = $1',
        [code],
      )
      if ((inUse[0]?.n ?? 0) > 0) {
        throw Object.assign(
          new Error(`коллекция используется ${inUse[0].n} предметами`),
          { http: 409 },
        )
      }
      const del = await exec<{ code: string }>(
        'DELETE FROM collections WHERE code = $1 RETURNING code',
        [code],
      )
      if (del.length === 0) throw Object.assign(new Error('collection not found'), { http: 404 })
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'collection.delete',
          targetType: 'collection',
          targetId: code,
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
