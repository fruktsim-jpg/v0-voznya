import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { validateImage, isValidationError } from '@/lib/item-art/image-validate'
import { invalidateAssetOverlay } from '@/lib/item-art/manifest-source'
import { isContentStatus, STATUS_META } from '@/lib/admin/lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// =============================================================================
// VOZNYA — ADMIN: item asset authoring API (Item Authoring IA-1)
// =============================================================================
//
// Pattern A: the site owns the content/art catalog and writes it here via the
// existing audited admin spine (getAdminSession + hasPermission + withTransaction
// + writeAudit). The bot stays authority for economy/users/grants — untouched.
//
//   GET    /api/admin/assets            — list asset metadata (content.view)
//   POST   /api/admin/assets            — upload PNG/WebP for a code (content.manage)
//                                         multipart: file=<blob>, code=<string>
//   PATCH  /api/admin/assets            — publish | retire | draft  (content.publish)
//                                         json: { code, status }
//   DELETE /api/admin/assets?code=      — delete an asset            (content.manage)
//
// Upload lands as status='draft' (private — only admin preview can see it).
// PATCH→published flips it live and invalidates the runtime overlay so the art
// appears across every surface within the next render. No code, no deploy.
// =============================================================================

function ipOf(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.CONTENT_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  try {
    const assets = await query<{
      code: string
      mime: string
      width: number | null
      height: number | null
      byte_size: number
      status: string
      version: number
      updated_at: string
    }>(
      `SELECT code, mime, width, height, byte_size, status, version, updated_at
         FROM item_assets
        ORDER BY updated_at DESC`,
    )
    return NextResponse.json({ assets })
  } catch {
    // Migration 0037 not applied — degrade to empty.
    return NextResponse.json({ assets: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.CONTENT_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 })
  }

  const code = (form.get('code') ?? '').toString().trim()
  const file = form.get('file')

  if (!code || code.length > 64 || !/^[a-z0-9_]+$/i.test(code)) {
    return NextResponse.json(
      { error: 'invalid code (a-z, 0-9, _ ; max 64)' },
      { status: 400 },
    )
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const info = validateImage(buf)
  if (isValidationError(info)) {
    return NextResponse.json({ error: info.error }, { status: 400 })
  }

  const ip = ipOf(req)

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      const existing = await exec<{ id: number; version: number }>(
        'SELECT id, version FROM item_assets WHERE code = $1 FOR UPDATE',
        [code],
      )
      const isUpdate = existing.length > 0
      // Re-upload bumps version (busts the immutable cache for this code).
      const nextVersion = isUpdate ? existing[0].version + 1 : 1

      await exec(
        `INSERT INTO item_assets
           (code, mime, bytes, width, height, byte_size, checksum,
            status, version, uploaded_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9, now(), now())
         ON CONFLICT (code) DO UPDATE SET
           mime = EXCLUDED.mime,
           bytes = EXCLUDED.bytes,
           width = EXCLUDED.width,
           height = EXCLUDED.height,
           byte_size = EXCLUDED.byte_size,
           checksum = EXCLUDED.checksum,
           version = EXCLUDED.version,
           uploaded_by = EXCLUDED.uploaded_by,
           updated_at = now()`,
        [
          code,
          info.mime,
          buf,
          info.width,
          info.height,
          info.byteSize,
          info.checksum,
          nextVersion,
          session.uid,
        ],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: isUpdate ? 'asset.reupload' : 'asset.upload',
          targetType: 'item_asset',
          targetId: code,
          meta: {
            mime: info.mime,
            width: info.width,
            height: info.height,
            byteSize: info.byteSize,
            version: nextVersion,
          },
          ip,
        },
        exec,
      )

      return { code, isUpdate, version: nextVersion, auditId, ...info }
    })

    // A re-upload of an already-published code must refresh the live bytes.
    invalidateAssetOverlay()
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
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      const upd = await exec<{ code: string; version: number }>(
        `UPDATE item_assets SET status = $2, updated_at = now()
          WHERE code = $1 RETURNING code, version`,
        [code, status],
      )
      if (upd.length === 0) {
        throw Object.assign(new Error('asset not found'), { http: 404 })
      }
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: `asset.status.${status}`,
          targetType: 'item_asset',
          targetId: code,
          meta: { status, isLive: STATUS_META[status].isLive, version: upd[0].version },
          ip,
        },
        exec,
      )
      return { code, status, version: upd[0].version }
    })

    invalidateAssetOverlay()
    return NextResponse.json({ ok: true, ...result })
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
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      const del = await exec<{ code: string }>(
        'DELETE FROM item_assets WHERE code = $1 RETURNING code',
        [code],
      )
      if (del.length === 0) {
        throw Object.assign(new Error('asset not found'), { http: 404 })
      }
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'asset.delete',
          targetType: 'item_asset',
          targetId: code,
          ip,
        },
        exec,
      )
    })
    invalidateAssetOverlay()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
