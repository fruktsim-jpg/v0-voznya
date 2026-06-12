import { NextResponse, type NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Object-local gift statistics (read-only). Answers, for ONE gift code:
 * how many purchased, revenue (net of refunds), refunds, delivery funnel
 * (completed/pending/cancelled), realized Stars cost + margin, how many sit in
 * player inventories now, and Stars P&L for this gift. All from ledgers the bot
 * writes (purchase_history, gift_transactions, inventory*). No mutations.
 *
 * GET /api/admin/gifts/[code]/stats — requires gift.view.
 */

const NUM = (v: string | null | undefined) => Number(v ?? 0) || 0

export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.GIFT_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { code } = await ctx.params
  const giftCode = (code ?? '').toString().trim()
  if (!giftCode) return NextResponse.json({ error: 'code required' }, { status: 400 })

  async function safe<T extends Record<string, unknown>>(text: string, p: unknown[]): Promise<T[]> {
    try {
      return await query<T>(text, p)
    } catch {
      return []
    }
  }

  const [purchaseAgg, deliveryAgg, ownedAgg, fromCasesAgg] = await Promise.all([
    safe<{ revenue: string; purchases: string; refunds: string }>(
      `SELECT COALESCE(SUM(price) FILTER (WHERE COALESCE(meta->>'refunded','false') <> 'true'), 0)::text AS revenue,
              COUNT(*) FILTER (WHERE COALESCE(meta->>'refunded','false') <> 'true')::text AS purchases,
              COUNT(*) FILTER (WHERE meta->>'refunded' = 'true')::text AS refunds
         FROM purchase_history
        WHERE source = 'gift' AND item_code = $1`,
      [giftCode],
    ),
    safe<{ status: string; cnt: string; stars: string }>(
      `SELECT status, COUNT(*)::text AS cnt,
              COALESCE(SUM((meta->>'star_cost')::bigint), 0)::text AS stars
         FROM gift_transactions
        WHERE kind = 'tg_gift' AND item_code = $1
        GROUP BY status`,
      [giftCode],
    ),
    safe<{ holders: string; qty: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS holders,
              COALESCE(SUM(quantity), 0)::text AS qty
         FROM inventory WHERE item_code = $1`,
      [giftCode],
    ),
    safe<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM case_rewards WHERE reward_item_code = $1`,
      [giftCode],
    ),
  ])

  const byStatus = new Map(deliveryAgg.map((r) => [r.status, { cnt: NUM(r.cnt), stars: NUM(r.stars) }]))
  const completed = byStatus.get('completed')?.cnt ?? 0
  const pending = byStatus.get('pending')?.cnt ?? 0
  const cancelled = byStatus.get('cancelled')?.cnt ?? 0
  const starsRealized = byStatus.get('completed')?.stars ?? 0
  const revenueEshki = NUM(purchaseAgg[0]?.revenue)
  const marginEshki = revenueEshki - starsRealized * 10

  return NextResponse.json({
    code: giftCode,
    purchases: NUM(purchaseAgg[0]?.purchases),
    refunds: NUM(purchaseAgg[0]?.refunds),
    revenueEshki,
    delivery: { completed, pending, cancelled },
    starsRealized,
    marginEshki,
    inInventories: { holders: NUM(ownedAgg[0]?.holders), quantity: NUM(ownedAgg[0]?.qty) },
    droppedByCases: NUM(fromCasesAgg[0]?.n),
  })
}
