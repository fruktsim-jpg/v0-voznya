'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ds/avatar'
import {
  EVENT_FILTERS,
  eventText,
  timeAgo,
  type CommunityEvent,
  type EventFilterKey,
} from '@/lib/events'
import { rarityToken } from '@/lib/rarity'

/**
 * World Pulse (VOZNYA REDESIGN — Home, zone 1: the heartbeat).
 *
 * The FIRST thing on Home and the core differentiator: VOZNYA is alive even when
 * you're offline. A prominent, animated live activity stream of what the whole
 * community is doing RIGHT NOW — jackpots, rare gift drops, rank-ups, new
 * families, big casino wins. Steam-friends-activity + Discord + CS-market-feed
 * energy, not a dashboard widget.
 *
 * Data is REAL (`getCommunityFeed`, timestamped). The "live" feel is honest
 * presentation: a pulsing indicator + relative timestamps that re-tick on an
 * interval. We do NOT fabricate fake events or fake "online now" counts — the
 * subtitle counts only the real events in the fetched recent window.
 */
export function WorldPulse({ events }: { events: CommunityEvent[] }) {
  const [filter, setFilter] = useState<EventFilterKey>('all')
  // Re-render every 30s so relative timestamps stay fresh (alive feel).
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const codesByFilter = useMemo(() => {
    const map = new Map<EventFilterKey, readonly string[] | null>()
    for (const f of EVENT_FILTERS) map.set(f.key, 'codes' in f ? f.codes : null)
    return map
  }, [])

  const visible = useMemo(() => {
    const codes = codesByFilter.get(filter)
    return codes ? events.filter((e) => codes.includes(e.code)) : events
  }, [events, filter, codesByFilter])

  return (
    <section className="pt-hero-safe px-4 pb-1 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div
          className="glass overflow-hidden rounded-3xl border border-border"
          style={{
            backgroundImage:
              'radial-gradient(120% 90% at 0% 0%, rgba(136,71,255,0.14), transparent 55%), radial-gradient(120% 90% at 100% 0%, rgba(75,105,255,0.12), transparent 55%)',
          }}
        >
          {/* Header */}
          <div className="flex items-end justify-between gap-3 px-5 pt-5 sm:px-6">
            <div>
              <p className="label-eyebrow flex items-center gap-1.5 text-[#b79bff]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#22c55e]" />
                </span>
                VOZNYA прямо сейчас
              </p>
              <h1 className="section-title text-2xl text-foreground sm:text-3xl">
                Живая лента мира
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {events.length > 0
                  ? `${events.length}+ событий в сообществе`
                  : 'Сообщество просыпается'}
              </p>
            </div>
            <Link
              href="/live"
              className="hidden shrink-0 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20 sm:inline-block"
            >
              Вся активность
            </Link>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto px-5 py-3 sm:px-6">
            {EVENT_FILTERS.map((f) => {
              const active = f.key === filter
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
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

          {/* Stream */}
          {visible.length === 0 ? (
            <div className="px-5 pb-6 pt-2 text-sm text-muted-foreground sm:px-6">
              Пока тихо в этой категории — переключи фильтр.
            </div>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-white/5 overflow-y-auto">
              {visible.map((e) => {
                const token = rarityToken(e.rarity)
                return (
                  <li key={e.id}>
                    <div className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-xl text-xl"
                        style={{ background: token.capsule }}
                        aria-hidden
                      >
                        {e.icon}
                      </span>
                      <Link
                        href={`/profile/${e.actor.id}`}
                        className="flex min-w-0 items-center gap-2 transition hover:opacity-90"
                      >
                        <Avatar src={e.actor.avatar ?? null} name={e.actor.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-foreground">
                            <span className="font-semibold">{e.actor.name}</span>{' '}
                            <span className="text-muted-foreground">{eventText(e)}</span>
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {timeAgo(e.occurredAt)}
                          </span>
                        </span>
                      </Link>
                      <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
                        {e.value != null && (
                          <span
                            className="font-mono text-sm font-semibold"
                            style={{ color: token.color }}
                          >
                            +{e.value.toLocaleString('ru-RU')}
                          </span>
                        )}
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ color: token.color, background: `${token.color}1a` }}
                        >
                          {token.label}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
