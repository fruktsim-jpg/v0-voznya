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
 * DELETE /api/admin/cases/[code]/rewards?id=..  — remove a drop row.
 *
 * V1 only accepts reward_kind 'item' | 'currency'. The schema allows
 * 'tg_gift'/'stars' as a foundation, but the bot's open_case() filters those
 * out, so we reject them here too — a row the runtime ignores would silently
 * distort the displayed odds. Probabilities are derived from `weight`.
 */

const KINDS_V1 = new Set(['item', 'currency'])

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
      reward_item_value: number | null
      amount: string | null
      weight: number
      min_qty: number
      max_qty: number
      max_global_supply: number | null
      granted_count: number
      is_jackpot: boolean
    }>(
      `SELECT r.id, r.reward_kind, r.reward_item_code,
              i.name AS reward_item_name, i.rarity AS reward_item_rarity,
              i.ref_value AS reward_item_value,
              r.amount, r.weight, r.min_qty, r.max_qty,
              r.max_global_supply, r.granted_count, r.is_jackpot
         FROM case_rewards r
         LEFT JOIN inventory_items i ON i.code = r.reward_item_code
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

  if (!KINDS_V1.has(rewardKind)) {
    return NextResponse.json(
      { error: "reward_kind must be 'item' or 'currency' (V1)" },
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

      // For item rewards, the reward item must exist in the catalog.
      if (rewardKind === 'item') {
        const cat = await exec<{ code: string }>(
          'SELECT code FROM inventory_items WHERE code = $1',
          [rewardItemCode],
        )
        if (cat.length === 0) {
          throw Object.assign(new Error('reward item not in catalog'), { http: 404 })
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
          rewardKind,
          rewardKind === 'item' ? rewardItemCode : null,
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
          meta: { case: caseCode, rewardKind, weight, isJackpot },
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
