import 'server-only'

import { query } from './db'
import { ACHIEVEMENTS } from './voznya-bot'
import { normalizeRarity, RARITY_ORDER, type Rarity } from './rarity'
import type { PlayerProfile } from './queries'

/**
 * Local guards (mirrors of the private helpers in queries.ts). Kept here so
 * this module stays self-contained without widening queries.ts's public API.
 * Both fail safe to `false` so a missing table just hides a standing.
 */
async function tableExists(table: string): Promise<boolean> {
  try {
    const rows = await query<{ reg: string | null }>(
      `SELECT to_regclass($1) AS reg`,
      [table],
    )
    return Boolean(rows[0]?.reg)
  } catch {
    return false
  }
}

async function columnExists(table: string, column: string): Promise<boolean> {
  try {
    const rows = await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2
       ) AS exists`,
      [table, column],
    )
    return Boolean(rows[0]?.exists)
  } catch {
    return false
  }
}

/**
 * PRESTIGE SUMMARY (Phase D — Profile as a trophy case)
 * =====================================================
 * Read-only, additive aggregation that turns the profile's raw numbers into
 * *standing* — the emotional payoff the gap analysis calls E4 (prestige) and
 * E7 (social proof): "I can show something / I can become someone."
 *
 * It answers three questions a trophy case must answer at a glance:
 *   1. STANDING  — where do I rank *relative to everyone* ("Топ 3% по MMR")?
 *   2. CROWN JEWEL — what is the single rarest thing I own (or did)?
 *   3. MASTERY   — how complete is my collection / achievement set?
 *
 * Honesty rules (carried from the master context):
 *   - Percentiles are computed over the SAME population that defines each rank
 *     (e.g. `byMmr` ranks players with mmr>0, so the denominator is COUNT of
 *     players with mmr>0). No inflated "out of all users" framing.
 *   - Every field is nullable; when a ladder/table is absent the standing is
 *     simply omitted, never faked.
 *   - No new tables, no writes. Pure read layer over the bot's Postgres.
 */

export type Standing = {
  /** Ladder key for styling/links. */
  key: 'mmr' | 'wealth' | 'reputation' | 'voice'
  /** Short label, e.g. "MMR", "Богатство". */
  label: string
  /** 1-based rank in the ladder. */
  rank: number
  /** Population the rank is measured against (>0). */
  total: number
  /**
   * Top percentile, rounded to a "brag-friendly" value:
   * rank 1 → 1, otherwise ceil(rank/total*100) clamped to [1,99].
   * "Топ {topPercent}%".
   */
  topPercent: number
  /** True for rank 1 — used to render "№1", not "Топ 1%". */
  isFirst: boolean
}

export type CrownJewel = {
  /** What kind of possession this is. */
  kind: 'item' | 'achievement' | 'title'
  rarity: Rarity
  name: string
  /** Short provenance/﻿context line, e.g. "Коллекция · 1 шт.". */
  note: string
}

export type PrestigeSummary = {
  /** Ordered best-first; may be empty. Capped to the strongest few. */
  standings: Standing[]
  /** The single most prestigious possession, or null when nothing qualifies. */
  crownJewel: CrownJewel | null
  /** Achievement mastery (always available — catalog is static). */
  mastery: {
    achievementsUnlocked: number
    achievementsTotal: number
    /** Distinct rare+ items owned (rare/epic/legendary/mythic), 0 when none. */
    rareItemsOwned: number
  }
  /** Equipped title, when the cosmetic read-path has one. */
  equippedTitle: { name: string } | null
}

function bragPercent(rank: number, total: number): number {
  if (total <= 0) return 99
  if (rank <= 1) return 1
  return Math.min(99, Math.max(1, Math.ceil((rank / total) * 100)))
}

/** Count of players on the MMR ladder, matching getPlayerProfile's ranking population. */
async function mmrPopulation(): Promise<number> {
  if (await columnExists('users', 'mmr')) {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM users WHERE mmr > 0`,
    )
    return Number(rows[0]?.n ?? 0)
  }
  if (await tableExists('mmr_entries')) {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM (
         SELECT player_id FROM mmr_entries GROUP BY player_id HAVING SUM(amount) > 0
       ) t`,
    )
    return Number(rows[0]?.n ?? 0)
  }
  return 0
}

async function wealthPopulation(): Promise<number> {
  // rankInTop ranks by balance among players with balance > 0.
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM users WHERE balance > 0`,
  )
  return Number(rows[0]?.n ?? 0)
}

