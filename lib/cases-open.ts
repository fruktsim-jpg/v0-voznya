// Server-only case opening — a faithful TypeScript port of the bot's
// open_case() (app/features/cases/service.py + rewards.py), running against the
// SAME Postgres database inside ONE transaction.
//
// Why this exists: the Mini App / site runs on Vercel and the bot on a separate
// VPS, so the site cannot reach the bot's internal HTTP API. Both already share
// one Postgres, and lib/db.ts exposes withTransaction(), so the site opens cases
// directly and atomically — no network bridge, no bot exposure.
//
// This MUST stay behavior-identical to the bot:
//   1. validate case (active + date window);
//   2. PRE-FLIGHT under row locks (FOR UPDATE) — key and/or currency — no writes;
//   3. weighted pick with a CSPRNG over available rewards (locked drop-list);
//   4. mutations that can no longer fail: consume key, burn currency
//      (transactions ledger), bump limited supply, grant reward, write the
//      case_openings ledger.
// Any throw rolls the whole transaction back (withTransaction does ROLLBACK).
//
// Currency reasons match app/core/economy_events.py: 'purchase' (open cost),
// 'reward' (currency reward). tg_gift rewards become a pending GiftTransaction —
// the exact same manual-delivery pipeline as the gift shop (/gifts_pending →
// /gifts_done), keyed by a unique idempotency_key.
import 'server-only'

import { randomInt, randomBytes } from 'crypto'
import type { PoolClient } from 'pg'
import { withTransaction } from './db'
import { pickIndexByRoll } from './cases-pick'

export type OpenStatus =
  | 'ok'
  | 'not_found'
  | 'inactive'
  | 'no_key'
  | 'not_enough'
  | 'empty'

export type OpenResult = {
  status: OpenStatus
  caseName?: string
  rewardKind?: string
  rewardItemCode?: string | null
  rewardItemName?: string | null
  rewardRarity?: string | null
  amount?: number | null
  qty?: number
  isJackpot?: boolean
  balance?: number | null
  deliveryKey?: string | null
}

const REWARD_KINDS_OPENABLE = ['item', 'currency', 'tg_gift']

type CaseRow = {
  item_code: string
  name: string
  open_cost_kind: string
  open_cost_amount: number
  consumes_key: boolean
  is_active: boolean
  starts_at: Date | null
  ends_at: Date | null
}

type RewardRow = {
  id: number
  reward_kind: string
  reward_item_code: string | null
  amount: number | null
  weight: number
  min_qty: number
  max_qty: number
  max_global_supply: number | null
  granted_count: number
  is_jackpot: boolean
}

/**
 * Weighted reward pick using a CSPRNG (crypto.randomInt). Selection rule lives
 * in cases-pick.ts (shared, unit-tested for bot parity). dropMult defaults to
 * 1.0 — see the parity note in cases-pick.ts.
 */
function pickReward(rewards: RewardRow[]): { reward: RewardRow; roll: number; total: number } {
  const eff = rewards.map((r) => r.weight)
  const total = eff.reduce((s, w) => s + w, 0)
  const roll = randomInt(0, total) // [0, total)
  const { index } = pickIndexByRoll(rewards, roll)
  return { reward: rewards[index], roll, total }
}

/**
 * Opens a case for `userId`. Fully atomic against the shared DB.
 * Behavior-identical to the bot's open_case().
 */
