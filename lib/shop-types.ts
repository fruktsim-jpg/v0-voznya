// Pure Shop view-model types + presentation constants. NO server-only / DB
// imports, so BOTH the server catalog builder (lib/shop-catalog.ts) and the
// client UI (components/shop/*) can share them without dragging `pg` into the
// client bundle.
import type { Rarity } from './rarity'
import type { ItemClass } from './item-art/model'

/** Shop category — one bucket per item, drives the category navigation. */
export type ShopCategory = 'premium' | 'romance' | 'seasonal' | 'celebration' | 'classic'

export const SHOP_CATEGORY_META: Record<
  ShopCategory,
  { label: string; glyph: string; blurb: string }
> = {
  premium: { label: 'Premium', glyph: '⭐', blurb: 'Telegram Premium — вершина желания' },
  romance: { label: 'Романтика', glyph: '💍', blurb: 'Подарить чувства' },
  seasonal: { label: 'Сезонные', glyph: '🎄', blurb: 'Коллекционные, пока сезон' },
  celebration: { label: 'Праздник', glyph: '🥂', blurb: 'Отметить момент' },
  classic: { label: 'Классика', glyph: '🎁', blurb: 'Вечные подарки сообщества' },
}

export const SHOP_CATEGORY_ORDER: ShopCategory[] = [
  'premium',
  'romance',
  'seasonal',
  'celebration',
  'classic',
]

export type ShopItem = {
  code: string
  name: string
  description: string | null
  priceEshki: number
  /** Remaining units (null = unlimited). Sold-out items are filtered out. */
  remaining: number | null
  rarity: Rarity
  /** Art class — premium vs gift — drives the canonical ItemArt glyph/template. */
  itemClass: ItemClass
  /**
   * Deterministic per-code glyph fallback, passed to ItemArt as the glyph
   * override (manifest art still wins). Replaces the brittle substring heuristic
   * (giftIcon): an explicit map keyed by the REAL catalog codes, so variety
   * survives until Item Authoring fills the manifest with authored art.
   */
  glyph: string
  limited: boolean
  seasonal: boolean
  isNew: boolean
  category: ShopCategory
  soldCount: number
  /**
   * Collection this object belongs to, when authored. Code + display name come
   * from the authored `inventory_items.collection_code` → `collections` join.
   * null = not part of any set (the legacy gift_catalog case). Drives the
   * collection chip on cards and the collection filter.
   */
  collectionCode: string | null
  collectionName: string | null
  /**
   * True when an authored `inventory_items` definition backs this storefront
   * row (rarity/itemClass/collection/supply came from the unified content
   * system, not from code-string heuristics). Lets the UI mark genuinely
   * authored objects and lets us trust their metadata.
   */
  authored: boolean
}
