import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { slugifyWithPrefix, generateUniqueCode } from '@/lib/admin/code-gen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Gift catalog admin API (stage 1: assortment only, no Telegram sending).
 *
 * Manages `gift_catalog` — the Telegram Gifts players will be able to buy for
 * ешки (see VOZNYA_ECONOMY_V2). Stage 1 is catalog + pricing + stock/budget
 * management; the purchase flow and automatic Telegram delivery come later
 * (the `stock`/`reserved` columns are already in place for that).
 *
 * GET    /api/admin/gifts        — list catalog (gift.view, any admin role).
 * POST   /api/admin/gifts        — create/update a gift (gift.manage, admin+).
 * DELETE /api/admin/gifts?code=  — remove a gift (gift.manage, admin+).
 *
 * Economy note surfaced to the admin: 1 Star ≈ 10 ешек, so price_eshki should
 * normally be ≥ star_cost*10 (margin). We warn but do not hard-block, so events
 * (subsidised gifts) remain possible deliberately.
 */

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.GIFT_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const gifts = await query<{
      code: string
      name: string
      description: string | null
      star_cost: number
      price_eshki: string
      telegram_gift_id: string | null
      stock: number | null
      reserved: number
      sold_count: number
      is_active: boolean
      sort_order: number
    }>(
      `SELECT code, name, description, star_cost,
              price_eshki, telegram_gift_id,
              stock, reserved, sold_count, is_active, sort_order
         FROM gift_catalog
        ORDER BY is_active DESC, sort_order, name`,
    )
    return NextResponse.json({ gifts })
  } catch {
    // Migration 0018 not applied yet — degrade to empty list.
    return NextResponse.json({ gifts: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.GIFT_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: {
    code?: string
    name?: string
    description?: string | null
    starCost?: number
    priceEshki?: number
    telegramGiftId?: string | null
    stock?: number | null
    isActive?: boolean
    sortOrder?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const code = (body.code ?? '').toString().trim()
  const name = (body.name ?? '').toString().trim()
  const description = (body.description ?? '').toString().slice(0, 2000) || null
  const starCost = Number(body.starCost)
  const priceEshki = Number(body.priceEshki)
  const telegramGiftId = (body.telegramGiftId ?? '').toString().trim() || null
  const stock =
    body.stock == null || body.stock === ('' as unknown) ? null : Number(body.stock)
  const isActive = body.isActive == null ? true : Boolean(body.isActive)
  const sortOrder = body.sortOrder == null ? 100 : Number(body.sortOrder)

  // Workflow-first: code is optional. On create it is auto-generated from the
  // name (operator never invents `gift_bear_rare`). If sent, it is validated as
  // the immutable key for an update.
  if (code && code.length > 64) {
    return NextResponse.json({ error: 'invalid code' }, { status: 400 })
  }
  if (!name || name.length > 128) {
    return NextResponse.json({ error: 'invalid name' }, { status: 400 })
  }
  if (!Number.isInteger(starCost) || starCost < 0) {
    return NextResponse.json(
      { error: 'starCost must be a non-negative integer' },
      { status: 400 },
    )
  }
  if (!Number.isInteger(priceEshki) || priceEshki < 0) {
    return NextResponse.json(
      { error: 'priceEshki must be a non-negative integer' },
      { status: 400 },
    )
  }
  if (stock != null && (!Number.isInteger(stock) || stock < 0)) {
    return NextResponse.json(
      { error: 'stock must be a non-negative integer or empty' },
      { status: 400 },
    )
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return NextResponse.json({ error: 'invalid sortOrder' }, { status: 400 })
  }

  // Soft economic guard: gifts priced below cost lose Stars on every sale.
  const belowCost = priceEshki < starCost * 10

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      const isUpdate = !!code
      const finalCode = code
        ? code
        : await generateUniqueCode(exec, 'gift_catalog', 'code', slugifyWithPrefix('gift', name))

      await exec(
        `INSERT INTO gift_catalog
           (code, name, description, star_cost, price_eshki, telegram_gift_id,
            stock, reserved, sold_count, is_active, sort_order,
            created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,
                 0, 0,
                 $8,$9, now(), now())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,

           description = EXCLUDED.description,
           star_cost = EXCLUDED.star_cost,
           price_eshki = EXCLUDED.price_eshki,
           telegram_gift_id = EXCLUDED.telegram_gift_id,
           stock = EXCLUDED.stock,
           is_active = EXCLUDED.is_active,
           sort_order = EXCLUDED.sort_order,
           updated_at = now()`,
        [
          finalCode,
          name,
          description,
          starCost,
          priceEshki,
          telegramGiftId,
          stock,
          isActive,
          sortOrder,
        ],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: isUpdate ? 'gift.catalog_update' : 'gift.catalog_create',
          targetType: 'gift',
          targetId: finalCode,
          meta: { starCost, priceEshki, stock, isActive, belowCost },
          ip,
        },
        exec,
      )

      return { code: finalCode, isUpdate, auditId, belowCost }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.GIFT_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      const del = await exec<{ code: string }>(
        'DELETE FROM gift_catalog WHERE code = $1 RETURNING code',
        [code],
      )
      if (del.length === 0) {
        throw Object.assign(new Error('gift not found'), { http: 404 })
      }
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'gift.catalog_delete',
          targetType: 'gift',
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
