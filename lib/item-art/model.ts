// =============================================================================
// VOZNYA — ITEM ART: canonical item model + render contract (P0 infrastructure)
// =============================================================================
//
// WHAT THIS IS
//   The single platform-level definition of "what a desirable thing is" in
//   VOZNYA, plus the contract for how its ART is resolved. Cases, Inventory,
//   Shop, Collection, Profile, Home, Live Feed, Play Hub and (future) Command
//   Center all build on THIS, not on per-screen conventions.
//
// WHAT THIS IS NOT
//   - Not a DB schema. We do NOT touch the read-only bot tables. Art is mapped
//     by stable `code` via a static manifest (see lib/item-art/manifest.ts).
//   - Not content. This file defines the SYSTEM; assets arrive later (P1+).
//
// DESIGN RULES (must survive 2 years of product growth)
//   1. Items are referenced by a STABLE CODE (`inventory_items.code`,
//      `gift_catalog.code`, `case_definitions.item_code`,
//      `case_rewards.reward_item_code`). Art binds to the code, never to a row id
//      or an ownership instance.
//   2. RARITY is the unified value language (lib/rarity.ts, 6 tiers). Art rides
//      on top of rarity; rarity is never re-invented per surface.
//   3. Rendering is PROGRESSIVE: unique art → templated art → glyph → box. A
//      missing asset is never a broken state.
//   4. The model is authored as if the Command Center already exists: every
//      field here is something a future "Create Item" form would fill in.
//
// =============================================================================

import type { Rarity } from '@/lib/rarity'
// Re-export so sibling modules (manifest.ts) can import Rarity from the model
// barrel without reaching into lib/rarity directly.
export type { Rarity }

// -----------------------------------------------------------------------------
// 1. ITEM CLASS — the canonical taxonomy of "kinds of thing"
// -----------------------------------------------------------------------------
//
// This is the platform answer to "what types exist". It supersets today's
// `inventory_items.type`, the gift kinds, and case rewards into ONE enum that
// every system shares. New game systems (Play Hub modes, Duels stakes, etc.)
// classify their objects here rather than inventing parallel type strings.

export type ItemClass =
  // Cosmetics — worn/equipped identity objects (no consumption)
  | 'cosmetic' //   generic cosmetic
  | 'title' //      a player title
  | 'badge' //      a badge
  | 'frame' //      an avatar frame
  | 'avatar' //     an avatar
  // Collectibles — owned-for-status objects
  | 'collectible' // a collection piece (set member)
  | 'event' //      an event/seasonal object
  // Gifts — Telegram gift economy objects
  | 'gift' //       a Telegram gift
  | 'premium' //    Telegram Premium grant
  // Functional — objects that DO something
  | 'case' //       an openable case (its own "box art")
  | 'key' //        a key that opens cases
  | 'currency' //   eshki / stars payout (rendered as a coin, not unique art)

/**
 * How a class behaves with respect to ownership lifecycle. This is the
 * canonical answer to "consumable vs permanent" and drives inventory UX
 * (sellable, stackable, equippable) independent of art.
 */
export type ItemDurability =
  | 'permanent' //   stays owned: cosmetics, collectibles, premium grants
  | 'consumable' //  spent on use: cases (opened), keys (used), currency

/** The canonical durability of each class. Single source of truth. */
export const CLASS_DURABILITY: Record<ItemClass, ItemDurability> = {
  cosmetic: 'permanent',
  title: 'permanent',
  badge: 'permanent',
  frame: 'permanent',
  avatar: 'permanent',
  collectible: 'permanent',
  event: 'permanent',
  gift: 'permanent',
  premium: 'permanent',
  case: 'consumable',
  key: 'consumable',
  currency: 'consumable',
}

/** Whether a class can be worn in an equip slot (drives the "equipped" badge). */
export const CLASS_EQUIPPABLE: Record<ItemClass, boolean> = {
  cosmetic: true,
  title: true,
  badge: true,
  frame: true,
  avatar: true,
  collectible: false,
  event: false,
  gift: false,
  premium: false,
  case: false,
  key: false,
  currency: false,
}

// -----------------------------------------------------------------------------
// 2. SOURCE — where an owned thing came from
// -----------------------------------------------------------------------------
//
// Canonical answer to "what is a Source". Used for provenance lines ("выбито из
// кейса", "куплено в магазине", "награда за достижение") and for filtering. An
// item's CODE is constant; its SOURCE is a property of how a specific player
// acquired it.

export type ItemSource =
  | 'case' //        opened from a case
  | 'shop' //        bought in the shop
  | 'achievement' // granted by an achievement
  | 'season' //      seasonal reward
  | 'gift' //        received as a gift from another player / system
  | 'catalog' //     base catalog / admin grant
  | 'unknown'

