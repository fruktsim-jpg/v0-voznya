import 'server-only'

import type { CommunityEvent } from '@/lib/events'
import type { Rarity } from '@/lib/rarity'
import { mmrRank, MMR_RANKS, type MmrRank } from '@/lib/mmr'
import {
  getPlayerProfile,
  getUserSummary,
  getTopRich,
  getCommunityStats,
  type RichUser,
  type CommunityStats,
} from '@/lib/queries'
import { getCommunityFeed, getUserFeed } from '@/lib/feed'
import {
  getActiveSeason,
  getSeasonProfile,
  divisionProgress,
} from '@/lib/season'
import { getActiveCasesWithRewards } from '@/lib/cases'

/**
 * Home aggregator (VOZNYA REDESIGN — Home Hub stage).
 *
 * READ-ONLY. Composes EXISTING bot-DB read functions into one snapshot for the
 * Home command center and the shared identity/progression bar. It NEVER writes
 * — the bot owns `users` and all game tables. Every field here is DB-backed or
 * computed from DB-backed values; nothing is faked. Where a value is not
 * available in the schema (login streak, daily claims, cosmetics/title, second
 * currency), it is simply omitted — callers render an explicit future slot, not
 * a fabricated number.
 *
 * The identity/progression slice is the single source shared by:
 *   - the persistent shell bar (`/api/me/summary` → PlayerContextBar), and
 *   - the Home identity hero.
 * Built once here so the bar and hero can never drift.
 */

// --- Shared identity / progression slice ------------------------------------

export type IdentityDivision = {
  name: string
  emoji: string
  minMmr: number
}

export type IdentitySeason = {
  name: string
  endsAt: string | null
  seasonMmr: number
  rank: number | null
  division: IdentityDivision
  nextDivision: IdentityDivision | null
  /** 0..1 progress toward the next division. */
  ratio: number
  /** Season MMR remaining to the next division (0 at max). */
  toNext: number
}

export type IdentityFamily = {
  partnerId: number
  partnerName: string
  days: number
}

/**
 * The shared identity + progression slice. Serializable (passed to client
 * components and returned by `/api/me/summary`). `registered: false` means the
 * authenticated Telegram user has no game row yet.
 */
export type IdentityProgression = {
  userId: number
  registered: boolean
  name: string | null
  photoUrl: string | null
  balance: number | null
  /** Leaderboard position by balance. */
  rank: number | null
  mmr: number | null
  mmrRank: MmrRank | null
  /** Next MMR rank tier + MMR remaining to reach it (null at top tier). */
  nextMmrRank: MmrRank | null
  mmrToNextRank: number | null
  reputation: number | null
  streak: number
  maxStreak: number
  season: IdentitySeason | null
  family: IdentityFamily | null
}

function nextMmrTier(mmr: number): { next: MmrRank | null; toNext: number | null } {
  const current = mmrRank(mmr)
  const idx = MMR_RANKS.findIndex((r) => r.name === current.name)
  const next = idx >= 0 && idx < MMR_RANKS.length - 1 ? MMR_RANKS[idx + 1] : null
  return {
    next,
    toNext: next ? Math.max(0, next.minMmr - mmr) : null,
  }
}

/**
 * Season slice. Season tables can be absent on un-migrated DBs and the season
 * loaders throw in that case (unlike the feed loaders), so this is fully
 * guarded and degrades to null.
 */
async function loadSeasonSlice(userId: number): Promise<IdentitySeason | null> {
  try {
    const [active, profile] = await Promise.all([
      getActiveSeason(),
      getSeasonProfile(userId),
    ])
    const progress = divisionProgress(profile.seasonMmr)
    return {
      name: active?.name ?? 'Сезон',
      endsAt: active?.endsAt ?? null,
      seasonMmr: profile.seasonMmr,
      rank: profile.rank,
      division: {
        name: progress.current.name,
        emoji: progress.current.emoji,
        minMmr: progress.current.minMmr,
      },
      nextDivision: progress.next
        ? {
            name: progress.next.name,
            emoji: progress.next.emoji,
            minMmr: progress.next.minMmr,
          }
        : null,
      ratio: progress.ratio,
      toNext: progress.toNext,
    }
  } catch {
    return null
  }
}

