import { describe, it, expect } from 'vitest'
import { MMR_RANKS, mmrRank } from '@/lib/mmr'

// MMR ranks are DUPLICATED in the bot (app/settings/mmr.py RANKS). These tests
// pin the exact thresholds/names/emojis so the two can't silently drift, and
// verify the boundary selection logic mmrRank() relies on.

describe('MMR_RANKS table (bot↔site sync guard)', () => {
  it('matches the bot RANKS value-by-value', () => {
    // If you change this, change app/settings/mmr.py RANKS in the bot too.
    expect(MMR_RANKS).toEqual([
      { minMmr: 0, emoji: '🥉', name: 'Залётный' },
      { minMmr: 1000, emoji: '🥈', name: 'Бродяга Утрехта' },
      { minMmr: 2500, emoji: '🥇', name: 'Свой в Зволле' },
      { minMmr: 5000, emoji: '💎', name: 'Котейший' },
      { minMmr: 10000, emoji: '👑', name: 'Архидрун' },
      { minMmr: 25000, emoji: '🔥', name: 'Боженька Возни' },
    ])
  })

  it('is sorted ascending by minMmr and starts at 0', () => {
    expect(MMR_RANKS[0].minMmr).toBe(0)
    for (let i = 1; i < MMR_RANKS.length; i++) {
      expect(MMR_RANKS[i].minMmr).toBeGreaterThan(MMR_RANKS[i - 1].minMmr)
    }
  })
})

describe('mmrRank()', () => {
  it('returns the lowest rank at and below the first threshold', () => {
    expect(mmrRank(0).name).toBe('Залётный')
    expect(mmrRank(999).name).toBe('Залётный')
  })

  it('selects the rank at an exact threshold (inclusive lower bound)', () => {
    expect(mmrRank(1000).name).toBe('Бродяга Утрехта')
    expect(mmrRank(2500).name).toBe('Свой в Зволле')
    expect(mmrRank(25000).name).toBe('Боженька Возни')
  })

  it('stays on the top rank above the last threshold', () => {
    expect(mmrRank(999999).name).toBe('Боженька Возни')
  })

  it('clamps negative MMR to the first rank (defensive)', () => {
    expect(mmrRank(-50).name).toBe('Залётный')
  })
})
