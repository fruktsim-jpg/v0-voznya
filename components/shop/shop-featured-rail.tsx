'use client'

import { CoinAmount } from '@/components/ds/coin'
import { ItemArt } from '@/components/ds/item-art'
import { rarityToken } from '@/lib/rarity'
import { Glyph } from '@/components/ds/icon'
import { GiftBuyButton } from '@/components/v2/gift-buy-button'
import type { ShopItem } from '@/lib/shop-types'

/**
 * ShopFeaturedRail (Shop redesign) — the storefront HERO. Answers "what is most
 * desirable / rare / limited right now" before any browsing. The top pick gets a
 * large showcase card; the rest ride a horizontal scarcity rail. This is the
 * "create desire" surface — not a grid.
 */
export function ShopFeaturedRail({
  items,
  ownedCodes,
  balance,
}: {
  items: ShopItem[]
  ownedCodes: Set<string>
  balance: number | null
}) {
  if (items.length === 0) return null
  const [hero, ...rest] = items
  const ht = rarityToken(hero.rarity)
  const heroAffordable = balance == null ? null : balance >= hero.priceEshki

  return (
    <section className="px-4 pt-2 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Объекты желания
        </h2>

        <div className="grid gap-2.5 lg:grid-cols-[1.3fr_1fr]">
          {/* Hero — the single most prestigious object. Calm Settings-grade
              surface: the OBJECT (rarity-glowing ItemArt) is the focus; rarity
              lives in a thin border tint + a label pill, not a full-card acid
              wash. */}
          <div
            className="glass relative overflow-hidden rounded-2xl border border-border p-4"
            style={{ borderColor: `${ht.color}40` }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(to right, ${ht.color}80, transparent 70%)` }}
            />
            <div className="flex items-center gap-3.5">
              <ItemArt code={hero.code} itemClass={hero.itemClass} glyph={hero.glyph} rarity={hero.rarity} size="lg" className="!h-20 !w-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: `${ht.color}1a`, color: ht.color }}
                  >
                    {ht.label}
                  </span>
                  {hero.limited && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                      Лимитка
                    </span>
                  )}
                  {hero.seasonal && (
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-foreground">
                      Сезон
                    </span>
                  )}
                </div>
                <h3 className="mt-1 truncate text-lg font-bold text-foreground">{hero.name}</h3>
                {hero.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {hero.description}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <CoinAmount value={hero.priceEshki} size="md" />
                  {hero.remaining != null && hero.remaining <= 5 && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                      <Glyph name="flame" className="h-3 w-3" />
                      осталось {hero.remaining.toLocaleString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <GiftBuyButton
                code={hero.code}
                name={hero.name}
                rarity={hero.rarity}
                priceEshki={hero.priceEshki}
                color={ht.color}
                owned={ownedCodes.has(hero.code)}
                affordable={heroAffordable}
              />
            </div>
          </div>

          {/* Rail — the runners-up, horizontally scannable */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {rest.map((it) => {
              const t = rarityToken(it.rarity)
              return (
                <div
                  key={it.code}
                  className="glass flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl border p-3 lg:min-w-0"
                  style={{ borderColor: `${t.color}33` }}
                >
                  <ItemArt code={it.code} itemClass={it.itemClass} glyph={it.glyph} rarity={it.rarity} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{it.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <CoinAmount value={it.priceEshki} size="xs" />
                      {it.limited && <span className="text-[10px] text-amber-300">лимитка</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
