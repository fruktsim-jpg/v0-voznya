// Client-safe inventory DERIVE layer (VOZNYA Stage 2 — Inventory Redesign).
//
// Pure, presentational helpers that turn the read-only `InventoryItem[]` from
// lib/inventory-list.ts into the view-model the redesigned inventory UI needs:
// a single normalized item shape, collections, rarity distribution, totals and
// fast client-side filter/sort.
//
// STRICT BOUNDARY: this module is derive-only. It NEVER fetches, mutates or
// touches `pg`/`./db`. It adds ZERO new data — every field is computed from
// signals that already exist on InventoryItem (rarity, type, limited, premium,
// source, value, quantity). Collections are LOGICAL groupings of those existing
// signals; a real collection catalog would need a backend change (out of scope
// for Stage 2 — see DELIVERABLES → remaining gaps).

import type { Rarity } from './rarity'
import { rarityToken } from './rarity'
import { typeEmoji } from './inventory'
import { giftIcon } from './gifts-ux'
import type { ItemClass } from './item-art/model'
import type {
  InventoryItem,
  InventoryGiftItem,
  InventoryStackItem,
} from './inventory-list'

const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
]

/** Normalise any catalog rarity string to a canonical Rarity (fallback common). */
export function asRarity(raw: string | null | undefined): Rarity {
  const r = (raw ?? 'common') as Rarity
  return RARITY_ORDER.includes(r) ? r : 'common'
}

export function rarityRank(r: Rarity): number {
  const i = RARITY_ORDER.indexOf(r)
  return i < 0 ? 0 : i
}

// --- Unified item view-model ------------------------------------------------
//
// One shape for the grid/inspect UI regardless of underlying kind. `raw` keeps
// the original object so action logic (gift cards) stays type-safe.

export type CollectionKey =
  | 'premium'
  | 'limited'
  | 'gifts'
  | 'cosmetic'
  | 'title'
  | 'badge'
  | 'frame'
  | 'avatar'
  | 'collectible'
  | 'event'
  | 'case'
  | 'key'
  | 'other'

export type InvItem = {
  /** Stable per-render id: deliveryKey for gifts, itemCode for stacks. */
  id: string
  /** Stable item CODE for art resolution (itemCode for both kinds). */
  code: string
  kind: 'gift' | 'stack'
  name: string
  rarity: Rarity
  /** Fallback glyph (emoji) when no art src is available. */
  glyph: string
  /** Future PNG/transparent/animated art URL. null today (artwork-first ready). */
  art: string | null
  /** Canonical item class for the ItemArt resolver (template + glyph fallback). */
  itemClass: ItemClass
  /** Human type label (RU) for chips/inspect. */
  typeKey: string
  typeLabel: string
  collection: CollectionKey
  collectionLabel: string
  /**
   * Authored collection (real `collections` catalog), when the item belongs to
   * one. Distinct from the logical `collection` grouping above: this is the
   * named set the operator created, surfaced to seed the collection loop
   * ("part of <set>"). Null for items with no authored collection.
   */
  setCode: string | null
  setName: string | null
  isPremium: boolean
  limited: boolean
  /** Internal value in eshki (0 when unknown / cosmetic). */
  value: number
  quantity: number
  equipped: boolean
  source: 'case' | 'shop' | 'catalog'
  acquiredAt: string | null
  /** Pending gifts are actionable (sell/withdraw/gift/transfer). */
  actionable: boolean
  raw: InventoryItem
}

const TYPE_LABELS: Record<string, string> = {
  cosmetic: 'Косметика',
  title: 'Титул',
  badge: 'Бейдж',
  frame: 'Рамка',
  avatar: 'Аватар',
  collectible: 'Коллекционное',
  event: 'Событие',
  case: 'Кейс',
  key: 'Ключ',
  gift: 'Подарок',
}

const COLLECTION_LABELS: Record<CollectionKey, string> = {
  premium: 'Telegram Premium',
  limited: 'Лимитная коллекция',
  gifts: 'Подарки',
  cosmetic: 'Косметика',
  title: 'Титулы',
  badge: 'Бейджи',
  frame: 'Рамки',
  avatar: 'Аватары',
  collectible: 'Коллекционные',
  event: 'События',
  case: 'Кейсы',
  key: 'Ключи',
  other: 'Прочее',
}

