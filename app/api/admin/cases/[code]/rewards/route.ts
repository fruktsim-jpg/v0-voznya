import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Drop-list (rewards) admin API for one case.
 *
 * GET    /api/admin/cases/[code]/rewards        — list the case's drop rows.
 * POST   /api/admin/cases/[code]/rewards        — add a drop row.
 * PATCH  /api/admin/cases/[code]/rewards        — edit an existing drop row.
 * DELETE /api/admin/cases/[code]/rewards?id=..  — remove a drop row.
 *
 * Reward kinds the bot can actually open are 'item', 'currency' and 'tg_gift'.
 * The operator only chooses "предмет" or "ешки"; we infer the real kind from
 * the catalog row's type:
 *   - type='gift'  → reward_kind='tg_gift' (delivered/sellable via gift_catalog,
 *                    valued by its price; a plain 'item' gift would land in the
 *                    stack inventory with NO sell/withdraw path).
 *   - type='case'  → rejected (a case must never be a reward inside a case).
 *   - otherwise    → reward_kind='item'.
 * Probabilities are derived from `weight`.
 */

// Kinds the operator can request via the UI selector.
const KINDS_REQUESTABLE = new Set(['item', 'currency'])

async function requireManage() {
  const session = await getAdminSession()
  if (!session) return { error: 401 as const }
  if (!hasPermission(session.role, PERM.CASES_MANAGE)) return { error: 403 as const }
  return { session }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.CASES_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { code } = await ctx.params
  const caseCode = (code ?? '').toString().trim()

  try {
    const rewards = await query<{
      id: number
      reward_kind: string
      reward_item_code: string | null
      reward_item_name: string | null
      reward_item_rarity: string | null
      reward_item_type: string | null
      reward_item_value: number | null
      amount: string | null
      weight: number
      min_qty: number
      max_qty: number
      max_global_supply: number | null
      granted_count: number
      is_jackpot: boolean
    }>(
      // reward_item_value is the eshki value used for EV/RTP. For a tg_gift the
      // value lives in gift_catalog (price_eshki, or star_cost × 10 fallback);
      // for a plain item it's inventory_items.ref_value. COALESCE picks the
      // right source so gift rewards are no longer valued at 0.
      `SELECT r.id, r.reward_kind, r.reward_item_code,
              COALESCE(i.name, g.name) AS reward_item_name,
              i.rarity AS reward_item_rarity,
              COALESCE(i.type, CASE WHEN g.code IS NOT NULL THEN 'gift' END) AS reward_item_type,
              COALESCE(
                NULLIF(g.price_eshki, 0),
                NULLIF(g.star_cost, 0) * 10,
                i.ref_value
              ) AS reward_item_value,
              r.amount, r.weight, r.min_qty, r.max_qty,
              r.max_global_supply, r.granted_count, r.is_jackpot
         FROM case_rewards r
         LEFT JOIN inventory_items i ON i.code = r.reward_item_code
         LEFT JOIN gift_catalog g ON g.code = r.reward_item_code
        WHERE r.case_item_code = $1
        ORDER BY r.id`,
      [caseCode],
    )
    return NextResponse.json({ rewards })
  } catch {
    return NextResponse.json({ rewards: [] })
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const guard = await requireManage()
  if ('error' in guard) {
    return NextResponse.json(
      { error: guard.error === 401 ? 'unauthorized' : 'forbidden' },
      { status: guard.error },
    )
  }
  const { session } = guard
  const { code } = await ctx.params
  const caseCode = (code ?? '').toString().trim()

  let body: {
    rewardKind?: string
    rewardItemCode?: string | null
    amount?: number | null
    weight?: number
    minQty?: number
    maxQty?: number
    maxGlobalSupply?: number | null
    isJackpot?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const rewardKind = (body.rewardKind ?? '').toString()
  const rewardItemCode = (body.rewardItemCode ?? '').toString().trim() || null
  const amount = body.amount == null ? null : Number(body.amount)
  const weight = Number(body.weight)
  const minQty = body.minQty == null ? 1 : Number(body.minQty)
  const maxQty = body.maxQty == null ? 1 : Number(body.maxQty)
  const maxGlobalSupply =
    body.maxGlobalSupply == null ? null : Number(body.maxGlobalSupply)
  const isJackpot = Boolean(body.isJackpot)

  if (!KINDS_REQUESTABLE.has(rewardKind)) {
    return NextResponse.json(
      { error: "reward_kind must be 'item' or 'currency'" },
      { status: 400 },
    )
  }
  if (!Number.isInteger(weight) || weight <= 0) {
    return NextResponse.json({ error: 'weight must be a positive integer' }, { status: 400 })
  }
  if (!Number.isInteger(minQty) || minQty < 1 || !Number.isInteger(maxQty) || maxQty < minQty) {
    return NextResponse.json({ error: 'invalid min/max qty' }, { status: 400 })
  }
  if (maxGlobalSupply != null && (!Number.isInteger(maxGlobalSupply) || maxGlobalSupply <= 0)) {
    return NextResponse.json(
      { error: 'maxGlobalSupply must be a positive integer or empty' },
      { status: 400 },
    )
  }
  if (rewardKind === 'item' && !rewardItemCode) {
    return NextResponse.json({ error: 'item reward requires rewardItemCode' }, { status: 400 })
  }
  if (rewardKind === 'currency' && (amount == null || !Number.isInteger(amount) || amount <= 0)) {
    return NextResponse.json(
      { error: 'currency reward requires a positive integer amount' },
      { status: 400 },
    )
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      // Case must exist.
      const cases = await exec<{ id: number }>(
        'SELECT id FROM case_definitions WHERE item_code = $1',
        [caseCode],
      )
      if (cases.length === 0) {
        throw Object.assign(new Error('case not found'), { http: 404 })
      }

      // For item rewards, the reward item must exist in the catalog. We also
      // read its type to (a) reject cases-in-cases and (b) promote a gift to a
      // tg_gift reward so it's delivered/sellable instead of a dead stack item.
      let effectiveKind = rewardKind
      if (rewardKind === 'item') {
        const cat = await exec<{ code: string; type: string | null }>(
          'SELECT code, type FROM inventory_items WHERE code = $1',
          [rewardItemCode],
        )
        if (cat.length === 0) {
          throw Object.assign(new Error('reward item not in catalog'), { http: 404 })
        }
        if (cat[0].type === 'case') {
          throw Object.assign(
            new Error('кейс нельзя добавить наградой в другой кейс'),
            { http: 400 },
          )
        }
        if (cat[0].type === 'gift') {
          // A gift must be granted as a Telegram gift (sellable/withdrawable,
          // valued by gift_catalog), not as a plain inventory stack item.
          effectiveKind = 'tg_gift'
        }
      }

      const rows = await exec<{ id: number }>(
        `INSERT INTO case_rewards
           (case_item_code, reward_kind, reward_item_code, amount, weight,
            min_qty, max_qty, max_global_supply, granted_count, is_jackpot, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9, now())
         RETURNING id`,
        [
          caseCode,
          effectiveKind,
          rewardKind === 'currency' ? null : rewardItemCode,
          rewardKind === 'currency' ? amount : null,
          weight,
          minQty,
          maxQty,
          maxGlobalSupply,
          isJackpot,
        ],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'cases.reward_add',
          targetType: 'case_reward',
          targetId: String(rows[0].id),
          meta: { case: caseCode, rewardKind: effectiveKind, weight, isJackpot },
          ip,
        },
        exec,
      )

      return { rewardId: rows[0].id, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const guard = await requireManage()
  if ('error' in guard) {
    return NextResponse.json(
      { error: guard.error === 401 ? 'unauthorized' : 'forbidden' },
      { status: guard.error },
    )
  }
  const { session } = guard
  const { code } = await ctx.params
  const caseCode = (code ?? '').toString().trim()

  let body: {
    id?: number
    amount?: number | null
    weight?: number
    minQty?: number
    maxQty?: number
    maxGlobalSupply?: number | null
    isJackpot?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const rewardId = Number(body.id)
  const weight = Number(body.weight)
  const minQty = body.minQty == null ? 1 : Number(body.minQty)
  const maxQty = body.maxQty == null ? 1 : Number(body.maxQty)
  const amount = body.amount == null ? null : Number(body.amount)
  const maxGlobalSupply =
    body.maxGlobalSupply == null ? null : Number(body.maxGlobalSupply)
  const isJackpot = Boolean(body.isJackpot)

  if (!Number.isInteger(rewardId) || rewardId <= 0) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }
  if (!Number.isInteger(weight) || weight <= 0) {
    return NextResponse.json({ error: 'weight must be a positive integer' }, { status: 400 })
  }
  if (!Number.isInteger(minQty) || minQty < 1 || !Number.isInteger(maxQty) || maxQty < minQty) {
    return NextResponse.json({ error: 'invalid min/max qty' }, { status: 400 })
  }
  if (maxGlobalSupply != null && (!Number.isInteger(maxGlobalSupply) || maxGlobalSupply <= 0)) {
    return NextResponse.json(
      { error: 'maxGlobalSupply must be a positive integer or empty' },
      { status: 400 },
    )
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      // Load the existing row (scoped to this case) to know its kind — only a
      // currency row's amount is editable here; item/tg_gift keep their code.
      const existing = await exec<{ reward_kind: string }>(
        'SELECT reward_kind FROM case_rewards WHERE id = $1 AND case_item_code = $2',
        [rewardId, caseCode],
      )
      if (existing.length === 0) {
        throw Object.assign(new Error('reward not found for this case'), { http: 404 })
      }
      const kind = existing[0].reward_kind
      if (kind === 'currency' && (amount == null || !Number.isInteger(amount) || amount <= 0)) {
        return Promise.reject(
          Object.assign(new Error('currency reward requires a positive integer amount'), {
            http: 400,
          }),
        )
      }

      await exec(
        `UPDATE case_rewards
            SET weight = $3,
                min_qty = $4,
                max_qty = $5,
                max_global_supply = $6,
                is_jackpot = $7,
                amount = CASE WHEN reward_kind = 'currency' THEN $8 ELSE amount END
          WHERE id = $1 AND case_item_code = $2`,
        [rewardId, caseCode, weight, minQty, maxQty, maxGlobalSupply, isJackpot, amount],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'cases.reward_update',
          targetType: 'case_reward',
          targetId: String(rewardId),
          meta: { case: caseCode, weight, isJackpot, minQty, maxQty, maxGlobalSupply },
          ip,
        },
        exec,
      )

      return { rewardId, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const guard = await requireManage()
  if ('error' in guard) {
    return NextResponse.json(
      { error: guard.error === 401 ? 'unauthorized' : 'forbidden' },
      { status: guard.error },
    )
  }
  const { session } = guard
  const { code } = await ctx.params
  const caseCode = (code ?? '').toString().trim()
  const rewardId = Number(req.nextUrl.searchParams.get('id'))

  if (!Number.isInteger(rewardId) || rewardId <= 0) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      // Scope delete to the case in the path so an id from another case can't
      // be removed via this route.
      const deleted = await exec<{ id: number }>(
        'DELETE FROM case_rewards WHERE id = $1 AND case_item_code = $2 RETURNING id',
        [rewardId, caseCode],
      )
      if (deleted.length === 0) {
        throw Object.assign(new Error('reward not found for this case'), { http: 404 })
      }

      // Note: past case_openings keep a weight_snapshot, so deleting a drop row
      // never rewrites history — only future odds change.
      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'cases.reward_remove',
          targetType: 'case_reward',
          targetId: String(rewardId),
          meta: { case: caseCode },
          ip,
        },
        exec,
      )

      return { removed: rewardId, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
