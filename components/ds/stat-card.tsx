import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * StatCard (DS) — единый «метрический изразец» для всего продукта: крошечная
 * бровь-капс → крупное число → подпись. Это та самая микро-иерархия, что делает
 * дашборды Linear/Stripe «дорогими». Раньше каждый экран (профиль, статы,
 * экономика, дашборд, операции) переизобретал её инлайном со своей подложкой и
 * своим стилем числа — теперь один источник правды.
 *
 *   • число рендерится ролью `.type-stat` (моно, tabular-nums) или
 *     `.type-economy` (для валюты) — числа по всему сайту читаются одинаково;
 *   • бровь — ролью `.label-eyebrow`;
 *   • опциональный `accent` подсвечивает значение/кромку из мульти-акцентной
 *     палитры (gold=валюта, indigo=прогресс, teal=экономика, и т.д.);
 *   • вложенный градиент + specular как у премиальной карточки.
 *
 * Server component (без интерактива).
 */

export type StatAccent =
  | 'default'
  | 'indigo'
  | 'violet'
  | 'pink'
  | 'gold'
  | 'teal'
  | 'red'
  | 'emerald'

const ACCENT_COLOR: Record<StatAccent, string | undefined> = {
  default: undefined,
  indigo: 'var(--accent-indigo)',
  violet: 'var(--accent-violet)',
  pink: 'var(--accent-pink)',
  gold: 'var(--accent-gold)',
  teal: 'var(--accent-teal)',
  red: 'var(--accent-red)',
  emerald: '#34d399',
}

export function StatCard({
  label,
  value,
  caption,
  glyph,
  accent = 'default',
  economy = false,
  delta,
  className = '',
}: {
  /** Бровь сверху (капс, разрядка). */
  label: ReactNode
  /** Главное значение. */
  value: ReactNode
  /** Мелкая подпись снизу. */
  caption?: ReactNode
  /** Иконка/глиф в правом верхнем углу. */
  glyph?: ReactNode
  accent?: StatAccent
  /** Рендерить значение валютной ролью (.type-economy) вместо .type-stat. */
  economy?: boolean
  /** Дельта-бейдж (рост/падение). */
  delta?: { value: ReactNode; positive: boolean }
  className?: string
}) {
  const color = ACCENT_COLOR[accent]
  return (
    <div
      className={cn(
        'glass relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-white/[0.05] to-transparent p-3 transition duration-200',
        className,
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
    >
      {color && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="label-eyebrow">{label}</span>
        {glyph && <span className="shrink-0 text-base leading-none opacity-80">{glyph}</span>}
      </div>
      <div className="mt-1 flex items-end gap-2">
        <span
          className={cn(
            economy ? 'type-economy' : 'type-stat',
            'text-2xl leading-none text-foreground',
          )}
          style={color ? { color } : undefined}
        >
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'mb-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
              delta.positive
                ? 'bg-emerald-400/15 text-emerald-300'
                : 'bg-rose-400/15 text-rose-300',
            )}
          >
            {delta.positive ? '▲' : '▼'} {delta.value}
          </span>
        )}
      </div>
      {caption && <div className="mt-1 text-[11px] text-muted-foreground">{caption}</div>}
    </div>
  )
}

/** Адаптивная сетка изразцов. Дефолт — auto-fit, чтобы экраны не дублировали grid-классы. */
export function MetricGrid({
  children,
  className = '',
  cols,
}: {
  children: ReactNode
  className?: string
  /** Фикс. число колонок на десктопе; иначе auto-fit. */
  cols?: 2 | 3 | 4
}) {
  const colCls =
    cols === 2
      ? 'grid-cols-2'
      : cols === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : cols === 4
          ? 'grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
  return <div className={cn('grid gap-2.5', colCls, className)}>{children}</div>
}