const COLLECTION_GLYPH: Record<CollectionKey, string> = {
  premium: '⭐',
  limited: '🏆',
  gifts: '🎁',
  cosmetic: '✨',
  title: '🏷',
  badge: '🎖',
  frame: '🖼',
  avatar: '👤',
  collectible: '💎',
  event: '🎉',
  case: '📦',
  key: '🔑',
  other: '🎒',
}

function giftCollection(g: InventoryGiftItem): CollectionKey {
  if (g.isPremium) return 'premium'
  if (g.limited) return 'limited'
  return 'gifts'
}

function stackCollection(s: InventoryStackItem): CollectionKey {
  const t = s.type as CollectionKey
  if (t in COLLECTION_LABELS && t !== 'premium' && t !== 'limited' && t !== 'gifts')
    return t
  return 'other'
}

/** Map a catalog `type` to a canonical ItemClass for art resolution. */
const STACK_CLASS: Record<string, ItemClass> = {
  cosmetic: 'cosmetic',
  title: 'title',
  badge: 'badge',
  frame: 'frame',
  avatar: 'avatar',
  collectible: 'collectible',
  event: 'event',
  case: 'case',
  key: 'key',
}
function stackItemClass(type: string): ItemClass {
  return STACK_CLASS[type] ?? 'collectible'
}

/** Normalise the read-only inventory into the redesign view-model. */
export function toInvItems(items: InventoryItem[]): InvItem[] {
  return items.map((it) => {
    if (it.kind === 'gift') {
      const collection = giftCollection(it)
      return {
        id: `gift:${it.deliveryKey}`,
        code: it.itemCode,
        kind: 'gift',
        name: it.name,
        rarity: asRarity(it.rarity),
        glyph: it.icon || giftIcon(it.itemCode),
        art: null,
        itemClass: it.isPremium ? 'premium' : 'gift',
        typeKey: 'gift',
        typeLabel: it.isPremium ? 'Premium' : 'Подарок',
        collection,
        collectionLabel: COLLECTION_LABELS[collection],
        setCode: null,
        setName: null,
        isPremium: it.isPremium,
        limited: it.limited,
        value: it.value,
        quantity: 1,
        equipped: false,
        source: it.source,
        acquiredAt: it.acquiredAt,
        actionable: true,
        raw: it,
      }
    }
    const collection = stackCollection(it)
    return {
      id: `stack:${it.itemCode}`,
      code: it.itemCode,
      kind: 'stack',
      name: it.name,
      rarity: asRarity(it.rarity),
      glyph: typeEmoji(it.type),
      art: null,
      itemClass: stackItemClass(it.type),
      typeKey: it.type,
      typeLabel: TYPE_LABELS[it.type] ?? it.type,
      collection,
      collectionLabel: COLLECTION_LABELS[collection],
      setCode: it.collectionCode,
      setName: it.collectionName,
      isPremium: false,
      limited: false,
      value: 0,
      quantity: it.quantity,
      equipped: it.equipped,
      source: 'catalog',
      acquiredAt: it.acquiredAt,
      actionable: false,
      raw: it,
    }
  })
}

// --- Summary / collections --------------------------------------------------

export type RaritySlice = { rarity: Rarity; count: number; color: string }

export type CollectionView = {
  key: CollectionKey
  label: string
  glyph: string
  owned: number
  /** Total quantity (stacks count their quantity). */
  totalQty: number
  /** Highest rarity present — drives the collection's accent. */
  topRarity: Rarity
  /** Sum of value across the collection (eshki). */
  value: number
}

export type InventorySummary = {
  totalItems: number
  totalQuantity: number
  collectionsTotal: number
  collectionsCompleted: number
  totalValue: number
  topRarity: Rarity
  rarityDistribution: RaritySlice[]
  collections: CollectionView[]
  /** Most recent acquisitions (by acquiredAt desc), already normalised. */
  recent: InvItem[]
}

/**
 * A logical collection is considered "completed" when it contains at least one
 * top-tier (epic+) member AND more than one item — a soft, data-only heuristic
 * for progression motivation. Real completion needs a catalog (future stage).
 */
function isCollectionComplete(c: CollectionView): boolean {
  return c.totalQty >= 2 && rarityRank(c.topRarity) >= rarityRank('epic')
}

