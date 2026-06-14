'use client'

import { AnimatedCounter } from '@/components/voznya/animated-counter'
import { Glyph, type GlyphName } from '@/components/ds/icon/glyph'
import { useApi } from '@/hooks/use-api'
import type { CommunityStats, MessageStats } from '@/lib/queries'

type CardData = { icon: GlyphName; label: string; value: number }

export function LiveCommunityStats() {
  const { data, error } = useApi<CommunityStats>('/api/stats', 20_000)
  const { data: messages } = useApi<MessageStats>('/api/messages', 20_000)

  const cards: CardData[] = data
    ? [
        { icon: 'users', label: 'Пользователей', value: data.users },
        { icon: 'coin', label: 'Ешек в обороте', value: data.eshInCirculation },
        ...(messages
          ? [{ icon: 'message' as const, label: 'Сообщений всего', value: messages.total }]
          : [{ icon: 'vault' as const, label: 'Кладов найдено', value: data.treasuresFound }]),
        { icon: 'trophy', label: 'Получено ачивок', value: data.achievements },
        { icon: 'swords', label: 'Дуэлей', value: data.duels },
        { icon: 'sprout', label: 'Фермеров', value: data.farmers },
      ]
    : []

  return (
    <section className="px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {error && !data ? (
          <p className="text-center text-sm text-muted-foreground">Статистика временно недоступна</p>
        ) : !data ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {cards.map((c) => (
              <div
                key={c.label}
                className="glass rounded-2xl border border-border p-3 text-center"
              >
                <Glyph name={c.icon} className="mx-auto text-lg text-primary" />
                <div className="mt-1 type-stat text-base text-foreground">
                  <AnimatedCounter value={c.value} />
                </div>
                <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-xs">{c.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
