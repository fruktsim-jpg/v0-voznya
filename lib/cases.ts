// Server-only read helpers for the public Cases showcase. Talks to Postgres
// via `./db`, so importing this into a client component must fail the build.
// READ-ONLY: the site never opens cases or writes the cases tables — the bot's
// open_case() is the single writer. These queries only display catalog data.
import 'server-only'

import { query } from './db'

export type ShowcaseReward = {
  rewardKind: string
  rewardItemCode: string | null
  rewardItemName: string | null
  rewardItemRarity: string | null
  amount: number | null
  minQty: number
  maxQty: number
  weight: number
  isJackpot: boolean
  limited: boolean
  // Probability in percent (weight / Σweight * 100), rounded for display.
  chance: number
  // For tg_gift rewards — the gift's Stars cost (real value), else null.
  starCost: number | null
  // Real global supply remaining for limited rewards: max_global_supply −
  // granted_count. null when the reward is unlimited (no cap). Powers honest
  // "осталось N" scarcity — never a fabricated number.
  remaining: number | null
}


export type ShowcaseCase = {
  itemCode: string
  name: string
  description: string | null
  openCostKind: string
  openCostAmount: number
  consumesKey: boolean
  rewards: ShowcaseReward[]
  // Scheduling / season metadata (Stage 3 — drives category derivation in the
  // UX layer). READ-ONLY: these already exist on case_definitions; we surface
  // them for presentation only. No new tables, no writes.
  seasonCode: string | null
  startsAt: string | null
  endsAt: string | null
}

/**
 * Active cases with their drop-lists and computed odds, for the public
 * showcase. "Active" = is_active AND inside the optional start/end window —
 * the same gate the bot's get_active_cases() applies. Degrades to an empty
 * list if the cases tables are not migrated yet (migration 0016).
 *
 * item/currency/tg_gift rewards are all shown — the same scope the opener
 * honors, so the displayed odds match what can actually drop. Telegram Gifts
 * and Premium (tg_gift) are the most valuable drops, so hiding them would
 * misrepresent the case's value.
 */

export async function getActiveCasesWithRewards(): Promise<ShowcaseCase[]> {
  let cases: {
    item_code: string
    name: string
    description: string | null
    open_cost_kind: string
    open_cost_amount: string
    consumes_key: boolean
    season_code: string | null
    starts_at: Date | string | null
    ends_at: Date | string | null
  }[]
  try {
    cases = await query(
      `SELECT item_code, name, description, open_cost_kind,
              open_cost_amount, consumes_key,
              season_code, starts_at, ends_at
         FROM case_definitions
        WHERE is_active = true
          AND (starts_at IS NULL OR starts_at <= now())
          AND (ends_at IS NULL OR ends_at >= now())
        ORDER BY name`,
    )
  } catch {
    return []
  }
  if (cases.length === 0) return []

  const codes = cases.map((c) => c.item_code)
  let rewardRows: {
    case_item_code: string
    reward_kind: string
    reward_item_code: string | null
    reward_item_name: string | null
    reward_item_rarity: string | null
    amount: string | null
    weight: number
    min_qty: number
    max_qty: number
    max_global_supply: number | null
    is_jackpot: boolean
    star_cost: number | null
    granted_count: number | null
  }[] = []
  try {
    rewardRows = await query(
      `SELECT r.case_item_code, r.reward_kind, r.reward_item_code,
              COALESCE(i.name, g.name) AS reward_item_name,
              i.rarity AS reward_item_rarity,
              g.star_cost AS star_cost,
              r.amount, r.weight, r.min_qty, r.max_qty,
              r.max_global_supply, r.granted_count, r.is_jackpot
         FROM case_rewards r
         LEFT JOIN inventory_items i ON i.code = r.reward_item_code
         LEFT JOIN gift_catalog g ON g.code = r.reward_item_code
        WHERE r.case_item_code = ANY($1)
          AND r.reward_kind IN ('item', 'currency', 'tg_gift')
        ORDER BY r.weight DESC, r.id`,
      [codes],
    )

  } catch {
    rewardRows = []
  }


  const byCase = new Map<string, typeof rewardRows>()
  for (const r of rewardRows) {
    const list = byCase.get(r.case_item_code) ?? []
    list.push(r)
    byCase.set(r.case_item_code, list)
  }

  return cases.map((c) => {
    const rows = byCase.get(c.item_code) ?? []
    const total = rows.reduce((s, r) => s + r.weight, 0) || 1
    const rewards: ShowcaseReward[] = rows.map((r) => ({
      rewardKind: r.reward_kind,
      rewardItemCode: r.reward_item_code,
      rewardItemName: r.reward_item_name,
      rewardItemRarity: r.reward_item_rarity,
      amount: r.amount == null ? null : Number(r.amount),
      minQty: r.min_qty,
      maxQty: r.max_qty,
      weight: r.weight,
      isJackpot: r.is_jackpot,
      limited: r.max_global_supply != null,
      chance: (r.weight / total) * 100,
      starCost: r.star_cost == null ? null : Number(r.star_cost),
      remaining:
        r.max_global_supply == null
          ? null
          : Math.max(0, Number(r.max_global_supply) - Number(r.granted_count ?? 0)),
    }))

    return {
      itemCode: c.item_code,
      name: c.name,
      description: c.description,
      openCostKind: c.open_cost_kind,
      openCostAmount: Number(c.open_cost_amount),
      consumesKey: c.consumes_key,
      rewards,
      seasonCode: c.season_code ?? null,
      startsAt: c.starts_at == null ? null : new Date(c.starts_at).toISOString(),
      endsAt: c.ends_at == null ? null : new Date(c.ends_at).toISOString(),
    }
  })
}

