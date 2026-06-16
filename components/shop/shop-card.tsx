'use client'

import { CoinAmount } from '@/components/ds/coin'
import { ItemArt } from '@/components/ds/item-art'
import { rarityToken, type Rarity } from '@/lib/rarity'
import { GiftBuyButton } from '@/components/v2/gift-buy-button'
import type { ItemClass } from '@/lib/item-art/model'

/**
 * ShopCard (Shop redesign) — one storefront object, built to create DESIRE
 * before purchase. Funnels art through the ONE path (ItemArt, no giftIcon),
 * renders price as the minted coin (CoinAmount), and surfaces scarcity / status
 * (limited, low-stock, new, already-owned, can't-afford) so the player can read
 * "what is this worth / can I get it" at a glance.
 */
export type ShopCardItem = {
  code: string
  name: string
  priceEshki: number
  remaining: number | null
  rarity: Rarity
  itemClass: ItemClass
  glyph: string
  limited: boolean
  seasonal: boolean
  isNew: boolean
  collectionName: string | null
}

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function ShopCard({
  item,
  owned,
  affordable,
  balance,
}: {
  item: ShopCardItem
  owned: boolean
  affordable: boolean | null
  balance: number | null
}) {
  const t = rarityToken(item.rarity)
  const lowStock = item.remaining != null && item.remaining <= 5
  const cantAfford = affordable === false
  const shortBy = cantAfford && balance != null ? item.priceEshki - balance : null

  return (
    <article
      className="glass group relative flex flex-col items-center overflow-hidden rounded-2xl border border-border p-4 text-center transition hover:-translate-y-0.5 hover:bg-white/[0.04]"
    >
      {/* Status flags — neutral surface, one accent. */}
      <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
        {item.isNew && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            new
          </span>
        )}
        {item.limited && (
          <span className="rounded-full border border-border bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Лимитка
          </span>
        )}
      </div>
      {owned && (
        <span className="absolute right-2 top-2 z-10 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          в инвентаре
        </span>
      )}

      {/* Object capsule — the desire. ONE art path. */}
      <div className="relative mb-2 mt-1">
        <ItemArt
          code={item.code}
          itemClass={item.itemClass}
          glyph={item.glyph}
          rarity={item.rarity}
          size="md"
        />
      </div>

      <h3 className="relative line-clamp-1 text-sm font-bold tracking-tight text-foreground">{item.name}</h3>
      <p className="relative mt-0.5 label-eyebrow" style={{ color: t.color }}>
        {t.label}
      </p>
      {item.collectionName && (
        <p className="relative mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-[10px] text-muted-foreground">
          <span className="truncate">{item.collectionName}</span>
        </p>
      )}

      {/* Price — neutral lozenge, gold reserved for the coin itself. */}
      <div className="relative mt-2.5 w-full">
        <span className="type-economy inline-flex items-center justify-center rounded-full border border-border px-3 py-1">
          <CoinAmount value={item.priceEshki} size="sm" tone={cantAfford ? 'muted' : 'gold'} />
        </span>

        {lowStock && item.remaining != null && (
          <div className="mt-1.5 text-[11px] font-medium text-muted-foreground">
            осталось {fmt(item.remaining)}
          </div>
        )}
        {cantAfford && shortBy != null && shortBy > 0 && (
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            не хватает {fmt(shortBy)}
          </div>
        )}
      </div>

      <div className="relative mt-2.5 w-full">
        <GiftBuyButton
          code={item.code}
          name={item.name}
          rarity={item.rarity}
          priceEshki={item.priceEshki}
          color={t.color}
          owned={owned}
          affordable={affordable}
        />
      </div>
    </article>
  )
}
