'use client'

import { rarityToken } from '@/lib/rarity'
import type { CollectionView, CollectionKey } from '@/lib/inventory-meta'
import { SegmentedProgress } from '@/components/ds/progress-bar'

/**
 * InventoryCollections (Stage 2) — collection visibility & progression. A
 * horizontally scrollable strip of collection cards: glyph, name, owned count,
 * top-rarity accent and a segmented progress hint. Tapping a card filters the
 * grid to that collection — the foundation for future collection pages.
 *
 * Progress is a DATA-ONLY heuristic (owned vs a soft target derived from what's
 * present) — there is no collection catalog in the DB yet, so "missing items"
 * is represented as remaining empty segments rather than fabricated entries.
 * A real catalog (exact totals, named missing items) is a future backend stage.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

/** Soft target per collection: next milestone above current owned (3/6/10/…). */
function milestone(owned: number): number {
  const steps = [3, 6, 10, 15, 25, 50]
  return steps.find((s) => s >= owned) ?? Math.ceil(owned / 10) * 10
}

export function InventoryCollections({
  collections,
  activeCollection,
  onSelect,
}: {
  collections: CollectionView[]
  activeCollection: CollectionKey | 'all'
  onSelect: (key: CollectionKey | 'all') => void
}) {
  if (collections.length === 0) return null

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="text-sm font-bold text-foreground">
          Коллекции <span className="text-muted-foreground">({collections.length})</span>
        </h2>
        {activeCollection !== 'all' && (
          <button
            type="button"
            onClick={() => onSelect('all')}
            className="text-xs font-medium text-primary hover:underline"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {collections.map((c) => {
          const t = rarityToken(c.topRarity)
          const target = milestone(c.totalQty)
          const active = activeCollection === c.key
          const complete = c.totalQty >= target

          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelect(active ? 'all' : c.key)}
              aria-pressed={active}
              className="relative flex w-40 shrink-0 flex-col gap-2 overflow-hidden rounded-2xl border bg-white/[0.02] p-3 text-left transition active:scale-[0.98]"
              style={{
                borderColor: active ? t.color : `${t.color}40`,
                boxShadow: active ? t.glow || undefined : undefined,
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full opacity-20 blur-2xl"
                style={{ background: t.color }}
              />
              <div className="relative flex items-center gap-2">
                <span aria-hidden="true" className="text-2xl">{c.glyph}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.label}</p>
                  <p className="text-[11px]" style={{ color: t.color }}>{t.label}</p>
                </div>
              </div>

              <div className="relative">
                <SegmentedProgress
                  filled={Math.min(c.totalQty, target)}
                  total={target}
                  color={t.color}
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-mono tabular-nums text-foreground">
                    {fmt(c.totalQty)} / {fmt(target)}
                  </span>
                  {complete ? (
                    <span className="font-semibold text-amber-300">✓ собрано</span>
                  ) : (
                    <span className="text-muted-foreground">осталось {fmt(target - c.totalQty)}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