/**
 * Build the shared identity/progression slice for a user. Degrades gracefully:
 * an unregistered or DB-unavailable user still yields a well-formed object with
 * `registered: false` and null progression, so the bar/hero can decide what to
 * render without throwing.
 */
export async function getIdentityProgression(
  userId: number,
): Promise<IdentityProgression> {
  let profile: Awaited<ReturnType<typeof getPlayerProfile>> = null
  try {
    profile = await getPlayerProfile(userId)
  } catch {
    profile = null
  }

  // Fall back to the lighter summary for name/photo/rank when there is no full
  // profile yet (or the profile read failed).
  if (!profile) {
    let summary: Awaited<ReturnType<typeof getUserSummary>> | null = null
    try {
      summary = await getUserSummary(userId)
    } catch {
      summary = null
    }
    return {
      userId,
      registered: summary?.registered ?? false,
      name: summary?.name ?? null,
      photoUrl: summary?.photoUrl ?? null,
      balance: summary?.balance ?? null,
      rank: summary?.rank ?? null,
      mmr: null,
      mmrRank: null,
      nextMmrRank: null,
      mmrToNextRank: null,
      reputation: null,
      streak: 0,
      maxStreak: 0,
      season: null,
      family: null,
    }
  }

  const season = await loadSeasonSlice(userId)
  const tier =
    profile.mmr !== null ? nextMmrTier(profile.mmr) : { next: null, toNext: null }

  return {
    userId,
    registered: true,
    name: profile.firstName,
    photoUrl: profile.photoUrl,
    balance: profile.balance,
    rank: profile.rankInTop,
    mmr: profile.mmr,
    mmrRank: profile.mmrRank,
    nextMmrRank: tier.next,
    mmrToNextRank: tier.toNext,
    reputation: profile.reputation,
    streak: profile.farmStreak,
    maxStreak: profile.maxFarmStreak,
    season,
    family: profile.marriage
      ? {
          partnerId: profile.marriage.partnerId,
          partnerName: profile.marriage.partnerName,
          days: profile.marriage.days,
        }
      : null,
  }
}

// --- Next goals (computed, honest) ------------------------------------------

export type NextGoal = {
  id: string
  icon: string
  label: string
  /** Optional short progress hint, e.g. "+120 MMR". */
  hint?: string
  href: string
  /** 0..1 when a real progress ratio exists. */
  ratio?: number
}

/**
 * Compute motivational, DB-honest "what to do next" goals from the identity
 * slice. Every goal points at a real existing destination. No claimable
 * rewards, daily missions or login streaks are invented — those need bot-owned
 * writes and stay future slots.
 */
function computeNextGoals(identity: IdentityProgression): NextGoal[] {
  const goals: NextGoal[] = []

  // 1. Climb to the next season division (strongest progression hook).
  if (identity.season?.nextDivision && identity.season.toNext > 0) {
    goals.push({
      id: 'division',
      icon: identity.season.nextDivision.emoji,
      label: `До дивизиона ${identity.season.nextDivision.name}`,
      hint: `+${identity.season.toNext.toLocaleString('ru-RU')} MMR`,
      href: '/season',
      ratio: identity.season.ratio,
    })
  }

  // 2. Next MMR rank tier (lifetime progression).
  if (
    identity.mmr !== null &&
    identity.nextMmrRank &&
    identity.mmrToNextRank !== null &&
    identity.mmrToNextRank > 0
  ) {
    goals.push({
      id: 'mmr-rank',
      icon: identity.nextMmrRank.emoji,
      label: `До ранга «${identity.nextMmrRank.name}»`,
      hint: `+${identity.mmrToNextRank.toLocaleString('ru-RU')} MMR`,
      href: '/profile/me',
    })
  }

  // 3. Keep the farm streak alive (return-behavior hook).
  if (identity.streak > 0) {
    goals.push({
      id: 'streak',
      icon: '🔥',
      label: 'Сохрани серию фарма',
      hint: `${identity.streak} дн подряд`,
      href: '/',
    })
  }

  // 4. Always-available action: open a case.
  goals.push({
    id: 'case',
    icon: '📦',
    label: 'Открой кейс',
    hint: 'новые артефакты',
    href: '/cases',
  })

  return goals.slice(0, 4)
}

