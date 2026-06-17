import { describe, it, expect } from 'vitest'
import { DIVISIONS, getDivision, divisionProgress } from '@/lib/season'

// Season divisions are DUPLICATED from the bot (app/settings/season.py
// DIVISIONS). Pin them so end-of-season reward payouts can't silently drift,
// and verify the pure progress math used across season surfaces.

describe('DIVISIONS table (bot↔site sync guard)', () => {
  it('matches the bot DIVISIONS value-by-value', () => {
    expect(DIVISIONS).toEqual([
      { minMmr: 0, emoji: '🥉', name: 'Bronze', rewardEshki: 0 },
      { minMmr: 500, emoji: '🥈', name: 'Silver', rewardEshki: 200 },
      { minMmr: 1500, emoji: '🥇', name: 'Gold', rewardEshki: 500 },
      { minMmr: 3500, emoji: '💠', name: 'Platinum', rewardEshki: 1200 },
      { minMmr: 7000, emoji: '💎', name: 'Diamond', rewardEshki: 2500 },
      { minMmr: 12000, emoji: '🏅', name: 'Master', rewardEshki: 5000 },
    ])
  })
})

describe('getDivision()', () => {
  it('floors to the division at/below the season MMR', () => {
    expect(getDivision(0).name).toBe('Bronze')
    expect(getDivision(499).name).toBe('Bronze')
    expect(getDivision(500).name).toBe('Silver')
    expect(getDivision(12000).name).toBe('Master')
    expect(getDivision(999999).name).toBe('Master')
  })
})

describe('divisionProgress()', () => {
  it('reports ratio and remaining MMR toward the next division', () => {
    // Halfway from Silver(500) to Gold(1500): 1000 → 0.5, 500 to go
    const p = divisionProgress(1000)
    expect(p.current.name).toBe('Silver')
    expect(p.next?.name).toBe('Gold')
    expect(p.ratio).toBeCloseTo(0.5, 5)
    expect(p.toNext).toBe(500)
  })

  it('caps at the top division (no next, full ratio)', () => {
    const p = divisionProgress(20000)
    expect(p.current.name).toBe('Master')
    expect(p.next).toBeNull()
    expect(p.ratio).toBe(1)
    expect(p.toNext).toBe(0)
  })

  it('clamps ratio into [0,1] at a division floor', () => {
    const p = divisionProgress(500)
    expect(p.current.name).toBe('Silver')
    expect(p.ratio).toBeGreaterThanOrEqual(0)
    expect(p.ratio).toBeLessThanOrEqual(1)
  })
})
