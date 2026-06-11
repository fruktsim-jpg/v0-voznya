/**
 * Celebration System (PHASE A — A3).
 *
 * The framework that turns significant events into MOMENTS instead of feed rows.
 * A celebration is described declaratively; the host renders a tiered experience
 * (backdrop → entrance → sound → particles → optional shareable card).
 *
 * Emotional intent: REWARD, PRESTIGE, SURPRISE, RECOGNITION. The tier controls
 * intensity so a common drop never feels like a mythic — and a mythic NEVER
 * passes silently. Avoiding celebration fatigue is a design goal: only genuinely
 * significant events should reach the full-screen takeover.
 *
 * Pure presentation. No data. SSR-safe (types/constants only).
 */

import type { Rarity } from '@/lib/rarity'

/** What kind of event is being celebrated (drives copy + iconography). */
export type CelebrationKind =
  | 'drop' // case / gift drop
  | 'achievement' // achievement unlocked
  | 'rankup' // MMR rank up
  | 'division' // new season division reached
  | 'season' // season milestone / end
  | 'collection' // set completed / collection milestone
  | 'purchase' // notable purchase

/**
 * Intensity tier. Decoupled from rarity so non-item events (rank-up, season) can
 * still be epic. Maps to particles, sound weight, and whether the backdrop dims.
 */
export type CelebrationTier = 'standard' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type Celebration = {
  kind: CelebrationKind
  tier: CelebrationTier
  title: string
  subtitle?: string
  /** Emoji / glyph shown in the hero medallion. */
  glyph?: string
  /** Image URL for the hero (overrides glyph when present). */
  art?: string
  /** Rarity tint for the hero + glow (defaults derived from tier). */
  rarity?: Rarity
  /** Show the "share this moment" affordance (a screenshot-ready card). */
  shareable?: boolean
  /** Small stat line under the title (e.g. "0.3% of players own this"). */
  flavor?: string
}

/** Tier → which rarity color drives the visuals (when `rarity` not given). */
const TIER_RARITY: Record<CelebrationTier, Rarity> = {
  standard: 'uncommon',
  rare: 'rare',
  epic: 'epic',
  legendary: 'legendary',
  mythic: 'mythic',
}

export function celebrationRarity(c: Celebration): Rarity {
  return c.rarity ?? TIER_RARITY[c.tier]
}

/** Does this tier earn the heavy, full-screen, particle-rich treatment? */
export function isBigMoment(tier: CelebrationTier): boolean {
  return tier === 'legendary' || tier === 'mythic' || tier === 'epic'
}

/** Particle count by tier (0 = none). Capped for performance on mobile. */
export function shardCount(tier: CelebrationTier): number {
  switch (tier) {
    case 'mythic':
      return 18
    case 'legendary':
      return 14
    case 'epic':
      return 10
    case 'rare':
      return 6
    default:
      return 0
  }
}

/** Map a drop's rarity (+ jackpot flag) to a celebration tier. */
export function tierFromRarity(rarity: Rarity, special = false): CelebrationTier {
  if (special || rarity === 'mythic') return 'mythic'
  if (rarity === 'legendary') return 'legendary'
  if (rarity === 'epic') return 'epic'
  if (rarity === 'rare') return 'rare'
  return 'standard'
}
