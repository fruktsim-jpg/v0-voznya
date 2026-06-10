'use client'

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * AreaTrend (DS charts) — сглаженный график-тренд во времени. Базовый кирпич
 * аналитики (экономика, прогрессия). Обёртка над recharts с тёмной темой Возни.
 *
 * Презентационный слой: принимает готовые данные, ничего не запрашивает.
 * Client component (recharts работает только в браузере).
 */
export function AreaTrend({
  data,
  xKey,
  yKey,
  color = 'var(--primary)',
  height = 200,
  format,
}: {
  data: Array<Record<string, number | string>>
  xKey: string
  yKey: string
  color?: string
  height?: number
  format?: (v: number) => string
}) {
  const gradId = `area-${yKey}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
          tickFormatter={format}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--muted-foreground)' }}
          formatter={(v: number) => (format ? format(v) : v)}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
