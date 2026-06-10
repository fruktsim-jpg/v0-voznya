import Link from 'next/link'
import { IdentityHero } from '@/components/home/identity-hero'
import { TodayPrompt } from '@/components/home/today-prompt'
import { CommunityStatsStrip } from '@/components/home/community-stats-strip'
import { SeasonSnapshot } from '@/components/home/season-snapshot'
import { WhileAway } from '@/components/home/while-away'
import { NextGoals } from '@/components/home/next-goals'
import { FeaturedOpportunityCard } from '@/components/home/featured-opportunity'
import { LeadersPreview } from '@/components/home/leaders-preview'
import { CommunityActivity } from '@/components/v2/community-activity'
import type { HomeContext } from '@/lib/home-context'

/**
 * Authenticated Home Hub (VOZNYA REDESIGN — Home Hub).
 *
 * Living-world command center. Renders the approved zone hierarchy:
 *   1. Identity / Progression Hero      — Who am I?
 *   2. Today prompt (urgency)           — Why should I care today?
 *   3. Community stats                  — community is alive (moved high)
 *   4. Season Snapshot                  — why the season matters now
 *   5. While you were away              — what did I gain / miss?
 *   6. Next goals                       — what should I do next?
 *   7. Featured Opportunity             — best real action right now
 *   8. Community live feed              — what's happening in the community?
 *   9. Leaders                          — social status / community
 *
 * All data is the read-only `HomeContext`. Every section self-hides when its
 * data is empty/unavailable, so the page degrades honestly instead of faking.
 */
export function HomeHub({ ctx }: { ctx: HomeContext }) {
  const identity = ctx.identity
  if (!identity) return null

  return (
    <div className="pb-10">
      {/* 1. Identity / progression hero */}
      <IdentityHero identity={identity} />

      {/* 2. Why should I care today? */}
      <TodayPrompt ctx={ctx} />

      {/* 3. Community is alive (proof of scale, moved high) */}
      {ctx.stats && <CommunityStatsStrip stats={ctx.stats} />}

      {/* 4. Season snapshot */}
      {identity.season && <SeasonSnapshot season={identity.season} />}

      {/* 5. While you were away (client: localStorage diff) */}
      <WhileAway userId={identity.userId} events={ctx.personalFeed} />

      {/* Main + rail */}
      <div className="mx-auto mt-1 max-w-5xl gap-2 px-0 lg:grid lg:grid-cols-[1fr_minmax(0,20rem)] lg:px-6">
        <div className="min-w-0">
          {/* 6. Next goals */}
          <NextGoals goals={ctx.goals} />

          {/* 7. Featured opportunity */}
          {ctx.featured && <FeaturedOpportunityCard featured={ctx.featured} />}

          {/* 8. Community live feed */}
          <CommunityActivity
            events={ctx.communityFeed}
            limit={8}
            title="Движуха сообщества"
            subtitle="Что происходит в Возне прямо сейчас"
            action={
              <Link
                href="/live"
                className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
              >
                Смотреть всё
              </Link>
            }
          />
        </div>

        <aside className="min-w-0">
          {/* 9. Leaders */}
          <LeadersPreview leaders={ctx.leaders} />
        </aside>
      </div>
    </div>
  )
}
