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
    // P0 PROOF-OF-PIPELINE sample (the only authored asset). Demonstrates that
    // populating one entry lights up every surface that renders this code —
    // inventory grid, inspect sheet, showcase, profile collection. Replace /
    // remove freely; real P1 dream items land here the same way.
    relic_zwolle: { src: '/items/_sample_relic.svg', authored: true },
  },
  templates: {},
}

/** Look up a unique asset for a code. Returns null when none is authored. */
export function manifestAsset(code: string | null | undefined): ManifestAsset | null {
  if (!code) return null
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
