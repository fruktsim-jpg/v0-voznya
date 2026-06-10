import { cn } from '@/lib/utils'

/**
 * ProgressBar (DS) — линейный прогресс. Два режима:
 *  - сплошной (value/max) — для XP, прогресса к следующему дивизиону и т.п.;
 *  - сегментный (segments) — для лестницы тиров (заполненные/пустые ячейки).
 * Server component. Цвет по умолчанию — primary, можно переопределить.
 */
export function ProgressBar({
  value,
  max = 100,
  color = 'var(--primary)',
  track = 'rgba(255,255,255,0.08)',
  height = 8,
  label,
  className = '',
}: {
  value: number
  max?: number
  color?: string
  track?: string
  height?: number
  label?: string
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{label}</span>
          <span className="font-mono tabular-nums">
            {Math.round(value).toLocaleString('ru-RU')} /{' '}
            {Math.round(max).toLocaleString('ru-RU')}
          </span>
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full"
        style={{ height, background: track }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

/** Сегментный прогресс: filled из total ячеек. */
export function SegmentedProgress({
  filled,
  total,
  color = 'var(--primary)',
  className = '',
}: {
  filled: number
  total: number
  color?: string
  className?: string
}) {
  return (
    <div className={cn('flex gap-1', className)}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full"
          style={{
            background: i < filled ? color : 'rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </div>
  )
}
