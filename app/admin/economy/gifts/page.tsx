import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { loadGiftsOverview } from '@/lib/economy-analytics'
import {
  EconomyTabs,
  SectionTitle,
  Note,
  Empty,
  fmt,
} from '../economy-ui'
import { AdminPageHeader } from '@/components/admin/ui'
import { StatCard, MetricGrid, Donut } from '@/components/admin/kit'

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

  const deliverySegments = [
    { value: g.completed, color: 'var(--accent-teal)', label: 'выдано' },
    { value: g.pending, color: '#f59e0b', label: 'ждут' },
    { value: g.cancelled, color: 'var(--accent-red)', label: 'отменено' },
  ]
  const deliveriesTotal = g.completed + g.pending + g.cancelled

  return (
    <div className="space-y-8">
      <div>
        <AdminPageHeader
          eyebrow="Экономика"
          title="🎀 Аналитика подарков"
          subtitle="Экономика каталога Telegram Gifts. Только чтение."
          actions={
            /* P0-3: переход к редактору каталога подарков. */
            <a
              href="/admin/gifts"
              className="rounded-lg border border-primary/40 px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/15"
            >
              ✏️ Редактор подарков
            </a>
          }
        />
        <EconomyTabs active="/admin/economy/gifts" />
      </div>


      <section>
        <SectionTitle>Сводка</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <MetricGrid cols={2} className="content-start">
            <StatCard label="Активных позиций" value={fmt(g.activeCount)} glyph="🎀" accent="pink" />
            <StatCard
              label="Выручка, ешки"
              value={fmt(g.revenueEshki)}
              glyph="💰"
              accent="gold"
              economy
              caption={`покупок: ${fmt(g.purchasesCount)}`}
            />
            <StatCard
              label="Истрачено Stars (факт)"
              value={fmt(g.starsSpentRealized)}
              glyph="⭐"
              accent="gold"
              caption="по выданным подаркам"
            />
            <StatCard
              label="Маржа, ешки"
              value={fmt(g.marginEshki)}
              glyph="📈"
              accent={g.marginEshki >= 0 ? 'teal' : 'red'}
              economy
              caption="выручка − себест.×10"
            />
            <StatCard
              label="Баланс фонда Stars"
              value={g.fundBalance == null ? '—' : fmt(g.fundBalance)}
              glyph="🏦"
              accent="gold"
              caption={`пополнено ${fmt(g.starsIn)} / истрачено ${fmt(g.starsOut)} ⭐`}
            />
          </MetricGrid>
          <div className="glass flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-gradient-to-b from-white/[0.05] to-transparent p-4">
            <Donut
              segments={deliverySegments}
              center={
                <div className="flex flex-col items-center">
                  <span className="type-stat text-2xl leading-none text-foreground">
                    {fmt(deliveriesTotal)}
                  </span>
                  <span className="label-eyebrow mt-1">доставки</span>
                </div>
              }
            />
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent-teal)]" /> выдано {fmt(g.completed)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#f59e0b]" /> ждут {fmt(g.pending)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent-red)]" /> отменено {fmt(g.cancelled)}
              </span>
            </div>
          </div>
        </div>
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
