/**
 * PrestigeFrame (A4) — turns a subject (usually an avatar) into a TIER-WORLD
 * subject. This is the component that finally uses the long-dormant
 * `Avatar.frame` slot and makes prestige visible INSTANTLY around a player.
 *
 * Each tier renders a different environment:
 *   - matte/metal (stone/iron/gold): a static colored ring, no glow→subtle glow;
 *   - crystal (platinum/diamond): a rotating conic sheen ring + breathing aura;
 *   - royal (master): brighter ring + stronger aura;
 *   - mythic (apex): the violet→red→gold world with a drifting gradient ring.
 *
 * Compose around any child (avatar, medallion). Transform/opacity-only motion,
 * reduced-motion safe (rings/auras freeze, colors remain). Presentation only.
 */

import type { ReactNode } from 'react'
import { prestigeTier, type PrestigeTier, type PrestigeTierKey } from '@/lib/ds/prestige'

export function PrestigeFrame({
  tier,
  children,
  /** Disable motion explicitly (e.g. dense lists) regardless of tier. */
  static: isStatic = false,
  className = '',
}: {
  tier: PrestigeTierKey | PrestigeTier
  children: ReactNode
  static?: boolean
  className?: string
}) {
  const t = typeof tier === 'string' ? prestigeTier(tier) : tier
  const animated = t.animated && !isStatic

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Aura — behind the subject. Higher tiers breathe. */}
      {t.index >= 1 && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-2 rounded-full blur-md ${animated ? 'ds-prestige-aura' : ''}`}
          style={{ background: t.aura }}
        />
      )}

      {/* Rotating conic sheen ring for crystal+ tiers. */}
      {animated && t.index >= 3 && (
        <span
          aria-hidden="true"
          className="ds-prestige-ring pointer-events-none absolute -inset-[3px] rounded-full opacity-70"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${t.color} 90deg, transparent 200deg, ${t.color2} 300deg, transparent 360deg)`,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
          }}
        />
      )}

      {/* Static ring (always present) — the tier's border identity. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full ring-2"
        style={{ boxShadow: t.glow || undefined, borderRadius: '9999px' }}
      >
        <span className={`absolute inset-0 rounded-full ring-2 ${t.ringClass}`} />
      </span>

      <span className="relative z-10">{children}</span>
    </span>
  )
}
