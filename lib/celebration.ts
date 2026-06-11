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

/**
 * Ceremony channel (PHASE C — C5 Ceremony Expansion).
 *
 * Not every celebrated event deserves a full-screen takeover. Pre-C5 the host
 * rendered the same blocking overlay for a common drop and a mythic — the fast
 * road to celebration fatigue, after which users dismiss reflexively and the
 * mythic moment is wasted too.
 *
 * The matrix routes each event to the lightest treatment that still honors it:
 *
 *   full  — screen takeover, particles, lingers. EARN IT: legendary/mythic of
 *           any kind, plus structurally huge events (new division, a completed
 *           collection set). These are the "stop and look" moments.
 *   mini  — a compact, non-blocking corner card with a rarity edge + auto-hide.
 *           "That was good" without seizing the screen: epic drops, rank-ups,
 *           season milestones, achievements.
 *   toast — a single notification line. Acknowledged, not ceremonied: standard/
 *           rare drops, purchases, soft recognition.
 *
 * Decoupled from FX intensity (sound/haptics still scale by tier) — this only
 * decides how much SCREEN a moment is allowed to take.
 */
export type CeremonyChannel = 'toast' | 'mini' | 'full'

export function ceremonyChannel(c: Celebration): CeremonyChannel {
  // Always-full structural milestones, regardless of tier.
  if (c.kind === 'division') return 'full'
  if (c.kind === 'collection' && (c.tier === 'legendary' || c.tier === 'mythic')) return 'full'

  // The genuinely big tiers take the screen.
  if (c.tier === 'mythic' || c.tier === 'legendary') return 'full'

  // Mid-weight recognition: notable, not screen-blocking.
  if (c.tier === 'epic') return 'mini'
  if (c.kind === 'rankup' || c.kind === 'season' || c.kind === 'achievement') return 'mini'

  // Everything else — standard/rare drops, purchases, soft notices — is a toast.
  return 'toast'
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
