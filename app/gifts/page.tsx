import Link from 'next/link'
import { getShowcaseGifts } from '@/lib/gifts'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Подарки — Возня',
  description: 'Магазин Telegram Gifts за ешки: к чему копить и сколько стоит.',
}

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * Public, read-only Gifts showcase. Lists active in-stock catalog positions
 * with their eshki price. The site never sells or delivers — buying happens in
 * the bot (/подарки) through the single Python flow. Star cost is not exposed.
 * Degrades to a friendly empty state before migration 0018 / 0020.
 */
export default async function GiftsPage() {
  const gifts = await getShowcaseGifts()

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <header className="mb-8 text-center">
          <div className="mb-2 text-4xl">🎁</div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Магазин подарков
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Копи ешки и забирай реальные Telegram Gifts. Купить можно в боте
            командой
            <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5">/подарки</code>.
          </p>
        </header>

        {gifts.length === 0 ? (
          <div className="glass mx-auto max-w-md rounded-3xl border border-border p-8 text-center">
            <div className="mb-2 text-3xl">📦</div>
            <p className="text-sm text-muted-foreground">
              Подарков пока нет в наличии. Загляни позже — скоро добавим.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              ← На главную
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gifts.map((g) => (
              <article
                key={g.code}
                className="glass flex flex-col rounded-3xl border border-border p-5"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-foreground">🎁 {g.name}</h2>
                  {g.remaining != null && (
                    <span className="shrink-0 rounded-full border border-border bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground">
                      осталось {fmt(g.remaining)}
                    </span>
                  )}
                </div>
                {g.description && (
                  <p className="mb-3 flex-1 text-sm text-muted-foreground">
                    {g.description}
                  </p>
                )}
                <div className="mt-auto pt-2">
                  <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-200">
                    {fmt(g.priceEshki)} ешек
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Цена указана в ешках. Подарок отправляется в Telegram после покупки в
          боте. Количество ограничено наличием.
        </p>
      </div>
    </main>
  )
}
