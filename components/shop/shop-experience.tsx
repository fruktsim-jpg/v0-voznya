'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { onBalanceChanged } from '@/lib/balance-events'
import { CoinAmount } from '@/components/ds/coin'
import { ShopFeaturedRail } from '@/components/shop/shop-featured-rail'
import { ShopCard } from '@/components/shop/shop-card'
import { RARITY_ORDER } from '@/lib/rarity'
import {
  SHOP_CATEGORY_META,
  SHOP_CATEGORY_ORDER,
  type ShopCategory,
  type ShopItem,
} from '@/lib/shop-types'

/**
 * ShopExperience (Shop redesign) — the storefront as a DESTINATION, not a list.
 *
 * It answers, in order: what is desirable (featured rail) → what fits me
 * (balance-aware, owned hints) → let me find it (category / search / filter /
 * sort). All client state; catalog + featured are computed on the server and the
 * viewer's balance + owned codes are fetched read-only so cards know what the
 * player can afford and already holds. The economy write stays in the audited
 * buy action — this is purely the browse/desire layer.
 */
type SortKey = 'featured' | 'price-desc' | 'price-asc' | 'rarity'

type MeSummary = { authenticated: boolean; registered?: boolean; balance?: number | null }

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Подборка' },
  { key: 'rarity', label: 'Редкость' },
  { key: 'price-desc', label: 'Дороже' },
  { key: 'price-asc', label: 'Дешевле' },
]

export function ShopExperience({
  catalog,
  featured,
}: {
  catalog: ShopItem[]
  featured: ShopItem[]
}) {
  const [category, setCategory] = useState<ShopCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('featured')
  const [onlyAffordable, setOnlyAffordable] = useState(false)
  const [onlyLimited, setOnlyLimited] = useState(false)

  // Bumped on every balance-change event (case open / sell / shop buy) so the
  // balance line, affordability and owned-hints re-fetch live — no F5. We bust
  // the URL cache via a nonce because useApi keys its fetch on the URL string.
  const [refreshTick, setRefreshTick] = useState(0)
  useEffect(() => onBalanceChanged(() => setRefreshTick((t) => t + 1)), [])
  const bust = refreshTick > 0 ? `?r=${refreshTick}` : ''

  const me = useApi<MeSummary>(`/api/me/summary${bust}`, 0)
  const ownedApi = useApi<{ codes: string[] }>(`/api/shop/owned${bust}`, 0)

  const balance =
    me.data?.authenticated && typeof me.data.balance === 'number' ? me.data.balance : null
  const ownedCodes = useMemo(
    () => new Set(ownedApi.data?.codes ?? []),
    [ownedApi.data],
  )

  // Category counts (over the full catalog, ignoring other filters) for the nav.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: catalog.length }
    for (const it of catalog) c[it.category] = (c[it.category] ?? 0) + 1
    return c
  }, [catalog])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = catalog.filter((it) => {
      if (category !== 'all' && it.category !== category) return false
      if (onlyLimited && !it.limited) return false
      if (onlyAffordable && balance != null && it.priceEshki > balance) return false
      if (q && !it.name.toLowerCase().includes(q)) return false
      return true
    })

    const featuredOrder = new Map(featured.map((it, i) => [it.code, i]))
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'price-desc':
          return b.priceEshki - a.priceEshki
        case 'price-asc':
          return a.priceEshki - b.priceEshki
        case 'rarity':
          return (
            RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
            b.priceEshki - a.priceEshki
          )
        case 'featured':
        default: {
          const fa = featuredOrder.has(a.code) ? featuredOrder.get(a.code)! : 999
          const fb = featuredOrder.has(b.code) ? featuredOrder.get(b.code)! : 999
          return fa - fb || b.priceEshki - a.priceEshki
        }
      }
    })
    return list
  }, [catalog, featured, category, search, sort, onlyAffordable, onlyLimited, balance])

  return (
    <div className="space-y-5">
      {/* HERO — create desire first */}
      <ShopFeaturedRail items={featured} ownedCodes={ownedCodes} balance={balance} />

      <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6">
        {/* Balance line — anchors "what can I afford" */}
        {balance != null && (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Твой баланс</span>
            <CoinAmount value={balance} size="md" />
          </div>
        )}

        {/* Category navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <CategoryPill
            active={category === 'all'}
            onClick={() => setCategory('all')}
            glyph="🛍"
            label="Всё"
            count={counts.all}
          />
          {SHOP_CATEGORY_ORDER.filter((c) => counts[c]).map((c) => (
            <CategoryPill
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
              glyph={SHOP_CATEGORY_META[c].glyph}
              label={SHOP_CATEGORY_META[c].label}
              count={counts[c]}
            />
          ))}
        </div>

        {/* Search + sort + filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск подарка…"
            className="min-w-[160px] flex-1 rounded-full border border-border bg-white/[0.03] px-4 py-2 text-sm text-foreground outline-none transition focus:border-white/25"
          />
          <div className="flex gap-1 rounded-full border border-border bg-white/[0.02] p-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  sort === s.key
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterToggle active={onlyLimited} onClick={() => setOnlyLimited((v) => !v)} label="Только лимитки" />
          {balance != null && (
            <FilterToggle
              active={onlyAffordable}
              onClick={() => setOnlyAffordable((v) => !v)}
              label="По карману"
            />
          )}
        </div>

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="glass mx-auto mt-2 max-w-md rounded-2xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Ничего не нашлось — попробуй другой фильтр.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((it) => (
              <ShopCard
                key={it.code}
                item={it}
                owned={ownedCodes.has(it.code)}
                affordable={balance == null ? null : balance >= it.priceEshki}
                balance={balance}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryPill({
  active,
  onClick,
  glyph,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  glyph: string
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-white/25 bg-white/10 text-foreground'
          : 'border-border bg-white/[0.02] text-muted-foreground hover:text-foreground'
      }`}
    >
      <span aria-hidden>{glyph}</span>
      {label}
      {count != null && <span className="text-[11px] opacity-60">{count}</span>}
    </button>
  )
}

function FilterToggle({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-primary/50 bg-primary/15 text-primary'
          : 'border-border bg-white/[0.02] text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}
