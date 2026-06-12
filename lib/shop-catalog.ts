// Server-only Shop catalog (read). Derives the STOREFRONT view-model over the
// existing gift_catalog columns — no new data, no writes (purchase lives in
// lib/shop-actions.ts). Every desirability signal the Shop shows (rarity tier,
// item class, category, limited, seasonal, "new", featured) is computed here so
// the UI stays dumb and consistent with Inventory/Cases.
//
// Boundary (AGENTS.md): bot owns the economy; this only reads gift_catalog.
import 'server-only'

import { query } from './db'
import { giftRarity } from './gifts-ux'
import { isLimitedGiftId } from './limited-gifts'
import { RARITY_ORDER } from './rarity'
import {
  SHOP_CATEGORY_META,
  SHOP_CATEGORY_ORDER,
  type ShopCategory,
  type ShopItem,
} from './shop-types'

// Re-export the shared view-model so existing `from '@/lib/shop-catalog'`
// imports keep working; the pure types live in shop-types (client-safe).
export {
  SHOP_CATEGORY_META,
  SHOP_CATEGORY_ORDER,
  type ShopCategory,
  type ShopItem,
}

/**
 * Explicit code→glyph map for the live catalog. Deterministic (no substring
 * guessing). Anything unknown falls back to the canonical class glyph via
 * ItemArt, so a new code never breaks — it just shows 🎁/⭐ until authored.
 */
const SHOP_GLYPH: Record<string, string> = {
  gift_heart: '❤️',
  gift_bear: '🧸',
  gift_box: '🎁',
  gift_rose: '🌹',
  gift_bouquet: '💐',
  gift_champagne: '🍾',
  gift_cake: '🎂',
  gift_rocket: '🚀',
  gift_spring_bear: '🌸',
  gift_valentine_heart: '💝',
  gift_clown_bear: '🤡',
  gift_lucky_bear: '🍀',
  gift_easter_bear: '🐣',
  gift_builder_bear: '👷',
  gift_xmas_tree: '🎄',
  gift_xmas_bear: '🎅',
  gift_valentine_bear: '💘',
  gift_ring: '💍',
  gift_diamond: '💎',
  gift_cup: '🏆',
  gift_premium_3m: '⭐',
  gift_premium_6m: '🌟',
}

/** Seasonal collectibles — recognised by code (canon seed has no meta flag). */
function isSeasonalCode(code: string): boolean {
  return /(xmas|tree|easter|spring|valentine|clown|lucky|halloween)/i.test(code)
}

/** One category per item, by code semantics (priority: premium→seasonal→…). */
function categorize(code: string, seasonal: boolean): ShopCategory {
  const c = code.toLowerCase()
  if (/premium/.test(c)) return 'premium'
  if (seasonal) return 'seasonal'
  if (/(heart|rose|bouquet|ring|diamond|love|kiss)/.test(c)) return 'romance'
  if (/(champagne|cake|bouquet|cup|trophy|birthday)/.test(c)) return 'celebration'
  return 'classic'
}

/**
 * Active Shop catalog as a desire-ranked storefront. Cheapest-DB-order is kept
 * for stable sort; the UI re-orders. Degrades to [] if gift_catalog is missing.
 * Star cost is never exposed — players see only the eshki price.
 */
export async function getShopCatalog(): Promise<ShopItem[]> {
  let rows: {
    code: string
    name: string
    description: string | null
    price_eshki: string
    stock: number | null
    reserved: number
    sold_count: number
    telegram_gift_id: string | null
    created_at: string | null
  }[]
  try {
    rows = await query(
      `SELECT code, name, description, price_eshki::text AS price_eshki,
              stock, reserved, sold_count, telegram_gift_id, created_at
         FROM gift_catalog
        WHERE is_active = true
        ORDER BY price_eshki, sort_order, name`,
    )
  } catch {
    return []
  }

  // "New" only fires when it's a real minority signal — otherwise (fresh seed
  // where everything shares one date) it would flood every card and mean nothing.
  const now = Date.now()
  const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
  const freshFlags = rows.map(
    (r) => r.created_at != null && now - new Date(r.created_at).getTime() <= NEW_WINDOW_MS,
  )
  const freshCount = freshFlags.filter(Boolean).length
  const newIsMeaningful = freshCount > 0 && freshCount <= Math.ceil(rows.length * 0.4)

  const out: ShopItem[] = []
  rows.forEach((r, i) => {
    const remaining = r.stock == null ? null : r.stock - r.reserved - r.sold_count
    if (remaining != null && remaining <= 0) return // sold out

    const priceEshki = Number(r.price_eshki)
    const limited = isLimitedGiftId(r.telegram_gift_id)
    const isPremium = /premium/i.test(r.code)
    const seasonal = isSeasonalCode(r.code)

    out.push({
      code: r.code,
      name: r.name,
      description: r.description,
      priceEshki,
      remaining,
      // Canonical rarity — identical to Inventory: Premium is the mythic top
      // tier; everything else tiers by value with a bump for limiteds.
      rarity: isPremium ? 'mythic' : giftRarity(priceEshki, { limited }),
      itemClass: isPremium ? 'premium' : 'gift',
      glyph: SHOP_GLYPH[r.code] ?? (isPremium ? '⭐' : '🎁'),
      limited,
      seasonal,
      isNew: newIsMeaningful && freshFlags[i],
      category: categorize(r.code, seasonal),
      soldCount: r.sold_count,
    })
  })
  return out
}

/**
 * Pick the featured "objects of desire" for the hero rail: the most prestigious
 * and scarce items first. Pure ranking over the catalog — no extra data.
 */
export function pickFeatured(items: ShopItem[], limit = 5): ShopItem[] {
  const score = (it: ShopItem) =>
    RARITY_ORDER.indexOf(it.rarity) * 1000 +
    (it.limited ? 500 : 0) +
    (it.seasonal ? 100 : 0) +
    Math.min(it.priceEshki / 1000, 99)
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, limit)
}

/**
 * Gift codes the viewer already owns as PENDING (bought or won, awaiting the
 * player's decision in inventory). Lets Shop cards show "уже в инвентаре" so a
 * player doesn't blindly re-buy. Read-only; degrades to [] when unmigrated.
 */
export async function getOwnedGiftCodes(userId: number): Promise<string[]> {
  try {
    const rows = await query<{ item_code: string | null }>(
      `SELECT DISTINCT item_code
         FROM gift_transactions
        WHERE kind = 'tg_gift'
          AND recipient_user_id = $1
          AND status = 'pending'
          AND item_code IS NOT NULL`,
      [userId],
    )
    return rows.map((r) => r.item_code as string)
  } catch {
    return []
  }
}