async function reputationPopulation(): Promise<number> {
  if (!(await tableExists('reputation_entries'))) return 0
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM (
       SELECT target_user_id FROM reputation_entries GROUP BY target_user_id
     ) t`,
  )
  return Number(rows[0]?.n ?? 0)
}

async function voicePopulation(): Promise<number> {
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM users WHERE messages_count > 0`,
  )
  return Number(rows[0]?.n ?? 0)
}

/**
 * Build the prestige summary for a profile. Accepts the already-loaded
 * PlayerProfile (so we reuse its ranks/inventory/achievements) and runs only a
 * handful of small COUNT queries for the ladder denominators. Degrades to an
 * empty-but-valid summary on any failure (the profile must still render).
 */
export async function getPrestigeSummary(profile: PlayerProfile): Promise<PrestigeSummary> {
  const standings: Standing[] = []

  try {
    const [mmrTotal, wealthTotal, repTotal, voiceTotal] = await Promise.all([
      profile.ranks.byMmr ? mmrPopulation() : Promise.resolve(0),
      profile.rankInTop ? wealthPopulation() : Promise.resolve(0),
      profile.ranks.byReputation ? reputationPopulation() : Promise.resolve(0),
      profile.ranks.byMessages ? voicePopulation() : Promise.resolve(0),
    ])

    const add = (
      key: Standing['key'],
      label: string,
      rank: number | null,
      total: number,
    ) => {
      if (!rank || total <= 0 || rank > total) return
      standings.push({
        key,
        label,
        rank,
        total,
        topPercent: bragPercent(rank, total),
        isFirst: rank === 1,
      })
    }

    add('mmr', 'MMR', profile.ranks.byMmr, mmrTotal)
    add('wealth', 'Богатство', profile.rankInTop, wealthTotal)
    add('reputation', 'Уважение', profile.ranks.byReputation, repTotal)
    add('voice', 'Голос', profile.ranks.byMessages, voiceTotal)

    // Best standing first (lowest topPercent), so the strongest brag leads.
    standings.sort((a, b) => a.topPercent - b.topPercent || a.rank - b.rank)
  } catch {
    // Leave standings as-is; the profile renders without the standing strip.
  }

  // --- Crown jewel: the single most prestigious possession ----------------
  // Prefer the rarest inventory item; an equipped title is inherently
  // prestigious; otherwise fall back to the highest-reward achievement.
  let crownJewel: CrownJewel | null = null

  const rarestItem = (profile.inventory?.list ?? [])
    .map((i) => ({ item: i, r: normalizeRarity(i.rarity) }))
    .sort((a, b) => RARITY_ORDER.indexOf(b.r) - RARITY_ORDER.indexOf(a.r))[0]

  if (rarestItem && RARITY_ORDER.indexOf(rarestItem.r) >= RARITY_ORDER.indexOf('rare')) {
    crownJewel = {
      kind: 'item',
      rarity: rarestItem.r,
      name: rarestItem.item.name,
      note: rarestItem.item.quantity > 1 ? `Коллекция · ${rarestItem.item.quantity} шт.` : 'Коллекция',
    }
  } else if (profile.cosmetics.title) {
    crownJewel = {
      kind: 'title',
      rarity: 'legendary',
      name: profile.cosmetics.title.name,
      note: 'Уникальный титул',
    }
  } else {
    const topAch = [...profile.achievements].sort((a, b) => b.reward - a.reward)[0]
    if (topAch) {
      const r: Rarity =
        topAch.reward >= 5000 ? 'legendary'
        : topAch.reward >= 2000 ? 'epic'
        : topAch.reward >= 500 ? 'rare'
        : 'uncommon'
      crownJewel = { kind: 'achievement', rarity: r, name: topAch.name, note: 'Достижение' }
    }
  }

  const rareItemsOwned = (profile.inventory?.list ?? []).filter(
    (i) => RARITY_ORDER.indexOf(normalizeRarity(i.rarity)) >= RARITY_ORDER.indexOf('rare'),
  ).length

  return {
    standings: standings.slice(0, 3),
    crownJewel,
    mastery: {
      achievementsUnlocked: profile.achievementsUnlocked,
      achievementsTotal: ACHIEVEMENTS.length,
      rareItemsOwned,
    },
    equippedTitle: profile.cosmetics.title ? { name: profile.cosmetics.title.name } : null,
  }
}
