import 'server-only'

import type { CommunityEvent } from '@/lib/events'
import type { Rarity } from '@/lib/rarity'
import { RARITY_ORDER } from '@/lib/rarity'
import {
  getUserSummary,
  getTopRich,
  getWeeklyTop,
  getCommunityStats,
  type RichUser,
  type WeeklyEarner,
  type CommunityStats,
} from '@/lib/queries'
import { getCommunityFeed, getUserFeed } from '@/lib/feed'
import {
  getActiveSeason,
  getSeasonProfile,
  getSeasonLeaderboard,
  type SeasonLeaderRow,
} from '@/lib/season'
import { getActiveCasesWithRewards } from '@/lib/cases'

/**
 * Home aggregator (VOZNYA REDESIGN — Home = "VOZNYA Right Now").
 *
 * READ-ONLY. Composes EXISTING bot-DB read functions into a WORLD-FIRST snapshot.
 * Home answers "what's happening in VOZNYA right now / what did I miss / what's
 * hot / who's winning", NOT "who am I" — identity lives on Profile and in the
 * persistent shell bar. The only personal data Home carries is a THIN current-
 * state strip (division + MMR-ish standing + balance + leaderboard place); no
 * progression detail, no personal goals, no achievements/collection.
 *
 * NEVER writes — the bot owns `users` and all game tables. Every field is
 * DB-backed or derived from DB-backed values. Signals that require stored
 * history the bot does not write (trend deltas, "you fell N places vs
 * yesterday", "economy +X% today") are intentionally OMITTED, not faked. We use
 * only honest CURRENT + TIME-WINDOWED + SINCE-LAST-VISIT signals.
 */

// --- Thin personal strip (current-state only) -------------------------------

export type PlayerStrip = {
  userId: number
  name: string | null
  photoUrl: string | null
  balance: number | null
  /** Leaderboard position by balance. */
  rank: number | null
  /** Current season division (label + emoji) — current state, not progression. */
  division: { name: string; emoji: string } | null
  seasonMmr: number | null
  seasonRank: number | null
}

/**
 * Build the thin personal strip. Deliberately minimal: it is an anchor, not a
 * profile. Degrades to `null` for guests / DB-unavailable. Season is guarded
 * (season tables can be absent on un-migrated DBs) and simply omitted on error.
 */
export async function getPlayerStrip(userId: number): Promise<PlayerStrip | null> {
  let summary: Awaited<ReturnType<typeof getUserSummary>> | null = null
  try {
    summary = await getUserSummary(userId)
  } catch {
    return null
  }
  if (!summary.registered) return null

  let division: { name: string; emoji: string } | null = null
  let seasonMmr: number | null = null
  let seasonRank: number | null = null
  try {
    const sp = await getSeasonProfile(userId)
    seasonMmr = sp.seasonMmr
    seasonRank = sp.rank
    division = { name: sp.division.name, emoji: sp.division.emoji }
  } catch {
    // No season tables — strip still renders balance/rank.
  }

  return {
    userId,
    name: summary.name,
    photoUrl: summary.photoUrl,
    balance: summary.balance,
    rank: summary.rank,
    division,
    seasonMmr,
    seasonRank,
  }
}

// --- Hot Today (world highlights derived from the real feed) ----------------

export type HotHighlight = {
  id: string
  label: string
  actorName: string
  actorId: number
  value: number | null
  rarity: Rarity
  icon: string
  occurredAt: string
}

export type HotToday = {
  /** Single biggest payout event in the window (casino/treasure/case value). */
  biggestWin: HotHighlight | null
  /** Rarest drop in the window (highest rarity tier, tie-broken by value). */
  rarestDrop: HotHighlight | null
  /** Count of jackpots in the window — "the world is winning" proof. */
  jackpots: number
  /** Count of rare+ Telegram-gift drops in the window. */
  giftDrops: number
}

function toHighlight(e: CommunityEvent, label: string): HotHighlight {
  return {
    id: e.id,
    label,
    actorName: e.actor.name,
    actorId: e.actor.id,
    value: e.value ?? null,
    rarity: e.rarity,
    icon: e.icon,
    occurredAt: e.occurredAt,
  }
}

/**
 * Derive "hot today" highlights from the real community feed. This is honest:
 * it ranks events the feed already returned (timestamped, real), it does not
 * invent superlatives. "Today" here means "within the fetched recent window" —
 * we do not claim calendar-day semantics we cannot back.
 */
