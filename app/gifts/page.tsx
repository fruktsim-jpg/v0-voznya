import Link from 'next/link'
import { getShopCatalog, pickFeatured } from '@/lib/shop-catalog'
import { ShopExperience } from '@/components/shop/shop-experience'
import { ScreenHeader } from '@/components/v2/screen-header'
import { Glyph } from '@/components/ds/icon/glyph'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Магазин — Возня',
  description:
    'Магазин Возни: Telegram Gifts и Premium за ешки. Редкие, лимитированные и сезонные подарки сообщества.',
}

/**
 * Shop (redesign) — a DESTINATION, not a catalog. The server computes the
 * desire-ranked storefront (rarity / category / limited / seasonal / featured)
 * over gift_catalog and hands it to the interactive ShopExperience, which layers
 * the player's balance + owned items (read-only) for affordability and ownership
 * hints. The purchase itself goes through the audited buy action (AGENTS.md).
 */
export default async function ShopPage() {
  const catalog = await getShopCatalog()
  const featured = pickFeatured(catalog, 5)

  return (
    <main className="relative min-h-svh overflow-x-hidden pb-6">
      <ScreenHeader icon="gift" title="Магазин" kicker="Подарки сообщества" accent="pink" />

      {catalog.length === 0 ? (
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center">
            <Glyph name="gift" className="mx-auto mb-2 text-3xl text-accent-pink" />
            <p className="text-sm text-muted-foreground">
              Витрина пока пуста. Скоро здесь появятся редкие трофеи.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              ← На главную
            </Link>
          </div>
        </div>
      ) : (
        <ShopExperience catalog={catalog} featured={featured} />
      )}
    </main>
  )
}
