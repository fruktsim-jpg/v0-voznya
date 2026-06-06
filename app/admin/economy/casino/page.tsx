import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import {
  loadCasinoOverview,
  loadCasinoExtremes,
} from '@/lib/economy-analytics'
import {
  EconomyTabs,
  StatGrid,
  SectionTitle,
  Note,
  Empty,
  fmt,
  fmtSigned,
  fmtPct,
  type Stat,
} from '../economy-ui'

export const dynamic = 'force-dynamic'

/**
 * Casino Analytics — reconstructed entirely from the transactions ledger
 * (reason='casino', meta {bet, payout, multiplier, outcome}). Read-only.
 * There is no dedicated casino table; each spin is one ledger row.
 */
export default async function CasinoAnalyticsPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.ECONOMY_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра экономики.
      </div>
    )
  }

  const [overview, wins, losses] = await Promise.all([
    loadCasinoOverview(),
    loadCasinoExtremes('win', 5),
    loadCasinoExtremes('loss', 5),
  ])

  const cards: Stat[] = [
    { emoji: '🎰', label: 'Ставок', value: fmt(overview.bets), tone: 'border-primary/30 from-primary/[0.08]' },
    { emoji: '📥', label: 'Сумма ставок', value: fmt(overview.totalWagered), tone: 'border-sky-400/25 from-sky-400/[0.08]' },
    { emoji: '📤', label: 'Сумма выигрышей', value: fmt(overview.totalPayout), tone: 'border-rose-400/25 from-rose-400/[0.08]' },
    { emoji: '🎯', label: 'Фактический RTP', value: fmtPct(overview.rtp), tone: 'border-amber-400/25 from-amber-400/[0.08]', hint: 'выплачено / поставлено' },
    {
      emoji: '🏦',
      label: 'Прибыль казино',
      value: fmtSigned(overview.houseProfit),
      tone:
        overview.houseProfit != null && overview.houseProfit >= 0
          ? 'border-emerald-400/25 from-emerald-400/[0.08]'
          : 'border-rose-400/25 from-rose-400/[0.08]',
      hint: 'поставлено − выплачено',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
          🎰 Аналитика казино
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Восстановлено из леджера транзакций (одна ставка = одна строка). Только
          чтение.
        </p>
        <EconomyTabs active="/admin/economy/casino" />
      </div>

      <section>
        <SectionTitle>Сводка</SectionTitle>
        {overview.bets == null ? (
          <Empty>Пока нет ставок в казино.</Empty>
        ) : (
          <StatGrid cards={cards} />
        )}
        <div className="mt-3">
          <Note>
            RTP (Return to Player) = доля поставленного, которая вернулась
            игрокам. Прибыль казино = поставлено − выплачено (= −Σ нетто по
            ставкам). Деталей по каждой ставке нет отдельной таблицей — всё из
            <code className="mx-1 rounded bg-white/[0.06] px-1">meta</code>
            транзакций.
          </Note>
        </div>
      </section>

      <section>
        <SectionTitle>🏆 Топ выигрыши</SectionTitle>
        {wins.length === 0 ? (
          <Empty>Пока нет выигрышей.</Empty>
        ) : (
          <ExtremeTable rows={wins} positive />
        )}
      </section>

      <section>
        <SectionTitle>💀 Топ проигрыши</SectionTitle>
        {losses.length === 0 ? (
          <Empty>Пока нет проигрышей.</Empty>
        ) : (
          <ExtremeTable rows={losses} positive={false} />
        )}
      </section>
    </div>
  )
}

function ExtremeTable({
  rows,
  positive,
}: {
  rows: {
    userId: number
    userName: string | null
    net: number
    bet: number
    payout: number
    outcome: string | null
    createdAt: string
  }[]
  positive: boolean
}) {
  return (
    <div className="glass overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Игрок</th>
            <th className="px-3 py-2 text-right font-semibold">Ставка</th>
            <th className="px-3 py-2 text-right font-semibold">Выплата</th>
            <th className="px-3 py-2 text-right font-semibold">Нетто</th>
            <th className="px-3 py-2 font-semibold">Исход</th>
            <th className="px-3 py-2 font-semibold">Когда</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.userId}-${i}`} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 font-medium text-foreground">
                {r.userName ?? `id ${r.userId}`}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.bet)}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.payout)}</td>
              <td className={`px-3 py-2 text-right font-semibold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                {fmtSigned(r.net)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{r.outcome ?? '—'}</td>
              <td className="px-3 py-2 text-[11px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString('ru-RU')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
