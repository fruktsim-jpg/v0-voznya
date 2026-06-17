// Pure, testable gift-value math — a faithful port of the bot's _item_full_value
// + _sell_value (voznya-bot/app/features/gifts/service.py). Kept separate from
// inventory-actions.ts (server-only + DB) so the money formula can be unit-tested
// for bot↔site parity without a database. inventory-actions delegates here, so
// pinning these functions pins the real sell path.
import { ESHKI_PER_STAR, ITEM_SELL_RATE } from './economy-rules'

/** floor(full_value × ITEM_SELL_RATE), never negative. Port of _sell_value. */
export function sellValue(fullValue: number): number {
  return Math.floor(Math.max(0, fullValue) * ITEM_SELL_RATE)
}

/**
 * Full internal value of a gift item (Release 2.2 single rate). Port of
 * _item_full_value: the base is ALWAYS the shop price (price_eshki) regardless
 * of source (shop purchase OR case prize). Fallback when price_eshki is unset:
 * star_cost × ESHKI_PER_STAR, taking star_cost from the catalog first, then from
 * the delivery's meta snapshot (catalog row may have been deleted).
 */
export function itemFullValue(
  priceEshki: number | string | null | undefined,
  starCost: number | string | null | undefined,
  metaStarCost?: unknown,
): number {
  const price = priceEshki == null ? 0 : Number(priceEshki)
  if (price > 0) return Math.max(0, price)

  let stars = starCost == null ? 0 : Number(starCost)
  if (stars <= 0) {
    stars = typeof metaStarCost === 'number' ? metaStarCost : 0
  }
  return Math.max(0, stars) * ESHKI_PER_STAR
}
