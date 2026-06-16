import type { ReactNode } from 'react'

/**
 * Donut (DS) — лёгкий SVG-донат без зависимостей (не recharts). Два режима:
 *
 *   • одно значение (`value` 0..1) — кольцевой индикатор-прогресс (RTP, шанс,
 *     заполнение). Дешёвый, анимируется через stroke-dashoffset.
 *   • сегменты (`segments`) — кольцевая диаграмма состава (распределение по
 *     редкости, статусы доставок, источники дохода).
 *
 * Вынесен из редактора наград (OddsDonut/RarityDonut) в общий слой, чтобы
 * «данные кружком» были доступны на любой странице, а не только в кейсах.
 */

export type DonutSegment = { value: number; color: string; label?: string }

export function Donut({
  value,
  segments,
  size = 132,
  stroke = 16,
  color = 'var(--primary)',
  trackColor = 'rgba(255,255,255,0.06)',
  center,
  rounded = false,
}: {
  /** Режим прогресса: доля 0..1. Игнорируется, если задан `segments`. */
  value?: number
  /** Режим состава: массив сегментов (значения суммируются). */
  segments?: DonutSegment[]
  size?: number
  stroke?: number
  /** Цвет дуги в режиме прогресса. */
  color?: string
  trackColor?: string
  /** Контент в центре кольца. */
  center?: ReactNode
  /** Скруглять концы дуги (для прогресса). */
  rounded?: boolean
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  let arcs: ReactNode
  if (segments && segments.length > 0) {
    const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
    let offset = 0
    arcs = segments.map((seg, i) => {
      const frac = Math.max(0, seg.value) / total
      const node = (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={stroke}
          strokeDasharray={`${c * frac} ${c * (1 - frac)}`}
          strokeDashoffset={-c * offset}
        />
      )
      offset += frac
      return node
    })
  } else {
    const clamped = Math.max(0, Math.min(1, value ?? 0))
    arcs = (
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap={rounded ? 'round' : 'butt'}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
      />
    )
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {arcs}
      </svg>
      {center != null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  )
}

/**
 * MiniBar (DS) — горизонтальный прогресс-бар одной строкой. Для «давления на
 * запас», топ-листов, долей. Заменяет десятки инлайновых
 * `div.h-2.overflow-hidden.rounded-full`.
 */
export function MiniBar({
  value,
  color = 'var(--primary)',
  track = 'rgba(255,255,255,0.08)',
  height = 8,
  className = '',
}: {
  /** Доля 0..1. */
  value: number
  color?: string
  track?: string
  height?: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={`overflow-hidden rounded-full ${className}`}
      style={{ height, background: track }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: 'width 200ms ease-out' }}
      />
    </div>
  )
}
