'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ds/avatar'
import {
  EVENT_FILTERS,
  eventText,
  eventHeat,
  timeAgo,
  type CommunityEvent,
  type EventFilterKey,
} from '@/lib/events'
import { rarityToken } from '@/lib/rarity'
import { Glyph, type GlyphName } from '@/components/ds/icon'

/**
 * World Pulse (VOZNYA REDESIGN — Home, zone 1: the heartbeat).
 *
 * The FIRST thing on Home and the core differentiator: VOZNYA is alive even when
 * you're offline. A prominent, animated live activity stream of what the whole
 * community is doing RIGHT NOW.
 *
 * E0.x Live Feed upgrade (LF-1 + LF-4) — the feed's problem was emotional weight,
 * not visual quality: a jackpot and a routine action read the same, and nothing
 * pointed forward. Fixes:
 *   - LF-1 HEAT TIERS: events are ranked by real magnitude (code/value/rarity)
 *     into headline / notable / ambient. Headlines render large with rarity glow;
 *     ambient events are compact one-liners. The stream now has loud and quiet
 *     moments — a world, not a uniform log.
 *   - LF-4 ANTICIPATION STRIP: a thin forward-looking band above the stream built
 *     from REAL aggregates (jackpots today, rare drops, season countdown) so the
 *     feed creates FOMO + anticipation, not just history.
 *
 * Data is REAL (`getCommunityFeed` + `deriveHotToday` + `getActiveSeason`,
 * timestamped). We do NOT fabricate events, "online now" counts, or superlatives.
 */

type Pulse = { id: string; icon: GlyphName; text: string; tone: 'hot' | 'rare' | 'time' }

function buildPulses(hot: AnticipationInput['hot'], seasonEndsAt: string | null): Pulse[] {
  const pulses: Pulse[] = []

  if (hot && hot.jackpots > 0) {
    pulses.push({
      id: 'jackpots',
      icon: 'flame',
      tone: 'hot',
      text: `${hot.jackpots} ${plural(hot.jackpots, 'джекпот', 'джекпота', 'джекпотов')} сорвано`,
    })
  }
  if (hot && hot.giftDrops > 0) {
    pulses.push({
      id: 'drops',
      icon: 'gift',
      tone: 'rare',
      text: `${hot.giftDrops} ${plural(hot.giftDrops, 'редкий дроп', 'редких дропа', 'редких дропов')}`,
    })
  }

  const days = daysUntil(seasonEndsAt)
  if (days != null && days >= 0) {
    pulses.push({
      id: 'season',
      icon: 'season',
      tone: 'time',
      text:
        days === 0
          ? 'Сезон заканчивается сегодня'
          : `До конца сезона ${days} ${plural(days, 'день', 'дня', 'дней')}`,
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

  const pulses = useMemo(() => buildPulses(hot ?? null, seasonEndsAt ?? null), [hot, seasonEndsAt])

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

          {/* LF-4 Anticipation strip — forward-looking pulse from real aggregates.
              Scrolls horizontally on mobile; self-hides when there's nothing live. */}
          {pulses.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-5 pt-3 sm:px-6">
              {pulses.map((p) => (
                <span
                  key={p.id}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    p.tone === 'hot'
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                      : p.tone === 'rare'
                        ? 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200'
                        : 'border-sky-400/30 bg-sky-400/10 text-sky-200'
                  }`}
                >
                  <Glyph name={p.icon} className="h-3.5 w-3.5" />
                  {p.text}
                </span>
              ))}
            </div>
          )}

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

          {/* Stream — heat-tiered rows (LF-1) */}
          {visible.length === 0 ? (
            <div className="px-5 pb-6 pt-2 text-sm text-muted-foreground sm:px-6">
              Пока тихо в этой категории — переключи фильтр.
            </div>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-white/5 overflow-y-auto">
              {visible.map((e, i) => (
                <FeedRow key={`${e.id}-${i}`} event={e} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * One feed row, rendered at one of three weights (LF-1). Headlines get a glow
 * capsule, a larger icon, a louder value, and a "момент" ribbon so the eye is
 * pulled to them; ambient rows stay compact.
 */
function FeedRow({ event: e }: { event: CommunityEvent }) {
  const token = rarityToken(e.rarity)
  const heat = eventHeat(e)

  if (heat === 'headline') {
    return (
      <li
        className="relative"
        style={{
          backgroundImage: `linear-gradient(90deg, ${token.color}14, transparent 60%)`,
        }}
      >
        <div className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl ring-1 ring-inset"
            style={{
              background: token.capsule,
              boxShadow: token.glow ? `0 0 22px -6px ${token.color}` : undefined,
              borderColor: `${token.color}55`,
            }}
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
              <span className="flex items-center gap-1.5">
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{ color: token.color, background: `${token.color}1f` }}
                >
                  Момент
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[15px] text-foreground">
                <span className="font-bold">{e.actor.name}</span>{' '}
                <span className="text-muted-foreground">{eventText(e)}</span>
              </span>
              <span className="block text-xs text-muted-foreground">{timeAgo(e.occurredAt)}</span>
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
            {e.value != null && (
              <span
                className="font-mono text-base font-bold"
                style={{ color: token.color, textShadow: `0 0 12px ${token.color}55` }}
              >
                +{e.value.toLocaleString('ru-RU')}
              </span>
            )}
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ color: token.color, background: `${token.color}1a` }}
            >
              {token.label}
            </span>
          </div>
        </div>
      </li>
    )
  }

  const notable = heat === 'notable'
  return (
    <li>
      <div className={`flex items-center gap-3 px-5 sm:px-6 ${notable ? 'py-2.5' : 'py-2'}`}>
        <span
          className={`grid shrink-0 place-items-center rounded-xl ${notable ? 'size-10 text-xl' : 'size-8 text-base opacity-90'}`}
          style={{ background: token.capsule }}
          aria-hidden
        >
          {e.icon}
        </span>
        <Link
          href={`/profile/${e.actor.id}`}
          className="flex min-w-0 items-center gap-2 transition hover:opacity-90"
        >
          {notable && <Avatar src={e.actor.avatar ?? null} name={e.actor.name} size="sm" />}
          <span className="min-w-0">
            <span className={`block truncate ${notable ? 'text-sm' : 'text-[13px]'} text-foreground`}>
              <span className="font-semibold">{e.actor.name}</span>{' '}
              <span className="text-muted-foreground">{eventText(e)}</span>
            </span>
            <span className="block text-xs text-muted-foreground">{timeAgo(e.occurredAt)}</span>
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
          {e.value != null && (
            <span className="font-mono text-sm font-semibold" style={{ color: token.color }}>
              +{e.value.toLocaleString('ru-RU')}
            </span>
          )}
          {notable && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ color: token.color, background: `${token.color}1a` }}
            >
              {token.label}
            </span>
          )}
        </div>
      </div>
    </li>
  )
}
