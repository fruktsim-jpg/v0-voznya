'use client'

import { useApi } from '@/hooks/use-api'
import type { Daily } from '@/lib/queries'

/**
 * DailyPanel — «Номинации дня»: Пидор дня + Пара дня. Один из самых
 * «сегодняшних» элементов продукта, поэтому живёт высоко во вкладке «Сейчас».
 * Settings-grade: компактные glass-строки, цвет только смысловой. Данные —
 * daily_nominations через /api/daily. Скрывается, когда номинаций нет.
 */
export function DailyPanel() {
  const { data } = useApi<Daily>('/api/daily', 30_000)

  if (!data) return null
  const hasPara = Boolean(data.para)
  const hasPidor = Boolean(data.pidor)
  if (!hasPara && !hasPidor) return null

  return (
    <section className="px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Номинации дня
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {hasPidor && data.pidor && (
            <div className="glass flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
              <span className="text-xl" aria-hidden>🏳️‍🌈</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Пидор дня</div>
                <div className="truncate text-sm font-semibold text-foreground">
                  {data.pidor.name}
                  {data.pidor.count > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-muted-foreground">×{data.pidor.count}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {hasPara && data.para && (
            <div className="glass flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
              <span className="text-xl" aria-hidden>❤️</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Пара дня</div>
                <div className="truncate text-sm font-semibold text-foreground">
                  {data.para.first} <span className="text-rose-300">&</span> {data.para.second}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
