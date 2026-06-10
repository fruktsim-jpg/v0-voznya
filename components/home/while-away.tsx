'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CommunityEvent } from '@/lib/events'
import { eventText, timeAgo } from '@/lib/events'
import { rarityToken } from '@/lib/rarity'
import { readLastVisit, writeLastVisit } from '@/lib/last-visit'

/**
 * "While you were away" (VOZNYA REDESIGN — Home, zone 3: re-entry hook).
 *
 * WORLD-FIRST re-engagement. On return it diffs BOTH the world feed and your
 * personal feed against a browser last-visit marker (APPROVED: localStorage, no
 * DB write — there's no server last-seen column). The headline leads with what
 * the WORLD did while you were gone (jackpots, gift drops, new families), then
 * shows your own missed moments as a secondary strip. This reinforces "the world
 * kept moving without me" — not "here is my profile".
 *
 * Honest: counts only real events newer than the marker. No prior marker (first
 * device visit) → renders nothing (the live World Pulse already covers "now").
 * This component is the SINGLE owner of the last-visit write.
 */
type Delta = {
  total: number
  jackpots: number
  giftDrops: number
  marriages: number
  rankUps: number
}

/** Russian plural: one / few (2-4) / many. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

function summarize(events: CommunityEvent[], since: number): Delta {
  const d: Delta = { total: 0, jackpots: 0, giftDrops: 0, marriages: 0, rankUps: 0 }
  for (const e of events) {
    if (new Date(e.occurredAt).getTime() <= since) continue
    d.total++
    if (e.code === 'CASE_JACKPOT') d.jackpots++
    if (e.code === 'CASE_GIFT_DROP' || e.code === 'GIFT_DELIVERED') d.giftDrops++
    if (e.code === 'MARRIAGE_CREATED') d.marriages++
    if (e.code === 'MMR_RANK_UP') d.rankUps++
  }
  return d
}

export function WhileAway({
  userId,
  worldEvents,
  personalEvents,
}: {
  userId: number
  worldEvents: CommunityEvent[]
  personalEvents: CommunityEvent[]
}) {
  const [state, setState] = useState<{
    world: Delta
    mine: CommunityEvent[]
  } | null>(null)

  useEffect(() => {
    const last = readLastVisit(userId)
    // Write the new marker AFTER reading, so the next return diffs from now.
    writeLastVisit(userId)
    if (last === null) {
      setState(null) // first device visit — nothing to recap
      return
    }
    const world = summarize(worldEvents, last)
    const mine = personalEvents.filter(
      (e) => new Date(e.occurredAt).getTime() > last,
    )
    if (world.total === 0 && mine.length === 0) {
      setState(null)
      return
    }
    setState({ world, mine })
  }, [userId, worldEvents, personalEvents])

  if (!state) return null

  const w = state.world
  const chips: { icon: string; text: string }[] = []
  if (w.jackpots > 0) chips.push({ icon: '💎', text: `${w.jackpots} ${plural(w.jackpots, 'джекпот', 'джекпота', 'джекпотов')}` })
  if (w.giftDrops > 0) chips.push({ icon: '🎁', text: `${w.giftDrops} ${plural(w.giftDrops, 'подарок', 'подарка', 'подарков')}` })
  if (w.marriages > 0) chips.push({ icon: '💍', text: `${w.marriages} ${plural(w.marriages, 'новая семья', 'новых семьи', 'новых семей')}` })
  if (w.rankUps > 0) chips.push({ icon: '⬆️', text: `${w.rankUps} ${plural(w.rankUps, 'ап ранга', 'апа ранга', 'апов ранга')}` })

  return (
    <section className="px-4 pt-5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div
          className="glass overflow-hidden rounded-3xl border border-[#4B69FF]/35 p-5"
          style={{
            backgroundImage:
              'linear-gradient(110deg, rgba(75,105,255,0.14), rgba(136,71,255,0.08) 70%, transparent)',
          }}
        >
          <p className="label-eyebrow text-[#7C93FF]">Пока тебя не было</p>
          <h2 className="section-title text-xl text-foreground sm:text-2xl">
            Мир не стоял на месте
          </h2>

          {w.total > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {w.total}+ событий в сообществе с твоего прошлого визита
              </p>
              {chips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <span
                      key={c.text}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-foreground"
                    >
                      <span aria-hidden>{c.icon}</span>
                      {c.text}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Сообщество затаилось — самое время задать движ.
            </p>
          )}

          {/* Your own missed moments (secondary) */}
          {state.mine.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                А у тебя за это время
              </p>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {state.mine.slice(0, 4).map((e) => {
                  const token = rarityToken(e.rarity)
                  return (
                    <li
                      key={e.id}
                      className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-2.5"
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-base"
                        style={{ background: token.capsule }}
                        aria-hidden
                      >
                        {e.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {eventText(e)}
                      </span>
                      {e.value != null && (
                        <span
                          className="shrink-0 font-mono text-xs font-semibold"
                          style={{ color: token.color }}
                        >
                          +{e.value.toLocaleString('ru-RU')}
                        </span>
                      )}
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(e.occurredAt)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <Link
              href="/cases"
              className="inline-flex items-center gap-1 rounded-full bg-[#8847FF] px-5 py-2.5 text-sm font-semibold text-white transition hover:translate-x-0.5"
            >
              Вернуться в игру <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
