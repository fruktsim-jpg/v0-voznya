// =============================================================================
// VOZNYA — ITEM ART: manifest contract (P0 infrastructure)
// =============================================================================
//
// The manifest is the SINGLE SOURCE OF TRUTH for which art an item code gets.
// It is a static, code-keyed lookup that ships with the app — deliberately NOT
// a DB table, so it crosses no read-only bot-DB boundary (AGENTS.md). A future
// Command Center writes this same shape (upload PNG → assign code → publish),
// so the runtime contract and the authoring contract are identical.
//
// LAYERS THE MANIFEST EXPRESSES (matches the pipeline plan):
//   - `unique`   : a hand-authored asset bound to one exact code (P1 dream items)
//   - `template` : a class base + rarity finish, reused across the long tail (P4)
//   Templates mean hundreds of items render WITHOUT hundreds of unique assets.
//
// RUNTIME SHAPE: the manifest is loaded once (build-time import or a single fetch
// of /items/manifest.json) and consulted synchronously by the resolver. No
// per-item network calls.
//
// =============================================================================

import type { ItemClass, Rarity } from '@/lib/item-art/model'

/** A single hand-authored asset entry, keyed by item code. */
export type ManifestAsset = {
  /** Public URL (e.g. /items/relic_zwolle.webp). */
  src: string
  /** Optional low-quality placeholder (blurhash/dataURL) for smooth loading. */
  placeholder?: string
  /** Optional: marks this as the authoritative art (vs an auto template). */
  authored?: boolean
}

/**
 * A template entry: art derived from an item's CLASS, finished by RARITY. One
 * template covers every item of that class that lacks a unique asset. This is
 * the mechanism that bounds the content burden.
 *
 * `byRarity` lets a class swap base art per tier (e.g. a matte vs foil badge);
 * `base` is the single fallback when a tier-specific asset isn't provided.
 */
export type ManifestTemplate = {
  base?: string
  byRarity?: Partial<Record<Rarity, string>>
  placeholder?: string
}

export type ItemArtManifest = {
  /** Manifest schema version — lets the Command Center evolve it safely. */
  version: number
  /** Per-code unique assets. Highest priority in resolution. */
  assets: Record<string, ManifestAsset>
  /** Per-class templates. Used when no unique asset exists for a code. */
  templates: Partial<Record<ItemClass, ManifestTemplate>>
}

/**
 * The live manifest.
 *
 * P0 ships it EMPTY (zero assets, zero templates) on purpose: the whole render
 * funnel must degrade gracefully to glyphs with no content. As P1+ assets land
 * in `public/items/`, entries are added here (by hand now, by the Command Center
 * later) and they light up everywhere at once — no per-surface code change.
 *
 * Example of the shape a future entry takes (commented; do NOT add fake art):
 *
 *   assets: {
 *     relic_zwolle:  { src: '/items/relic_zwolle.webp',  authored: true },
 *     case_jackpot:  { src: '/items/case_jackpot.webp',  authored: true },
 *   },
 *   templates: {
 *     badge: { base: '/items/_tpl/badge.webp',
 *              byRarity: { legendary: '/items/_tpl/badge_legendary.webp' } },
 *     case:  { base: '/items/_tpl/case.webp' },
 *   },
 */
export const ITEM_ART_MANIFEST: ItemArtManifest = {
  version: 1,
  assets: {
    // ── P1 DREAM ITEMS ─────────────────────────────────────────────────────
    // The premium vertical slice. Every code below is REAL (verified against
    // case_definitions / case_rewards / gift_catalog / inventory_items), so the
    // art lands on live screens — cases, shop, inventory, feed, profile —
    // through the P0 funnel with no per-surface code change.
    //
    // The desire ladder, top-down:
    badge_founder: { src: '/items/badge_founder.svg', authored: true }, // #1 mythic, founders set
    gift_premium_6m: { src: '/items/gift_premium_6m.svg', authored: true }, // #2 the jackpot gift
    relic_zwolle: { src: '/items/relic_zwolle.svg', authored: true }, // #3 legendary city relic
    gift_diamond: { src: '/items/gift_diamond.svg', authored: true }, // #4 shop centerpiece
    gift_ring: { src: '/items/gift_ring.svg', authored: true }, // #5 shop, "I gave this"
    relic_rotterdam: { src: '/items/relic_rotterdam.svg', authored: true }, // #6 epic city relic
    relic_amsterdam: { src: '/items/relic_amsterdam.svg', authored: true }, // #7 rare city relic

    // ── P1 CASE COVERS ─────────────────────────────────────────────────────
    // The "box art" that fixes the weak storefront. Real case_definitions codes.
    case_jackpot: { src: '/items/case_jackpot.svg', authored: true },
    case_premium: { src: '/items/case_premium.svg', authored: true },
    case_collector: { src: '/items/case_collector.svg', authored: true },
  },
  templates: {},
}

/** Look up a unique asset for a code. Returns null when none is authored. */
export function manifestAsset(code: string | null | undefined): ManifestAsset | null {
  if (!code) return null
  // Dev-only toggle to capture "before" (glyph-fallback) screenshots without
  // touching the manifest. Never set in production.
  if (process.env.NEXT_PUBLIC_ART_OFF === '1') return null
  return ITEM_ART_MANIFEST.assets[code] ?? null
}

/** Look up a class template, finished by rarity. Returns null when none exists. */
export function manifestTemplate(
  itemClass: ItemClass | null | undefined,
  rarity: Rarity,
): { src: string; placeholder?: string } | null {
  if (!itemClass) return null
  const tpl = ITEM_ART_MANIFEST.templates[itemClass]
  if (!tpl) return null
  const src = tpl.byRarity?.[rarity] ?? tpl.base
  if (!src) return null
  return { src, placeholder: tpl.placeholder }
}