// --- Featured opportunity (curated, presentation-side) ----------------------

export type FeaturedOpportunity = {
  kind: 'case'
  itemCode: string
  name: string
  description: string | null
  openCostKind: string
  openCostAmount: number
  /** Best real reward on this case, for the "chase" line. Null if none. */
  topReward: { name: string; rarity: Rarity; chance: number } | null
  /** Whether this case carries a limited or jackpot reward. */
  hasChase: boolean
  href: string
}

/**
 * Curated "Featured Opportunity" pick. There is NO CMS/featured table, so this
 * is an honest presentation-side choice over the real active cases: prefer a
 * case that carries a jackpot or limited reward (the strongest chase), else the
 * highest open cost (the marquee case). Returns null when no cases are active.
 */
async function pickFeaturedOpportunity(): Promise<FeaturedOpportunity | null> {
  let cases: Awaited<ReturnType<typeof getActiveCasesWithRewards>> = []
  try {
    cases = await getActiveCasesWithRewards()
  } catch {
    return null
  }
  if (cases.length === 0) return null

  const scoreOf = (c: (typeof cases)[number]) => {
    const hasChase = c.rewards.some((r) => r.isJackpot || r.limited)
    return (hasChase ? 1_000_000 : 0) + c.openCostAmount
  }
  const pick = [...cases].sort((a, b) => scoreOf(b) - scoreOf(a))[0]

  // Best reward by rarity weight then by Stars/amount value, for the chase line.
  const RARITY_ORDER: Rarity[] = [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
    'mythic',
  ]
  const named = pick.rewards.filter((r) => r.rewardItemName)
  const best = named.sort((a, b) => {
    const ra = RARITY_ORDER.indexOf((a.rewardItemRarity ?? 'common') as Rarity)
    const rb = RARITY_ORDER.indexOf((b.rewardItemRarity ?? 'common') as Rarity)
    if (rb !== ra) return rb - ra
    return (b.starCost ?? b.amount ?? 0) - (a.starCost ?? a.amount ?? 0)
  })[0]

  return {
    kind: 'case',
    itemCode: pick.itemCode,
    name: pick.name,
    description: pick.description,
    openCostKind: pick.openCostKind,
    openCostAmount: pick.openCostAmount,
    topReward: best
      ? {
          name: best.rewardItemName as string,
          rarity: (best.rewardItemRarity ?? 'common') as Rarity,
          chance: best.chance,
        }
      : null,
    hasChase: pick.rewards.some((r) => r.isJackpot || r.limited),
    href: '/cases',
  }
}

// --- Full Home context ------------------------------------------------------

export type HomeContext = {
  identity: IdentityProgression | null
  goals: NextGoal[]
  featured: FeaturedOpportunity | null
  /** Personal recent activity (for "While you were away" diffing client-side). */
  personalFeed: CommunityEvent[]
  /** Community-wide activity feed. */
  communityFeed: CommunityEvent[]
  leaders: RichUser[]
  stats: CommunityStats | null
}

/**
 * One-pass Home snapshot. `userId` is null for guests/unauthenticated visitors;
 * in that case identity/goals/personalFeed are empty and the page renders the
 * guest landing. All sub-loaders degrade independently so a single failure
 * never blanks the whole page.
 */
export async function getHomeContext(
  userId: number | null,
): Promise<HomeContext> {
  const [
    identity,
    featured,
    personalFeed,
    communityFeed,
    leaders,
    stats,
  ] = await Promise.all([
    userId !== null ? getIdentityProgression(userId) : Promise.resolve(null),
    pickFeaturedOpportunity(),
    userId !== null ? getUserFeed(userId, 12) : Promise.resolve([]),
    getCommunityFeed(16),
    getTopRich(5).catch(() => [] as RichUser[]),
    getCommunityStats().catch(() => null),
  ])

  const goals = identity?.registered ? computeNextGoals(identity) : []

  return {
    identity,
    goals,
    featured,
    personalFeed,
    communityFeed,
    leaders,
    stats,
  }
}
