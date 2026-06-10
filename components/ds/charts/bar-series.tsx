'use client'

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * BarSeries (DS charts) — столбчатая диаграмма. Для распределений и сравнений
 * по категориям (источники эмиссии, активность по дням). Тёмная тема Возни.
 * Client component.
 */
export function BarSeries({
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--muted-foreground)' }}
          formatter={(v: number) => (format ? format(v) : v)}
        />
        <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
