import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/inventory — return the active item catalog for autocomplete.
 * Read-only; requires inventory.view (any admin role). Shapes the rows the
 * admin item picker needs (code, name, rarity, type) and keeps the payload
 * small. Gracefully returns an empty list if the catalog table is missing
 * (foundation-only on un-migrated DBs).
 *
 * Optional `?exclude=case,key` filters out item types the caller must not
 * offer. The case reward picker passes `exclude=case` so a case can never be
 * added as a reward inside another case (which the bot's opener would treat as
 * a plain item and could nest cases). Each item also carries its `type` so the
 * caller can pick the right reward_kind (a `gift` reward must become a
 * sellable/withdrawable tg_gift, not a plain inventory stack item).
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.INVENTORY_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Whitelist-validate the exclude list to safe type tokens before using it.
  const exclude = (req.nextUrl.searchParams.get('exclude') ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => /^[a-z_]{1,24}$/.test(t))

  try {
    const items = await query<{
      code: string
      name: string | null
      rarity: string | null
      type: string | null
    }>(
      `SELECT code, name, rarity, type
         FROM inventory_items
        WHERE is_active = true
          AND ($1::text[] IS NULL OR type IS NULL OR NOT (type = ANY($1::text[])))
        ORDER BY name NULLS LAST, code`,
      [exclude.length > 0 ? exclude : null],
    )
    return NextResponse.json({ items })
  } catch {
    // Catalog not migrated yet — return empty so the picker degrades to manual.
    return NextResponse.json({ items: [] })
  }
}


/**
 * POST /api/admin/inventory — grant or revoke an item for a player.
 * Body: { userId, itemCode, quantity (>0, default 1), action: "grant"|"revoke", reason? }
 *
 * Atomic: inventory upsert/decrement + inventory_history row + audit row in one
 * transaction. Ownership lives in `inventory`; the item ledger is
 * `inventory_history`. Requires inventory.grant / inventory.revoke (owner/admin).
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    userId?: number
    itemCode?: string
    quantity?: number
    action?: 'grant' | 'revoke'
    reason?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const userId = Number(body.userId)
  const itemCode = (body.itemCode ?? '').toString().trim()
  const quantity = body.quantity == null ? 1 : Number(body.quantity)
  const action = body.action
  const reason = (body.reason ?? '').toString().slice(0, 500) || null

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  if (!itemCode || itemCode.length > 64) {
    return NextResponse.json({ error: 'invalid itemCode' }, { status: 400 })
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 })
  }
  if (action !== 'grant' && action !== 'revoke') {
    return NextResponse.json({ error: 'action must be grant or revoke' }, { status: 400 })
  }

  const perm = action === 'grant' ? PERM.INVENTORY_GRANT : PERM.INVENTORY_REVOKE
  if (!hasPermission(session.role, perm)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      if (action === 'grant') {
        // Item must exist in the catalog; copy its slot for the equip index.
        const cat = await exec<{ slot: string | null; is_active: boolean }>(
          'SELECT slot, is_active FROM inventory_items WHERE code = $1',
          [itemCode],
        )
        if (cat.length === 0) {
          throw Object.assign(new Error('unknown item_code'), { http: 404 })
        }
        const slot = cat[0].slot
        // Upsert: stack quantity if the player already owns it.
        await exec(
          `INSERT INTO inventory (user_id, item_code, slot, quantity, equipped, source)
             VALUES ($1, $2, $3, $4, false, 'admin')
           ON CONFLICT (user_id, item_code)
           DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
          [userId, itemCode, slot, quantity],
        )
      } else {
        // Revoke: lock the row, decrement, drop if it hits zero.
        const rows = await exec<{ quantity: number }>(
          `SELECT quantity FROM inventory
            WHERE user_id = $1 AND item_code = $2 FOR UPDATE`,
          [userId, itemCode],
        )
        if (rows.length === 0 || rows[0].quantity < quantity) {
          throw Object.assign(new Error('player does not own enough of this item'), {
            http: 409,
          })
        }
        const remaining = rows[0].quantity - quantity
        if (remaining === 0) {
          await exec(
            'DELETE FROM inventory WHERE user_id = $1 AND item_code = $2',
            [userId, itemCode],
          )
        } else {
          await exec(
            `UPDATE inventory SET quantity = $3
              WHERE user_id = $1 AND item_code = $2`,
            [userId, itemCode, remaining],
          )
        }
      }

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: action === 'grant' ? 'inventory.grant' : 'inventory.revoke',
          targetUserId: userId,
          targetType: 'item',
          targetId: itemCode,
          reason,
          meta: { quantity },
          ip,
        },
        exec,
      )

      // Item ledger row (append-only), linked to the audit row.
      await exec(
        `INSERT INTO inventory_history
           (user_id, item_code, delta, event, source, actor_user_id, audit_id, meta)
         VALUES ($1, $2, $3, $4, 'admin', $5, $6, $7)`,
        [
          userId,
          itemCode,
          action === 'grant' ? quantity : -quantity,
          action,
          session.uid,
          auditId,
          JSON.stringify({ via: 'admin_panel' }),
        ],
      )

      return { auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
