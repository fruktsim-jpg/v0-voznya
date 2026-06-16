import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { loadShopItemStats, type ShopItemStat } from '@/lib/economy-analytics'
import { SectionTitle, Empty, fmt } from '../economy/economy-ui'
import { AdminPageHeader } from '@/components/admin/ui'
import { StatCard, MetricGrid, MiniBar } from '@/components/admin/kit'

export const dynamic = 'force-dynamic'

/**
 * Shop analytics (Admin V2 final — /admin/shop). Per-item lifecycle of every
 * Telegram-gift catalog position: bought today / total, dropped from cases,
 * withdrawn, gifted to a friend, sitting in inventories, refunded / sold back,
 * and revenue. Plus Top-N blocks and a dedicated Limited-items breakdown.
 * Read-only over gift_transactions + purchase_history; no migration.
 */

/** A small Top-N list card sorted by a numeric field, ranked with MiniBars. */
function TopBlock({
  title,
  emoji,
  rows,
  field,
  color = 'var(--primary)',
  hint,
}: {
  title: string
  emoji: string
  rows: ShopItemStat[]
  field: keyof ShopItemStat
  color?: string
  hint?: string
}) {
  const sorted = [...rows]
    .filter((r) => Number(r[field]) > 0)
    .sort((a, b) => Number(b[field]) - Number(a[field]))
    .slice(0, 5)
  const max = Math.max(1, ...sorted.map((r) => Number(r[field])))
  return (
    <div className="glass rounded-2xl border border-border p-4">
      <div className="mb-2 text-sm font-semibold text-foreground">
        {emoji} {title}
      </div>
      {sorted.length === 0 ? (
        <Empty>Нет данных.</Empty>
      ) : (
        <ul className="space-y-2 text-sm">
          {sorted.map((r) => (
            <li key={r.code} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-foreground">{r.name || r.code}</span>
                <span className="type-stat shrink-0 text-[13px]" style={{ color }}>
                  {fmt(Number(r[field]))}
                </span>
              </div>
              <MiniBar value={Number(r[field]) / max} color={color} height={6} />
            </li>
          ))}
        </ul>
      )}
      {hint && <p className="mt-2 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  )
}

export default async function ShopAnalyticsPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.ECONOMY_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра магазина.
      </div>
    )
  }

  const items = await loadShopItemStats()
  const limited = items.filter((i) => i.isLimited)

  // "Unused" = sitting in inventories but never withdrawn/gifted — dead stock.
  const unused = [...items]
    .filter((i) => i.inInventories > 0 && i.withdrawn === 0 && i.giftedToFriend === 0)
    .sort((a, b) => b.inInventories - a.inInventories)
    .slice(0, 5)
  const unusedMax = Math.max(1, ...unused.map((r) => r.inInventories))

  // Catalog-wide totals for the summary row.
  const totalBought = items.reduce((s, i) => s + i.boughtTotal, 0)
  const totalRevenue = items.reduce((s, i) => s + i.revenueEshki, 0)
  const totalWithdrawn = items.reduce((s, i) => s + i.withdrawn, 0)
  const totalInInventories = items.reduce((s, i) => s + i.inInventories, 0)

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Экономика"
        title="🛒 Магазин"
        subtitle="Жизненный цикл каждого предмета магазина: куплено, выпало из кейсов, выведено, подарено, лежит в инвентарях, продано обратно. Только чтение."
        actions={
          <a
            href="/admin/gifts"
            className="rounded-lg border border-primary/40 px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/15"
          >
            ✏️ Редактор подарков
          </a>
        }
      />

      {items.length > 0 && (
        <section>
          <SectionTitle>Сводка</SectionTitle>
          <MetricGrid cols={4}>
            <StatCard label="Куплено всего" value={fmt(totalBought)} glyph="🛒" accent="pink" />
            <StatCard label="Выручка, ешки" value={fmt(totalRevenue)} glyph="💰" accent="gold" economy />
            <StatCard label="Выведено" value={fmt(totalWithdrawn)} glyph="📤" accent="indigo" />
            <StatCard label="В инвентарях" value={fmt(totalInInventories)} glyph="📦" accent="gold" caption="лежит у игроков" />
          </MetricGrid>
        </section>
      )}

      {/* Top blocks */}
      <section>
        <SectionTitle>Топы</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TopBlock title="Покупки" emoji="🛒" rows={items} field="boughtTotal" color="var(--accent-pink)" />
          <TopBlock title="Выводы" emoji="📤" rows={items} field="withdrawn" color="var(--accent-indigo)" />
          <TopBlock title="Продажи обратно" emoji="↩️" rows={items} field="soldBack" color="var(--accent-violet)" />
          <div className="glass rounded-2xl border border-border p-4">
            <div className="mb-2 text-sm font-semibold text-foreground">
              💤 Неиспользуемые
            </div>
            {unused.length === 0 ? (
              <Empty>Нет данных.</Empty>
            ) : (
              <ul className="space-y-2 text-sm">
                {unused.map((r) => (
                  <li key={r.code} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-foreground">{r.name || r.code}</span>
                      <span className="type-stat shrink-0 text-[13px] text-amber-300">
                        {fmt(r.inInventories)}
                      </span>
                    </div>
                    <MiniBar value={r.inInventories / unusedMax} color="#f59e0b" height={6} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              лежат в инвентарях, ни разу не выведены и не подарены
            </p>
          </div>
        </div>
      </section>

      {/* Per-item table */}
      <section>
        <SectionTitle>Предметы</SectionTitle>
        {items.length === 0 ? (
          <Empty>Магазин пуст.</Empty>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Предмет</th>
                  <th className="px-3 py-2 text-right font-semibold">Сегодня</th>
                  <th className="px-3 py-2 text-right font-semibold">Куплено</th>
                  <th className="px-3 py-2 text-right font-semibold">Из кейсов</th>
                  <th className="px-3 py-2 text-right font-semibold">Выведено</th>
                  <th className="px-3 py-2 text-right font-semibold">Другу</th>
                  <th className="px-3 py-2 text-right font-semibold">В инвент.</th>
                  <th className="px-3 py-2 text-right font-semibold">Возвраты</th>
                  <th className="px-3 py-2 text-right font-semibold">Продано</th>
                  <th className="px-3 py-2 text-right font-semibold">Выручка</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.code} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{r.name || r.code}</span>
                        {r.isLimited && (
                          <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-1.5 py-0.5 text-[9px] font-medium text-fuchsia-200">
                            лимитка
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{r.code}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-300">{fmt(r.boughtToday)}</td>
                    <td className="px-3 py-2 text-right text-foreground">{fmt(r.boughtTotal)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.fromCases)}</td>
                    <td className="px-3 py-2 text-right text-sky-200">{fmt(r.withdrawn)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.giftedToFriend)}</td>
                    <td className="px-3 py-2 text-right text-amber-200">{fmt(r.inInventories)}</td>
                    <td className="px-3 py-2 text-right text-rose-300">{fmt(r.refunded)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.soldBack)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-400">{fmt(r.revenueEshki)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Limited items breakdown */}
      <section>
        <SectionTitle>Лимитки</SectionTitle>
        {limited.length === 0 ? (
          <Empty>Лимитированных предметов нет.</Empty>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Лимитка</th>
                  <th className="px-3 py-2 text-right font-semibold">Куплено</th>
                  <th className="px-3 py-2 text-right font-semibold">Из кейсов</th>
                  <th className="px-3 py-2 text-right font-semibold">Выведено</th>
                  <th className="px-3 py-2 text-right font-semibold">В инвентарях</th>
                </tr>
              </thead>
              <tbody>
                {limited.map((r) => (
                  <tr key={r.code} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{r.name || r.code}</td>
                    <td className="px-3 py-2 text-right text-foreground">{fmt(r.boughtTotal)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.fromCases)}</td>
                    <td className="px-3 py-2 text-right text-sky-200">{fmt(r.withdrawn)}</td>
                    <td className="px-3 py-2 text-right text-amber-200">{fmt(r.inInventories)}</td>
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