// ----------------------------------------------------------------------------
// Social proof + popularity — read-only over the case_openings ledger (the same
// append-only table getCommunityFeed() reads). PUBLIC-SAFE columns only: who won
// what, when, and how rare — NEVER spend/RTP/profit (those stay in admin). No
// new tables, degrades to empty like every other loader.
// ----------------------------------------------------------------------------

/** One recent case win, for the storefront "недавно выиграли" social-proof ticker. */
export type RecentCaseWin = {
  id: string
  caseItemCode: string
  actorName: string
  rewardName: string
  rewardKind: string
  rarity: string
  // Stars value for tg_gift, else the eshki amount, else null. Display only.
  value: number | null
  createdAt: string
}

/**
 * Latest notable case wins across all cases (newest first). "Notable" =
 * item/gift drops or jackpots — we skip plain currency so the ticker shows
 * desirable wins, not "выиграл 50 ешек". Real names from users, real rarity
 * from the rolled reward. Degrades to [] on any failure.
 */
export async function getRecentCaseWins(limit = 12): Promise<RecentCaseWin[]> {
  try {
    const rows = await query<{
      id: string
      case_item_code: string
      actor_name: string
      reward_name: string | null
      reward_kind: string
      rarity: string
      value: string | null
      created_at: string
    }>(
      `SELECT co.id::text AS id,
              co.case_item_code,
              COALESCE(NULLIF(u.first_name,''), NULLIF(u.username,''), 'Игрок') AS actor_name,
              COALESCE(ii.name, gc.name, co.reward_item_code) AS reward_name,
              co.reward_kind,
              CASE
                WHEN co.reward_kind = 'tg_gift' THEN 'mythic'
                WHEN cr.is_jackpot THEN 'legendary'
                ELSE COALESCE(ii.rarity, 'common')
              END AS rarity,
              CASE WHEN co.reward_kind = 'tg_gift' THEN gc.star_cost
                   ELSE co.amount END AS value,
              co.created_at
         FROM case_openings co
         JOIN users u ON u.user_id = co.user_id
         LEFT JOIN case_rewards cr ON cr.id = co.reward_id
         LEFT JOIN inventory_items ii ON ii.code = co.reward_item_code
         LEFT JOIN gift_catalog gc ON gc.code = co.reward_item_code
        WHERE co.reward_kind IN ('item', 'tg_gift')
           OR cr.is_jackpot
        ORDER BY co.created_at DESC
        LIMIT $1`,
      [limit],
    )
    return rows.map((r) => ({
      id: r.id,
      caseItemCode: r.case_item_code,
      actorName: r.actor_name,
      rewardName: r.reward_name ?? 'награда',
      rewardKind: r.reward_kind,
      rarity: r.rarity,
      value: r.value == null ? null : Number(r.value),
      createdAt: new Date(r.created_at).toISOString(),
    }))
  } catch {
    return []
  }
}

/**
 * Total open count per case (all-time). Real popularity signal from the same
 * ledger. Returns a Map keyed by case_item_code; empty Map on failure. No spend
 * or profit data — just "how many times opened".
 */
export async function getCaseOpenCounts(): Promise<Map<string, number>> {
  try {
    const rows = await query<{ case_item_code: string; opens: string }>(
      `SELECT case_item_code, COUNT(*)::text AS opens
         FROM case_openings
        GROUP BY case_item_code`,
    )
    return new Map(rows.map((r) => [r.case_item_code, Number(r.opens)]))
  } catch {
    return new Map()
  }
}
