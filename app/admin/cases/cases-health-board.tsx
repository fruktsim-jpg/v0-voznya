import { FLAG_META, type CasesHealthReport, type CaseHealth } from '@/lib/admin/case-health'

/**
 * CasesHealthBoard — operator interpretation of all live cases at a glance.
 * Leads with "what needs attention", then the performance ranking. Not another
 * raw table: every row carries a verdict + reason. Read-only.
 */

const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU')

function VerdictPill({ c }: { c: CaseHealth }) {
  const m = FLAG_META[c.verdict]
  return <span className={`shrink-0 text-xs font-semibold ${m.tone}`}>{m.label}</span>
}

export function CasesHealthBoard({ report }: { report: CasesHealthReport }) {
  if (report.totals.cases === 0) return null
  const { totals, attention, topByOpenings } = report
  const maxOpen = Math.max(1, ...topByOpenings.map((c) => c.openingsTotal))

  return (
    <section className="space-y-4">
      {/* Roll-up */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Roll label="Кейсов" value={fmt(totals.cases)} />
        <Roll label="Открытий всего" value={fmt(totals.openingsTotal)} />
        <Roll label="Открытий за сутки" value={fmt(totals.openingsToday)} />
        <Roll
          label="Требуют внимания"
          value={fmt(totals.needsAttention)}
          tone={totals.needsAttention > 0 ? 'text-amber-300' : 'text-emerald-300'}
        />
      </div>

      {/* Needs attention */}
      <div className="glass rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.05] to-transparent p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Требуют внимания</h3>
        {attention.length === 0 ? (
          <p className="text-sm text-emerald-300">Все кейсы в пределах нормы.</p>
        ) : (
          <ul className="space-y-2">
            {attention.map((c) => (
              <li key={c.caseCode} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                    <VerdictPill c={c} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{c.reason}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{fmt(c.openingsTotal)} откр.</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Performance ranking */}
      <div className="glass rounded-2xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Производительность кейсов</h3>
        <div className="space-y-2">
          {topByOpenings.map((c) => (
            <div key={c.caseCode} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-foreground">{c.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <VerdictPill c={c} />
                  <span className="w-16 text-right text-[11px] text-muted-foreground">{fmt(c.openingsTotal)} откр.</span>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/[0.05]">
                  <div className="h-1.5 rounded bg-primary/70" style={{ width: `${(c.openingsTotal / maxOpen) * 100}%` }} />
                </div>
                <span className="w-28 shrink-0 text-right text-[10px] text-muted-foreground/70">
                  {c.currencyRtp == null ? 'RTP —' : `RTP ${Math.round(c.currencyRtp * 100)}%`}
                  {c.jackpotDrops > 0 ? ` · 💎${c.jackpotDrops}` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">
          RTP здесь — только по валютным выплатам (ценность предметов/подарков не учтена), поэтому у
          «предметных» кейсов он занижен. Вердикты — операторские подсказки, не автоматические действия.
        </p>
      </div>
    </section>
  )
}

function Roll({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="glass rounded-2xl border border-border bg-gradient-to-br from-white/[0.04] to-transparent p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${tone ?? 'text-foreground'}`}>{value}</div>
    </div>
  )
}
