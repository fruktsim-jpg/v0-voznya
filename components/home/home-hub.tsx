import Link from 'next/link'
import { WorldPulse } from '@/components/home/world-pulse'
import { WhileAway } from '@/components/home/while-away'
import { StreakChip } from '@/components/home/streak-chip'
import { HotToday } from '@/components/home/hot-today'
import { SeasonRace } from '@/components/home/season-race'
import { DayPulseTeaser } from '@/components/home/day-pulse-teaser'
import { LeadersPreview } from '@/components/home/leaders-preview'
import type { HomeContext } from '@/lib/home-context'

/**
 * Home Hub (VOZNYA REDESIGN — "VOZNYA Right Now").
 *
 * WORLD-FIRST command center. Home answers "what's happening in VOZNYA right
 * now / what did I miss / what's hot / who's winning" — NOT "who am I". Identity
 * lives on Profile and in the persistent UnifiedShell bar (avatar + balance +
 * one rank pill), so Home does NOT restate it.
 *
 * E0.2 (identity deduplication): the old thin PlayerStrip — a fourth copy of
 * balance/division/#place sitting right under the shell that already shows
 * them — was REMOVED. Home now opens directly on the World Pulse hero.
 *
 * Zone order (world-first):
 *   1. World Pulse          — live community heartbeat (the hero)
 *   2. While You Were Away   — world delta since last visit (+ your missed slice)
 *   3. Hot Today            — trending: featured opportunity + real superlatives
 *   4. Season Race + Movers  — seasonal/economy world (spectator), who's rising
 *   5. Community Stats       — proof of scale
 *   6. Elite (richest)       — social status / community
 *
 * Every zone is DB-backed and self-hides when empty, so Home degrades honestly.
 */
export function HomeHub({ ctx }: { ctx: HomeContext }) {
  return (
    <div className="pb-10">
      {/* 1. The heartbeat — the hero (Home opens here; identity lives in shell).
          LF-1 heat tiers + LF-4 anticipation strip use the SAME hotToday /
          season aggregates Home already computes — no new data fetched. */}
      <WorldPulse
        events={ctx.worldFeed}
        hot={ctx.hotToday}
        seasonEndsAt={ctx.seasonRace?.endsAt ?? null}
      />

      {/* 2. Re-entry hook (world-first) */}
      {ctx.player && (
        <WhileAway
          userId={ctx.player.userId}
          worldEvents={ctx.worldFeed}
          personalEvents={ctx.personalFeed}
        />
      )}

      {/* 2b. Daily streak — личный «крючок возвращения» (streak уже в me/summary,
          раньше нигде не показывался). Сам скрывается при серии 0 / для гостей. */}
      {ctx.player && <StreakChip />}

      {/* 3. What's hot right now */}
      <HotToday hot={ctx.hotToday} featured={ctx.featured} />

      {/* 4. Seasonal / economy world */}
      <SeasonRace race={ctx.seasonRace} movers={ctx.weeklyMovers} />

      {/* 5. Пульс дня — ТИЗЕР (полный пульс/моменты живут на Live). Заменил
          прежний полноразмерный CommunityStatsStrip, дублировавший Live. */}
      <DayPulseTeaser pulse={ctx.worldPulse} />

      {/* 6. Social status */}
      {ctx.richLeaders.length > 0 && (
        <>
          <LeadersPreview leaders={ctx.richLeaders} />
          <div className="mx-auto mt-4 max-w-5xl px-4 sm:px-6">
            <Link
              href="/live"
              className="block rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-center text-sm font-medium text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
            >
              Открыть полную живую статистику VOZNYA →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
