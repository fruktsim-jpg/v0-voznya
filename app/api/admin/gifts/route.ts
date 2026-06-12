import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { slugifyWithPrefix, slugifyCode, generateUniqueCode } from '@/lib/admin/code-gen'
import { giftStudioSchema, firstZodError } from '@/lib/admin/schemas'
import { isContentStatus, STATUS_META } from '@/lib/admin/lifecycle'
import { invalidateAssetOverlay } from '@/lib/item-art/manifest-source'

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
      rarity: string | null
      collection_code: string | null
      status: string | null
      featured_slot: string | null
      available_from: string | null
      available_until: string | null
      has_art: boolean
    }>(
      // Gift Studio: a gift is the gift_catalog row LEFT JOINed to its authored
      // inventory_items definition (shared code) for the visual-object fields.
      `SELECT g.code, g.name, g.description, g.star_cost,
              g.price_eshki, g.telegram_gift_id,
              g.stock, g.reserved, g.sold_count, g.is_active, g.sort_order,
              i.rarity, i.collection_code, i.status, i.featured_slot,
              i.available_from, i.available_until,
              (i.asset_code IS NOT NULL) AS has_art
         FROM gift_catalog g
         LEFT JOIN inventory_items i ON i.code = g.code
        ORDER BY g.is_active DESC, g.sort_order, g.name`,
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

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = giftStudioSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 })
  }
  const g = parsed.data

  // Soft economic guard: gifts priced below cost lose Stars on every sale.
  const belowCost = g.priceEshki < g.starCost * 10
  // Lifecycle drives bot-compatible is_active (published/scheduled → true).
  const activeFor = (status: string): boolean =>
    isContentStatus(status) ? STATUS_META[status].isLive : false

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      const isUpdate = !!g.code
      const finalCode = g.code
        ? g.code
        : await generateUniqueCode(exec, 'gift_catalog', 'code', slugifyWithPrefix('gift', g.name))

      // Inline collection creation (same pattern as the Item Builder): a new
      // collection name is authored here (auto-code) and linked to the gift.
      let collectionCode = g.collectionCode
      if (g.newCollectionName) {
        const newCode = await generateUniqueCode(
          exec,
          'collections',
          'code',
          slugifyCode(g.newCollectionName),
        )
        await exec(
          `INSERT INTO collections
             (code, name, description, kind, season_code, sort_order, status,
              created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,NULL,'permanent',NULL,100,$3,$4,$4, now(), now())
           ON CONFLICT (code) DO NOTHING`,
          [newCode, g.newCollectionName, g.status, session.uid],
        )
        await writeAudit(
          {
            actorUserId: session.uid,
            actorRole: session.role,
            action: 'collection.create',
            targetType: 'collection',
            targetId: newCode,
            meta: { via: 'gift-studio-inline', name: g.newCollectionName },
            ip,
          },
          exec,
        )
        collectionCode = newCode
      }
      if (collectionCode) {
        const col = await exec<{ code: string }>(
          'SELECT code FROM collections WHERE code = $1',
          [collectionCode],
        )
        if (col.length === 0) {
          throw Object.assign(new Error(`коллекция «${collectionCode}» не найдена`), { http: 400 })
        }
      }

      // 1) gift_catalog row — pricing/delivery (unchanged economy contract).
      await exec(
        `INSERT INTO gift_catalog
           (code, name, description, star_cost, price_eshki, telegram_gift_id,
            stock, reserved, sold_count, is_active, sort_order,
            created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, 0, 0, $8,$9, now(), now())
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
          g.name,
          g.description ?? null,
          g.starCost,
          g.priceEshki,
          g.telegramGiftId,
          g.stock ?? null,
          activeFor(g.status),
          g.sortOrder,
        ],
      )

      // 2) inventory_items definition — the VISUAL OBJECT (art/rarity/collection/
      //    lifecycle/featured), sharing the gift code. type='gift'. Shop
      //    item-awareness already reads this over the gift code. Authoring only;
      //    granting/ownership stays the bot's job. asset_code == code (shared art).
      await exec(
        `INSERT INTO inventory_items
           (code, type, rarity, name, description, collection_code,
            is_limited, max_supply, transferable, stackable, status, asset_code,
            featured_slot, available_from, available_until, is_active,
            updated_by, created_at, updated_at)
         VALUES ($1,'gift',$2,$3,$4,$5, false, NULL, true, true, $6, $1,
                 $7,$8,$9,$10,$11, now(), now())
         ON CONFLICT (code) DO UPDATE SET
           rarity = EXCLUDED.rarity,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           collection_code = EXCLUDED.collection_code,
           status = EXCLUDED.status,
           asset_code = EXCLUDED.asset_code,
           featured_slot = EXCLUDED.featured_slot,
           available_from = EXCLUDED.available_from,
           available_until = EXCLUDED.available_until,
           is_active = EXCLUDED.is_active,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [
          finalCode,
          g.rarity,
          g.name,
          g.description ?? null,
          collectionCode,
          g.status,
          g.featuredSlot,
          g.availableFrom,
          g.availableUntil,
          activeFor(g.status),
          session.uid,
        ],
      )

      // 3) Featured slot (one engine), if chosen — ref_type 'gift'.
      if (g.featuredSlot) {
        await exec(
          `INSERT INTO featured_slots
             (surface, ref_type, ref_code, status, priority, created_by, updated_by,
              created_at, updated_at)
           VALUES ($1, 'gift', $2, $3, 100, $4, $4, now(), now())
           ON CONFLICT DO NOTHING`,
          [g.featuredSlot, finalCode, g.status, session.uid],
        )
      }

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: isUpdate ? 'gift.catalog_update' : 'gift.catalog_create',
          targetType: 'gift',
          targetId: finalCode,
          meta: {
            starCost: g.starCost,
            priceEshki: g.priceEshki,
            stock: g.stock ?? null,
            rarity: g.rarity,
            collection: collectionCode,
            status: g.status,
            featuredSlot: g.featuredSlot,
            belowCost,
          },
          ip,
        },
        exec,
      )

      return { code: finalCode, isUpdate, auditId, belowCost }
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

      // Clean up the converged visual-object definition + featured slot, but
      // only if no player owns it (authoring delete must not orphan ownership).
      const owned = await exec<{ n: number }>(
        `SELECT (
            (SELECT count(*) FROM inventory WHERE item_code = $1)
          + (SELECT count(*) FROM inventory_instances WHERE item_code = $1)
         )::int AS n`,
        [code],
      )
      if ((owned[0]?.n ?? 0) === 0) {
        await exec(`DELETE FROM featured_slots WHERE ref_type = 'gift' AND ref_code = $1`, [code])
        await exec(`DELETE FROM inventory_items WHERE code = $1 AND type = 'gift'`, [code])
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
    invalidateAssetOverlay()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
