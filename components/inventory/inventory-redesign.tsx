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
import { Glyph } from '@/components/ds/icon'
import { InventoryHeader } from '@/components/inventory/inventory-header'
import { InventoryShowcase } from '@/components/inventory/inventory-showcase'
import { InventoryCollections } from '@/components/inventory/inventory-collections'
import { InventoryFilters } from '@/components/inventory/inventory-filters'
import { ItemCard } from '@/components/inventory/item-card'
import { ItemInspectSheet } from '@/components/inventory/item-inspect-sheet'

/**
 * Per-device "last inventory visit" marker (client-only, like lib/last-visit).
 * Lets us flag items acquired since the previous visit with a "новое" badge —
 * the missing acquisition feedback. Namespaced per user; never throws.
 */
const INV_SEEN_PREFIX = 'voznya:inv-seen:'
function readInvSeen(userId: number): number | null {
  if (typeof window === 'undefined') return null
  try {
    const n = Number(window.localStorage.getItem(`${INV_SEEN_PREFIX}${userId}`))
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}
function writeInvSeen(userId: number, when = Date.now()): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${INV_SEEN_PREFIX}${userId}`, String(when))
  } catch {
    /* private mode — highlight simply degrades off */
  }
}

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
export function InventoryRedesign({
  initial,
  userId,
}: {
  initial: InventoryItem[]
  userId?: number
}) {
  const [raw, setRaw] = useState<InventoryItem[]>(initial)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { favorites, isFavorite, toggle: toggleFav, reconcile: reconcileFav } = useFavorites()
  const showcase = useShowcase()

  // Stable favorites lookup: a Set derived from the favorites array. Passing
  // `favorite={favSet.has(id)}` (a plain boolean) to the memoized ItemCard means
  // toggling one favorite re-renders only the affected card, not the whole grid
  // (the previous `isFavorite` function identity changed on every toggle).
  const favSet = useMemo(() => new Set(favorites), [favorites])

  // Derive the normalized view-model once per raw change.
  const items = useMemo(() => toInvItems(raw), [raw])
  const summary = useMemo(() => summarize(items, favorites.length), [items, favorites.length])

  // "New since last visit" — capture the previous marker ONCE on mount, then
  // advance it so a refresh doesn't keep re-flagging. Items acquired after the
  // captured time get a "новое" badge. Client-only, per-device (read-only DB).
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    if (userId == null) return
    const since = readInvSeen(userId)
    if (since != null) {
      const fresh = new Set(
        items
          .filter((i) => i.acquiredAt != null && new Date(i.acquiredAt).getTime() > since)
          .map((i) => i.id),
      )
      setNewIds(fresh)
    }
    writeInvSeen(userId)
    // Capture only on first mount for this user — not on every items change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

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
    () => applyFilters(items, filters, (id) => favSet.has(id)),
    [items, filters, favSet],
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
  // A pending gift was consumed by an action — drop it from the local list.
  const onConsumed = useCallback((deliveryKey: string) => {
    setRaw((prev) =>
      prev.filter((i) => !(i.kind === 'gift' && i.deliveryKey === deliveryKey)),
    )
  }, [])

  if (items.length === 0) {
    return (
      <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center">
        <div className="mb-3 flex justify-center text-4xl text-muted-foreground/70">
          <Glyph name="inventory" />
        </div>
        <p className="text-sm text-muted-foreground">
          Инвентарь пуст. Открывай кейсы и покупай в магазине — всё попадёт сюда.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <a
            href="/cases"
            className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition active:scale-[0.98] hover:bg-primary/25"
          >
            Открыть кейсы
          </a>
          <a
            href="/gifts"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition active:scale-[0.98] hover:text-foreground"
          >
            В магазин
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <InventoryHeader summary={summary} />

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
            <div className="mb-2 flex justify-center text-2xl text-muted-foreground/70">
              <Glyph name="search" />
            </div>
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
              favorite={favSet.has(item.id)}
              pinned={showcase.isPinned(item.id)}
              isNew={newIds.has(item.id)}
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
