/**
 * Prestige badges (A4) — RankBadge / DivisionBadge / TitleBadge.
 *
 * These REPLACE the platform's flat "emoji + text" prestige pills (where a 🥉
 * Bronze looked identical to a 👑 Архидрун). Each badge resolves its rank to a
 * TIER WORLD (lib/ds/prestige.ts) and renders that world's color, gradient,
 * glow, and material — so the tier is legible before the label is read.
 *
 * Three sizes; high tiers gain a subtle gradient fill + glow + (lg) a living
 * sheen. Reduced-motion safe. Presentation only — they NEVER compute a rank,
 * they only style one passed in (rank truth stays in mmr.ts / season.ts).
 */

import type { ReactNode } from 'react'
import {
  prestigeForDivision,
  prestigeForMmrRank,
  prestigeForTitleIndex,
  type PrestigeTier,
} from '@/lib/ds/prestige'

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  sm: 'gap-1 px-2 py-0.5 text-[11px]',
  md: 'gap-1.5 px-2.5 py-1 text-xs',
  lg: 'gap-2 px-3.5 py-1.5 text-sm',
}

/** Shared tier-styled pill. The visual heart of all three badges. */
function PrestigeBadgeBase({
  t,
  emoji,
  label,
  sub,
  size = 'md',
  title,
}: {
  t: PrestigeTier
  emoji: string
  label: string
  sub?: ReactNode
  size?: Size
  title?: string
}) {
  // Low tiers (stone/iron) stay restrained: subtle fill, no glow → "unproven".
  // High tiers fill with the world gradient + glow → "earned, expensive".
  const high = t.index >= 2
  const apex = t.material === 'mythic'

  return (
    <span
      title={title}
      className={`relative inline-flex items-center overflow-hidden rounded-full border font-semibold ${SIZE_CLASS[size]}`}
      style={{
        borderColor: `${t.color}${high ? '99' : '55'}`,
        color: apex ? '#fff' : t.color,
        background: high ? t.gradient : `${t.color}14`,
        boxShadow: size === 'lg' && high ? t.glow || undefined : undefined,
      }}
    >
      {/* Apex world drifts; high crystal/royal tiers get a faint sheen layer. */}
      {apex && (
        <span
          aria-hidden="true"
          className="ds-apex-shift pointer-events-none absolute inset-0 opacity-60"
          style={{ background: t.gradient }}
        />
      )}
      <span aria-hidden="true" className="relative">
        {emoji}
      </span>
      <span className="relative whitespace-nowrap">{label}</span>
      {sub != null && (
        <span className="relative opacity-75" style={{ color: apex ? '#fff' : undefined }}>
          {sub}
        </span>
      )}
    </span>
  )
}

/** MMR (lifetime) rank badge. */
export function RankBadge({
  emoji,
  name,
  size = 'md',
  sub,
}: {
  emoji: string
  name: string
  size?: Size
  sub?: ReactNode
}) {
  const t = prestigeForMmrRank(name)
  return <PrestigeBadgeBase t={t} emoji={emoji} label={name} sub={sub} size={size} title={`Ранг: ${name}`} />
}

/** Season division badge. */
export function DivisionBadge({
  emoji,
  name,
  size = 'md',
  sub,
}: {
  emoji: string
  name: string
  size?: Size
  sub?: ReactNode
}) {
  const t = prestigeForDivision(name)
  return <PrestigeBadgeBase t={t} emoji={emoji} label={name} sub={sub} size={size} title={`Дивизион: ${name}`} />
}

/** Earnings title badge — tier scaled by ladder position. */
export function TitleBadge({
  emoji,
  name,
  index,
  total,
  size = 'md',
}: {
  emoji: string
  name: string
  /** Position in the earnings-title ladder (0-based). */
  index: number
  /** Ladder length. */
  total: number
  size?: Size
}) {
  const t = prestigeForTitleIndex(index, total)
  return <PrestigeBadgeBase t={t} emoji={emoji} label={name} size={size} title={`Титул: ${name}`} />
}
