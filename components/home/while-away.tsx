'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CommunityEvent } from '@/lib/events'
import { eventText, timeAgo } from '@/lib/events'
import { rarityToken } from '@/lib/rarity'
import { readLastVisit, writeLastVisit } from '@/lib/last-visit'

/**
 * "While you were away" (VOZNYA REDESIGN — Home Hub, zone 5).
 *
 * Return-behavior hook. APPROVED: uses a browser-only localStorage last-visit
 * marker (no DB write). On mount it reads the previous marker, counts personal
 * feed events newer than it ("while you were away"), then writes the new marker.
 * When there is no prior marker (first device visit) it degrades to a neutral
 * "Recent activity" view — never a fabricated digest.
 *
 * Client component because localStorage and "now" are client concerns. The feed
 * itself is real data passed from the server aggregator (`getUserFeed`).
 */
export function WhileAway({
  userId,
  events,
}: {
  userId: number
  events: CommunityEvent[]
}) {
  // `null` = not yet measured (SSR/first paint); avoids hydration mismatch.
  const [sinceVisit, setSinceVisit] = useState<number | null>(null)
  const [hadMarker, setHadMarker] = useState(false)

  useEffect(() => {
    const last = readLastVisit(userId)
    if (last !== null) {
      setHadMarker(true)
      const count = events.filter(
        (e) => new Date(e.occurredAt).getTime() > last,
      ).length
      setSinceVisit(count)
    } else {
      setHadMarker(false)
      setSinceVisit(0)
    }
    // Mark this visit AFTER measuring, so the next return diffs from now.
    writeLastVisit(userId)
  }, [userId, events])

  if (events.length === 0) return null

  const isDigest = hadMarker && (sinceVisit ?? 0) > 0
  const title = isDigest ? 'Пока тебя не было' : 'Твоя недавняя активность'
  const eyebrow = isDigest
    ? `${sinceVisit} ${plural(sinceVisit as number, ['событие', 'события', 'событий'])} с прошлого визита`
    : 'Последнее, что произошло у тебя'

  const shown = events.slice(0, 4)

  return (
    <section className="px-4 pt-5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="label-eyebrow text-[#7C93FF]">{eyebrow}</span>
            <h2 className="section-title text-xl text-foreground">{title}</h2>
          </div>
          <Link
            href={`/profile/${userId}`}
            className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
          >
            Профиль
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shown.map((e) => {
            const token = rarityToken(e.rarity)
            return (
              <li
                key={e.id}
                className="glass flex items-center gap-3 rounded-2xl border p-3"
                style={{ borderColor: `${token.color}55` }}
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-lg"
                  style={{ background: token.capsule }}
                  aria-hidden
                >
                  {e.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{eventText(e)}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(e.occurredAt)}</p>
                </div>
                {e.value != null && (
                  <span
                    className="shrink-0 font-mono text-sm font-semibold"
                    style={{ color: token.color }}
                  >
                    {e.value.toLocaleString('ru-RU')}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}
