import 'server-only'

import { mmrRank, MMR_RANKS, type MmrRank } from '@/lib/mmr'
import { getPlayerProfile, getUserSummary } from '@/lib/queries'
import { getActiveSeason, getSeasonProfile, divisionProgress } from '@/lib/season'

/**
 * Identity / progression slice (VOZNYA REDESIGN).
 *
 * This is the SELF surface's data, deliberately SEPARATE from the Home
 * aggregator (`lib/home-context.ts`). Home is world-first and must not own
 * identity; this slice powers the things that legitimately show "who am I":
 *   - the persistent shell `PlayerContextBar` (identity on every screen), and
 *   - the Profile page (prestige centerpiece, later stage).
 *
 * READ-ONLY. Degrades gracefully: unregistered / DB-unavailable yields a
 * well-formed object with `registered: false` and null progression.
 */
export type IdentityDivision = { name: string; emoji: string; minMmr: number }

export type IdentitySeason = {
  name: string
  endsAt: string | null
  seasonMmr: number
  rank: number | null
  division: IdentityDivision
  nextDivision: IdentityDivision | null
  ratio: number
  toNext: number
}

export type IdentityFamily = { partnerId: number; partnerName: string; days: number }

export type IdentityProgression = {
  userId: number
  registered: boolean
  name: string | null
  photoUrl: string | null
  balance: number | null
  rank: number | null
  mmr: number | null
  mmrRank: MmrRank | null
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
  return { next, toNext: next ? Math.max(0, next.minMmr - mmr) : null }
}

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

export async function getIdentityProgression(
  userId: number,
): Promise<IdentityProgression> {
  let profile: Awaited<ReturnType<typeof getPlayerProfile>> = null
  try {
    profile = await getPlayerProfile(userId)
  } catch {
    profile = null
  }

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
