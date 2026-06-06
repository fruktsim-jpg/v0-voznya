// Server-only read helpers for the public Gifts showcase. Talks to Postgres
// via `./db`. READ-ONLY: the site never sells or delivers gifts — the bot's
// buy_gift()/deliver_gift() are the single writers. This only displays the
// catalog so players can see what to save eshki for.
import 'server-only'

import { query } from './db'

export type ShowcaseGift = {
  code: string
  name: string
  description: string | null
  priceEshki: number
  // Remaining units (null = unlimited). Sold-out items are filtered out.
  remaining: number | null
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
  }[]
  try {
    rows = await query(
      `SELECT code, name, description, price_eshki::text AS price_eshki,
              stock, reserved, sold_count
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
    out.push({
      code: r.code,
      name: r.name,
      description: r.description,
      priceEshki: Number(r.price_eshki),
      remaining,
    })
  }
  return out
}
