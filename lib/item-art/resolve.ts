// =============================================================================
// VOZNYA — ITEM ART: resolver (P0 infrastructure)
// =============================================================================
//
// THE one function every surface uses to turn an item reference into renderable
// art. This is the "one source of truth" the platform requires: Cases, Inventory,
// Shop, Feed, Profile and (future) Play Hub all call `resolveItemArt(...)` and
// hand the result to <ItemArt>. No surface decides emoji/border/glow on its own.
//
// FALLBACK HIERARCHY (progressive, never a broken state):
//   1. unique   — manifest has a hand-authored asset for this exact `code`
//   2. template — manifest has a class template, finished by rarity
//   3. glyph    — a CLASS + RARITY appropriate emoji on a rarity capsule
//   4. box      — '📦'
//
// CANONICAL GLYPH LANGUAGE: today the codebase mixes emoji (inventory/gifts) and
// SVG Glyph names (cases). P0 unifies the *fallback* on ONE emoji language keyed
// by ItemClass, so every pre-art surface reads as one world. Surfaces may still
// pass an explicit `glyph` override (e.g. a feed event emoji) which wins over the
// class default but still loses to real art.
//
// PURE + SYNC + OWNERSHIP-SAFE: no data access, no writes, no ownership inputs.
// Art depends only on (code, class, rarity) — never on who owns the item.
//
// =============================================================================

import type { Rarity } from '@/lib/rarity'
import { manifestAsset, manifestTemplate } from '@/lib/item-art/manifest'
import type {
  ItemArtRef,
  ItemArtResolution,
  ItemClass,
  ItemDefinition,
} from '@/lib/item-art/model'

/**
 * Canonical fallback glyph per item class. ONE language for the pre-art world.
 * (Mirrors today's emoji choices so nothing regresses, but now centralized.)
 */
const CLASS_GLYPH: Record<ItemClass, string> = {
  cosmetic: '✨',
  title: '🏷',
  badge: '🎖',
  frame: '🖼',
  avatar: '👤',
  collectible: '💎',
  event: '🎉',
  gift: '🎁',
  premium: '⭐',
  case: '📦',
  key: '🔑',
  currency: '🪙',
}

function normRarity(r: Rarity | null | undefined): Rarity {
  return r ?? 'common'
}

/**
 * Resolve art for a minimal reference. The hot path used by surfaces that only
 * have a code + class + rarity (feed rows, reward rows, gift cards).
 */
export function resolveItemArt(ref: ItemArtRef): ItemArtResolution {
  const rarity = normRarity(ref.rarity)
  const itemClass = ref.itemClass ?? null

  // 1. Unique authored asset for this exact code.
  const asset = manifestAsset(ref.code)
  if (asset) {
    return {
      src: asset.src,
      glyph: null,
      rarity,
      tier: 'unique',
      placeholder: asset.placeholder ?? null,
      itemClass,
    }
  }

  // 2. Class template, finished by rarity.
  const tpl = manifestTemplate(itemClass, rarity)
  if (tpl) {
    return {
      src: tpl.src,
      glyph: null,
      rarity,
      tier: 'template',
      placeholder: tpl.placeholder ?? null,
      itemClass,
    }
  }

  // 3. Glyph fallback: explicit override → class default → box.
  const glyph = ref.glyph ?? (itemClass ? CLASS_GLYPH[itemClass] : null)
  if (glyph) {
    return { src: null, glyph, rarity, tier: 'glyph', placeholder: null, itemClass }
  }

  // 4. Ultimate fallback.
  return { src: null, glyph: '📦', rarity, tier: 'box', placeholder: null, itemClass }
}

/** Convenience: resolve art for a full ItemDefinition. */
export function resolveDefinitionArt(def: ItemDefinition): ItemArtResolution {
  return resolveItemArt({ code: def.code, itemClass: def.class, rarity: def.rarity })
}

/** The canonical glyph for a class, exposed for non-ItemArt legacy callers. */
export function classGlyph(itemClass: ItemClass | null | undefined): string {
  return itemClass ? CLASS_GLYPH[itemClass] : '📦'
}
