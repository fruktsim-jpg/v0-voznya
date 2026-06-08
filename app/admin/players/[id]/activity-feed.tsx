'use client'

import { useMemo, useState } from 'react'
import type { ActivityCategory, ActivityEvent } from '@/lib/player-analytics'

/**
 * Read-only unified activity feed for the admin player card (Admin V2 P0). The
 * server merges case openings, transactions and gift deliveries into one
 * timeline; this client component renders it with category filter chips. No
 * mutations — pure diagnostics.
 */

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; emoji: string; tone: string }
> = {
  case: { label: 'Кейсы', emoji: '🎁', tone: 'text-foreground' },
  economy: { label: 'Экономика', emoji: '💰', tone: 'text-amber-200' },
  casino: { label: 'Казино', emoji: '🎰', tone: 'text-fuchsia-200' },
  gift: { label: 'Подарки', emoji: '🎀', tone: 'text-pink-200' },
  premium: { label: 'Premium', emoji: '⭐', tone: 'text-yellow-200' },
  admin: { label: 'Админ', emoji: '🛡', tone: 'text-sky-200' },
}

const FILTERS: { key: ActivityCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'case', label: 'Кейсы' },
  { key: 'economy', label: 'Экономика' },
  { key: 'casino', label: 'Казино' },
  { key: 'gift', label: 'Подарки' },
  { key: 'premium', label: 'Premium' },
  { key: 'admin', label: 'Админ' },
]

const fmtSigned = (n: number) =>
  `${n > 0 ? '+' : ''}${n.toLocaleString('ru-RU')}`

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState<ActivityCategory | 'all'>('all')

  const counts = useMemo(() => {
    const m = new Map<ActivityCategory | 'all', number>([['all', events.length]])
    for (const e of events) m.set(e.category, (m.get(e.category) ?? 0) + 1)
    return m
  }, [events])

  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.category === filter)),
    [events, filter],
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key
          const n = counts.get(f.key) ?? 0
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]'
              }`}
            >
              {f.label}
              {n > 0 ? ` · ${n}` : ''}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="glass rounded-2xl border border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Событий нет.
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((e) => {
            const meta = CATEGORY_META[e.category]
            return (
              <li
                key={e.id}
                className="glass flex items-center gap-3 rounded-2xl border border-border p-3"
              >
                <span className="text-lg">{meta.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-semibold ${meta.tone}`}>
                    {e.title}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {e.detail ? `${e.detail} · ` : ''}
                    {new Date(e.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                {e.amount != null && e.amount !== 0 && (
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      e.amount > 0 ? 'text-emerald-300' : 'text-destructive-foreground'
                    }`}
                  >
                    {fmtSigned(e.amount)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
