// Server-only inventory reader for the player's own /inventory page.
//
// VOZNYA 2.2 — "items as full game objects". The inventory unifies EVERYTHING a
// player owns into one list, against the SAME Postgres the bot uses:
//
//   1. Stack items     — rows in `inventory` joined with the `inventory_items`
//                        catalog (cosmetics, case keys, collectibles).
//   2. Pending Gifts    — rows in `gift_transactions` with status='pending'
//                        (real Telegram Gifts / Premium won in a case or bought
//                        in the shop, not yet delivered). These are the items a
//                        player can Keep / Sell / Withdraw.
//
// READ-ONLY: this module never mutates. Mutations go through
// lib/inventory-actions.ts (sell / withdraw / retry), faithful ports of the
// bot's app/features/gifts/service.py. Both run against the shared DB because
// the site (Vercel) and the bot (VPS) cannot reach each other's process — the
// database is the single source of truth.
import 'server-only'

import { query } from './db'
import { giftRarity, giftIcon } from './gifts-ux'
import { ESHKI_PER_STAR, ITEM_SELL_RATE } from './economy-rules'
import { isLimitedGiftId } from './limited-gifts'
import type { Rarity } from './rarity'


// Какие предметы пользователь видит и какие действия доступны.
export type InventoryStackItem = {
  kind: 'stack'
  itemCode: string
  name: string
  rarity: string // catalog rarity key (common..legendary)
  type: string
  description: string | null
  quantity: number
  equipped: boolean
  acquiredAt: string | null
}

// Pending Telegram Gift / Premium как полноценный предмет инвентаря.
export type InventoryGiftItem = {
  kind: 'gift'
  // deliveryKey = gift_transactions.idempotency_key — ключ для sell/withdraw.
  deliveryKey: string
  itemCode: string
  name: string
  rarity: Rarity
  icon: string
  // Признак Premium (особые действия: активировать/подарить — пока вручную).
  isPremium: boolean
  // Лимитный (сезонный collectible) — по канону telegram_gift_id.
  limited: boolean
  // Полная внутренняя стоимость в ешках и сумма продажи (70%).
  value: number

  sellAmount: number
  // Источник: 'case' (приз кейса) | 'shop' (покупка магазина).
  source: 'case' | 'shop'
  status: 'pending'
  acquiredAt: string | null
}

export type InventoryItem = InventoryStackItem | InventoryGiftItem

export type InventoryView = {
  items: InventoryItem[]
  stackCount: number
  giftCount: number
}

/** floor(full_value × ITEM_SELL_RATE) — точный порт _sell_value() из бота. */
function sellValue(fullValue: number): number {
  return Math.floor(Math.max(0, fullValue) * ITEM_SELL_RATE)
}

/**
 * Полная стоимость pending-предмета в ешках — порт _item_full_value (Release 2.2):
 * ЕДИНЫЙ курс независимо от источника. База всегда цена магазина (price_eshki) —
 * та же сумма, что показана как «ценность» и как цена в магазине. Фолбэк, когда
 * price_eshki не задан: внутренняя стоимость star_cost × ESHKI_PER_STAR (каталог,
 * затем слепок meta). Так в магазине и при продаже игрок видит один и тот же курс.
 */
function itemFullValue(args: {
  priceEshki: number | null
  catalogStarCost: number | null
  metaStarCost: number | null
}): number {
  if ((args.priceEshki ?? 0) > 0) {
    return Math.max(0, args.priceEshki ?? 0)
  }
  const starCost = args.catalogStarCost ?? args.metaStarCost ?? 0
  return Math.max(0, starCost) * ESHKI_PER_STAR
}


/**
 * Собирает инвентарь игрока: стековые предметы + pending Gifts/Premium.
 * Деградирует до пустого списка, если таблицы ещё не мигрированы.
 */
export async function getInventory(userId: number): Promise<InventoryView> {
  const items: InventoryItem[] = []

  // --- 1. Стековые предметы (inventory ⋈ inventory_items) ------------------
  try {
    const stackRows = await query<{
      item_code: string
      quantity: string
      equipped: boolean
      acquired_at: Date | null
      name: string | null
      rarity: string | null
      type: string | null
      description: string | null
    }>(
      `SELECT inv.item_code, inv.quantity, inv.equipped, inv.acquired_at,
              cat.name, cat.rarity, cat.type, cat.description
         FROM inventory inv
         LEFT JOIN inventory_items cat ON cat.code = inv.item_code
        WHERE inv.user_id = $1
        ORDER BY inv.equipped DESC, inv.acquired_at DESC`,
      [userId],
    )
    for (const r of stackRows) {
      items.push({
        kind: 'stack',
        itemCode: r.item_code,
        name: r.name ?? r.item_code,
        rarity: r.rarity ?? 'common',
        type: r.type ?? 'cosmetic',
        description: r.description,
        quantity: Number(r.quantity) || 0,
        equipped: Boolean(r.equipped),
        acquiredAt: r.acquired_at ? new Date(r.acquired_at).toISOString() : null,
      })
    }
  } catch {
    // inventory не мигрирован — мягко деградируем.
  }

  // --- 2. Pending Telegram Gifts / Premium (gift_transactions) -------------
  try {
    const giftRows = await query<{
      idempotency_key: string
      item_code: string | null
      transaction_id: number | null
      meta: Record<string, unknown> | null
      created_at: Date | null
      gift_name: string | null
      price_eshki: string | null
      star_cost: number | null
      telegram_gift_id: string | null
    }>(
      `SELECT gt.idempotency_key, gt.item_code, gt.transaction_id, gt.meta,
              gt.created_at,
              gc.name AS gift_name, gc.price_eshki::text AS price_eshki,
              gc.star_cost, gc.telegram_gift_id
         FROM gift_transactions gt

         LEFT JOIN gift_catalog gc ON gc.code = gt.item_code
        WHERE gt.kind = 'tg_gift'
          AND gt.recipient_user_id = $1
          AND gt.status = 'pending'
        ORDER BY gt.created_at DESC`,
      [userId],
    )
    for (const r of giftRows) {
      const isShopPurchase = r.transaction_id !== null
      const meta = r.meta ?? {}
      const metaStarCost =
        typeof meta.star_cost === 'number' ? (meta.star_cost as number) : null
      const priceEshki = r.price_eshki == null ? null : Number(r.price_eshki)
      const fullValue = itemFullValue({
        priceEshki,
        catalogStarCost: r.star_cost == null ? null : Number(r.star_cost),
        metaStarCost,
      })

      const code = r.item_code ?? '?'
      const isPremium = /premium/i.test(code)
      // Лимитность — по канону telegram_gift_id (единый источник истины), а не
      // «всё pending лимитное», как было раньше.
      const limited = isLimitedGiftId(r.telegram_gift_id)
      items.push({
        kind: 'gift',
        deliveryKey: r.idempotency_key,
        itemCode: code,
        name: r.gift_name ?? code,
        // Premium — самый ценный тир (мифический); обычные/лимитные — по цене
        // с поднятием тира для лимитки.
        rarity: isPremium ? 'mythic' : giftRarity(fullValue, { limited }),
        icon: isPremium ? '⭐' : giftIcon(code),
        isPremium,
        limited,
        value: fullValue,

        sellAmount: sellValue(fullValue),
        source: isShopPurchase ? 'shop' : 'case',
        status: 'pending',
        acquiredAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      })
    }
  } catch {
    // gift_transactions не мигрирован — мягко деградируем.
  }

  const stackCount = items.filter((i) => i.kind === 'stack').length
  const giftCount = items.filter((i) => i.kind === 'gift').length
  return { items, stackCount, giftCount }
}
