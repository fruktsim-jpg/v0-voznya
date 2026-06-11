import Link from 'next/link'
import { getShowcaseGifts } from '@/lib/gifts'
import { GiftCard } from '@/components/v2/gift-card'
import { ScreenHeader } from '@/components/v2/screen-header'
import { Glyph } from '@/components/ds/icon/glyph'
import { type Rarity } from '@/lib/rarity'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Подарки — Возня',
  description: 'Коллекция Telegram Gifts: трофеи, редкости и лимитки сообщества.',
}

// Порядок редкости от высшей к низшей — легендарные трофеи впереди.
const RARITY_ORDER: Rarity[] = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common']

/**
 * Gifts (App Redesign V1) — коллекция Telegram Gifts как ПРИЛОЖЕНИЕ. Тонкий
 * title bar + сразу плотная сетка коллекции, без дублирующего блока «Трофеи»,
 * легенды редкостей и сносок. Редкость кодируется цветом самой карточки.
 * Покупка — в боте (/подарки). Read-only.
 */
export default async function GiftsPage() {
  const gifts = await getShowcaseGifts()

  const sorted = [...gifts].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
      b.priceEshki - a.priceEshki,
  )

  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader icon="gift" title="Подарки" kicker="Подарки сообщества" accent="pink" />

      <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
        {sorted.length === 0 ? (
          <div className="glass mx-auto mt-6 max-w-md rounded-2xl border border-border p-8 text-center">
            <Glyph name="gift" className="mx-auto mb-2 text-3xl text-accent-pink" />
            <p className="text-sm text-muted-foreground">
              Коллекция пока пуста. Скоро здесь появятся редкие трофеи.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              ← На главную
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map((g) => (
              <GiftCard key={g.code} gift={g} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
