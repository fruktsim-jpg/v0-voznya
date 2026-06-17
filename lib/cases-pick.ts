// Pure, testable reward-pick logic — a faithful port of the bot's _pick_reward
// + _is_rare_reward (voznya-bot/app/features/cases/service.py). Kept separate
// from cases-open.ts (which is server-only + DB) so it can be unit-tested for
// bot↔site parity without a database.
//
// PARITY NOTE: the bot scales the EFFECTIVE weight of rare rewards (jackpots
// and limited-supply rows) by `dropMult` (app_settings: modifier.drop) during
// selection only — DB weights and the ledger snapshot are untouched. The site
// previously ignored this multiplier; this module restores it. Callers pass
// dropMult=1.0 (the default) until the site wires the same app_settings value,
// which keeps current behavior identical while making the path correct.

export interface PickableReward {
  weight: number
  is_jackpot: boolean
  max_global_supply: number | null
}

/** Rare = jackpot or limited-supply. Mirrors _is_rare_reward. */
export function isRareReward(r: PickableReward): boolean {
  return Boolean(r.is_jackpot) || r.max_global_supply != null
}

/**
 * Effective weights used for selection. With dropMult ≠ 1.0 (and > 0), rare
 * rewards get `max(1, round(weight × dropMult))`; everyone else keeps weight.
 * Mirrors the bot's eff_weights branch exactly.
 */
export function effectiveWeights(
  rewards: readonly PickableReward[],
  dropMult = 1.0,
): number[] {
  if (dropMult && dropMult > 0 && dropMult !== 1.0) {
    return rewards.map((r) =>
      isRareReward(r) ? Math.max(1, Math.round(r.weight * dropMult)) : r.weight,
    )
  }
  return rewards.map((r) => r.weight)
}

/**
 * Weighted pick by cumulative effective weight. `roll` must be an integer in
 * [0, total). Returns the chosen index, the roll, and the total weight.
 * Selection rule mirrors _pick_reward: first row where roll < running sum.
 *
 * `roll` is injected so the rule is deterministically testable; production
 * passes a CSPRNG value (crypto.randomInt). Python's secrets.randbelow and
 * Node's crypto.randomInt produce the same [0, total) integer domain.
 */
export function pickIndexByRoll(
  rewards: readonly PickableReward[],
  roll: number,
  dropMult = 1.0,
): { index: number; total: number } {
  const eff = effectiveWeights(rewards, dropMult)
  const total = eff.reduce((s, w) => s + w, 0)
  let acc = 0
  for (let i = 0; i < rewards.length; i++) {
    acc += eff[i]
    if (roll < acc) return { index: i, total }
  }
  // Unreachable for roll < total; safety net mirrors the bot (last row).
  return { index: rewards.length - 1, total }
}
