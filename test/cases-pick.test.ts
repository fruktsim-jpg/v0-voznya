import { describe, it, expect } from 'vitest'
import {
  isRareReward,
  effectiveWeights,
  pickIndexByRoll,
  type PickableReward,
} from '@/lib/cases-pick'

// Parity tests for the case reward-pick rule (P0 #3). This is a port of the
// bot's _pick_reward / _is_rare_reward (voznya-bot/app/features/cases/service.py).
// The DB-bound open flow (lib/cases-open.ts) delegates the selection rule here,
// so pinning it pins both sides' odds math. `roll` is injected to make the
// cumulative-weight rule deterministic (prod passes a CSPRNG value in [0,total)).

const r = (
  weight: number,
  opts: { jackpot?: boolean; supply?: number | null } = {},
): PickableReward => ({
  weight,
  is_jackpot: opts.jackpot ?? false,
  max_global_supply: opts.supply ?? null,
})

describe('isRareReward (mirror of _is_rare_reward)', () => {
  it('treats jackpots and limited-supply rows as rare', () => {
    expect(isRareReward(r(10, { jackpot: true }))).toBe(true)
    expect(isRareReward(r(10, { supply: 100 }))).toBe(true)
    expect(isRareReward(r(10))).toBe(false)
  })
})

describe('pickIndexByRoll (mirror of _pick_reward cumulative rule)', () => {
  const rewards = [r(10), r(30), r(60)] // total 100, boundaries 10 / 40 / 100

  it('selects the first row whose cumulative weight exceeds the roll', () => {
    expect(pickIndexByRoll(rewards, 0).index).toBe(0) // [0,10)
    expect(pickIndexByRoll(rewards, 9).index).toBe(0)
    expect(pickIndexByRoll(rewards, 10).index).toBe(1) // [10,40)
    expect(pickIndexByRoll(rewards, 39).index).toBe(1)
    expect(pickIndexByRoll(rewards, 40).index).toBe(2) // [40,100)
    expect(pickIndexByRoll(rewards, 99).index).toBe(2)
  })

  it('reports the total weight', () => {
    expect(pickIndexByRoll(rewards, 0).total).toBe(100)
  })

  it('every roll in [0,total) maps to exactly one reward (full coverage)', () => {
    const counts = [0, 0, 0]
    for (let roll = 0; roll < 100; roll++) counts[pickIndexByRoll(rewards, roll).index]++
    // Each reward owns exactly its weight worth of rolls — the odds ARE the weights.
    expect(counts).toEqual([10, 30, 60])
  })
})

describe('effectiveWeights (mirror of eff_weights / drop_mult)', () => {
  it('returns raw weights when dropMult is 1.0 (default, current site behavior)', () => {
    const rewards = [r(10, { jackpot: true }), r(90)]
    expect(effectiveWeights(rewards)).toEqual([10, 90])
    expect(effectiveWeights(rewards, 1.0)).toEqual([10, 90])
  })

  it('scales ONLY rare rewards by dropMult, floored at 1, rounded', () => {
    const rewards = [
      r(10, { jackpot: true }), // rare → 10×2.0 = 20
      r(5, { supply: 50 }), //     rare → 5×2.0 = 10
      r(85), //                    common → unchanged
    ]
    expect(effectiveWeights(rewards, 2.0)).toEqual([20, 10, 85])
  })

  it('never drops a rare weight below 1', () => {
    expect(effectiveWeights([r(1, { jackpot: true })], 0.1)).toEqual([1])
  })

  it('ignores non-positive multipliers (treats as no-op)', () => {
    const rewards = [r(10, { jackpot: true }), r(90)]
    expect(effectiveWeights(rewards, 0)).toEqual([10, 90])
    expect(effectiveWeights(rewards, -5)).toEqual([10, 90])
  })

  it('a higher dropMult shifts odds toward the rare reward', () => {
    const rewards = [r(10, { jackpot: true }), r(90)]
    const totalBefore = pickIndexByRoll(rewards, 0, 1.0).total
    const totalAfter = pickIndexByRoll(rewards, 0, 3.0).total
    expect(totalBefore).toBe(100) // 10 + 90
    expect(totalAfter).toBe(120) // 30 + 90 → rare share 10%→25%
  })
})
