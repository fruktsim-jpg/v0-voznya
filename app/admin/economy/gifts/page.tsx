import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { loadGiftsOverview } from '@/lib/economy-analytics'
import {
  EconomyTabs,
  StatGrid,
  SectionTitle,
  Note,
  Empty,
  fmt,
  type Stat,
} from '../economy-ui'

export const dynamic = 'force-dynamic'

/**
 * Gifts Analytics — catalog economics. Catalog + Stars cost basis are real now.
 * Sales/spend/fund are zeros/placeholders until the purchase flow ships (no
 * gift_buy transactions yet, sold_count stays 0, no fund ledger). Read-only.
 */
export default async function GiftsAnalyticsPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.ECONOMY_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра экономики.
      </div>
    )
  }

  const g = await loadGiftsOverview()

  const cards: Stat[] = [
    { emoji: '🎀', label: 'Активных позиций', value: fmt(g.activeCount), tone: 'border-primary/30 from-primary/[0.08]' },
    { emoji: '⭐', label: 'Себестоимость, Stars', value: fmt(g.estStarCostBasis), tone: 'border-amber-400/25 from-amber-400/[0.08]', hint: 'Σ за единицу (актив.)' },
    { emoji: '📦', label: 'Выдано подарков', value: fmt(g.giftsSold), tone: 'border-sky-400/25 from-sky-400/[0.08]' },
    { emoji: '💸', label: 'Потрачено игроками, ешки', value: g.eshkiSpentByPlayers == null ? '—' : fmt(g.eshkiSpentByPlayers), tone: 'border-rose-400/25 from-rose-400/[0.08]' },
    { emoji: '⭐', label: 'Истрачено Stars (факт)', value: fmt(g.starsSpentRealized), tone: 'border-amber-400/25 from-amber-400/[0.08]', hint: 'Σ star_cost × продано' },
    { emoji: '🏦', label: 'Баланс фонда Gifts', value: g.fundBalance == null ? '—' : fmt(g.fundBalance), tone: 'border-border from-white/[0.04]', hint: 'учёт пока не ведётся' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
          🎀 Аналитика подарков
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Экономика каталога Telegram Gifts. Только чтение.
        </p>
        <EconomyTabs active="/admin/economy/gifts" />
      </div>

      <section>
        <SectionTitle>Сводка</SectionTitle>
        <StatGrid cards={cards} />
        <div className="mt-3 space-y-2">
          <Note>
            Продажи, траты игроков и баланс фонда станут реальными после запуска
            потока покупки подарков. Сейчас продаж нет (sold_count = 0), а
            отдельного леджера фонда Gifts ещё нет — поэтому «—».
          </Note>
          <Note>
            Чтобы аналитика P&amp;L заработала, при запуске магазина нужно: писать
            транзакцию <code className="rounded bg-white/[0.06] px-1">purchase</code> c
            <code className="mx-1 rounded bg-white/[0.06] px-1">meta.source=&apos;gift_buy&apos;</code>
            и вести фонд (приход ешек игроков vs расход Stars владельца).
          </Note>
        </div>
      </section>

      <section>
        <SectionTitle>Каталог</SectionTitle>
        {g.catalog.length === 0 ? (
          <Empty>Каталог подарков пуст.</Empty>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Подарок</th>
                  <th className="px-3 py-2 text-right font-semibold">Цена, ешки</th>
                  <th className="px-3 py-2 text-right font-semibold">Себест., ⭐</th>
                  <th className="px-3 py-2 text-right font-semibold">Запас</th>
                  <th className="px-3 py-2 text-right font-semibold">Продано</th>
                  <th className="px-3 py-2 font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody>
                {g.catalog.map((row) => (
                  <tr key={row.code} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{row.name}</div>
                      <div className="text-[11px] text-muted-foreground">{row.code}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{fmt(row.priceEshki)}</td>
                    <td className="px-3 py-2 text-right text-amber-300">{fmt(row.starCost)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {row.stock == null ? '∞' : fmt(row.stock)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(row.soldCount)}</td>
                    <td className="px-3 py-2">
                      {row.isActive ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          активен
                        </span>
                      ) : (
                        <span className="rounded-full border border-border bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          скрыт
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
