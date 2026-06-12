'use client'

import { CoinAmount } from '@/components/ds/coin'
import { ItemArt } from '@/components/ds/item-art'
import { rarityToken } from '@/lib/rarity'
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
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Объекты желания
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          {/* Hero — the single most prestigious object */}
          <div
            className="glass relative overflow-hidden rounded-3xl border p-5"
            style={{
              borderColor: `${ht.color}55`,
              boxShadow: ht.glow || undefined,
              backgroundImage: ht.gradient,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: `${ht.color}22`, color: ht.color }}
              >
                {ht.label}
              </span>
              {hero.limited && (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                  Лимитка
                </span>
              )}
              {hero.seasonal && (
                <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  Сезон
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <ItemArt code={hero.code} itemClass={hero.itemClass} glyph={hero.glyph} rarity={hero.rarity} size="xl" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xl font-bold text-foreground">{hero.name}</h3>
                {hero.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {hero.description}
                  </p>
                )}
                <div className="mt-3">
                  <CoinAmount value={hero.priceEshki} size="lg" />
                </div>
                {hero.remaining != null && hero.remaining <= 5 && (
                  <p className="mt-1 text-xs font-semibold text-amber-300">
                    🔥 осталось {hero.remaining.toLocaleString('ru-RU')}
                  </p>
                )}
                <div className="mt-3 max-w-[220px]">
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
