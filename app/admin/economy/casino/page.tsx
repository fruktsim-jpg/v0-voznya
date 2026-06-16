import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import {
  loadCasinoOverview,
  loadCasinoExtremes,
} from '@/lib/economy-analytics'
import {
  EconomyTabs,
  SectionTitle,
  Note,
  Empty,
  fmt,
  fmtSigned,
  fmtPct,
} from '../economy-ui'
import { AdminPageHeader } from '@/components/admin/ui'
import { StatCard, MetricGrid, Donut, MiniBar } from '@/components/admin/kit'

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

  const rtp = overview.rtp ?? 0
  // RTP <= 100% means the house keeps an edge (teal/здоровый); > 100% means the
  // casino pays out more than it takes (amber/тревога).
  const rtpColor = rtp <= 1 ? 'var(--accent-teal)' : '#f59e0b'
  const houseUp = overview.houseProfit != null && overview.houseProfit >= 0

  return (
    <div className="space-y-8">
      <div>
        <AdminPageHeader
          eyebrow="Экономика"
          title="🎰 Аналитика казино"
          subtitle="Восстановлено из леджера транзакций (одна ставка = одна строка). Только чтение."
        />
        <EconomyTabs active="/admin/economy/casino" />
      </div>

      <section>
        <SectionTitle>Сводка</SectionTitle>
        {overview.bets == null ? (
          <Empty>Пока нет ставок в казино.</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
            <div className="glass flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-gradient-to-b from-white/[0.05] to-transparent p-4">
              <Donut
                value={rtp}
                color={rtpColor}
                rounded
                center={
                  <div className="flex flex-col items-center">
                    <span className="type-stat text-2xl leading-none" style={{ color: rtpColor }}>
                      {fmtPct(rtp)}
                    </span>
                    <span className="label-eyebrow mt-1">RTP</span>
                  </div>
                }
              />
              <div className="text-center text-[11px] text-muted-foreground">
                {rtp <= 1 ? 'House edge сохраняется' : 'Выплат больше, чем ставок'}
              </div>
            </div>
            <MetricGrid cols={2} className="content-start">
              <StatCard label="Ставок" value={fmt(overview.bets)} glyph="🎰" accent="indigo" />
              <StatCard
                label="Сумма ставок"
                value={fmt(overview.totalWagered)}
                glyph="📥"
                accent="gold"
                economy
                caption="поставлено игроками"
              />
              <StatCard
                label="Сумма выигрышей"
                value={fmt(overview.totalPayout)}
                glyph="📤"
                accent="gold"
                economy
                caption="выплачено игрокам"
              />
              <StatCard
                label="Прибыль казино"
                value={fmtSigned(overview.houseProfit)}
                glyph="🏦"
                accent={houseUp ? 'teal' : 'red'}
                economy
                caption="поставлено − выплачено"
              />
            </MetricGrid>
          </div>
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
          <div className="space-y-4">
            <ExtremeBars rows={wins} positive />
            <ExtremeTable rows={wins} positive />
          </div>
        )}
      </section>

      <section>
        <SectionTitle>💀 Топ проигрыши</SectionTitle>
        {losses.length === 0 ? (
          <Empty>Пока нет проигрышей.</Empty>
        ) : (
          <div className="space-y-4">
            <ExtremeBars rows={losses} positive={false} />
            <ExtremeTable rows={losses} positive={false} />
          </div>
        )}
      </section>
    </div>
  )
}

type ExtremeRow = {
  userId: number
  userName: string | null
  net: number
  bet: number
  payout: number
  outcome: string | null
  createdAt: string
}

/** Ranked viz summary above the detail table — net размером бара. */
function ExtremeBars({ rows, positive }: { rows: ExtremeRow[]; positive: boolean }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.net)))
  const color = positive ? 'var(--accent-teal)' : 'var(--accent-red)'
  return (
    <div className="glass rounded-2xl border border-border bg-gradient-to-b from-white/[0.04] to-transparent p-4">
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={`${r.userId}-${i}`} className="flex items-center gap-3 text-sm">
            <div className="w-44 shrink-0 truncate text-foreground" title={r.userName ?? `id ${r.userId}`}>
              <span className="mr-1.5 text-[11px] text-muted-foreground">#{i + 1}</span>
              {r.userName ?? `id ${r.userId}`}
            </div>
            <MiniBar value={Math.abs(r.net) / max} color={color} className="flex-1" />
            <div
              className={`w-24 shrink-0 text-right type-economy text-[13px] ${positive ? 'text-emerald-300' : 'text-rose-300'}`}
            >
              {fmtSigned(r.net)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExtremeTable({ rows, positive }: { rows: ExtremeRow[]; positive: boolean }) {
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
              <td className={`px-3 py-2 text-right type-economy ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
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
