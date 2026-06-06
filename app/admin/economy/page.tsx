import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import {
  loadEconomyOverview,
  loadDailyFlow,
  loadFlowBySource,
} from '@/lib/economy-analytics'
import {
  EconomyTabs,
  StatGrid,
  SectionTitle,
  Note,
  Empty,
  fmt,
  fmtSigned,
  type Stat,
} from './economy-ui'

export const dynamic = 'force-dynamic'

/**
 * Economy Dashboard — money-supply health at a glance. Read-only: every figure
 * is derived from the bot's transactions ledger and users balances. No writes.
 */
export default async function EconomyDashboardPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.ECONOMY_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра экономики.
      </div>
    )
  }

  const [overview, daily, sources] = await Promise.all([
    loadEconomyOverview(),
    loadDailyFlow(14),
    loadFlowBySource(30),
  ])

  const cards: Stat[] = [
    { emoji: '💰', label: 'Всего ешек', value: fmt(overview.totalEshki), tone: 'border-amber-400/25 from-amber-400/[0.08]' },
    { emoji: '👥', label: 'Игроков', value: fmt(overview.players), tone: 'border-primary/30 from-primary/[0.08]' },
    { emoji: '🔥', label: 'Активных (7д)', value: fmt(overview.activePlayers7d), tone: 'border-emerald-400/25 from-emerald-400/[0.08]', hint: 'уникальные авторы транзакций' },
    { emoji: '⚖️', label: 'Средний баланс', value: fmt(overview.avgBalance), tone: 'border-sky-400/25 from-sky-400/[0.08]' },
    { emoji: '🟢', label: 'Создано за день', value: fmt(overview.mintedToday), tone: 'border-emerald-400/25 from-emerald-400/[0.08]' },
    { emoji: '🔴', label: 'Сожжено за день', value: fmt(overview.burnedToday), tone: 'border-rose-400/25 from-rose-400/[0.08]' },
  ]

  const maxFlow = Math.max(
    1,
    ...daily.map((d) => Math.max(d.minted, d.burned)),
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
          💹 Экономика
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Состояние денежной массы в реальном времени. Источник — леджер
          транзакций бота. Только чтение.
        </p>
        <EconomyTabs active="/admin/economy" />
      </div>

      <section>
        <SectionTitle>Сводка</SectionTitle>
        <StatGrid cards={cards} />
        <div className="mt-3">
          <div
            className={`glass rounded-2xl border bg-gradient-to-br to-transparent p-4 ${
              overview.netToday != null && overview.netToday < 0
                ? 'border-emerald-400/30 from-emerald-400/[0.08]'
                : 'border-rose-400/30 from-rose-400/[0.08]'
            }`}
          >
            <div className="text-sm text-muted-foreground">
              Чистое изменение денежной массы за день
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {fmtSigned(overview.netToday)}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/70">
              создано − сожжено. Положительное = масса растёт (инфляция),
              отрицательное = масса сжимается.
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Поток за 14 дней</SectionTitle>
        {daily.length === 0 ? (
          <Empty>Пока нет транзакций.</Empty>
        ) : (
          <div className="glass overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">День</th>
                  <th className="px-3 py-2 text-right font-semibold">Создано</th>
                  <th className="px-3 py-2 text-right font-semibold">Сожжено</th>
                  <th className="px-3 py-2 text-right font-semibold">Нетто</th>
                  <th className="px-3 py-2 font-semibold">Баланс</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.day} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{d.day}</td>
                    <td className="px-3 py-2 text-right text-emerald-400">{fmt(d.minted)}</td>
                    <td className="px-3 py-2 text-right text-rose-400">{fmt(d.burned)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${d.net >= 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {fmtSigned(d.net)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex h-3 items-center gap-0.5">
                        <div
                          className="h-2 rounded-l bg-emerald-400/70"
                          style={{ width: `${(d.minted / maxFlow) * 50}%` }}
                        />
                        <div
                          className="h-2 rounded-r bg-rose-400/70"
                          style={{ width: `${(d.burned / maxFlow) * 50}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Источники за 30 дней</SectionTitle>
        {sources.length === 0 ? (
          <Empty>Пока нет транзакций.</Empty>
        ) : (
          <div className="glass overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Причина</th>
                  <th className="px-3 py-2 text-right font-semibold">Операций</th>
                  <th className="px-3 py-2 text-right font-semibold">Создано</th>
                  <th className="px-3 py-2 text-right font-semibold">Сожжено</th>
                  <th className="px-3 py-2 text-right font-semibold">Нетто</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.reason} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{s.reason}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(s.count)}</td>
                    <td className="px-3 py-2 text-right text-emerald-400">{fmt(s.minted)}</td>
                    <td className="px-3 py-2 text-right text-rose-400">{fmt(s.burned)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${s.net >= 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {fmtSigned(s.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3">
          <Note>
            «Нетто» по источнику = создано − сожжено для этой причины.
            Положительное = источник вливает ешки в экономику, отрицательное =
            изымает (сток).
          </Note>
        </div>
      </section>
    </div>
  )
}
