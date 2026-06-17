import { describe, it, expect } from 'vitest'
import { ESHKI_PER_STAR, ITEM_SELL_RATE } from '@/lib/economy-rules'
import { sellValue, itemFullValue } from '@/lib/gift-value'

// economy-rules mirrors the bot's app/settings/balance.py. These values drive
// real money math (item internal value = star_cost × ESHKI_PER_STAR; sell pays
// floor(value × ITEM_SELL_RATE)) on BOTH the site and the bot against the same
// DB, so they must never drift. We import the REAL site functions (lib/gift-value,
// which inventory-actions delegates to) and pin them against the bot's control
// examples from test_gift_sell_value.py — this is the actual sell path, not a
// re-implementation.

describe('economy constants (bot↔site sync guard)', () => {
  it('ESHKI_PER_STAR matches the bot (balance.py)', () => {
    expect(ESHKI_PER_STAR).toBe(10)
  })

  it('ITEM_SELL_RATE matches the bot (balance.py)', () => {
    expect(ITEM_SELL_RATE).toBe(0.7)
  })
})

describe('sellValue (mirror of bot _sell_value control examples)', () => {
  it('pays 70% floored — matches test_gift_sell_value.py', () => {
    expect(sellValue(150)).toBe(105) // Сердечко
    expect(sellValue(250)).toBe(175) // Роза
    expect(sellValue(500)).toBe(350) // Ракета
    expect(sellValue(1000)).toBe(700) // Бриллиант
    expect(sellValue(10000)).toBe(7000) // Premium 3м
    expect(sellValue(15000)).toBe(10500) // Premium 6м
  })

  it('floors and never rounds up in the player favor', () => {
    expect(sellValue(333)).toBe(233) // 233.1 → 233
    expect(sellValue(101)).toBe(70) // 70.7 → 70
    expect(sellValue(100)).toBe(70) // exact
  })

  it('never yields a negative or free payout', () => {
    expect(sellValue(0)).toBe(0)
    expect(sellValue(-100)).toBe(0)
  })
})

describe('itemFullValue (mirror of bot _item_full_value)', () => {
  it('uses shop price_eshki as the base regardless of source', () => {
    // Release 2.2: single rate. Both shop purchase and case prize value the same.
    expect(itemFullValue(300, 25, undefined)).toBe(300)
    expect(itemFullValue(300, 25, 999)).toBe(300)
  })

  it('falls back to star_cost × rate when price_eshki is unset', () => {
    expect(itemFullValue(null, 25, undefined)).toBe(25 * ESHKI_PER_STAR)
    expect(itemFullValue(0, 25, undefined)).toBe(250)
  })

  it('falls back to meta.star_cost when catalog is gone', () => {
    expect(itemFullValue(null, null, 50)).toBe(50 * ESHKI_PER_STAR)
    expect(itemFullValue(null, 0, 50)).toBe(500)
  })

  it('never negative', () => {
    expect(itemFullValue(-5, null, undefined)).toBe(0)
    expect(itemFullValue(null, -5, undefined)).toBe(0)
  })
})

