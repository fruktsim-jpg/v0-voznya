'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

/**
 * Donut (DS charts) — кольцевая диаграмма распределения (источники эмиссии,
 * структура богатства, доли по тирам). Client component.
 */
export function Donut({
  data,
  nameKey = 'name',
  valueKey = 'value',
  colors = ['#8b5cf6', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
  size = 180,
  format,
}: {
  data: Array<Record<string, number | string>>
  nameKey?: string
  valueKey?: string
  colors?: string[]
  size?: number
  format?: (v: number) => string
}) {
  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="60%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v: number) => (format ? format(v) : v)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
