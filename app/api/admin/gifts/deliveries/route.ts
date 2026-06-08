import { NextResponse, type NextRequest } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { requestGiftDelivery } from '@/lib/bot-client'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Gift DELIVERIES admin API — the operational side of the gift shop.
 *
 * A purchase (in the bot) writes a `gift_transactions` row with
 * status='pending' and reserves one unit in `gift_catalog`. Delivery then
 * either succeeds automatically (Telegram sendGift) or stays pending (delivery
 * disabled, no telegram_gift_id, not enough Stars). This route lets an admin
 * resolve those pending deliveries from the site instead of the bot:
 *
 *   GET    /api/admin/gifts/deliveries?status=&userId=  — list (gift.view)
 *   POST   /api/admin/gifts/deliveries                  — act    (gift.manage)
 *           body: { idempotencyKey, action: "complete" | "refund", reason? }
 *
 * ONE SOURCE OF TRUTH: the writes below mirror the bot's
 * app/features/gifts/service.py (complete_gift_manually / refund_gift) exactly —
 * same status transitions, same reserved/sold_count math, same refund ledger
 * (transactions.reason='reward', not productive → total_earned untouched). We do
 * not invent a second economy model; we replicate the bot's steps 1:1.
 *
 * Both actions are idempotent: they only act on status='pending' under a row
 * lock, so a double click or a late auto-delivery cannot double-apply.
 */

type DeliveryRow = {
  idempotency_key: string
  recipient_user_id: string
  item_code: string | null
  status: string
  quantity: number
  transaction_id: string | null
  star_cost: number | null
  manual: boolean
  manual_by_admin: number | null
  created_at: string
  gift_name: string | null
  price_eshki: string | null
  recipient_name: string | null
  recipient_username: string | null
  // Diagnostics surfaced from meta (no migration — bot already writes these).
  gift_type: string | null // player / system / admin
  source: string | null // case / gift_buy / gifted / admin
  attempts: number | null // failed auto-delivery attempts
  last_error: string | null // last sendGift error
  gifted_to: string | null // recipient handle for "gift to friend"
  transaction_eshki: string | null // amount paid (currency gift) or null
}


