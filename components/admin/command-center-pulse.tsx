import Link from 'next/link'
import type { PulseReport, PulseSignal, PulseSeverity } from '@/lib/command-center-pulse'

/**
 * CommandCenterPulse — the new `/admin` hero. Answers "what needs my attention
 * right now?" with cross-system FINDINGS, not metrics. Critical/warning lead;
 * a calm "all clear" shows when quiet. Read-only; deep-links into each module.
 */

const SEV_STYLE: Record<PulseSeverity, { dot: string; ring: string; label: string; labelTone: string }> = {
  critical: { dot: 'bg-rose-400', ring: 'border-rose-400/40 from-rose-400/[0.08]', label: 'Критично', labelTone: 'text-rose-300' },
  warning: { dot: 'bg-amber-400', ring: 'border-amber-400/40 from-amber-400/[0.08]', label: 'Внимание', labelTone: 'text-amber-300' },
  good: { dot: 'bg-emerald-400', ring: 'border-emerald-400/30 from-emerald-400/[0.06]', label: 'Норма', labelTone: 'text-emerald-300' },
  info: { dot: 'bg-sky-400', ring: 'border-sky-400/30 from-sky-400/[0.06]', label: 'Инфо', labelTone: 'text-sky-300' },
}

const SYSTEM_LABEL: Record<string, string> = {
  economy: 'Экономика',
  cases: 'Кейсы',
  gifts: 'Подарки',
  season: 'Сезон',
}

function Row({ s }: { s: PulseSignal }) {
  const st = SEV_STYLE[s.severity]
  const hasActions = !!s.actions && s.actions.length > 0
  // Title links to the module (if href) but is NOT a wrapping anchor, so the
  // action chips below can be their own links (no nested <a>).
  return (
    <div className={`rounded-xl border bg-gradient-to-br to-transparent p-3 ${st.ring}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {s.href ? (
              <Link
                href={s.href}
                className="truncate text-sm font-semibold text-foreground hover:text-primary"
              >
                {s.title}
              </Link>
            ) : (
              <span className="truncate text-sm font-semibold text-foreground">{s.title}</span>
            )}
            <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
              {SYSTEM_LABEL[s.system] ?? s.system}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{s.detail}</p>
          {hasActions && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.actions!.map((a, i) => (
                <Link
                  key={i}
                  href={a.href}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                    a.kind === 'primary'
                      ? 'border-primary/40 bg-primary/15 text-primary hover:bg-primary/25'
                      : 'border-border bg-white/[0.04] text-foreground hover:bg-white/[0.08]'
                  }`}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CommandCenterPulse({ report }: { report: PulseReport }) {
  const { attention, signals, counts, allClear } = report
  // Non-attention signals (good/info) shown as a calmer secondary list.
  const rest = signals.filter((s) => s.severity === 'good' || s.severity === 'info')

  return (
    <section className="glass rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Пульс — что требует внимания</h2>
        <div className="flex items-center gap-2 text-[11px]">
          {counts.critical > 0 && <span className="text-rose-300">● {counts.critical}</span>}
          {counts.warning > 0 && <span className="text-amber-300">● {counts.warning}</span>}
          {counts.good > 0 && <span className="text-emerald-300">● {counts.good}</span>}
          {counts.info > 0 && <span className="text-sky-300">● {counts.info}</span>}
        </div>
      </div>

      {allClear ? (
        <div className="rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/[0.08] to-transparent p-4">
          <div className="text-base font-semibold text-emerald-300">Всё спокойно</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Ни одна система не требует вмешательства прямо сейчас.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {attention.map((s, i) => (
            <Row key={`${s.system}-${i}`} s={s} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rest.map((s, i) => (
            <Row key={`rest-${s.system}-${i}`} s={s} />
          ))}
        </div>
      )}
    </section>
  )
}
