'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import type { InventoryItem } from '@/lib/inventory-list'
import {
  toInvItems,
  summarize,
  applyFilters,
  DEFAULT_FILTERS,
  type FilterState,
  type InvItem,
} from '@/lib/inventory-meta'
import { useFavorites, useShowcase } from '@/hooks/use-inventory-prefs'
import { InventoryHeader } from '@/components/inventory/inventory-header'
import { InventoryShowcase } from '@/components/inventory/inventory-showcase'
import { InventoryCollections } from '@/components/inventory/inventory-collections'
import { InventoryFilters } from '@/components/inventory/inventory-filters'
import { ItemCard } from '@/components/inventory/item-card'
import { ItemInspectSheet } from '@/components/inventory/item-inspect-sheet'

/**
 * InventoryRedesign (Stage 2) — the orchestrator. Wires the read-only inventory
 * into the prestige collection experience: premium summary header, pinned
 * showcase, collection progress, a fast filter system and an ItemArt-first
 * rarity grid, with a premium inspect sheet for every item.
 *
 * STATE: only client-side view state (filters, selected item) + localStorage
 * prefs (favorites / showcase). Item mutations go EXCLUSIVELY through the frozen
 * gift API inside ItemInspectSheet → on success we drop the consumed gift from
 * the local list (same model as Stage 1). No backend/economy/ownership change.
 */
export function InventoryRedesign({ initial }: { initial: InventoryItem[] }) {
  const [raw, setRaw] = useState<InventoryItem[]>(initial)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { favorites, isFavorite, toggle: toggleFav, reconcile: reconcileFav, count: favCount } = useFavorites()
  const showcase = useShowcase()

  // Derive the normalized view-model once per raw change.
  const items = useMemo(() => toInvItems(raw), [raw])
  const summary = useMemo(() => summarize(items, favorites.length), [items, favorites.length])

  // Prune favorite/showcase prefs whose item is gone (e.g. a gift was sold /
  // withdrawn / gifted) so consumed items don't linger as stale ids or keep
  // occupying showcase slots. Runs only when the live id set changes.
  const reconcileShowcase = showcase.reconcile
  useEffect(() => {
    const live = new Set(items.map((i) => i.id))
    reconcileFav(live)
    reconcileShowcase(live)
  }, [items, reconcileFav, reconcileShowcase])

  // Rarity counts for the filter chips.
  const rarityCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of items) m.set(i.rarity, (m.get(i.rarity) ?? 0) + Math.max(1, i.quantity))
    return m
  }, [items])

  const visible = useMemo(
    () => applyFilters(items, filters, isFavorite),
    [items, filters, isFavorite],
  )

  const pinnedItems = useMemo(
    () => showcase.pinned.map((id) => items.find((i) => i.id === id)).filter(Boolean) as InvItem[],
    [showcase.pinned, items],
  )

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  )

  const openItem = useCallback((item: InvItem) => {
    setSelectedId(item.id)
    setSheetOpen(true)
  }, [])

  // Open by raw id (used by header "recent" strip).
  const openById = useCallback(
    (id: string) => {
      const found = items.find((i) => i.id === id)
      if (found) openItem(found)
    },
    [items, openItem],
  )

  // A pending gift was consumed by an action — drop it from the local list.
  const onConsumed = useCallback((deliveryKey: string) => {
    setRaw((prev) =>
      prev.filter((i) => !(i.kind === 'gift' && i.deliveryKey === deliveryKey)),
    )
  }, [])

  if (items.length === 0) {
    return (
      <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center">
        <div className="mb-2 text-4xl">🎒</div>
        <p className="text-sm text-muted-foreground">
          Инвентарь пуст. Открывай кейсы и покупай в магазине — всё попадёт сюда.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <InventoryHeader summary={summary} favoritesCount={favCount} onJumpRecent={openById} />

      {showcase.count > 0 && (
        <InventoryShowcase
          items={pinnedItems}
          slots={showcase.slots}
          onOpen={openItem}
          onUnpin={showcase.toggle}
        />
      )}

      <InventoryCollections
        collections={summary.collections}
        activeCollection={filters.collection}
        onSelect={(key) => setFilters((f) => ({ ...f, collection: key }))}
      />

      <InventoryFilters
        filters={filters}
        onChange={setFilters}
        collections={summary.collections}
        rarityCounts={rarityCounts}
        resultCount={visible.length}
      />

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white/[0.02] p-8 text-center">
          <div className="mb-2 text-2xl">🔍</div>
          <p className="text-sm text-muted-foreground">Ничего не найдено по этим фильтрам.</p>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              favorite={isFavorite(item.id)}
              pinned={showcase.isPinned(item.id)}
              onOpen={openItem}
              onToggleFavorite={toggleFav}
            />
          ))}
        </div>
      )}

      <ItemInspectSheet
        item={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        favorite={selected ? isFavorite(selected.id) : false}
        pinned={selected ? showcase.isPinned(selected.id) : false}
        showcaseFull={showcase.full}
        showcaseSlots={showcase.slots}
        showcaseCount={showcase.count}
        onToggleFavorite={toggleFav}
        onTogglePin={showcase.toggle}
        onConsumed={onConsumed}
      />
    </div>
  )
}
