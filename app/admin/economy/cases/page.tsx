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
import { AdminPageHeader } from '@/components/admin/ui'
import { StatCard, MetricGrid, MiniBar } from '@/components/admin/kit'
import { OpeningsHistory } from './openings-history'


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
  const totalUnpriced = stats.reduce((s, c) => s + c.itemRewardsUnpriced, 0)
  const totalBurned = stats.reduce((s, c) => s + c.eshkiBurned, 0)
  const totalGranted = stats.reduce((s, c) => s + c.eshkiGranted + c.itemValueGranted, 0)
  const totalNet = stats.reduce((s, c) => s + c.net, 0)


  return (
    <div className="space-y-8">
      <div>
        <AdminPageHeader
          eyebrow="Экономика"
          title="🎁 Аналитика кейсов"
          subtitle="Фактическая экономика кейсов из журнала открытий. Только чтение."
          actions={
            /* P0-3: переход к редактору кейсов и дроп-листов. */
            <a
              href="/admin/cases"
              className="rounded-lg border border-primary/40 px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/15"
            >
              ✏️ Редактор кейсов
            </a>
          }
        />
        <EconomyTabs active="/admin/economy/cases" />
      </div>

      {stats.length > 0 && (
        <section>
          <SectionTitle>Сводка</SectionTitle>
          <MetricGrid cols={4}>
            <StatCard label="Открытий всего" value={fmt(totalOpenings)} glyph="🎁" accent="indigo" />
            <StatCard label="Сожжено" value={fmt(totalBurned)} glyph="🔥" accent="red" economy caption="стоимость открытий" />
            <StatCard label="Выдано" value={fmt(totalGranted)} glyph="🎉" accent="gold" economy caption="валюта + предметы" />
            <StatCard
              label="Нетто"
              value={fmtSigned(totalNet)}
              glyph="🏦"
              accent={totalNet >= 0 ? 'teal' : 'red'}
              economy
              caption={totalNet >= 0 ? 'house edge' : 'убыточно'}
            />
          </MetricGrid>
        </section>
      )}


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
                  <th className="px-3 py-2 text-right font-semibold">Выдано (валюта)</th>
                  <th className="px-3 py-2 text-right font-semibold">Выдано (предметы)</th>
                  <th className="px-3 py-2 text-right font-semibold">Нетто</th>
                  <th className="px-3 py-2 text-right font-semibold">EV полный</th>
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
                    <td className="px-3 py-2 text-right text-emerald-400">
                      {fmt(c.itemValueGranted)}
                      {c.itemRewardsUnpriced > 0 && (
                        <span className="ml-1 text-[10px] text-amber-300" title="предметные выпадения без оценочной стоимости">
                          (+{fmt(c.itemRewardsUnpriced)}?)
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${c.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {fmtSigned(c.net)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(c.avgFullEvPerOpen)}</td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
        <div className="mt-3 space-y-2">
          <Note>
            «Нетто» = сожжено (стоимость открытия) − выдано (валюта + предметы по
            оценочной стоимости). Положительное = кейс приносит сток ешек (house
            edge), отрицательное = кейс убыточен.
          </Note>
          <Note>
            «Выдано (предметы)» и «EV полный» учитывают оценочную стоимость
            предметов (<code className="rounded bg-white/[0.06] px-1">inventory_items.ref_value</code>).
            {totalUnpriced > 0 ? (
              <>
                {' '}Сейчас {fmt(totalUnpriced)} предметных выпадений без
                проставленного <code className="rounded bg-white/[0.06] px-1">ref_value</code> —
                они помечены «?» и не входят в стоимость. Проставь стоимость
                предметам, чтобы EV стал точным.
              </>
            ) : (
              <> Все выпавшие предметы оценены — EV полный и точный.</>
            )}
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
              const maxShare = Math.max(0.0001, ...rows.map((r) => r.share))
              return (
                <div key={caseCode} className="glass rounded-2xl border border-border p-4">
                  <div className="mb-3 text-sm font-semibold text-foreground">{name}</div>
                  <div className="space-y-2">
                    {rows.map((r, i) => {
                      const isCurrency = r.rewardKind === 'currency'
                      const label = isCurrency ? 'Ешки' : r.rewardItemCode ?? r.rewardKind
                      // Валюта — золото; предметные выпадения — фиолетовый (престиж).
                      const color = isCurrency
                        ? 'var(--accent-gold)'
                        : 'var(--accent-violet)'
                      return (
                        <div key={`${caseCode}-${i}`} className="flex items-center gap-3 text-sm">
                          <div className="w-40 shrink-0 truncate text-muted-foreground" title={label}>
                            {label}
                          </div>
                          <MiniBar value={r.share / maxShare} color={color} className="flex-1" />
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

      <section>
        <SectionTitle>История открытий</SectionTitle>
        <OpeningsHistory
          cases={stats.map((c) => ({ code: c.caseCode, name: c.name ?? c.caseCode }))}
        />
      </section>
    </div>
  )
}


