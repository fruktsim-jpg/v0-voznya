import { describe, it, expect } from 'vitest'
import { ESHKI_PER_STAR, ITEM_SELL_RATE } from '@/lib/economy-rules'

// economy-rules mirrors the bot's app/settings/balance.py. These values drive
// real money math (item internal value = star_cost × ESHKI_PER_STAR; sell pays
// floor(value × ITEM_SELL_RATE)) on BOTH the site and the bot against the same
// DB, so they must never drift. Pin them, and pin the derived sell formula.

describe('economy constants (bot↔site sync guard)', () => {
  it('ESHKI_PER_STAR matches the bot (balance.py)', () => {
    expect(ESHKI_PER_STAR).toBe(10)
  })

  it('ITEM_SELL_RATE matches the bot (balance.py)', () => {
    expect(ITEM_SELL_RATE).toBe(0.7)
  })
})

// Contract mirror of lib/inventory-actions._sell_value / _item_full_value
// (those are module-private). If the site formula changes, this must change
// in lockstep with the bot's sell_gift — keeping the audited invariant pinned.
function itemFullValueFromStars(starCost: number): number {
  return Math.max(0, starCost) * ESHKI_PER_STAR
}
function sellValue(fullValue: number): number {
  return Math.floor(Math.max(0, fullValue) * ITEM_SELL_RATE)
}

describe('sell-value math (mirror of sell_gift)', () => {
  it('values an item from its star cost', () => {
    expect(itemFullValueFromStars(15)).toBe(150)
  })

  it('pays 70% of full value, floored', () => {
    expect(sellValue(150)).toBe(105)
    // 100 × 0.7 = 70 exactly
    expect(sellValue(100)).toBe(70)
    // 101 × 0.7 = 70.7 → floor 70 (never round up in the player's favor)
    expect(sellValue(101)).toBe(70)
  })

  it('never yields a negative payout', () => {
    expect(sellValue(-999)).toBe(0)
    expect(itemFullValueFromStars(-5)).toBe(0)
  })

  it('a zero-value item sells for zero (no free eshki)', () => {
    expect(sellValue(0)).toBe(0)
  })
})
