'use client'

import { Area, AreaChart, ResponsiveContainer } from 'recharts'

/**
 * Sparkline (DS charts) — миниатюрный график-тренд без осей. Встраивается в
 * KPI-карточки и строки таблиц (динамика баланса/MMR). Client component.
 */
export function Sparkline({
  data,
  yKey = 'value',
  color = 'var(--primary)',
  width = 96,
  height = 32,
}: {
  data: Array<Record<string, number | string>>
  yKey?: string
  color?: string
  width?: number
  height?: number
}) {
  const gradId = `spark-${yKey}-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
