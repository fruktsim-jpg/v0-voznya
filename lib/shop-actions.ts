// Server-only shop purchase — faithful TS port of the bot's buy_gift()
// (app/features/gifts/service.py), running against the SAME Postgres in ONE
// transaction. Lets the player actually BUY a gift/Premium for eshki from the
// site (P4/P5): the purchase goes to the inventory as a pending gift_transaction
// (exactly like the bot), then Sell/Withdraw act on it — no instant delivery.
//
// Why a TS port: the site (Vercel) cannot reach the bot's process (separate
// VPS), but both share one Postgres and lib/db.ts exposes withTransaction().
//
// MUST stay behavior-identical to buy_gift():
//   PRE-FLIGHT under row locks (catalog FOR UPDATE + user FOR UPDATE), no writes
//   → burn eshki (transactions ledger, reason='purchase')
//   → reserved+1 → purchase_history → gift_transactions(status='pending').
// Ownership is the SIGNED session (caller passes userId), never the body.
import 'server-only'

import { randomBytes } from 'crypto'
import { withTransaction } from './db'
import { emitWorldEvent } from './world-events'

export type BuyResult = {
  status: 'ok' | 'not_found' | 'inactive' | 'sold_out' | 'not_enough' | 'error'
  giftName?: string
  price?: number
  balance?: number | null
  deliveryKey?: string | null
  error?: string
}

type GiftRow = {
  id: number
  code: string
  name: string
  is_active: boolean
  price_eshki: string
  star_cost: number | null
  telegram_gift_id: string | null
  stock: number | null
  reserved: number
  sold_count: number
}

/**
 * Покупает подарок за ешки на стороне сайта (P4). Полностью атомарно — порт
 * buy_gift(): после покупки подарок лежит в инвентаре как pending, дальше игрок
 * сам решает (продать/вывести). Доставку делает бот.
 */
export async function buyGift(userId: number, code: string, channel: 'web' | 'miniapp' = 'web'): Promise<BuyResult> {
  return withTransaction(async (client) => {
    // --- PRE-FLIGHT под блокировками ---------------------------------------
    const giftRes = await client.query<GiftRow>(
      `SELECT id, code, name, is_active, price_eshki::text AS price_eshki,
              star_cost, telegram_gift_id, stock, reserved, sold_count
         FROM gift_catalog WHERE code = $1 FOR UPDATE`,
      [code],
    )
    const gift = giftRes.rows[0]
    if (!gift) return { status: 'not_found' }
    if (!gift.is_active) return { status: 'inactive', giftName: gift.name }

    const price = Number(gift.price_eshki)
    // Остаток (NULL stock = безлимит).
    if (gift.stock != null && gift.stock - gift.reserved - gift.sold_count <= 0) {
      return { status: 'sold_out', giftName: gift.name }
    }

    const userRes = await client.query<{ balance: string }>(
      `SELECT balance FROM users WHERE user_id = $1 FOR UPDATE`,
      [userId],
    )
    const balance = userRes.rows[0] ? Number(userRes.rows[0].balance) : 0
    if (!userRes.rows[0] || balance < price) {
      return { status: 'not_enough', giftName: gift.name, price }
    }

    // --- МУТАЦИИ (отказ уже невозможен) ------------------------------------
    const idem = `giftbuy:${userId}:${randomBytes(8).toString('hex')}`
    const baseMeta = {
      channel,
      source: 'gift_buy',
      gift: gift.code,
      star_cost: gift.star_cost,
      telegram_gift_id: gift.telegram_gift_id,
    }

    // 1) Списать ешки (reason='purchase'), получить id проводки и новый баланс.
    const upd = await client.query<{ balance: string }>(
      `UPDATE users SET balance = balance - $2 WHERE user_id = $1 RETURNING balance`,
      [userId, price],
    )
    const tx = await client.query<{ id: number }>(
      `INSERT INTO transactions (user_id, amount, reason, meta)
       VALUES ($1, $2, 'purchase', $3) RETURNING id`,
      [userId, -price, JSON.stringify({ source: 'gift_buy', gift: gift.code, channel })],
    )
    const txId = tx.rows[0].id

    // 2) Зарезервировать единицу пула.
    await client.query(
      `UPDATE gift_catalog SET reserved = reserved + 1 WHERE id = $1`,
      [gift.id],
    )

    // 3) Запись покупки (деньги).
    await client.query(
      `INSERT INTO purchase_history
         (user_id, offer_id, item_code, price, quantity, source, transaction_id, meta)
       VALUES ($1, $2, $3, $4, 1, 'gift', $5, $6)`,
      [userId, gift.id, gift.code, price, txId, JSON.stringify(baseMeta)],
    )

    // 4) Доставка pending (тот же жизненный цикл, что у бота).
    await client.query(
      `INSERT INTO gift_transactions
         (kind, gift_type, sender_user_id, recipient_user_id, item_code,
          quantity, status, idempotency_key, transaction_id, meta)
       VALUES ('tg_gift', 'system', NULL, $1, $2, 1, 'pending', $3, $4, $5)`,
      [userId, gift.code, idem, txId, JSON.stringify(baseMeta)],
    )

    // 5) Проекция в world_events (как бот buy_gift) — друн видит покупку с сайта.
    await emitWorldEvent(client, {
      type: 'gift_purchase',
      actorId: userId,
      amount: price,
      refTable: 'transactions',
      refId: txId,
      meta: { gift: gift.code, gift_name: gift.name, star_cost: gift.star_cost, channel },
    })

    return {
      status: 'ok',
      giftName: gift.name,
      price,
      balance: Number(upd.rows[0].balance),
      deliveryKey: idem,
    }
  })
}
