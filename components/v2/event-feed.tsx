'use client'

import { useMemo, useState } from 'react'
import { ActivityCard } from '@/components/v2/activity-card'
import { EmptyState } from '@/components/v2/empty-state'
import { Glyph } from '@/components/ds/icon/glyph'
import {
  EVENT_FILTERS,
  type CommunityEvent,
  type EventFilterKey,
} from '@/lib/events'

/**
 * Event Feed (Phase 1) — лента событий сообщества с фильтр-чипами
 * (VOZNYA_EVENTS_SYSTEM §5). Принимает события пропсом (сейчас — mock из
 * `lib/events`), без realtime/websocket/БД. Client component ради фильтров.
 */
export function EventFeed({
  events,
  initialFilter = 'all',
  limit,
}: {
  events: CommunityEvent[]
  initialFilter?: EventFilterKey
  limit?: number
}) {
  const [filter, setFilter] = useState<EventFilterKey>(initialFilter)

  const codesByFilter = useMemo(() => {
    const map = new Map<EventFilterKey, readonly string[] | null>()
    for (const f of EVENT_FILTERS) {
      map.set(f.key, 'codes' in f ? f.codes : null)
    }
    return map
  }, [])

  const visible = useMemo(() => {
    const codes = codesByFilter.get(filter)
    const list = codes ? events.filter((e) => codes.includes(e.code)) : events
    return limit ? list.slice(0, limit) : list
  }, [events, filter, limit, codesByFilter])

  return (
    <div className="space-y-3">
      {/* Фильтр-чипы */}
      <div className="flex flex-wrap gap-2">
        {EVENT_FILTERS.map((f) => {
          const active = f.key === filter
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-white/10 text-muted-foreground hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Лента — в едином glass-контейнере, как лидерборды/настройки. */}
      {visible.length === 0 ? (
        <EmptyState
          icon={<Glyph name="moon" />}
          title="Пока тихо"
          description="Скоро здесь будет жарко — кейсы, подарки и выигрыши сообщества."
        />
      ) : (
        <ul className="glass divide-y divide-border/50 overflow-hidden rounded-2xl border border-border">
          {visible.map((e) => (
            <li key={e.id} className="px-1.5 py-1">
              <ActivityCard event={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
