'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ActivityCard } from '@/components/v2/activity-card'
import {
  EVENT_FILTERS,
  type CommunityEvent,
  type EventFilterKey,
} from '@/lib/events'
import { Glyph, type GlyphName } from '@/components/ds/icon'

/**
 * World Pulse (Home, zone 1: the heartbeat) — the live activity stream that
 * shows VOZNYA is alive even when you're offline.
 *
 * Single feed renderer: rows go through the SHARED ActivityCard (same as Live),
 * so the feed looks identical everywhere — owned SVG icons, heat tiers, one glass
 * container. No separate emoji rendering, no loud gradient hero: the surface uses
 * the same calm Settings-grade language as the rest of the app.
 *
 * Data is REAL (`getCommunityFeed` + `deriveHotToday` + `getActiveSeason`,
 * timestamped). We do NOT fabricate events or "online now" counts.
 */

type Pulse = { id: string; icon: GlyphName; text: string }

function buildPulses(hot: AnticipationInput['hot'], seasonEndsAt: string | null): Pulse[] {
  const pulses: Pulse[] = []
  if (hot && hot.jackpots > 0) {
    pulses.push({ id: 'jackpots', icon: 'flame', text: `${hot.jackpots} ${plural(hot.jackpots, 'джекпот', 'джекпота', 'джекпотов')} сорвано` })
  }
  if (hot && hot.giftDrops > 0) {
    pulses.push({ id: 'drops', icon: 'gift', text: `${hot.giftDrops} ${plural(hot.giftDrops, 'редкий дроп', 'редких дропа', 'редких дропов')}` })
  }
  const days = daysUntil(seasonEndsAt)
  if (days != null && days >= 0) {
    pulses.push({
      id: 'season',
      icon: 'season',
      text: days === 0 ? 'Сезон заканчивается сегодня' : `До конца сезона ${days} ${plural(days, 'день', 'дня', 'дней')}`,
    })
  }
  return pulses
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(diff)) return null
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

type AnticipationInput = {
  hot?: { jackpots: number; giftDrops: number } | null
  seasonEndsAt?: string | null
}

export function WorldPulse({
  events,
  hot,
  seasonEndsAt,
}: { events: CommunityEvent[] } & AnticipationInput) {
  const [filter, setFilter] = useState<EventFilterKey>('all')
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

  const pulses = useMemo(() => buildPulses(hot ?? null, seasonEndsAt ?? null), [hot, seasonEndsAt])

  return (
    <section className="pt-header px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header — calm, left-aligned, like every other screen title. */}
        <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[#22c55e]" />
              </span>
              Прямо сейчас
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Живая лента мира</h2>
          </div>
          <Link
            href="/live"
            className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
          >
            Весь мир →
          </Link>
        </div>

        {/* Anticipation strip — forward-looking pulse from real aggregates. */}
        {pulses.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pulses.map((p) => (
              <span
                key={p.id}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                <Glyph name={p.icon} className="h-3.5 w-3.5 text-primary" />
                {p.text}
              </span>
            ))}
          </div>
        )}

        {/* Filter chips */}
        <div className="mb-2 flex gap-2 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    : 'border-border text-muted-foreground hover:bg-white/5'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Stream — SHARED ActivityCard rows in one glass container. */}
        {visible.length === 0 ? (
          <div className="glass rounded-2xl border border-border px-5 py-6 text-sm text-muted-foreground">
            Пока тихо в этой категории — переключи фильтр.
          </div>
        ) : (
          <ul className="glass max-h-[28rem] divide-y divide-border/50 overflow-y-auto overflow-hidden rounded-2xl border border-border">
            {visible.slice(0, 20).map((e, i) => (
              <li key={`${e.id}-${i}`} className="px-1.5 py-1">
                <ActivityCard event={e} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
