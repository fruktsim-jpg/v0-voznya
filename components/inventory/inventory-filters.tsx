'use client'

import { useState } from 'react'
import { Chip, ChipGroup } from '@/components/ds/chip'
import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'
import { rarityToken } from '@/lib/rarity'
import {
  type FilterState,
  type SortKey,
  type CollectionView,
  RARITY_ORDER,
} from '@/lib/inventory-meta'

/**
 * InventoryFilters (Stage 2) — modern, mobile-first filter system. A search
 * box + quick flag chips (all/favorites/limited/premium) + horizontally
 * scrollable collection and rarity chip rows + a sort selector.
 *
 * Pure presentation over derived data; all filtering happens client-side in
 * lib/inventory-meta.applyFilters (instant, no requests). Chip rows scroll
 * horizontally so the bar never wraps tall on narrow Telegram screens.
 */

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Сначала новые',
  rarity: 'По редкости',
  value: 'По ценности',
  name: 'По названию',
}

const FLAGS: { key: FilterState['flag']; label: string; icon: GlyphName }[] = [
  { key: 'all', label: 'Все', icon: 'inventory' },
  { key: 'favorites', label: 'Избранное', icon: 'heart' },
  { key: 'limited', label: 'Лимитные', icon: 'trophy' },
  { key: 'premium', label: 'Premium', icon: 'star' },
]

export function InventoryFilters({
  filters,
  onChange,
  collections,
  rarityCounts,
  resultCount,
}: {
  filters: FilterState
  onChange: (next: FilterState) => void
  collections: CollectionView[]
  rarityCounts: Map<string, number>
  resultCount: number
}) {
  const [showRarity, setShowRarity] = useState(false)
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-2.5">
      {/* Search + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Glyph name="search" className="text-base" />
          </span>
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Поиск по инвентарю"
            className="w-full rounded-xl border border-border bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary/50"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value as SortKey })}
            className="h-full appearance-none rounded-xl border border-border bg-white/[0.03] py-2 pl-3 pr-8 text-xs font-semibold text-foreground outline-none transition focus:border-primary/50"
            aria-label="Сортировка"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k} className="bg-popover">
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            ▼
          </span>
        </div>
      </div>

      {/* Quick flag chips */}
      <ChipGroup>
        {FLAGS.map((f) => (
          <Chip
            key={f.key}
            icon={<Glyph name={f.icon} />}
            active={filters.flag === f.key}
            onClick={() => set({ flag: f.key })}
          >
            {f.label}
          </Chip>
        ))}
        <span className="mx-0.5 h-5 w-px shrink-0 self-center bg-white/10" />
        <Chip
          active={showRarity}
          icon="🎨"
          onClick={() => setShowRarity((v) => !v)}
        >
          Редкость
        </Chip>
      </ChipGroup>

      {/* Rarity row (collapsible to save vertical space on mobile) */}
      {showRarity && (
        <ChipGroup>
          <Chip active={filters.rarity === 'all'} onClick={() => set({ rarity: 'all' })}>
            Любая
          </Chip>
          {RARITY_ORDER.filter((r) => (rarityCounts.get(r) ?? 0) > 0).map((r) => {
            const t = rarityToken(r)
            return (
              <Chip
                key={r}
                active={filters.rarity === r}
                count={rarityCounts.get(r)}
                onClick={() => set({ rarity: filters.rarity === r ? 'all' : r })}
              >
                <span style={{ color: t.color }}>{t.label}</span>
              </Chip>
            )
          })}
        </ChipGroup>
      )}

      {/* Collection row */}
      <ChipGroup>
        <Chip
          icon="🗂"
          active={filters.collection === 'all'}
          onClick={() => set({ collection: 'all' })}
        >
          Все коллекции
        </Chip>
        {collections.map((c) => (
          <Chip
            key={c.key}
            icon={c.glyph}
            count={c.owned}
            active={filters.collection === c.key}
            onClick={() => set({ collection: filters.collection === c.key ? 'all' : c.key })}
          >
            {c.label}
          </Chip>
        ))}
      </ChipGroup>

      <p className="px-0.5 text-[11px] text-muted-foreground">
        Показано: <span className="font-semibold text-foreground tabular-nums">{resultCount}</span>
      </p>
    </div>
  )
}
