import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Player Studio — GRANT a gift (incl. Telegram Premium) to a player.
 *
 * GROUNDED IN THE BOT (no parallel system): granting a gift means creating a
 * PENDING `gift_transactions` row — exactly what the bot's `_grant_tg_gift`
 * (app/features/cases/rewards.py) does. Delivery/refund then go through the
 * EXISTING `/api/admin/gifts/deliveries` route (which mirrors the bot's
 * complete_gift_manually / refund_gift). Premium is NOT a user flag in the bot —
 * it's a gift with item_code `gift_premium_3m` / `gift_premium_6m` delivered
 * manually as real Telegram Premium; so "grant premium" == grant that gift.
 *
 * Contract (gift_transactions, app/models/gift_transaction.py):
 *   kind='tg_gift', gift_type='admin', recipient_user_id=<player>,
 *   item_code=<gift_catalog.code>, quantity=1, status='pending',
 *   idempotency_key=unique, meta={ source:'admin', star_cost, manual,
 *   premium_months?, granted_by, reason }. Reserves one catalog unit
 *   (gift_catalog.reserved += 1) like a purchase, so stock/limit accounting
 *   stays consistent with the bot. No balance change (admin grant is free).
 *
 * GET  /api/admin/gifts/grant?type=premium|all — list grantable gift codes.
 * POST /api/admin/gifts/grant — { userId, code, reason }. Gated GIFT_MANAGE.
 */

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.GIFT_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const premiumOnly = req.nextUrl.searchParams.get('type') === 'premium'
  try {
    const rows = await query<{
      code: string
      name: string
      star_cost: number
      price_eshki: string
      stock: number | null
      reserved: number
      is_active: boolean
    }>(
      `SELECT code, name, star_cost, price_eshki::text AS price_eshki,
              stock, reserved, is_active
         FROM gift_catalog
        WHERE is_active = true ${premiumOnly ? "AND code LIKE 'gift_premium%'" : ''}
        ORDER BY code LIKE 'gift_premium%' DESC, sort_order, name`,
    )
    return NextResponse.json({
      gifts: rows.map((r) => ({
        code: r.code,
        name: r.name,
        starCost: r.star_cost,
        priceEshki: Number(r.price_eshki),
        // remaining = stock - reserved when stock is finite; null = unlimited
        remaining: r.stock == null ? null : Math.max(0, r.stock - r.reserved),
        isPremium: r.code.startsWith('gift_premium'),
      })),
    })
  } catch {
    return NextResponse.json({ gifts: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.GIFT_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { userId?: number; code?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const userId = Number(body.userId)
  const code = (body.code ?? '').toString().trim()
  const reason = (body.reason ?? '').toString().slice(0, 500) || null

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'invalid userId' }, { status: 400 })
  }
  if (!code || code.length > 64) {
    return NextResponse.json({ error: 'invalid code' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  // Unique idempotency key in the bot's namespace style ("admingift:<uid>:<rand>").
  const idem = `admingift:${userId}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      // Player must exist.
      const player = await exec<{ user_id: string }>(
        'SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE',
        [userId],
      )
      if (player.length === 0) {
        throw Object.assign(new Error('player not found'), { http: 404 })
      }

      // Gift must exist + be active; lock for reserve accounting. Reject if a
      // finite stock is exhausted (matches the bot's purchase guard).
      const gift = await exec<{
        code: string
        name: string
        star_cost: number
        stock: number | null
        reserved: number
        is_active: boolean
      }>(
        `SELECT code, name, star_cost, stock, reserved, is_active
           FROM gift_catalog WHERE code = $1 FOR UPDATE`,
        [code],
      )
      if (gift.length === 0) {
        throw Object.assign(new Error('gift not found'), { http: 404 })
      }
      const g = gift[0]
      if (!g.is_active) {
        throw Object.assign(new Error('gift is not active'), { http: 409 })
      }
      if (g.stock != null && g.stock - g.reserved <= 0) {
        throw Object.assign(new Error('gift out of stock'), { http: 409 })
      }

      const isPremium = code.startsWith('gift_premium')
      const premiumMonths = code === 'gift_premium_6m' ? 6 : code === 'gift_premium_3m' ? 3 : null

      // 1) Reserve one unit (mirror the bot's purchase reservation).
      await exec('UPDATE gift_catalog SET reserved = reserved + 1 WHERE code = $1', [code])

      // 2) Create the PENDING delivery (the bot's grant contract).
      await exec(
        `INSERT INTO gift_transactions
           (kind, gift_type, sender_user_id, recipient_user_id, item_code,
            quantity, amount, status, idempotency_key, meta, created_at)
         VALUES ('tg_gift', 'admin', NULL, $1, $2, 1, NULL, 'pending', $3, $4::jsonb, now())`,
        [
          userId,
          code,
          idem,
          JSON.stringify({
            source: 'admin',
            star_cost: g.star_cost,
            manual: true,
            granted_by: session.uid,
            ...(premiumMonths ? { premium_months: premiumMonths } : {}),
            ...(reason ? { reason } : {}),
          }),
        ],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'gift.grant',
          targetUserId: userId,
          targetType: 'gift',
          targetId: code,
          reason,
          meta: { code, name: g.name, isPremium, premiumMonths, idempotencyKey: idem },
          ip,
        },
        exec,
      )

      return { idempotencyKey: idem, code, name: g.name, isPremium, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
