'use client'

import type { InvItem } from '@/lib/inventory-meta'
import { ItemArt } from '@/components/ds/item-art'

/**
 * InventoryShowcase (Stage 2) — the player's pinned "favorites shelf". Designs
 * the showcase SLOTS now (default 6). These pinned items are the foundation for
 * future profile pages, leaderboards, social surfaces and player cards — the
 * same slot model will render there once a backend persists it.
 *
 * Today the pins live in localStorage (hooks/use-inventory-prefs). Empty slots
 * are shown as dashed placeholders so the player understands the shelf and is
 * motivated to fill it (collecting motivation).
 */

export function InventoryShowcase({
  items,
  slots,
  onOpen,
  onUnpin,
}: {
  items: InvItem[]
  slots: number
  onOpen: (item: InvItem) => void
  onUnpin: (id: string) => void
}) {
  const empty = Math.max(0, slots - items.length)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="text-sm font-bold text-foreground">
          📌 Витрина <span className="text-muted-foreground">({items.length}/{slots})</span>
        </h2>
        <span className="text-[11px] text-muted-foreground">для профиля и карточки игрока</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map((i) => (
          <div key={i.id} className="relative">
            <button
              type="button"
              onClick={() => onOpen(i)}
              className="flex w-full flex-col items-center gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2 transition active:scale-[0.97]"
              title={i.name}
            >
              <ItemArt code={i.code} itemClass={i.itemClass} glyph={i.glyph} rarity={i.rarity} size="md" />
              <span className="line-clamp-1 w-full text-center text-[10px] font-medium text-foreground">
                {i.name}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onUnpin(i.id)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-black/70 text-[10px] text-muted-foreground backdrop-blur-sm transition hover:text-foreground active:scale-90"
              aria-label={`Открепить ${i.name}`}
            >
              ✕
            </button>
          </div>
        ))}
        {Array.from({ length: empty }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center"
          >
            <span aria-hidden="true" className="text-xl opacity-30">＋</span>
            <span className="mt-0.5 text-[9px] text-muted-foreground/60">слот</span>
          </div>
        ))}
      </div>
    </section>
  )
}
