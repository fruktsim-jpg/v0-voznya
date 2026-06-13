import type { ReactNode } from 'react'

/**
 * Shared admin status badges — ONE source of truth for the живой/готов pattern
 * Operations introduced, so every screen (Operations, Settings, future armed
 * controls) uses the same visual language instead of bespoke spans.
 *
 *   enforcement='enforced' → «живой»  (the bot honors this now)
 *   enforcement='armed'    → «готов»  (stored, bot doesn't read it yet)
 *
 * Plus a generic on/off StatePill for service state (🟢 включено / 🔴 выключено).
 */

export type Enforcement = 'enforced' | 'armed'

export function EnforcementBadge({
  enforcement,
  className = '',
}: {
  enforcement: Enforcement
  className?: string
}) {
  if (enforcement === 'enforced') {
    return (
      <span
        title="Бот применяет это значение сейчас."
        className={`rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ${className}`}
      >
        живой
      </span>
    )
  }
  return (
    <span
      title="Значение сохраняется, но бот его пока не читает — требуется доработка бота."
      className={`rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ${className}`}
    >
      готов
    </span>
  )
}

/** Generic on/off pill for a service/system state. */
export function StatePill({
  on,
  onText = 'включено',
  offText = 'выключено',
  className = '',
}: {
  on: boolean
  onText?: string
  offText?: string
  className?: string
}) {
  return (
    <span
      className={`text-xs font-medium ${on ? 'text-emerald-300' : 'text-destructive-foreground'} ${className}`}
    >
      {on ? '🟢' : '🔴'} {on ? onText : offText}
    </span>
  )
}

/** Severity dot used in headers/status strips. */
export function StatusDot({
  tone,
  className = '',
}: {
  tone: 'ok' | 'warn' | 'crit' | 'idle'
  className?: string
}) {
  const map = {
    ok: 'bg-emerald-400',
    warn: 'bg-amber-400',
    crit: 'bg-rose-400',
    idle: 'bg-muted-foreground/50',
  } as const
  return <span className={`inline-block h-2 w-2 rounded-full ${map[tone]} ${className}`} />
}

export type HeaderStatus = {
  tone: 'ok' | 'warn' | 'crit' | 'idle'
  text: string
}

/**
 * AdminPageHeader — the one section-header pattern for every admin screen.
 * title + subtitle + optional status pill + a right-aligned actions slot. Kills
 * the ad-hoc `h1 + <p>` duplicated on each page and gives consistent hierarchy.
 */
export function AdminPageHeader({
  title,
  subtitle,
  status,
  actions,
}: {
  title: string
  subtitle?: string
  status?: HeaderStatus
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
          {status && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <StatusDot tone={status.tone} />
              {status.text}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
