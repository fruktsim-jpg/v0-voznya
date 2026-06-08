// Server-only read helpers for the public Gifts showcase. Talks to Postgres
// via `./db`. READ-ONLY: the site never sells or delivers gifts — the bot's
// buy_gift()/deliver_gift() are the single writers. This only displays the
// catalog so players can see what to save eshki for.
import 'server-only'

import { query } from './db'
import { giftRarity, giftIcon } from './gifts-ux'
import { isLimitedGiftId } from './limited-gifts'
import type { Rarity } from './rarity'


export type ShowcaseGift = {
  code: string
  name: string
  description: string | null
  priceEshki: number
  // Remaining units (null = unlimited). Sold-out items are filtered out.
  remaining: number | null
  // Производные для коллекционной витрины (без новых данных).
  rarity: Rarity
  limited: boolean
  soldCount: number
  icon: string
}


/**
 * Active gift catalog for the public showcase: in-stock, active positions,
 * cheapest first. Degrades to an empty list if gift_catalog is not migrated
 * (migration 0018). Star cost is intentionally NOT exposed publicly — players
 * see only the eshki price.
 */
export async function getShowcaseGifts(): Promise<ShowcaseGift[]> {
  let rows: {
    code: string
    name: string
    description: string | null
    price_eshki: string
    stock: number | null
    reserved: number
    sold_count: number
    telegram_gift_id: string | null
  }[]
  try {
    rows = await query(
      `SELECT code, name, description, price_eshki::text AS price_eshki,
              stock, reserved, sold_count, telegram_gift_id
         FROM gift_catalog
        WHERE is_active = true
        ORDER BY price_eshki, sort_order, name`,
    )
  } catch {
    return []
  }

  const out: ShowcaseGift[] = []
  for (const r of rows) {
    const remaining =
      r.stock == null ? null : r.stock - r.reserved - r.sold_count
    if (remaining != null && remaining <= 0) continue // sold out
    const priceEshki = Number(r.price_eshki)
    // Лимитность — по канону telegram_gift_id (единый источник истины), а НЕ по
    // наличию stock: у сезонных collectible-подарков stock=NULL.
    const limited = isLimitedGiftId(r.telegram_gift_id)

    out.push({
      code: r.code,
      name: r.name,
      description: r.description,
      priceEshki,
      remaining,
      limited,
      soldCount: r.sold_count,
      rarity: giftRarity(priceEshki, { limited }),
      icon: giftIcon(r.code),
    })
  }
  return out
}


