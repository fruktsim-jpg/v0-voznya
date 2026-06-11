/**
 * Prestige badges (A4) — RankBadge / DivisionBadge / TitleBadge.
 *
 * These REPLACE the platform's flat "emoji + text" prestige pills (where a
 * Bronze pill looked identical to an Архидрун one). Each badge resolves its rank to a
 * TIER WORLD (lib/ds/prestige.ts) and renders that world's color, gradient,
 * glow, and material — so the tier is legible before the label is read.
 *
 * Three sizes; high tiers gain a subtle gradient fill + glow + (lg) a living
 * sheen. Reduced-motion safe. Presentation only — they NEVER compute a rank,
 * they only style one passed in (rank truth stays in mmr.ts / season.ts).
 *
 * B1 (icon system): the leading glyph is now the owned PrestigeSigil — an SVG
 * emblem whose SHAPE escalates with the tier — instead of the OS emoji. The
 * `emoji` prop is still accepted for back-compat but no longer rendered, so
 * every caller across the app upgrades to the sigil with zero call-site churn.
 */

import type { ReactNode } from 'react'
import {
  prestigeForDivision,
  prestigeForMmrRank,
  prestigeForTitleIndex,
  type PrestigeTier,
} from '@/lib/ds/prestige'
import { PrestigeSigil } from '@/components/ds/icon'

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  sm: 'gap-1 px-2 py-0.5 text-[11px]',
  md: 'gap-1.5 px-2.5 py-1 text-xs',
  lg: 'gap-2 px-3.5 py-1.5 text-sm',
}

/** Shared tier-styled pill. The visual heart of all three badges. */
function PrestigeBadgeBase({
  t,
  label,
  sub,
  size = 'md',
  title,
}: {
  t: PrestigeTier
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
      <PrestigeSigil tier={t} withAura={size === 'lg' && high} className="relative shrink-0" />
      <span className="type-prestige relative whitespace-nowrap">{label}</span>
      {sub != null && (
        <span className="relative opacity-75" style={{ color: apex ? '#fff' : undefined }}>
          {sub}
        </span>
      )}
    </span>
  )
}

/** MMR (lifetime) rank badge. `emoji` is accepted for back-compat (unused). */
export function RankBadge({
  name,
  size = 'md',
  sub,
}: {
  emoji?: string
  name: string
  size?: Size
  sub?: ReactNode
}) {
  const t = prestigeForMmrRank(name)
  return <PrestigeBadgeBase t={t} label={name} sub={sub} size={size} title={`Ранг: ${name}`} />
}

/** Season division badge. `emoji` is accepted for back-compat (unused). */
export function DivisionBadge({
  name,
  size = 'md',
  sub,
}: {
  emoji?: string
  name: string
  size?: Size
  sub?: ReactNode
}) {
  const t = prestigeForDivision(name)
  return <PrestigeBadgeBase t={t} label={name} sub={sub} size={size} title={`Дивизион: ${name}`} />
}

/** Earnings title badge — tier scaled by ladder position. `emoji` back-compat. */
export function TitleBadge({
  name,
  index,
  total,
  size = 'md',
}: {
  emoji?: string
  name: string
  /** Position in the earnings-title ladder (0-based). */
  index: number
  /** Ladder length. */
  total: number
  size?: Size
}) {
  const t = prestigeForTitleIndex(index, total)
  return <PrestigeBadgeBase t={t} label={name} size={size} title={`Титул: ${name}`} />
}
