// Server-only inventory mutations — faithful TS ports of the bot's
// app/features/gifts/service.py (sell_gift / withdraw intent), running against
// the SAME Postgres in ONE transaction.
//
// Why this exists: the site (Vercel) cannot reach the bot's process (separate
// VPS), but both share one Postgres and lib/db.ts exposes withTransaction().
// So the site sells / withdraws directly and atomically — no network bridge.
//
// These MUST stay behavior-identical to the bot:
//   - SELL: lock the gift_transactions row FOR UPDATE, verify owner + pending,
//     credit floor(full_value × ITEM_SELL_RATE) via the transactions ledger
//     (reason='reward'), flip to 'cancelled', free the shop pool reservation
//     for shop purchases (case prizes never reserved a pool slot).
//   - WITHDRAW: the item is ALREADY a pending gift_transaction (created at case
//     open / shop buy). "Withdraw" just confirms intent — the row stays pending
//     so the bot's auto-delivery (deliver_gift) or manual /gifts_done picks it
//     up. We only stamp meta.withdraw_requested so the queue is auditable.
//
// Ownership is taken from the SIGNED session (caller passes session.uid), never
// from the request body — you can only sell/withdraw your OWN item.
import 'server-only'

import type { PoolClient } from 'pg'
import { withTransaction } from './db'
import { ESHKI_PER_STAR, ITEM_SELL_RATE } from './economy-rules'

export type SellResult = {
  status: 'ok' | 'not_found' | 'not_pending' | 'no_value'
  amount?: number
  balance?: number | null
  giftCode?: string | null
  error?: string
}

export type WithdrawResult = {
  status: 'ok' | 'not_found' | 'not_pending'
  giftCode?: string | null
  error?: string
}

type DeliveryRow = {
  id: number
  recipient_user_id: number
  item_code: string | null
  status: string
  transaction_id: number | null
  meta: Record<string, unknown> | null
}

type GiftRow = {
  code: string
  star_cost: number | null
  price_eshki: string | null
}

/** floor(full_value × ITEM_SELL_RATE) — порт _sell_value(). */
function sellValue(fullValue: number): number {
  return Math.floor(Math.max(0, fullValue) * ITEM_SELL_RATE)
}

/**
 * Полная внутренняя стоимость — порт _item_full_value():
 *  - покупка магазина (transaction_id != null): price_eshki;
 *  - приз кейса: star_cost × ESHKI_PER_STAR (каталог → слепок meta).
 */
function itemFullValue(d: DeliveryRow, g: GiftRow | null): number {
  const isShopPurchase = d.transaction_id !== null
  if (isShopPurchase && g) {
    return Math.max(0, g.price_eshki == null ? 0 : Number(g.price_eshki))
  }
  let starCost = g?.star_cost == null ? 0 : Number(g.star_cost)
  if (starCost <= 0) {
    const metaStar = (d.meta ?? {}).star_cost
    starCost = typeof metaStar === 'number' ? metaStar : 0
  }
  return Math.max(0, starCost) * ESHKI_PER_STAR
}

async function lockDelivery(
  client: PoolClient,
  deliveryKey: string,
): Promise<DeliveryRow | null> {
  const res = await client.query<DeliveryRow>(
    `SELECT id, recipient_user_id, item_code, status, transaction_id, meta
       FROM gift_transactions
      WHERE idempotency_key = $1
      FOR UPDATE`,
    [deliveryKey],
  )
  return res.rows[0] ?? null
}

async function getGift(
  client: PoolClient,
  code: string,
): Promise<GiftRow | null> {
  const res = await client.query<GiftRow>(
    `SELECT code, star_cost, price_eshki::text AS price_eshki
       FROM gift_catalog WHERE code = $1`,
    [code],
  )
  return res.rows[0] ?? null
}

/**
 * Продаёт pending-предмет игрока за ешки (P5). Идемпотентно, атомарно — порт
 * sell_gift(). Владелец берётся из сессии (userId), не из тела запроса.
 */