export function summarize(items: InvItem[], favorites: number): InventorySummary {
  const totalQuantity = items.reduce((n, i) => n + Math.max(1, i.quantity), 0)
  const totalValue = items.reduce((n, i) => n + i.value * Math.max(1, i.quantity), 0)

  // Rarity distribution (only tiers that appear).
  const byRarity = new Map<Rarity, number>()
  for (const i of items) {
    byRarity.set(i.rarity, (byRarity.get(i.rarity) ?? 0) + Math.max(1, i.quantity))
  }
  const rarityDistribution: RaritySlice[] = RARITY_ORDER.filter((r) =>
    byRarity.has(r),
  ).map((r) => ({ rarity: r, count: byRarity.get(r) ?? 0, color: rarityToken(r).color }))

  // Collections.
  const byCollection = new Map<CollectionKey, InvItem[]>()
  for (const i of items) {
    const arr = byCollection.get(i.collection) ?? []
    arr.push(i)
    byCollection.set(i.collection, arr)
  }
  const collections: CollectionView[] = Array.from(byCollection.entries())
    .map(([key, arr]) => {
      const topRarity = arr.reduce<Rarity>(
        (top, i) => (rarityRank(i.rarity) > rarityRank(top) ? i.rarity : top),
        'common',
      )
      return {
        key,
        label: COLLECTION_LABELS[key],
        glyph: COLLECTION_GLYPH[key],
        owned: arr.length,
        totalQty: arr.reduce((n, i) => n + Math.max(1, i.quantity), 0),
        topRarity,
        value: arr.reduce((n, i) => n + i.value * Math.max(1, i.quantity), 0),
      }
    })
    .sort((a, b) => rarityRank(b.topRarity) - rarityRank(a.topRarity) || b.owned - a.owned)

  const topRarity = items.reduce<Rarity>(
    (top, i) => (rarityRank(i.rarity) > rarityRank(top) ? i.rarity : top),
    'common',
  )

  const recent = [...items]
    .filter((i) => i.acquiredAt)
    .sort((a, b) => (a.acquiredAt! < b.acquiredAt! ? 1 : -1))
    .slice(0, 6)

  return {
    totalItems: items.length,
    totalQuantity,
    collectionsTotal: collections.length,
    collectionsCompleted: collections.filter(isCollectionComplete).length,
    totalValue,
    topRarity,
    rarityDistribution,
    collections,
    recent,
  }
}

// --- Filter / sort ----------------------------------------------------------

export type SortKey = 'recent' | 'rarity' | 'value' | 'name'

export type FilterState = {
  collection: CollectionKey | 'all'
  rarity: Rarity | 'all'
  /** Special quick filters. */
  flag: 'all' | 'favorites' | 'limited' | 'premium'
  search: string
  sort: SortKey
}

export const DEFAULT_FILTERS: FilterState = {
  collection: 'all',
  rarity: 'all',
  flag: 'all',
  search: '',
  sort: 'recent',
}

export function applyFilters(
  items: InvItem[],
  f: FilterState,
  isFavorite: (id: string) => boolean,
): InvItem[] {
  const q = f.search.trim().toLowerCase()
  const filtered = items.filter((i) => {
    if (f.collection !== 'all' && i.collection !== f.collection) return false
    if (f.rarity !== 'all' && i.rarity !== f.rarity) return false
    if (f.flag === 'favorites' && !isFavorite(i.id)) return false
    if (f.flag === 'limited' && !i.limited) return false
    if (f.flag === 'premium' && !i.isPremium) return false
    if (q && !i.name.toLowerCase().includes(q) && !i.collectionLabel.toLowerCase().includes(q))
      return false
    return true
  })

  const sorted = [...filtered]
  switch (f.sort) {
    case 'rarity':
      sorted.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.value - a.value)
      break
    case 'value':
      sorted.sort((a, b) => b.value - a.value || rarityRank(b.rarity) - rarityRank(a.rarity))
      break
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      break
    case 'recent':
    default:
      sorted.sort((a, b) => {
        if (a.acquiredAt && b.acquiredAt) return a.acquiredAt < b.acquiredAt ? 1 : -1
        if (a.acquiredAt) return -1
        if (b.acquiredAt) return 1
        return rarityRank(b.rarity) - rarityRank(a.rarity)
      })
      break
  }
  return sorted
}

export { COLLECTION_LABELS, COLLECTION_GLYPH, RARITY_ORDER }
