'use client'

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from 'recharts'

/**
 * RadialGauge (DS charts) — радиальный индикатор (0..100%). Для RTP кейсов,
 * процента выполнения, здоровья очереди доставок. Client component.
 */
export function RadialGauge({
  value,
  max = 100,
  color = 'var(--primary)',
  size = 160,
  label,
}: {
  value: number
  max?: number
  color?: string
  size?: number
  label?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const data = [{ name: 'value', value: pct, fill: color }]

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: 'rgba(255,255,255,0.06)' }} dataKey="value" cornerRadius={999} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
          {Math.round(pct)}%
        </span>
        {label && <span className="mt-0.5 text-[11px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}
