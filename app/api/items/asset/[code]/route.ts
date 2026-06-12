import { type NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// VOZNYA — ITEM ART asset serving (Item Authoring IA-1)
// =============================================================================
//
// Serves the image bytes for an authored asset code from `item_assets`. The
// dynamic manifest points each authored code at `/api/items/asset/{code}?v=N`,
// so this is the public read endpoint behind `<ItemArt>`.
//
// - Public reads serve ONLY `status='published'` bytes (drafts stay private).
// - `?preview=1` serves any status, but requires a content.view admin session —
//   this is what powers the admin's real <ItemArt> preview before publishing.
// - Versioned URLs (?v=) + immutable long cache: re-uploading bumps version, so
//   the URL changes and caches never serve stale art.
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  if (!code || code.length > 64) {
    return new NextResponse('bad code', { status: 400 })
  }

  const preview = req.nextUrl.searchParams.get('preview') === '1'
  if (preview) {
    const session = await getAdminSession()
    if (!session || !hasPermission(session.role, PERM.CONTENT_VIEW)) {
      return new NextResponse('forbidden', { status: 403 })
    }
  }

  let rows: { bytes: Buffer; mime: string; version: number }[] = []
  try {
    rows = await query<{ bytes: Buffer; mime: string; version: number }>(
      preview
        ? `SELECT bytes, mime, version FROM item_assets WHERE code = $1 LIMIT 1`
        : `SELECT bytes, mime, version FROM item_assets
            WHERE code = $1 AND status = 'published' LIMIT 1`,
      [code],
    )
  } catch {
    return new NextResponse('unavailable', { status: 503 })
  }

  const row = rows[0]
  if (!row) {
    return new NextResponse('not found', { status: 404 })
  }

  const body = Buffer.isBuffer(row.bytes) ? row.bytes : Buffer.from(row.bytes)
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': row.mime || 'application/octet-stream',
      'Content-Length': String(body.length),
      // Published versioned URL → cache hard. Preview → never cache (drafts move).
      'Cache-Control': preview
        ? 'private, no-store'
        : 'public, max-age=31536000, immutable',
      'X-Asset-Version': String(row.version),
    },
  })
}
