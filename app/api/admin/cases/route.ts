import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Cases admin API. Mirrors the bot's case model 1:1 — these routes only read
 * and write the SAME tables the bot owns (`case_definitions`), so there is no
 * second source of truth. The OPENING logic stays exclusively in Python
 * (`open_case()`); the site never opens cases, it only manages definitions and
 * reads history.
 *
 * GET  /api/admin/cases            — list case definitions (+ reward counts).
 * POST /api/admin/cases            — create or update a case definition.
 *
 * Drop-list rows live under /api/admin/cases/[code]/rewards.
 * Openings history lives under /api/admin/cases/openings.
 */

const COST_KINDS = new Set(['free', 'currency', 'stars'])

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.CASES_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const cases = await query<{
      item_code: string
      name: string
      description: string | null
      open_cost_kind: string
      open_cost_amount: string
      consumes_key: boolean
      is_active: boolean
      season_code: string | null
      reward_count: string
      total_weight: string | null
    }>(
      `SELECT d.item_code, d.name, d.description, d.open_cost_kind,
              d.open_cost_amount, d.consumes_key, d.is_active, d.season_code,
              COUNT(r.id) AS reward_count,
              COALESCE(SUM(r.weight), 0) AS total_weight
         FROM case_definitions d
         LEFT JOIN case_rewards r ON r.case_item_code = d.item_code
        GROUP BY d.id
        ORDER BY d.is_active DESC, d.name`,
    )
    return NextResponse.json({ cases })
  } catch {
    // Cases migration (0016) not applied yet — degrade to empty list.
    return NextResponse.json({ cases: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.CASES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: {
    itemCode?: string
    name?: string
    description?: string | null
    openCostKind?: string
    openCostAmount?: number
    consumesKey?: boolean
    isActive?: boolean
    seasonCode?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const itemCode = (body.itemCode ?? '').toString().trim()
  const name = (body.name ?? '').toString().trim()
  const description = (body.description ?? '').toString().slice(0, 2000) || null
  const openCostKind = (body.openCostKind ?? 'free').toString()
  const openCostAmount =
    body.openCostAmount == null ? 0 : Number(body.openCostAmount)
  const consumesKey = Boolean(body.consumesKey)
  const isActive = body.isActive == null ? true : Boolean(body.isActive)
  const seasonCode = (body.seasonCode ?? '').toString().trim().slice(0, 32) || null

  if (!itemCode || itemCode.length > 64) {
    return NextResponse.json({ error: 'invalid itemCode' }, { status: 400 })
  }
  if (!name || name.length > 128) {
    return NextResponse.json({ error: 'invalid name' }, { status: 400 })
  }
  if (!COST_KINDS.has(openCostKind)) {
    return NextResponse.json({ error: 'invalid openCostKind' }, { status: 400 })
  }
  if (openCostKind === 'stars') {
    // Schema allows it (foundation), but V1 runtime does not open stars-cost
    // cases. Block it at the admin boundary so no un-openable case is created.
    return NextResponse.json(
      { error: 'stars cost is post-V1 (not openable yet)' },
      { status: 400 },
    )
  }
  if (!Number.isInteger(openCostAmount) || openCostAmount < 0) {
    return NextResponse.json(
      { error: 'openCostAmount must be a non-negative integer' },
      { status: 400 },
    )
  }
  if (openCostKind === 'currency' && openCostAmount <= 0) {
    return NextResponse.json(
      { error: 'currency cost requires a positive openCostAmount' },
      { status: 400 },
    )
  }
  if (!consumesKey && openCostKind === 'free') {
    return NextResponse.json(
      { error: 'a case must cost something: a key or currency' },
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

      // The case must map to a catalog item of type 'case'. The bot is the
      // catalog owner; we only validate the link, never create the item here.
      const cat = await exec<{ type: string }>(
        'SELECT type FROM inventory_items WHERE code = $1',
        [itemCode],
      )
      if (cat.length === 0) {
        throw Object.assign(
          new Error('item_code not in catalog (create the case item first)'),
          { http: 404 },
        )
      }
      if (cat[0].type !== 'case') {
        throw Object.assign(
          new Error(`item '${itemCode}' is type '${cat[0].type}', expected 'case'`),
          { http: 409 },
        )
      }

      const existing = await exec<{ id: number }>(
        'SELECT id FROM case_definitions WHERE item_code = $1',
        [itemCode],
      )
      const isUpdate = existing.length > 0

      await exec(
        `INSERT INTO case_definitions
           (item_code, name, description, open_cost_kind, open_cost_amount,
            consumes_key, is_active, season_code, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now(), now())
         ON CONFLICT (item_code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           open_cost_kind = EXCLUDED.open_cost_kind,
           open_cost_amount = EXCLUDED.open_cost_amount,
           consumes_key = EXCLUDED.consumes_key,
           is_active = EXCLUDED.is_active,
           season_code = EXCLUDED.season_code,
           updated_at = now()`,
        [
          itemCode,
          name,
          description,
          openCostKind,
          openCostAmount,
          consumesKey,
          isActive,
          seasonCode,
        ],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: isUpdate ? 'cases.update' : 'cases.create',
          targetType: 'case',
          targetId: itemCode,
          meta: { openCostKind, openCostAmount, consumesKey, isActive },
          ip,
        },
        exec,
      )

      return { itemCode, isUpdate, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
