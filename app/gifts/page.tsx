import Link from 'next/link'
import { getShowcaseGifts } from '@/lib/gifts'
import { GiftCard } from '@/components/v2/gift-card'
import { Section } from '@/components/v2/section'
import { RARITY_TOKENS, type Rarity } from '@/lib/rarity'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Подарки — Возня',
  description: 'Коллекция Telegram Gifts: трофеи, редкости и лимитки сообщества.',
}

// Порядок редкости от высшей к низшей — легендарные трофеи впереди.

const RARITY_ORDER: Rarity[] = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common']

/**
 * Gifts (V3, поверхность №4) — Telegram Gifts как КОЛЛЕКЦИЯ и трофеи, не магазин.
 * Витрина «трофеев» (легендарные/лимитные впереди), легенда редкостей, сетка
 * коллекции по убыванию престижа. Покупка — в боте (/подарки). Read-only,
 * данные из getShowcaseGifts. Star cost не раскрывается.
 */
export default async function GiftsPage() {
  const gifts = await getShowcaseGifts()

  // Сортировка коллекции: по редкости, затем по цене (дороже выше).
  const sorted = [...gifts].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
      b.priceEshki - a.priceEshki,
  )
  const trophies = sorted.filter(
    (g) => g.rarity === 'legendary' || g.rarity === 'mythic' || g.limited,
  ).slice(0, 3)

  // Какие редкости присутствуют — для легенды.
  const presentRarities = RARITY_ORDER.filter((r) => sorted.some((g) => g.rarity === r))

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      {/* Hero */}
      <section className="relative px-6 pb-2 pt-20 text-center sm:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-amber-400/20 blur-[120px]"
        />
        <div className="relative mx-auto max-w-2xl">
          <div className="mb-2 text-5xl">🎁</div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Коллекция <span className="text-gradient">подарков</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Реальные Telegram Gifts — трофеи Возни. Чем реже подарок, тем он ценнее.
            Забрать можно в боте командой{' '}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5">/подарки</code>.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {sorted.length === 0 ? (
          <div className="glass mx-auto max-w-md rounded-3xl border border-border p-8 text-center">
            <div className="mb-2 text-3xl">📦</div>
            <p className="text-sm text-muted-foreground">
              Коллекция пока пуста. Скоро здесь появятся редкие трофеи.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              ← На главную
            </Link>
          </div>
        ) : (
          <>
            {/* Трофеи — самое ценное */}
            {trophies.length > 0 && (
              <Section title="✨ Трофеи коллекции" subtitle="Самое редкое и желанное" className="!px-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {trophies.map((g) => (
                    <GiftCard key={g.code} gift={g} />
                  ))}
                </div>
              </Section>
            )}

            {/* Легенда редкостей */}
            <div className="my-4 flex flex-wrap items-center justify-center gap-2">
              {presentRarities.map((r) => {
                const t = RARITY_TOKENS[r]
                return (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                    style={{ borderColor: `${t.color}66`, color: t.color }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                      aria-hidden="true"
                    />
                    {t.label}
                  </span>
                )
              })}
            </div>

            {/* Вся коллекция */}
            <Section title="Вся коллекция" subtitle={`${sorted.length} подарков`} className="!px-0">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {sorted.map((g) => (
                  <GiftCard key={g.code} gift={g} />
                ))}
              </div>
            </Section>
          </>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Цена указана в ешках. Подарок отправляется в Telegram после покупки в боте.
          Лимитированные позиции ограничены наличием — успей забрать.
        </p>
      </div>
    </main>
  )
}