export async function sellInventoryItem(
  userId: number,
  deliveryKey: string,
): Promise<SellResult> {
  return withTransaction(async (client) => {
    const d = await lockDelivery(client, deliveryKey)
    if (!d) return { status: 'not_found', error: 'delivery_not_found' }
    if (d.recipient_user_id !== userId) {
      // Не твой предмет — ведём себя как «не найдено» (не раскрываем чужое).
      return { status: 'not_found', error: 'not_owner' }
    }
    if (d.status !== 'pending') {
      return { status: 'not_pending', giftCode: d.item_code }
    }

    const giftCode = d.item_code ?? ''
    const gift = giftCode ? await getGift(client, giftCode) : null
    const fullValue = itemFullValue(d, gift)
    const amount = sellValue(fullValue)
    if (amount <= 0) {
      return { status: 'no_value', giftCode, error: 'unknown_value' }
    }

    // Начислить ешки за продажу (reason='reward'), вернуть новый баланс.
    const upd = await client.query<{ balance: string }>(
      `UPDATE users SET balance = balance + $2 WHERE user_id = $1 RETURNING balance`,
      [userId, amount],
    )
    if (upd.rowCount === 0) {
      // Игрок обязан существовать (создаётся ботом). Создаём, чтобы не потерять.
      await client.query(
        `INSERT INTO users (user_id, balance) VALUES ($1, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      )
      await client.query(
        `UPDATE users SET balance = balance + $2 WHERE user_id = $1`,
        [userId, amount],
      )
    }
    const txMeta = {
      source: 'item_sell',
      gift: giftCode,
      full_value: fullValue,
      channel: 'site',
    }
    await client.query(
      `INSERT INTO transactions (user_id, amount, reason, meta)
       VALUES ($1, $2, 'reward', $3)`,
      [userId, amount, JSON.stringify(txMeta)],
    )

    // Освободить резерв каталога для покупки магазина (приз кейса не занимал).
    if (d.transaction_id !== null) {
      await client.query(
        `UPDATE gift_catalog SET reserved = reserved - 1
          WHERE code = $1 AND reserved > 0`,
        [giftCode],
      )
    }

    // Доставка → cancelled (предмет «израсходован» продажей).
    const meta = { ...(d.meta ?? {}), sold: true, sell_amount: amount, sell_full_value: fullValue, sell_channel: 'site' }
    await client.query(
      `UPDATE gift_transactions SET status = 'cancelled', meta = $2 WHERE id = $1`,
      [d.id, JSON.stringify(meta)],
    )

    const balRes = await client.query<{ balance: string }>(
      `SELECT balance FROM users WHERE user_id = $1`,
      [userId],
    )
    const balance = balRes.rows[0] ? Number(balRes.rows[0].balance) : null

    return { status: 'ok', amount, balance, giftCode }
  })
}

/**
 * Помечает pending-предмет к выдаче (P2). Предмет УЖЕ pending — реальную выдачу
 * делает бот (deliver_gift / ручной /gifts_done). Здесь только проставляем
 * meta.withdraw_requested, чтобы заявка была явной и попадала в очередь выдачи.
 * Идемпотентно: повторный вызов не двигает уже обработанную доставку.
 */
export async function withdrawInventoryItem(
  userId: number,
  deliveryKey: string,
): Promise<WithdrawResult> {
  return withTransaction(async (client) => {
    const d = await lockDelivery(client, deliveryKey)
    if (!d) return { status: 'not_found', error: 'delivery_not_found' }
    if (d.recipient_user_id !== userId) {
      return { status: 'not_found', error: 'not_owner' }
    }
    if (d.status !== 'pending') {
      return { status: 'not_pending', giftCode: d.item_code }
    }

    const meta = {
      ...(d.meta ?? {}),
      withdraw_requested: true,
      withdraw_channel: 'site',
      withdraw_at: new Date().toISOString(),
    }
    await client.query(
      `UPDATE gift_transactions SET meta = $2 WHERE id = $1`,
      [d.id, JSON.stringify(meta)],
    )
    return { status: 'ok', giftCode: d.item_code }
  })
}
