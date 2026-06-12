// =============================================================================
// VOZNYA — CASE ECONOMICS (Command Center, workflow-first Case Builder)
// =============================================================================
//
// Pure, dependency-light economics so the operator sees EV · RTP · rarity
// distribution · supply pressure WHILE composing a case — not on a separate
// analytics page after the fact. Client- and server-safe (no `lib/db`, no
// `server-only`). It computes the SAME odds the bot derives (weight / Σweight)
// and prices item rewards by `ref_value` (eshki), mirroring the bot's value
// model (see lib/economy-rules.ts). It does NOT open cases or write anything.
//
// The operator thinks in chances, value, excitement; weights stay underneath.
// =============================================================================

import { normalizeRarity, currencyRewardRarity, type Rarity } from '@/lib/rarity'
import { RARITY_ORDER } from '@/lib/rarity'

/** A drop row as the builder/editor holds it (superset of the API row). */
export type EconomyReward = {
  id?: number
  rewardKind: 'item' | 'currency'
  /** eshki for currency rewards; null for item rewards. */
  amount: number | null
  /** item value in eshki (inventory_items.ref_value); null when unpriced. */
  refValue?: number | null
  rarity?: string | null
  weight: number
  minQty: number
  maxQty: number
  maxGlobalSupply?: number | null
  grantedCount?: number
  isJackpot?: boolean
}

export type RewardOdds = EconomyReward & {
  /** probability 0..1 of this row per open. */
  p: number
  /** expected qty per hit (mid of min/max). */
  midQty: number
  /** per-row value in eshki (currency amount or item ref_value), per unit. */
  unitValue: number
  /** contribution to EV: p * midQty * unitValue. */
  evContribution: number
  /** effective rarity tier for distribution (item rarity or currency-by-amount). */
  tier: Rarity
}

export type CaseEconomics = {
  totalWeight: number
  /** expected eshki returned per open. */
  ev: number
  /** open price in eshki (0 for free/key-only cases). */
  price: number
  /** return-to-player = ev / price (null when price is 0). */
  rtp: number | null
  rows: RewardOdds[]
  /** probability mass per rarity tier (sums to ~1 across present tiers). */
  rarityDistribution: { tier: Rarity; p: number }[]
  /** rows with a global supply cap and how close they are to exhaustion. */
  supplyPressure: {
    reward: RewardOdds
    remaining: number
    cap: number
    pctConsumed: number
  }[]
  /** item rewards with no ref_value — EV is understated by their value. */
  unpricedItemRows: number
  /** does any drop exist? a case with no drops cannot be opened. */
  hasDrops: boolean
}

const mid = (a: number, b: number) => (a + b) / 2

/** Per-unit eshki value of a reward row (currency = amount; item = ref_value). */
export function rewardUnitValue(r: EconomyReward): number {
  if (r.rewardKind === 'currency') return Math.max(0, r.amount ?? 0)
  return Math.max(0, r.refValue ?? 0)
}

/** Effective rarity tier of a row, for the distribution view. */
export function rewardTier(r: EconomyReward): Rarity {
  if (r.rewardKind === 'currency') return currencyRewardRarity(r.amount ?? 0)
  return normalizeRarity(r.rarity)
}

/**
 * Compute full case economics from a drop list + open price. Probabilities are
 * weight / Σweight (matches the bot). EV sums p · midQty · unitValue; RTP is
 * EV / price.
 */
export function computeCaseEconomics(
  rewards: EconomyReward[],
  price: number,
): CaseEconomics {
  const totalWeight = rewards.reduce((s, r) => s + (r.weight > 0 ? r.weight : 0), 0)

  const rows: RewardOdds[] = rewards.map((r) => {
    const p = totalWeight > 0 ? Math.max(0, r.weight) / totalWeight : 0
    const midQty = mid(r.minQty, r.maxQty)
    const unitValue = rewardUnitValue(r)
    return {
      ...r,
      p,
      midQty,
      unitValue,
      evContribution: p * midQty * unitValue,
      tier: rewardTier(r),
    }
  })

  const ev = rows.reduce((s, r) => s + r.evContribution, 0)
  const rtp = price > 0 ? ev / price : null

  // Rarity distribution: probability mass grouped by tier, ordered canonically.
  const byTier = new Map<Rarity, number>()
  for (const r of rows) byTier.set(r.tier, (byTier.get(r.tier) ?? 0) + r.p)
  const rarityDistribution = RARITY_ORDER.filter((t) => (byTier.get(t) ?? 0) > 0).map(
    (tier) => ({ tier, p: byTier.get(tier) ?? 0 }),
  )

  const supplyPressure = rows
    .filter((r) => r.maxGlobalSupply != null && r.maxGlobalSupply > 0)
    .map((r) => {
      const cap = r.maxGlobalSupply as number
      const granted = r.grantedCount ?? 0
      const remaining = Math.max(0, cap - granted)
      return { reward: r, remaining, cap, pctConsumed: cap > 0 ? (granted / cap) * 100 : 0 }
    })
    .sort((a, b) => b.pctConsumed - a.pctConsumed)

  const unpricedItemRows = rows.filter(
    (r) => r.rewardKind === 'item' && (r.refValue == null || r.refValue <= 0),
  ).length

  return {
    totalWeight,
    ev,
    price,
    rtp,
    rows,
    rarityDistribution,
    supplyPressure,
    unpricedItemRows,
    hasDrops: rows.length > 0,
  }
}

/**
 * Monte-Carlo-free expected simulation: deterministic projection of opening N
 * times (expected counts = p · N). Honest and instant; no RNG variance so the
 * operator reads the intended distribution, not a noisy sample.
 */
export type SimulationResult = {
  opens: number
  totalSpent: number
  totalReturned: number
  net: number
  rtp: number | null
  perRow: { reward: RewardOdds; expectedHits: number; expectedValue: number }[]
  perTier: { tier: Rarity; expectedHits: number }[]
}

export function simulateOpens(econ: CaseEconomics, opens: number): SimulationResult {
  const perRow = econ.rows.map((r) => ({
    reward: r,
    expectedHits: r.p * opens,
    expectedValue: r.evContribution * opens,
  }))
  const totalReturned = perRow.reduce((s, x) => s + x.expectedValue, 0)
  const totalSpent = econ.price * opens

  const tierHits = new Map<Rarity, number>()
  for (const r of econ.rows) tierHits.set(r.tier, (tierHits.get(r.tier) ?? 0) + r.p * opens)
  const perTier = RARITY_ORDER.filter((t) => (tierHits.get(t) ?? 0) > 0).map((tier) => ({
    tier,
    expectedHits: tierHits.get(tier) ?? 0,
  }))

  return {
    opens,
    totalSpent,
    totalReturned,
    net: totalReturned - totalSpent,
    rtp: totalSpent > 0 ? totalReturned / totalSpent : null,
    perRow,
    perTier,
  }
}

/** Format a 0..1 probability as a readable percent string. */
export function pct(p: number): string {
  const v = p * 100
  if (v > 0 && v < 0.01) return '<0.01%'
  return `${v < 10 ? v.toFixed(2) : v.toFixed(1)}%`
}

/** RTP health band for operator color-coding. */
export function rtpBand(rtp: number | null): 'none' | 'low' | 'healthy' | 'high' | 'negative' {
  if (rtp == null) return 'none'
  if (rtp <= 0) return 'low'
  if (rtp < 0.85) return 'low'
  if (rtp <= 1.0) return 'healthy'
  return 'high'
}