export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.role, PERM.GIFT_VIEW)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get('status')?.trim() || 'pending'
  // Free-text search: matches recipient by ID (exact) OR name/username (ILIKE).
  // Back-compat: the old `userId` param is still accepted as an exact ID.
  const queryRaw =
    req.nextUrl.searchParams.get('q')?.trim() ||
    req.nextUrl.searchParams.get('userId')?.trim() ||
    ''

  // Whitelist statuses (matches GIFT_STATUSES in the bot). "all" = no filter.
  // "failed" is a DERIVED view of pending rows that already errored at least
  // once on auto-delivery (meta.attempts > 0) — the bot has no separate failed
  // status, a temporary sendGift failure stays pending and accrues attempts.
  const allowed = new Set([
    'pending',
    'completed',
    'cancelled',
    'failed',
    'all',
  ])
  if (!allowed.has(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  // Optional source filter: case / shop / gifted / admin (derived from meta).
  const sourceFilter = req.nextUrl.searchParams.get('source')?.trim() || ''

  try {
    const conditions: string[] = [`gt.kind = 'tg_gift'`]
    const params: unknown[] = []
    if (status === 'failed') {
      conditions.push(`gt.status = 'pending'`)
      conditions.push(`COALESCE((gt.meta->>'attempts')::int, 0) > 0`)
    } else if (status !== 'all') {
      params.push(status)
      conditions.push(`gt.status = $${params.length}`)
    }
    if (sourceFilter === 'case') {
      conditions.push(`gt.meta->>'source' = 'case'`)
    } else if (sourceFilter === 'admin') {
      conditions.push(`gt.gift_type = 'admin'`)
    } else if (sourceFilter === 'gifted') {
      conditions.push(`gt.meta ? 'gifted_to'`)
    } else if (sourceFilter === 'shop') {
      conditions.push(
        `(gt.gift_type <> 'admin' AND COALESCE(gt.meta->>'source','') <> 'case' AND NOT (gt.meta ? 'gifted_to'))`,
      )
    }

    if (queryRaw) {
      // Numeric query → exact recipient id OR name/username match.
      // Non-numeric query → name/username match only. ILIKE handles a leading
      // "@" in usernames gracefully via the wildcard pattern.
      const term = queryRaw.replace(/^@/, '')
      const numeric = /^\d+$/.test(term)
      params.push(`%${term}%`)
      const likeIdx = params.length
      if (numeric) {
        params.push(Number(term))
        const idIdx = params.length
        conditions.push(
          `(gt.recipient_user_id = $${idIdx}` +
            ` OR u.first_name ILIKE $${likeIdx}` +
            ` OR u.username ILIKE $${likeIdx})`,
        )
      } else {
        conditions.push(
          `(u.first_name ILIKE $${likeIdx} OR u.username ILIKE $${likeIdx})`,
        )
      }
    }
    // Pending first (oldest first within), then most recent activity.
    const deliveries = await query<DeliveryRow>(
      `SELECT gt.idempotency_key,
              gt.recipient_user_id,
              gt.item_code,
              gt.status,
              gt.quantity,
              gt.transaction_id,
              (gt.meta->>'star_cost')::int          AS star_cost,
              COALESCE((gt.meta->>'manual_delivery')::boolean, false) AS manual,
              (gt.meta->>'manual_by_admin')::bigint  AS manual_by_admin,
              gt.created_at,
              gc.name                                AS gift_name,
              gc.price_eshki                         AS price_eshki,
              u.first_name                           AS recipient_name,
              u.username                             AS recipient_username,
              gt.gift_type                           AS gift_type,
              gt.meta->>'source'                     AS source,
              COALESCE((gt.meta->>'attempts')::int, 0) AS attempts,
              gt.meta->>'last_error'                 AS last_error,
              gt.meta->>'gifted_to'                  AS gifted_to,
              gt.amount::text                        AS transaction_eshki
         FROM gift_transactions gt
         LEFT JOIN gift_catalog gc ON gc.code = gt.item_code
         LEFT JOIN users u ON u.user_id = gt.recipient_user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY (gt.status = 'pending') DESC,
                 gt.created_at ASC
        LIMIT 200`,
      params,
    )

    // Period stats for the header (independent of the status/source filter).
    // 'period' = 24h | 7d | 30d | all (default all). Failed = pending+attempts.
    const period = req.nextUrl.searchParams.get('period')?.trim() || 'all'
    const since =
      period === '24h'
        ? `now() - interval '24 hours'`
        : period === '7d'
          ? `now() - interval '7 days'`
          : period === '30d'
            ? `now() - interval '30 days'`
            : null
    const where = `gt.kind = 'tg_gift'${since ? ` AND gt.created_at >= ${since}` : ''}`
    const statRows = await query<{
      total: string
      completed: string
      pending: string
      cancelled: string
      failed: string
      premium: string
      limited: string
    }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE gt.status = 'completed')::text AS completed,
              COUNT(*) FILTER (WHERE gt.status = 'pending')::text AS pending,
              COUNT(*) FILTER (WHERE gt.status = 'cancelled')::text AS cancelled,
              COUNT(*) FILTER (
                WHERE gt.status = 'pending'
                  AND COALESCE((gt.meta->>'attempts')::int, 0) > 0
              )::text AS failed,
              COUNT(*) FILTER (
                WHERE gt.item_code IN ('gift_premium_3m', 'gift_premium_6m')
              )::text AS premium,
              COUNT(*) FILTER (WHERE ii.is_limited)::text AS limited
         FROM gift_transactions gt
         LEFT JOIN inventory_items ii ON ii.code = gt.item_code
        WHERE ${where}`,
    )
    const s = statRows[0]
    const stats = {
      total: Number(s?.total ?? 0),
      completed: Number(s?.completed ?? 0),
      pending: Number(s?.pending ?? 0),
      cancelled: Number(s?.cancelled ?? 0),
      failed: Number(s?.failed ?? 0),
      premium: Number(s?.premium ?? 0),
      limited: Number(s?.limited ?? 0),
    }

    return NextResponse.json({ deliveries, stats })

  } catch {
    // Migration not applied yet — degrade to empty list (keeps page alive).
    return NextResponse.json({ deliveries: [] })
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
    idempotencyKey?: string
    action?: 'complete' | 'refund' | 'retry'
    reason?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const key = (body.idempotencyKey ?? '').toString().trim()
  const action = body.action
  const reason = (body.reason ?? '').toString().slice(0, 500) || null

  if (!key || key.length > 64) {
    return NextResponse.json({ error: 'invalid idempotencyKey' }, { status: 400 })
  }
  if (action !== 'complete' && action !== 'refund' && action !== 'retry') {
    return NextResponse.json(
      { error: 'action must be complete, refund or retry' },
      { status: 400 },
    )
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  // RETRY = ask the bot to attempt the REAL Telegram sendGift again (the only
  // process holding the token + Stars). We look up the recipient, call the
  // bot's internal API, write an audit row, and let the bot's own logic update
  // the delivery (completed / still pending / cancelled+refund). If the bot is
  // unreachable we say so instead of silently doing nothing.
  if (action === 'retry') {
    const rows = await query<{ recipient_user_id: string; status: string }>(
      `SELECT recipient_user_id, status FROM gift_transactions
        WHERE idempotency_key = $1 AND kind = 'tg_gift'`,
      [key],
    )
    if (rows.length === 0) {
      return NextResponse.json({ error: 'delivery not found' }, { status: 404 })
    }
    if (rows[0].status !== 'pending') {
      return NextResponse.json(
        { error: 'delivery already processed (not pending)' },
        { status: 409 },
      )
    }
    const recipientId = Number(rows[0].recipient_user_id)
    const res = await requestGiftDelivery(recipientId, key)

    await writeAudit({
      actorUserId: session.uid,
      actorRole: session.role,
      action: 'gift.delivery_retry',
      targetUserId: recipientId,
      targetType: 'gift_delivery',
      targetId: key,
      reason,
      meta: { result: res.status, error: res.error ?? null },
      ip,
    })

    if (res.status === 'unreachable') {
      return NextResponse.json(
        { error: 'бот недоступен — повтор выдачи невозможен сейчас' },
        { status: 503 },
      )
    }
    return NextResponse.json({ ok: true, ...res })
  }


  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(
        text: string,
        p?: unknown[],
      ) => (await client.query(text, p as never[])).rows as T[]

      // Lock the delivery row; act only if still pending (idempotent).
      const rows = await exec<{
        recipient_user_id: string
        item_code: string | null
        status: string
        transaction_id: string | null
        meta: Record<string, unknown> | null
      }>(
        `SELECT recipient_user_id, item_code, status, transaction_id, meta
           FROM gift_transactions
          WHERE idempotency_key = $1
          FOR UPDATE`,
        [key],
      )
      if (rows.length === 0) {
        throw Object.assign(new Error('delivery not found'), { http: 404 })
      }
      const d = rows[0]
      if (d.status !== 'pending') {
        throw Object.assign(new Error('delivery already processed (not pending)'), {
          http: 409,
        })
      }

      const giftCode = d.item_code ?? ''
      const recipientId = Number(d.recipient_user_id)
      const meta = { ...(d.meta ?? {}) }

      if (action === 'complete') {
        // Mirror complete_gift_manually: pending → completed, reserve a unit
        // as sold. No money moves (purchase already recorded at buy time).
        meta.manual_delivery = true
        meta.manual_by_admin = session.uid
        meta.manual_channel = 'site'

        await exec(
          `UPDATE gift_transactions
              SET status = 'completed', meta = $2
            WHERE idempotency_key = $1`,
          [key, JSON.stringify(meta)],
        )
        await exec(
          `UPDATE gift_catalog
              SET reserved = reserved - 1,
                  sold_count = sold_count + 1
            WHERE code = $1 AND reserved > 0`,
          [giftCode],
        )

        const auditId = await writeAudit(
          {
            actorUserId: session.uid,
            actorRole: session.role,
            action: 'gift.delivery_complete',
            targetUserId: recipientId,
            targetType: 'gift_delivery',
            targetId: key,
            reason,
            meta: { gift: giftCode },
            ip,
          },
          exec,
        )
        return { status: 'completed', auditId }
      }

      // action === 'refund' — mirror refund_gift: return ешки, free reserve,
      // mark cancelled. reason='reward' is NOT productive in the bot, so we do
      // NOT touch total_earned/total_spent (only balance + ledger row).
      let refundTxId: number | null = null
      const price = d.transaction_id ? await priceFromCatalog(exec, giftCode) : 0
      if (price > 0) {
        await exec(
          `UPDATE users SET balance = balance + $2 WHERE user_id = $1`,
          [recipientId, price],
        )
        const tx = await exec<{ id: string }>(
          `INSERT INTO transactions (user_id, amount, reason, meta)
           VALUES ($1, $2, 'reward', $3) RETURNING id`,
          [
            recipientId,
            price,
            JSON.stringify({
              source: 'gift_refund',
              gift: giftCode,
              of_transaction: d.transaction_id ? Number(d.transaction_id) : null,
              channel: 'site',
              actor: session.uid,
            }),
          ],
        )
        refundTxId = Number(tx[0].id)
      }

      meta.refunded = true
      if (refundTxId != null) meta.refund_transaction_id = refundTxId
      if (reason) meta.error = reason
      await exec(
        `UPDATE gift_transactions
            SET status = 'cancelled', meta = $2
          WHERE idempotency_key = $1`,
        [key, JSON.stringify(meta)],
      )
      await exec(
        `UPDATE gift_catalog
            SET reserved = reserved - 1
          WHERE code = $1 AND reserved > 0`,
        [giftCode],
      )

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: 'gift.delivery_refund',
          targetUserId: recipientId,
          targetType: 'gift_delivery',
          targetId: key,
          amount: price,
          reason,
          meta: { gift: giftCode, refund_transaction_id: refundTxId },
          ip,
        },
        exec,
      )
      return { status: 'cancelled', refunded: price, auditId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}

/** Current ешки price of a gift from the catalog (0 if unknown). */
async function priceFromCatalog(
  exec: <T extends Record<string, unknown>>(text: string, p?: unknown[]) => Promise<T[]>,
  code: string,
): Promise<number> {
  if (!code) return 0
  const rows = await exec<{ price_eshki: string }>(
    'SELECT price_eshki FROM gift_catalog WHERE code = $1',
    [code],
  )
  return rows.length > 0 ? Number(rows[0].price_eshki) : 0
}
