import Link from 'next/link'
import { getActiveCasesWithRewards, type ShowcaseCase } from '@/lib/cases'
import { rarityStyle } from '@/lib/inventory'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Кейсы — Возня',
  description: 'Активные кейсы Возни: содержимое, редкости и честные шансы.',
}

const fmt = (n: number) => n.toLocaleString('ru-RU')

function chanceLabel(pct: number): string {
  if (pct >= 10) return `${pct.toFixed(0)}%`
  if (pct >= 1) return `${pct.toFixed(1)}%`
  return `${pct.toFixed(2)}%`
}

function costLabel(c: ShowcaseCase): string {
  if (c.openCostKind === 'currency' && c.openCostAmount > 0) {
    return `${fmt(c.openCostAmount)} ешек`
  }
  if (c.consumesKey) return 'нужен кейс'
  return 'бесплатно'
}

/**
 * Public, read-only Cases showcase. Lists active cases with their drop-lists
 * and honest odds (weight / Σweight). The site never opens cases — opening
 * happens only in the bot (and, later, the Mini App through the same Python
 * flow). This page is pure display, styled with the site's glass + rarity
 * language and degrading to a friendly empty state before migration 0016.
 */
export default async function CasesPage() {
  const cases = await getActiveCasesWithRewards()

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <header className="mb-8 text-center">
          <div className="mb-2 text-4xl">🎁</div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Кейсы Возни</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Содержимое и честные шансы. Открыть можно в боте командой
            <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5">/кейсы</code>.
            Каждое открытие фиксируется в проверяемом логе.
          </p>
        </header>

        {cases.length === 0 ? (
          <div className="glass mx-auto max-w-md rounded-3xl border border-border p-8 text-center">
            <div className="mb-2 text-3xl">📦</div>
            <p className="text-sm text-muted-foreground">
              Активных кейсов пока нет. Загляни позже — скоро добавим.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              ← На главную
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cases.map((c) => (
              <article
                key={c.itemCode}
                className="glass rounded-3xl border border-border p-5"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h2 className="truncate text-lg font-bold text-foreground">🎁 {c.name}</h2>
                  <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                    {costLabel(c)}
                  </span>
                </div>
                {c.description && (
                  <p className="mb-3 text-sm text-muted-foreground">{c.description}</p>
                )}

                {c.rewards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Содержимое скоро появится.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {c.rewards.map((r, idx) => {
                      const isItem = r.rewardKind === 'item'
                      const rs = isItem ? rarityStyle(r.rewardItemRarity ?? 'common') : null
                      const label = isItem
                        ? r.rewardItemName ?? r.rewardItemCode ?? 'предмет'
                        : `${fmt(r.amount ?? 0)} ешек`
                      const qty =
                        r.minQty === r.maxQty
                          ? r.minQty > 1
                            ? ` ×${r.minQty}`
                            : ''
                          : ` ×${r.minQty}–${r.maxQty}`
                      return (
                        <li
                          key={idx}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                            rs ? rs.className : 'border-amber-500/30 bg-amber-900/10'
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate text-foreground">
                            {r.isJackpot && '💎 '}
                            {isItem ? '' : '💰 '}
                            {label}
                            <span className="text-muted-foreground">{qty}</span>
                            {r.limited && (
                              <span className="ml-2 text-[11px] text-amber-300">лимит</span>
                            )}
                          </span>
                          {rs && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {rs.label}
                            </span>
                          )}
                          <span className="shrink-0 font-mono text-xs text-primary">
                            {chanceLabel(r.chance)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Шансы рассчитаны из весов дроп-листа. Возможны лимитированные награды
          (джекпоты) с ограниченным числом выпадений.
        </p>
      </div>
    </main>
  )
}