function deriveHotToday(feed: CommunityEvent[]): HotToday {
  let biggestWin: CommunityEvent | null = null
  let rarestDrop: CommunityEvent | null = null
  let jackpots = 0
  let giftDrops = 0

  for (const e of feed) {
    if (e.code === 'CASE_JACKPOT') jackpots++
    if (e.code === 'CASE_GIFT_DROP' || e.code === 'GIFT_DELIVERED') giftDrops++

    if (e.value != null && (biggestWin == null || e.value > (biggestWin.value ?? 0))) {
      biggestWin = e
    }

    if (rarestDrop == null) {
      rarestDrop = e
    } else {
      const a = RARITY_ORDER.indexOf(e.rarity)
      const b = RARITY_ORDER.indexOf(rarestDrop.rarity)
      if (a > b || (a === b && (e.value ?? 0) > (rarestDrop.value ?? 0))) {
        rarestDrop = e
      }
    }
  }

  return {
    biggestWin: biggestWin ? toHighlight(biggestWin, 'Крупнейший выигрыш') : null,
    rarestDrop: rarestDrop ? toHighlight(rarestDrop, 'Редчайший дроп') : null,
    jackpots,
    giftDrops,
  }
}

// --- Featured opportunity (storefront pick over real cases) -----------------

export type FeaturedOpportunity = {
  kind: 'case'
  itemCode: string
  name: string
  description: string | null
  openCostKind: string
  openCostAmount: number
  topReward: { name: string; rarity: Rarity; chance: number } | null
  hasChase: boolean
  href: string
}

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

// --- Season race (spectator view of the world's season) ---------------------

export type SeasonRace = {
  name: string
  endsAt: string | null
  leaders: {
    userId: number
    name: string
    seasonMmr: number
    division: { name: string; emoji: string }
  }[]
}

async function loadSeasonRace(): Promise<SeasonRace | null> {
  try {
    const [active, leaders] = await Promise.all([
      getActiveSeason(),
      getSeasonLeaderboard(5),
    ])
    if (!active && leaders.length === 0) return null
    return {
      name: active?.name ?? 'Сезон',
      endsAt: active?.endsAt ?? null,
      leaders: leaders.map((r: SeasonLeaderRow) => ({
        userId: r.userId,
        name: r.name?.trim() || (r.username ? `@${r.username}` : 'Игрок'),
        seasonMmr: r.seasonMmr,
        division: { name: r.division.name, emoji: r.division.emoji },
      })),
    }
  } catch {
    return null
  }
}

// --- Full Home context ------------------------------------------------------

export type HomeContext = {
  /** Thin current-state strip; null for guests. */
  player: PlayerStrip | null
  /** Community-wide live activity (the heartbeat). */
  worldFeed: CommunityEvent[]
  /** Personal recent activity, for the "while you were away" world+you re-entry. */
  personalFeed: CommunityEvent[]
  hotToday: HotToday
  featured: FeaturedOpportunity | null
  seasonRace: SeasonRace | null
  /** Top by balance (status). */
  richLeaders: RichUser[]
  /** Top earners in the last 7 days (who's rising right now). */
  weeklyMovers: WeeklyEarner[]
  stats: CommunityStats | null
}

/**
 * One-pass WORLD-FIRST Home snapshot. `userId` is null for guests; in that case
 * `player` and `personalFeed` are empty and the page renders the guest landing.
 * Every sub-loader degrades independently so a single failure never blanks Home.
 */
export async function getHomeContext(
  userId: number | null,
): Promise<HomeContext> {
  const [
    player,
    worldFeed,
    personalFeed,
    featured,
    seasonRace,
    richLeaders,
    weeklyMovers,
    stats,
  ] = await Promise.all([
    userId !== null ? getPlayerStrip(userId) : Promise.resolve(null),
    getCommunityFeed(24),
    userId !== null ? getUserFeed(userId, 12) : Promise.resolve([]),
    pickFeaturedOpportunity(),
    loadSeasonRace(),
    getTopRich(5).catch(() => [] as RichUser[]),
    getWeeklyTop(7, 5).catch(() => [] as WeeklyEarner[]),
    getCommunityStats().catch(() => null),
  ])

  return {
    player,
    worldFeed,
    personalFeed,
    hotToday: deriveHotToday(worldFeed),
    featured,
    seasonRace,
    richLeaders,
    weeklyMovers,
    stats,
  }
}
