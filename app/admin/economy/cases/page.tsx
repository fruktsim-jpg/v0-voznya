import { getAdminSession } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import {
  loadCaseStats,
  loadRewardDistribution,
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

export const dynamic = 'force-dynamic'

/**
 * Cases Analytics — actual case economy reconstructed from the openings ledger
 * (case_openings) and the transactions ledger. Read-only. Item rewards have no
 * eshki value, so EV/granted figures cover only the currency portion.
 */
export default async function CasesAnalyticsPage() {
  const session = await getAdminSession()
  if (!session) return null
  if (!hasPermission(session.role, PERM.ECONOMY_VIEW)) {
    return (
      <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
        Недостаточно прав для просмотра экономики.
      </div>
    )
  }

  const [stats, dist] = await Promise.all([
    loadCaseStats(),
    loadRewardDistribution(),
  ])

  const distByCase = new Map<string, typeof dist>()
  for (const row of dist) {
    const arr = distByCase.get(row.caseCode) ?? []
    arr.push(row)
    distByCase.set(row.caseCode, arr)
  }

  const totalOpenings = stats.reduce((s, c) => s + c.openings, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
          🎁 Аналитика кейсов
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Фактическая экономика кейсов из журнала открытий. Только чтение.
        </p>
        <EconomyTabs active="/admin/economy/cases" />
      </div>

      <section>
        <SectionTitle>Кейсы ({fmt(totalOpenings)} открытий всего)</SectionTitle>
        {stats.length === 0 ? (
          <Empty>Пока нет открытий кейсов.</Empty>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Кейс</th>
                  <th className="px-3 py-2 text-right font-semibold">Открытий</th>
                  <th className="px-3 py-2 text-right font-semibold">Сожжено</th>
                  <th className="px-3 py-2 text-right font-semibold">Выдано</th>
                  <th className="px-3 py-2 text-right font-semibold">Нетто</th>
                  <th className="px-3 py-2 text-right font-semibold">EV (валюта)</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((c) => (
                  <tr key={c.caseCode} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{c.name ?? c.caseCode}</div>
                      <div className="text-[11px] text-muted-foreground">{c.caseCode}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{fmt(c.openings)}</td>
                    <td className="px-3 py-2 text-right text-rose-400">{fmt(c.eshkiBurned)}</td>
                    <td className="px-3 py-2 text-right text-emerald-400">{fmt(c.eshkiGranted)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${c.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {fmtSigned(c.net)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(c.avgGrantedPerOpen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 space-y-2">
          <Note>
            «Нетто» = сожжено (стоимость открытия) − выдано (валютные награды).
            Положительное = кейс приносит сток ешек (house edge). Учитывается
            только валютная часть наград.
          </Note>
          <Note>
            «EV (валюта)» — средняя валютная выдача за открытие. Предметные
            награды не имеют стоимости в ешках, поэтому в EV не входят. Чтобы EV
            был полным, нужно начать вести эталонную стоимость предметов
            (см. отчёт об аудите).
          </Note>
        </div>
      </section>

      <section>
        <SectionTitle>Распределение наград (факт)</SectionTitle>
        {dist.length === 0 ? (
          <Empty>Пока нет данных по выпадениям.</Empty>
        ) : (
          <div className="space-y-4">
            {[...distByCase.entries()].map(([caseCode, rows]) => {
              const name = stats.find((s) => s.caseCode === caseCode)?.name ?? caseCode
              return (
                <div key={caseCode} className="glass rounded-2xl border border-border p-4">
                  <div className="mb-3 text-sm font-semibold text-foreground">{name}</div>
                  <div className="space-y-2">
                    {rows.map((r, i) => {
                      const label =
                        r.rewardKind === 'currency'
                          ? 'Ешки'
                          : r.rewardItemCode ?? r.rewardKind
                      return (
                        <div key={`${caseCode}-${i}`} className="flex items-center gap-3 text-sm">
                          <div className="w-40 shrink-0 truncate text-muted-foreground" title={label}>
                            {label}
                          </div>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className="h-full rounded-full bg-primary/70"
                              style={{ width: `${Math.max(2, r.share * 100)}%` }}
                            />
                          </div>
                          <div className="w-28 shrink-0 text-right text-muted-foreground">
                            {fmt(r.hits)} · {fmtPct(r.share)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
