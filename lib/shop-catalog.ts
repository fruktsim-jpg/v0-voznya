// Server-only Shop catalog (read). Derives the STOREFRONT view-model over
// gift_catalog, ENRICHED with the unified content system: when an authored
// `inventory_items` definition exists for the same code, its rarity / item
// class / collection / limited+supply / lifecycle status WIN over the legacy
// code-string heuristics. No authored row → identical legacy behavior (full
// backward compatibility). No new data is written; purchase lives in
// lib/shop-actions.ts and still locks gift_catalog.
//
// Boundary (AGENTS.md): bot owns the economy; this only READS. Authoring of
// inventory_items/collections is Pattern A (site-owned content catalog); this
// is the read side that lets the storefront finally express authored objects.
import 'server-only'

import { query } from './db'
import { giftRarity } from './gifts-ux'
import { isLimitedGiftId } from './limited-gifts'
import { RARITY_ORDER, type Rarity } from './rarity'
import { isLiveNow, type ContentStatus } from './admin/lifecycle'
import { featuredFor } from './featured'
import type { ItemClass } from './item-art/model'
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

/** A valid (non-empty) rarity tier name? Guards authored junk. */
function isRarity(v: string | null): v is Rarity {
  return v != null && (RARITY_ORDER as readonly string[]).includes(v)
}

type CatalogRow = {
  code: string
  name: string
  description: string | null
  price_eshki: string
  stock: number | null
  reserved: number
  sold_count: number
  telegram_gift_id: string | null
  created_at: string | null
  // --- enrichment from the authored content system (LEFT JOIN, all nullable) ---
  authored_name: string | null
  authored_description: string | null
  authored_rarity: string | null
  authored_class: string | null
  authored_collection: string | null
  authored_limited: boolean | null
  authored_max_supply: number | null
  authored_status: string | null
  authored_available_from: string | null
  authored_available_until: string | null
  collection_name: string | null
}

/**
 * Active Shop catalog as a desire-ranked storefront, ITEM-AWARE. gift_catalog
 * stays the purchasable source of truth; we LEFT JOIN the authored
 * `inventory_items` definition (+ its collection) so authored objects express
 * their real rarity / class / collection / scarcity / lifecycle. Unauthored
 * rows fall back to the legacy heuristics → identical to before.
 *
 * Lifecycle gating: if an authored definition exists but is NOT live right now
 * (draft/review/retired/archived, or a scheduled/closed availability window),
 * the storefront row is hidden — authoring controls shop visibility. gift_catalog
 * rows with no authored definition are always shown (legacy behavior preserved).
 *
 * Degrades to [] if gift_catalog is missing; degrades to legacy-only if the
 * authored tables aren't migrated yet (the JOIN is wrapped). Star cost is never
 * exposed — players see only the eshki price.
 */
