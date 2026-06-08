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
}


export type ShowcaseCase = {
  itemCode: string
  name: string
  description: string | null
  openCostKind: string
  openCostAmount: number
  consumesKey: boolean
  rewards: ShowcaseReward[]
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
  }[]
  try {
    cases = await query(
      `SELECT item_code, name, description, open_cost_kind,
              open_cost_amount, consumes_key
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
  }[] = []
  try {
    rewardRows = await query(
      `SELECT r.case_item_code, r.reward_kind, r.reward_item_code,
              COALESCE(i.name, g.name) AS reward_item_name,
              i.rarity AS reward_item_rarity,
              g.star_cost AS star_cost,
              r.amount, r.weight, r.min_qty, r.max_qty,
              r.max_global_supply, r.is_jackpot
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
    }))

    return {
      itemCode: c.item_code,
      name: c.name,
      description: c.description,
      openCostKind: c.open_cost_kind,
      openCostAmount: Number(c.open_cost_amount),
      consumesKey: c.consumes_key,
      rewards,
    }
  })
}
