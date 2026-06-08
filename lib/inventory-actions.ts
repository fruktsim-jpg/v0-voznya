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
  // ok — заявка принята (флаг выставлен, выдаст воркер);
  // delivered — выдан сразу (бот подтвердил авто-выдачу);
  // pending — временная ошибка, повторит воркер;
  // cancelled — постоянная ошибка, оформлен возврат.
  status: 'ok' | 'delivered' | 'pending' | 'cancelled' | 'not_found' | 'not_pending'
  giftCode?: string | null
  error?: string
}


type DeliveryRow = {
  id: number
  // ВНИМАНИЕ: BIGINT-колонки node-postgres отдаёт СТРОКОЙ (oid 20), а не number.
  // Поэтому сравнивать с userId (number) можно только через Number()-приведение —
  // иначе строгое `!==` всегда истинно и владелец «не совпадает» (см. ownerMatches).
  recipient_user_id: string | number
  item_code: string | null
  // transaction_id тоже BIGINT → строка|null.
  transaction_id: string | number | null
  status: string
  meta: Record<string, unknown> | null
}

/** Владелец доставки == текущий игрок (с приведением BIGINT-строки к number). */
function ownerMatches(row: DeliveryRow, userId: number): boolean {
  return Number(row.recipient_user_id) === userId
}

/** Покупка магазина: есть денежная проводка (BIGINT-строка ИЛИ number, не null). */
function isShopPurchase(row: DeliveryRow): boolean {
  return row.transaction_id !== null && row.transaction_id !== undefined
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
 * Полная стоимость — порт _item_full_value() (Release 2.2): ЕДИНЫЙ курс
 * независимо от источника. База всегда цена магазина (price_eshki) — та же
 * сумма, что в инвентаре и в магазине. Фолбэк (price_eshki не задан):
 * star_cost × ESHKI_PER_STAR (каталог → слепок meta).
 */
function itemFullValue(d: DeliveryRow, g: GiftRow | null): number {
  const priceEshki = g?.price_eshki == null ? 0 : Number(g.price_eshki)
  if (priceEshki > 0) {
    return Math.max(0, priceEshki)
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
    if (!ownerMatches(d, userId)) {
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
    if (isShopPurchase(d)) {

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
    if (!ownerMatches(d, userId)) {
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

export type QueueGiftResult = {
  status: 'ok' | 'not_found' | 'not_pending'
  giftCode?: string | null
  error?: string
}

/**
 * Запасной путь для «Подарить другу», когда бот недоступен (unreachable).
 * Не делаем реальную Telegram-доставку здесь (её умеет только бот) — лишь
 * помечаем pending-доставку: получатель (``meta.gift_to``) + флаг очереди
 * (``meta.withdraw_requested``). Фоновый воркер бота заберёт и отправит
 * РЕАЛЬНЫЙ подарок этому получателю. Владелец — из подписанной сессии.
 */
export async function queueGiftToFriend(
  senderId: number,
  deliveryKey: string,
  recipientRaw: string,
): Promise<QueueGiftResult> {
  return withTransaction(async (client) => {
    const d = await lockDelivery(client, deliveryKey)
    if (!d) return { status: 'not_found', error: 'delivery_not_found' }
    if (!ownerMatches(d, senderId)) {
      return { status: 'not_found', error: 'not_owner' }
    }
    if (d.status !== 'pending') {
      return { status: 'not_pending', giftCode: d.item_code }
    }
    const meta = {
      ...(d.meta ?? {}),
      withdraw_requested: true,
      withdraw_channel: 'site',
      // Получатель реального подарка (резолв username→id сделает воркер бота).
      gift_to: recipientRaw.trim(),
      gift_to_requested_at: new Date().toISOString(),
    }
    await client.query(
      `UPDATE gift_transactions SET meta = $2 WHERE id = $1`,
      [d.id, JSON.stringify(meta)],
    )
    return { status: 'ok', giftCode: d.item_code }
  })
}

export type GiftTransferResult = {

  // ok — передан; recipient_* — кому ушёл (для подтверждения в UI).
  status:
    | 'ok'
    | 'not_found'
    | 'not_pending'
    | 'recipient_not_found'
    | 'self_transfer'
  giftCode?: string | null
  recipientUserId?: number | null
  recipientUsername?: string | null
  error?: string
}

/** Нормализует ввод получателя: @username | username | числовой Telegram ID. */
function parseRecipient(raw: string): { username?: string; userId?: number } {
  const v = raw.trim()
  if (/^\d{4,}$/.test(v)) return { userId: Number(v) }
  const uname = v.replace(/^@/, '').toLowerCase()
  return { username: uname }
}

/**
 * Передаёт pending-предмет другому игроку по @username или Telegram ID (P0).
 *
 * Универсально для ЛЮБОГО pending gift_transactions (Telegram Gift, Premium,
 * будущие товары): подарок ещё не выдан в Telegram, поэтому «передача» — это
 * переназначение получателя (recipient_user_id) на нового игрока. Дальше новый
 * владелец сам решает судьбу (Оставить / Вывести / Продать / Передать).
 *
 * Получатель должен существовать в users (быть в Возне). Нельзя передать самому
 * себе и не-pending предмет. Владелец — из подписанной сессии (senderId).
 * Идемпотентность через FOR UPDATE строки доставки.
 */
export async function giftInventoryItem(
  senderId: number,
  deliveryKey: string,
  recipientRaw: string,
): Promise<GiftTransferResult> {
  return withTransaction(async (client) => {
    const d = await lockDelivery(client, deliveryKey)
    if (!d) return { status: 'not_found', error: 'delivery_not_found' }
    if (!ownerMatches(d, senderId)) {
      return { status: 'not_found', error: 'not_owner' }
    }
    if (d.status !== 'pending') {
      return { status: 'not_pending', giftCode: d.item_code }
    }

    // Найти получателя по username или числовому id.
    const parsed = parseRecipient(recipientRaw)
    let recipient: { user_id: string; username: string | null } | null = null
    if (parsed.userId != null) {
      const r = await client.query<{ user_id: string; username: string | null }>(
        `SELECT user_id, username FROM users WHERE user_id = $1`,
        [parsed.userId],
      )
      recipient = r.rows[0] ?? null
    } else if (parsed.username) {
      const r = await client.query<{ user_id: string; username: string | null }>(
        `SELECT user_id, username FROM users WHERE lower(username) = $1`,
        [parsed.username],
      )
      recipient = r.rows[0] ?? null
    }
    if (!recipient) {
      return { status: 'recipient_not_found', giftCode: d.item_code }
    }

    const recipientUserId = Number(recipient.user_id)
    if (recipientUserId === senderId) {
      return { status: 'self_transfer', giftCode: d.item_code }
    }

    // Переназначаем получателя. Сбрасываем флаг вывода (новый владелец решит
    // сам) и пишем след передачи в meta для аудита.
    const meta = {
      ...(d.meta ?? {}),
      withdraw_requested: false,
      transferred_from: senderId,
      transferred_to: recipientUserId,
      transferred_at: new Date().toISOString(),
      transfer_channel: 'site',
    }
    await client.query(
      `UPDATE gift_transactions
          SET recipient_user_id = $2, meta = $3
        WHERE id = $1`,
      [d.id, recipientUserId, JSON.stringify(meta)],
    )

    return {
      status: 'ok',
      giftCode: d.item_code,
      recipientUserId,
      recipientUsername: recipient.username,
    }
  })
}


