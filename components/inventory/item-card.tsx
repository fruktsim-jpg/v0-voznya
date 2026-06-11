'use client'

import { rarityToken } from '@/lib/rarity'
import type { InvItem } from '@/lib/inventory-meta'
import { ItemArt } from '@/components/ds/item-art'
import { VoznyaCoin } from '@/components/ds/icon'

/**
 * ItemCard (Stage 2) — the single grid tile for every owned object. ItemArt is
 * the hero: rarity reads instantly from the capsule gradient, border and glow
 * (rarity tokens) — no need to read text. Dense by design (2 cols on phones,
 * up to 5 on desktop) so the inventory keeps good information density.
 *
 * Tap opens the inspect sheet. A favorite heart and an actionable dot sit as
 * lightweight overlays. Quantity / Premium / limited badges communicate status.
 * No expensive effects — a single CSS transform on tap, static glow.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function ItemCard({
  item,
  favorite,
  pinned,
  onOpen,
  onToggleFavorite,
}: {
  item: InvItem
  favorite: boolean
  pinned: boolean
  onOpen: (item: InvItem) => void
  onToggleFavorite: (id: string) => void
}) {
  const t = rarityToken(item.rarity)
  const accent = item.rarity !== 'common'

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white/[0.02] p-2.5 text-left transition active:scale-[0.98]"
      style={{
        borderColor: accent ? `${t.color}66` : 'rgba(255,255,255,0.08)',
        boxShadow: accent ? t.glow || undefined : undefined,
      }}
    >
      {/* Whole-tile open button (art + meta) */}
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex flex-col items-center text-center outline-none"
        aria-label={`Открыть ${item.name}`}
      >
        <div className="relative">
          <ItemArt src={item.art} glyph={item.glyph} rarity={item.rarity} size="lg" className="!h-24 !w-24" />
          {item.quantity > 1 && (
            <span className="absolute bottom-0 right-0 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-foreground backdrop-blur-sm">
              ×{item.quantity}
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-1 w-full text-sm font-semibold text-foreground">{item.name}</p>
        <p className="line-clamp-1 w-full text-[11px] font-medium" style={{ color: t.color }}>
          {item.isPremium ? 'Telegram Premium' : t.label}
        </p>
        {item.value > 0 ? (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="type-economy">{fmt(item.value)}</span> <VoznyaCoin tone="muted" />
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.typeLabel}</p>
        )}
      </button>

      {/* Top-left status badges */}
      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
        {item.limited && (
          <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200 backdrop-blur-sm">
            лимит
          </span>
        )}
        {item.equipped && (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300 backdrop-blur-sm">
            надето
          </span>
        )}
        {pinned && (
          <span className="rounded-full border border-primary/50 bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary backdrop-blur-sm">
            на витрине
          </span>
        )}
      </div>

      {/* Favorite heart (top-right) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(item.id)
        }}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-sm backdrop-blur-sm transition active:scale-90"
        aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
        aria-pressed={favorite}
      >
        <span className={favorite ? 'opacity-100' : 'opacity-40 grayscale'}>
          {favorite ? '❤️' : '🤍'}
        </span>
      </button>

      {/* Actionable hint (pending gifts can be sold/withdrawn/gifted) */}
      {item.actionable && (
        <span
          className="pointer-events-none absolute bottom-2 right-2 h-2 w-2 rounded-full bg-primary"
          title="Доступны действия"
        />
      )}
    </article>
  )
}