export const SOURCE_LABELS: Record<ItemSource, string> = {
  case: 'Из кейса',
  shop: 'Из магазина',
  achievement: 'За достижение',
  season: 'Сезонная награда',
  gift: 'Подарок',
  catalog: 'Каталог',
  unknown: 'Источник неизвестен',
}

// -----------------------------------------------------------------------------
// 3. THE ITEM DEFINITION — the canonical object (what a Command Center creates)
// -----------------------------------------------------------------------------
//
// This is the shape the future "Create Item" form produces and the shape every
// system reasons about. It is intentionally DATA-SOURCE-AGNOSTIC: it can be
// hydrated from inventory_items, gift_catalog, case_rewards, or a future
// Command-Center-authored record, because all of those carry a `code`, a name,
// and a rarity.
//
// NOTE: this is the *definition* (the template/catalog identity), NOT an owned
// instance. Ownership is modeled separately (§4).

export type ItemDefinition = {
  /** Stable platform key. Binds art, collection membership, availability. */
  code: string
  name: string
  class: ItemClass
  rarity: Rarity
  description?: string | null
  /** Logical collection this item belongs to, if any (set membership). */
  collectionCode?: string | null
  /** Series size for "N of M" collection display, if part of a numbered set. */
  seriesTotal?: number | null
  /** Can this item move between players? (gifts/most collectibles: yes) */
  tradeable?: boolean
  /** Is this a scarce/limited object? (drives "Лимитка" treatment) */
  limited?: boolean
  /** Internal reference value in eshki (0 / null when purely cosmetic). */
  refValue?: number | null
}

// -----------------------------------------------------------------------------
// 4. OWNERSHIP — a player's relationship to an item definition
// -----------------------------------------------------------------------------
//
// Canonical answer to "what is Ownership". An OwnedItem is an ItemDefinition the
// player HAS, with instance-level facts (how many, equipped, when, from where).
// Art is resolved from `code` (the definition); ownership never affects which
// art shows — only locked/owned STATE does.

export type OwnedItem = ItemDefinition & {
  quantity: number
  equipped: boolean
  source: ItemSource
  acquiredAt: string | null
  /** Pending (e.g. undelivered gift) vs settled in the vault. */
  pending?: boolean
}

// -----------------------------------------------------------------------------
// 5. REWARD — a potential/awarded item (the bridge to Cases, Play Hub, Achv.)
// -----------------------------------------------------------------------------
//
// Canonical answer to "what is a Reward". A Reward is a *reference* to an item
// (or currency) that MAY be granted, with drop economics attached. Cases,
// achievements, seasons and future Play Hub modes all express their payouts as
// Rewards. A Reward points at a `code` (or is currency) — so reward art is the
// same art as the item it grants. One object, many contexts.

export type ItemReward = {
  kind: 'item' | 'currency' | 'gift'
  /** For item/gift rewards: the item definition code. */
  code?: string | null
  name: string
  rarity: Rarity
  /** Currency amount, or item quantity. */
  amount?: number | null
  /** Drop weight / probability metadata (presentational only here). */
  chance?: number | null
  isJackpot?: boolean
  limited?: boolean
}

// -----------------------------------------------------------------------------
// 6. ART RESOLUTION CONTRACT — the one path every visual flows through
// -----------------------------------------------------------------------------
//
// `ItemArtResolution` is what the resolver (lib/item-art/resolve.ts) returns and
// what <ItemArt> consumes. Every surface — Cases, Inventory, Shop, Feed, Profile,
// Play Hub — renders items by resolving a code (or a minimal descriptor) into
// this, then handing it to <ItemArt>. NO surface builds its own emoji/border.
//
// The fallback hierarchy is encoded by `tier`:
//   'unique'   — a hand-authored asset exists for this exact code
//   'template' — composed from a class base + rarity finish (the long tail)
//   'glyph'    — no asset; a class/rarity-appropriate glyph on a rarity capsule
//   'box'      — ultimate fallback ('📦')

export type ItemArtTier = 'unique' | 'template' | 'glyph' | 'box'

export type ItemArtResolution = {
  /** Image URL when tier is 'unique' or 'template'; null for glyph/box. */
  src: string | null
  /** Fallback glyph (emoji or icon name) when there's no image. */
  glyph: string | null
  rarity: Rarity
  tier: ItemArtTier
  /** Low-quality placeholder (blurhash/dataURL) for premium image loading. */
  placeholder?: string | null
  /** Echoed for downstream styling decisions (e.g. equip slot affordances). */
  itemClass?: ItemClass | null
}

/** Minimal descriptor a surface passes to the resolver when it has no full def. */
export type ItemArtRef = {
  code?: string | null
  itemClass?: ItemClass | null
  rarity?: Rarity | null
  /** Explicit glyph override (e.g. feed event emoji) used only as glyph fallback. */
  glyph?: string | null
}
