import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { itemBuilderSchema, firstZodError } from '@/lib/admin/schemas'
import { isContentStatus, STATUS_META } from '@/lib/admin/lifecycle'
import { invalidateAssetOverlay } from '@/lib/item-art/manifest-source'
import { slugifyCode, generateUniqueCode } from '@/lib/admin/code-gen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Item Builder API (IA-2). Pattern A: the site authors the item CATALOG
 * (definitions/content) — code, name, description, class, rarity, collection,
 * availability, lifecycle status, asset link, featured slot. It NEVER grants
 * ownership or mints supply; granting stays the bot's authority (authoring ≠
 * granting). Every write is audited and transactional.
 *
 *   GET    /api/admin/items        — list (content.view)
 *   POST   /api/admin/items        — create/update definition (content.manage)
 *   PATCH  /api/admin/items        — status transition (content.publish)
 *   DELETE /api/admin/items?code=  — delete definition (content.manage)
 *
 * `status` is the lifecycle source of truth; `is_active` is kept in sync
 * (published/scheduled → true) so the bot's existing reads keep working until a
 * separate bot-read migration.
 */

function ipOf(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

/** Lifecycle → legacy is_active (bot compatibility). */
function activeFor(status: string): boolean {
  return isContentStatus(status) ? STATUS_META[status].isLive : false
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.CONTENT_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  try {
    const items = await query(
      // Gifts (type='gift') and cases (type='case') have their own studios
      // (Gift Studio / Cases). Editing them here as plain items would desync
      // gift_catalog / case_definitions, so the Item Builder archive hides them.
      `SELECT code, name, description, type AS item_class, rarity,
              collection_code, series_total, is_limited, max_supply,
              transferable, stackable, status, asset_code, featured_slot,
              available_from, available_until, updated_at
         FROM inventory_items
        WHERE type NOT IN ('gift', 'case')
        ORDER BY updated_at DESC NULLS LAST, name`,
    )
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
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
  const parsed = itemBuilderSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 })
  }
  const it = parsed.data
  const ip = ipOf(req)

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      // Workflow-first: on create, auto-generate the code from the name so the
      // operator never invents a technical identifier. On edit, code is the
      // immutable key the client sends back.
      const isUpdate = !!it.code
      const code = it.code
        ? it.code
        : await generateUniqueCode(exec, 'inventory_items', 'code', slugifyCode(it.name))
      const assetCode = code // shared-art model: art keyed by item code

      if (it.code) {
        await exec<{ code: string }>(
          'SELECT code FROM inventory_items WHERE code = $1 FOR UPDATE',
          [code],
        )
      }

      // Inline collection creation: a brand-new collection name authors the
      // collection here (auto-code) and links the item to it — no separate trip.
      let collectionCode = it.collectionCode
      if (it.newCollectionName) {
        const newCode = await generateUniqueCode(
          exec,
          'collections',
          'code',
          slugifyCode(it.newCollectionName),
        )
        await exec(
          `INSERT INTO collections
             (code, name, description, kind, season_code, sort_order, status,
              created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,NULL,'permanent',NULL,100,$3,$4,$4, now(), now())
           ON CONFLICT (code) DO NOTHING`,
          [newCode, it.newCollectionName, it.status, session.uid],
        )
        await writeAudit(
          {
            actorUserId: session.uid,
            actorRole: session.role,
            action: 'collection.create',
            targetType: 'collection',
            targetId: newCode,
            meta: { via: 'item-builder-inline', name: it.newCollectionName },
            ip,
          },
          exec,
        )
        collectionCode = newCode
      }

      // Validate collection exists when set (items are collection-aware).
      if (collectionCode) {
        const col = await exec<{ code: string }>(
          'SELECT code FROM collections WHERE code = $1',
          [collectionCode],
        )
        if (col.length === 0) {
          throw Object.assign(
            new Error(`коллекция «${collectionCode}» не найдена`),
            { http: 400 },
          )
        }
      }

      await exec(
        `INSERT INTO inventory_items
           (code, type, rarity, name, description, collection_code, series_total,
            is_limited, max_supply, transferable, stackable, status, asset_code,
            featured_slot, available_from, available_until, is_active,
            updated_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now(), now())
         ON CONFLICT (code) DO UPDATE SET
           type = EXCLUDED.type,
           rarity = EXCLUDED.rarity,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           collection_code = EXCLUDED.collection_code,
           series_total = EXCLUDED.series_total,
           is_limited = EXCLUDED.is_limited,
           max_supply = EXCLUDED.max_supply,
           transferable = EXCLUDED.transferable,
           stackable = EXCLUDED.stackable,
           status = EXCLUDED.status,
           asset_code = EXCLUDED.asset_code,
           featured_slot = EXCLUDED.featured_slot,
           available_from = EXCLUDED.available_from,
           available_until = EXCLUDED.available_until,
           is_active = EXCLUDED.is_active,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [
          code,
          it.itemClass,
          it.rarity,
          it.name,
          it.description ?? null,
          collectionCode,
          it.seriesTotal ?? null,
          it.isLimited ?? false,
          it.maxSupply ?? null,
          it.transferable ?? true,
          it.stackable ?? false,
          it.status,
          assetCode,
          it.featuredSlot,
          it.availableFrom,
          it.availableUntil,
          activeFor(it.status),
          session.uid,
        ],
      )

      // If a featured slot was chosen, author a featured_slots row for it too
      // (one engine): the item points at HOME/SHOP/etc and the surface resolver
      // picks it up. Mirrors the item's status.
      if (it.featuredSlot) {
        await exec(
          `INSERT INTO featured_slots
             (surface, ref_type, ref_code, status, priority, created_by, updated_by,
              created_at, updated_at)
           VALUES ($1, 'item', $2, $3, 100, $4, $4, now(), now())
           ON CONFLICT DO NOTHING`,
          [it.featuredSlot, code, it.status, session.uid],
        )
      }

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: isUpdate ? 'item.update' : 'item.create',
          targetType: 'item',
          targetId: code,
          meta: {
            itemClass: it.itemClass,
            rarity: it.rarity,
            collection: collectionCode,
            status: it.status,
            featuredSlot: it.featuredSlot,
          },
          ip,
        },
        exec,
      )
      return { code, isUpdate, auditId }
    })

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
    await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]
      const upd = await exec<{ code: string }>(
        `UPDATE inventory_items
            SET status = $2, is_active = $3, updated_by = $4, updated_at = now()
          WHERE code = $1 RETURNING code`,
        [code, status, activeFor(status), session.uid],
      )
      if (upd.length === 0) throw Object.assign(new Error('item not found'), { http: 404 })
      // Keep gift_catalog.is_active in lockstep for gift-type definitions. The
      // shop's primary filter is gift_catalog.is_active; without this a gift
      // published via the lifecycle would update inventory_items but stay hidden
      // in the storefront (gift_catalog still inactive). No-op for non-gifts.
      await exec(
        `UPDATE gift_catalog SET is_active = $2, updated_at = now()
          WHERE code = $1`,
        [code, activeFor(status)],
      )
      // Keep any linked featured slot in lockstep.
      await exec(
        `UPDATE featured_slots SET status = $2, updated_at = now()
          WHERE ref_type = 'item' AND ref_code = $1`,
        [code, status],
      )
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: `item.status.${status}`,
          targetType: 'item',
          targetId: code,
          meta: { status, isLive: STATUS_META[status].isLive },
          ip,
        },
        exec,
      )
    })
    invalidateAssetOverlay()
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

      // Guard: never delete a definition that players already own.
      const owned = await exec<{ n: number }>(
        `SELECT (
            (SELECT count(*) FROM inventory WHERE item_code = $1)
          + (SELECT count(*) FROM inventory_instances WHERE item_code = $1)
         )::int AS n`,
        [code],
      )
      if ((owned[0]?.n ?? 0) > 0) {
        throw Object.assign(
          new Error(`предмет в инвентарях игроков (${owned[0].n}); используй «В архив» вместо удаления`),
          { http: 409 },
        )
      }
      const del = await exec<{ code: string }>(
        'DELETE FROM inventory_items WHERE code = $1 RETURNING code',
        [code],
      )
      if (del.length === 0) throw Object.assign(new Error('item not found'), { http: 404 })
      await exec(
        `DELETE FROM featured_slots WHERE ref_type = 'item' AND ref_code = $1`,
        [code],
      )
      await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'item.delete',
          targetType: 'item',
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