export async function openCase(
  userId: number,
  caseItemCode: string,
): Promise<OpenResult> {
  return withTransaction(async (client) => {
    // --- 1. Load + validate case --------------------------------------------
    const caseRes = await client.query<CaseRow>(
      `SELECT item_code, name, open_cost_kind, open_cost_amount,
              consumes_key, is_active, starts_at, ends_at
         FROM case_definitions
        WHERE item_code = $1`,
      [caseItemCode],
    )
    const c = caseRes.rows[0]
    if (!c) return { status: 'not_found' }

    const now = new Date()
    if (!c.is_active) return { status: 'inactive', caseName: c.name }
    if (c.starts_at && c.starts_at > now) return { status: 'inactive', caseName: c.name }
    if (c.ends_at && c.ends_at < now) return { status: 'inactive', caseName: c.name }

    const openCost = Number(c.open_cost_amount)
    const needsCurrency = c.open_cost_kind === 'currency' && openCost > 0

    // --- 2. PRE-FLIGHT under row locks, NO writes ---------------------------
    if (c.consumes_key) {
      const owned = await client.query<{ quantity: number }>(
        `SELECT quantity FROM inventory
          WHERE user_id = $1 AND item_code = $2
          FOR UPDATE`,
        [userId, c.item_code],
      )
      const qty = owned.rows[0]?.quantity ?? 0
      if (qty < 1) return { status: 'no_key', caseName: c.name }
    }

    if (needsCurrency) {
      const userRes = await client.query<{ balance: string }>(
        `SELECT balance FROM users WHERE user_id = $1 FOR UPDATE`,
        [userId],
      )
      const balance = userRes.rows[0] ? Number(userRes.rows[0].balance) : 0
      if (!userRes.rows[0] || balance < openCost) {
        return { status: 'not_enough', caseName: c.name }
      }
    }

    // --- 3. Weighted pick over available rewards (locked drop-list) ---------
    // Available = within optional supply limit. Lock the case's reward rows so
    // the limited-supply bump below is race-safe.
    const rewardsRes = await client.query<RewardRow>(
      `SELECT id, reward_kind, reward_item_code, amount, weight,
              min_qty, max_qty, max_global_supply, granted_count, is_jackpot
         FROM case_rewards
        WHERE case_item_code = $1
          AND (max_global_supply IS NULL OR granted_count < max_global_supply)
        ORDER BY id
        FOR UPDATE`,
      [caseItemCode],
    )
    const rewards = rewardsRes.rows.filter((r) =>
      REWARD_KINDS_OPENABLE.includes(r.reward_kind),
    )
    if (rewards.length === 0) {
      // Misconfigured / exhausted case. Throw → rollback (nothing burned yet).
      throw new Error(`case '${caseItemCode}' has no available rewards`)
    }

    const { reward, roll, total } = pickReward(rewards)
    const qty =
      reward.min_qty === reward.max_qty
        ? reward.min_qty
        : reward.min_qty + randomInt(0, reward.max_qty - reward.min_qty + 1)

    // --- 4. Mutations (can no longer fail — resources locked above) ---------
    // 4a. Consume key.
    if (c.consumes_key) {
      const upd = await client.query(
        `UPDATE inventory SET quantity = quantity - 1
          WHERE user_id = $1 AND item_code = $2 AND quantity >= 1`,
        [userId, c.item_code],
      )
      if (upd.rowCount === 0) {
        throw new Error(`key consume failed after pre-flight for '${caseItemCode}'`)
      }
      await client.query(
        `DELETE FROM inventory WHERE user_id = $1 AND item_code = $2 AND quantity <= 0`,
        [userId, c.item_code],
      )
      await client.query(
        `INSERT INTO inventory_history (user_id, item_code, delta, event, source, meta)
         VALUES ($1, $2, -1, 'use', 'case', $3)`,
        [userId, c.item_code, JSON.stringify({ reason: 'open_case' })],
      )
    }

    // 4b. Burn currency for the open cost (reason='purchase'), keep tx id.
    let openTxId: number | null = null
    if (needsCurrency) {
      const upd = await client.query<{ balance: string }>(
        `UPDATE users SET balance = balance - $2 WHERE user_id = $1 RETURNING balance`,
        [userId, openCost],
      )
      const tx = await client.query<{ id: number }>(
        `INSERT INTO transactions (user_id, amount, reason, meta)
         VALUES ($1, $2, 'purchase', $3) RETURNING id`,
        [userId, -openCost, JSON.stringify({ source: 'case_open', case: c.item_code })],
      )
      openTxId = tx.rows[0].id
      void upd
    }

    // 4c. Bump limited-supply counter.
    if (reward.max_global_supply !== null) {
      await client.query(
        `UPDATE case_rewards SET granted_count = granted_count + 1 WHERE id = $1`,
        [reward.id],
      )
    }

    // 4d. Grant the reward (single dispatch — mirror of grant_reward).
    const granted = await grantReward(client, {
      userId,
      rewardKind: reward.reward_kind,
      rewardItemCode: reward.reward_item_code,
      amount: reward.amount,
      qty,
      caseCode: c.item_code,
      rewardId: reward.id,
    })

    // 4e. Case opening ledger (fairness + reproducibility).
    const snapshot = rewards.map((r) => ({ reward_id: r.id, weight: r.weight }))
    await client.query(
      `INSERT INTO case_openings
         (user_id, case_item_code, reward_id, reward_kind, reward_item_code,
          amount, qty, roll, weight_snapshot, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        c.item_code,
        reward.id,
        granted.rewardKind,
        granted.rewardItemCode,
        granted.amount,
        granted.qty,
        roll,
        JSON.stringify({ total, rewards: snapshot }),
        openTxId,
      ],
    )

    // Pretty name/rarity (best-effort).
    let rewardItemName: string | null = null
    let rewardRarity: string | null = null
    if (granted.rewardKind === 'item' && granted.rewardItemCode) {
      const r = await client.query<{ name: string; rarity: string }>(
        `SELECT name, rarity FROM inventory_items WHERE code = $1`,
        [granted.rewardItemCode],
      )
      if (r.rows[0]) {
        rewardItemName = r.rows[0].name
        rewardRarity = r.rows[0].rarity
      }
    } else if (granted.rewardKind === 'tg_gift' && granted.rewardItemCode) {
      const r = await client.query<{ name: string }>(
        `SELECT name FROM gift_catalog WHERE code = $1`,
        [granted.rewardItemCode],
      )
      rewardItemName = r.rows[0]?.name ?? null
    }

    return {
      status: 'ok',
      caseName: c.name,
      rewardKind: granted.rewardKind,
      rewardItemCode: granted.rewardItemCode,
      rewardItemName,
      rewardRarity,
      amount: granted.amount,
      qty: granted.qty,
      isJackpot: reward.is_jackpot,
      balance: granted.newBalance,
      deliveryKey: granted.deliveryKey,
    }
  })
}

type GrantArgs = {
  userId: number
  rewardKind: string
  rewardItemCode: string | null
  amount: number | null
  qty: number
  caseCode: string
  rewardId: number
}

type GrantResult = {
  rewardKind: string
  rewardItemCode: string | null
  amount: number | null
  qty: number
  newBalance: number | null
  deliveryKey: string | null
}

/** Single reward dispatch — faithful port of grant_reward(). */
async function grantReward(client: PoolClient, a: GrantArgs): Promise<GrantResult> {
  const meta = { source: 'case', case: a.caseCode, reward_id: a.rewardId }

  if (a.rewardKind === 'currency') {
    if (a.amount === null || a.amount <= 0) {
      throw new Error('currency reward requires positive amount')
    }
    // Currency reward goes through the transactions ledger (reason='reward').
    const upd = await client.query<{ balance: string }>(
      `UPDATE users SET balance = balance + $2 WHERE user_id = $1 RETURNING balance`,
      [a.userId, a.amount],
    )
    if (upd.rowCount === 0) {
      // User must exist (created by the bot). Create to not lose the operation.
      await client.query(
        `INSERT INTO users (user_id, balance) VALUES ($1, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [a.userId],
      )
      const u2 = await client.query<{ balance: string }>(
        `UPDATE users SET balance = balance + $2 WHERE user_id = $1 RETURNING balance`,
        [a.userId, a.amount],
      )
      await client.query(
        `INSERT INTO transactions (user_id, amount, reason, meta)
         VALUES ($1, $2, 'reward', $3)`,
        [a.userId, a.amount, JSON.stringify(meta)],
      )
      return {
        rewardKind: 'currency',
        rewardItemCode: null,
        amount: a.amount,
        qty: 1,
        newBalance: Number(u2.rows[0].balance),
        deliveryKey: null,
      }
    }
    await client.query(
      `INSERT INTO transactions (user_id, amount, reason, meta)
       VALUES ($1, $2, 'reward', $3)`,
      [a.userId, a.amount, JSON.stringify(meta)],
    )
    return {
      rewardKind: 'currency',
      rewardItemCode: null,
      amount: a.amount,
      qty: 1,
      newBalance: Number(upd.rows[0].balance),
      deliveryKey: null,
    }
  }

  if (a.rewardKind === 'item') {
    if (!a.rewardItemCode) throw new Error('item reward requires reward_item_code')
    if (a.qty <= 0) throw new Error('item reward requires positive qty')
    // Item must exist in the catalog; copy its slot at grant time.
    const item = await client.query<{ slot: string | null }>(
      `SELECT slot FROM inventory_items WHERE code = $1`,
      [a.rewardItemCode],
    )
    if (item.rowCount === 0) throw new Error(`Unknown item_code: ${a.rewardItemCode}`)
    await client.query(
      `INSERT INTO inventory (user_id, item_code, slot, quantity, equipped, source)
       VALUES ($1, $2, $3, $4, false, 'reward')
       ON CONFLICT ON CONSTRAINT uq_inventory_user_item
       DO UPDATE SET quantity = inventory.quantity + $4`,
      [a.userId, a.rewardItemCode, item.rows[0].slot, a.qty],
    )
    await client.query(
      `INSERT INTO inventory_history (user_id, item_code, delta, event, source, meta)
       VALUES ($1, $2, $3, 'grant', 'case', $4)`,
      [a.userId, a.rewardItemCode, a.qty, JSON.stringify(meta)],
    )
    return {
      rewardKind: 'item',
      rewardItemCode: a.rewardItemCode,
      amount: null,
      qty: a.qty,
      newBalance: null,
      deliveryKey: null,
    }
  }

  if (a.rewardKind === 'tg_gift') {
    if (!a.rewardItemCode) {
      throw new Error('tg_gift reward requires reward_item_code (gift code)')
    }
    const gift = await client.query<{
      code: string
      star_cost: number | null
      telegram_gift_id: string | null
    }>(
      `SELECT code, star_cost, telegram_gift_id FROM gift_catalog WHERE code = $1`,
      [a.rewardItemCode],
    )
    if (gift.rowCount === 0) {
      throw new Error(`tg_gift reward references unknown gift '${a.rewardItemCode}'`)
    }
    const g = gift.rows[0]
    const idem = `casegift:${a.userId}:${randomBytes(8).toString('hex')}`
    const giftMeta = {
      source: 'case',
      gift: g.code,
      star_cost: g.star_cost,
      telegram_gift_id: g.telegram_gift_id,
      case: a.caseCode,
      reward_id: a.rewardId,
    }
    // Pending delivery — same lifecycle as the gift shop (manual /gifts_done).
    await client.query(
      `INSERT INTO gift_transactions
         (kind, gift_type, sender_user_id, recipient_user_id, item_code,
          quantity, status, idempotency_key, meta)
       VALUES ('tg_gift', 'system', NULL, $1, $2, 1, 'pending', $3, $4)`,
      [a.userId, g.code, idem, JSON.stringify(giftMeta)],
    )
    return {
      rewardKind: 'tg_gift',
      rewardItemCode: g.code,
      amount: null,
      qty: 1,
      newBalance: null,
      deliveryKey: idem,
    }
  }

  if (a.rewardKind === 'stars') {
    throw new Error("reward_kind 'stars' is not implemented yet")
  }
  throw new Error(`unknown reward_kind: ${a.rewardKind}`)
}