export async function getShopCatalog(): Promise<ShopItem[]> {
  let rows: CatalogRow[]
  try {
    rows = await query<CatalogRow>(
      `SELECT g.code, g.name, g.description, g.price_eshki::text AS price_eshki,
              g.stock, g.reserved, g.sold_count, g.telegram_gift_id, g.created_at,
              i.name            AS authored_name,
              i.description     AS authored_description,
              i.rarity          AS authored_rarity,
              i.type            AS authored_class,
              i.collection_code AS authored_collection,
              i.is_limited      AS authored_limited,
              i.max_supply      AS authored_max_supply,
              i.status          AS authored_status,
              i.available_from  AS authored_available_from,
              i.available_until AS authored_available_until,
              c.name            AS collection_name
         FROM gift_catalog g
         LEFT JOIN inventory_items i ON i.code = g.code
         LEFT JOIN collections c     ON c.code = i.collection_code
        WHERE g.is_active = true
        ORDER BY g.price_eshki, g.sort_order, g.name`,
    )
  } catch {
    // Authored tables not migrated (or JOIN unsupported) → fall back to the
    // legacy gift_catalog-only read so the shop never goes dark.
    try {
      const legacy = await query<CatalogRow>(
        `SELECT code, name, description, price_eshki::text AS price_eshki,
                stock, reserved, sold_count, telegram_gift_id, created_at,
                NULL AS authored_name, NULL AS authored_description,
                NULL AS authored_rarity, NULL AS authored_class,
                NULL AS authored_collection, NULL::boolean AS authored_limited,
                NULL::int AS authored_max_supply, NULL AS authored_status,
                NULL AS authored_available_from, NULL AS authored_available_until,
                NULL AS collection_name
           FROM gift_catalog
          WHERE is_active = true
          ORDER BY price_eshki, sort_order, name`,
      )
      rows = legacy
    } catch {
      return []
    }
  }

  // "New" only fires when it's a real minority signal — otherwise (fresh seed
  // where everything shares one date) it would flood every card and mean nothing.
  const now = Date.now()
  const nowDate = new Date(now)
  const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
  const freshFlags = rows.map(
    (r) => r.created_at != null && now - new Date(r.created_at).getTime() <= NEW_WINDOW_MS,
  )
  const freshCount = freshFlags.filter(Boolean).length
  const newIsMeaningful = freshCount > 0 && freshCount <= Math.ceil(rows.length * 0.4)

  const out: ShopItem[] = []
  rows.forEach((r, i) => {
    const authored = r.authored_status != null

    // Lifecycle gate: an authored-but-not-live definition hides the row. A row
    // with no authored definition is always shown (legacy compatibility).
    if (authored) {
      const status = r.authored_status as ContentStatus
      if (!isLiveNow(status, r.authored_available_from, r.authored_available_until, nowDate)) {
        return
      }
    }

    // Scarcity: authored max_supply is the cap when present; otherwise the
    // gift_catalog stock pool. Remaining ≤ 0 → sold out (hidden).
    const cap = authored && r.authored_max_supply != null ? r.authored_max_supply : r.stock
    const remaining = cap == null ? null : cap - r.reserved - r.sold_count
    if (remaining != null && remaining <= 0) return // sold out

    const priceEshki = Number(r.price_eshki)
    const isPremium = /premium/i.test(r.code)

    // limited: authored flag wins, else the hardcoded limited-gift set.
    const limited =
      authored && r.authored_limited != null
        ? r.authored_limited
        : isLimitedGiftId(r.telegram_gift_id)

    // seasonal: authored collection kind/event → handled via collection; else
    // code heuristic. (Authored 'event' class also counts as seasonal-ish.)
    const seasonal = (authored && r.authored_class === 'event') || isSeasonalCode(r.code)

    // rarity: authored tier wins; else the value-based heuristic (Premium=mythic).
    const rarity: Rarity =
      authored && isRarity(r.authored_rarity)
        ? r.authored_rarity
        : isPremium
          ? 'mythic'
          : giftRarity(priceEshki, { limited })

    // itemClass: authored class (validated) wins; else premium/gift split.
    const itemClass: ItemClass =
      authored && r.authored_class
        ? (r.authored_class as ItemClass)
        : isPremium
          ? 'premium'
          : 'gift'

    out.push({
      code: r.code,
      // Authored name/description (if the owner renamed it in the builder) win.
      name: r.authored_name ?? r.name,
      description: r.authored_description ?? r.description,
      priceEshki,
      remaining,
      rarity,
      itemClass,
      glyph: SHOP_GLYPH[r.code] ?? (isPremium ? '⭐' : '🎁'),
      limited,
      seasonal,
      isNew: newIsMeaningful && freshFlags[i],
      category: categorize(r.code, seasonal),
      soldCount: r.sold_count,
      collectionCode: authored ? r.authored_collection : null,
      collectionName: authored ? r.collection_name : null,
      authored,
    })
  })
  return out
}

/**
 * Pick the featured "objects of desire" for the hero rail: the most prestigious
 * and scarce items first. Pure ranking over the catalog — no extra data. Used as
 * the FALLBACK when no authored SHOP_HERO slots exist (see getShopFeatured).
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
 * The shop hero rail, AUTHORED-FIRST. Consults the unified Featured engine for
 * the `SHOP_HERO` surface: any authored slot pointing at an item/gift code that
 * is present and live in the storefront is promoted, in the owner's priority
 * order. The rail is then topped up with the heuristic `pickFeatured` ranking so
 * the hero is never empty. No authored slots → pure heuristic (legacy behavior).
 *
 * This is the bridge the audit called for: the same `featured_slots` engine that
 * already powers HOME/CASES/PLAY now powers the storefront — featuring becomes an
 * authored act, not a request-time guess.
 */
export async function getShopFeatured(catalog: ShopItem[], limit = 5): Promise<ShopItem[]> {
  const byCode = new Map(catalog.map((it) => [it.code, it]))

  // Authored SHOP_HERO slots (item/gift refs), priority-ordered + window-filtered.
  let authored: ShopItem[] = []
  try {
    const slots = await featuredFor('SHOP_HERO')
    const seen = new Set<string>()
    for (const slot of slots) {
      if (slot.ref_type !== 'item' && slot.ref_type !== 'gift') continue
      const it = byCode.get(slot.ref_code)
      if (it && !seen.has(it.code)) {
        authored.push(it)
        seen.add(it.code)
      }
    }
  } catch {
    authored = []
  }

  if (authored.length >= limit) return authored.slice(0, limit)

  // Top up with the heuristic ranking, skipping anything already promoted.
  const taken = new Set(authored.map((it) => it.code))
  const filler = pickFeatured(catalog, catalog.length).filter((it) => !taken.has(it.code))
  return [...authored, ...filler].slice(0, limit)
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
