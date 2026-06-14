'use client'

import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'
import { useApi } from '@/hooks/use-api'
import { formatCurrency } from '@/lib/pluralize'
import type { Economy } from '@/lib/queries'

export function EconomyPanel() {
  const { data, error } = useApi<Economy>('/api/economy', 30_000)

  const cards: { icon: GlyphName; label: string; value: string }[] = data
    ? [
        { icon: 'vault', label: 'Общая казна', value: formatCurrency(data.treasury) },
        { icon: 'bank', label: 'Средний баланс', value: formatCurrency(data.avgBalance) },
        { icon: 'crown', label: 'Самый богатый', value: data.richest ? data.richest.name : '—' },
        { icon: 'wallet', label: 'Максимальный баланс', value: formatCurrency(data.maxBalance) },
        { icon: 'sprout', label: 'Фермеров', value: data.farmers.toLocaleString('ru-RU') },
      ]
    : []

  return (
    <section className="px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Экономика
        </h2>

        {error && !data ? (
          <p className="text-sm text-muted-foreground">Данные экономики временно недоступны</p>
        ) : !data ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.label}
                className="glass rounded-2xl border border-border p-4"
              >
                <Glyph name={c.icon} className="text-lg text-primary" />
                <div className="mt-1.5 truncate text-base font-bold text-foreground sm:text-lg">{c.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
