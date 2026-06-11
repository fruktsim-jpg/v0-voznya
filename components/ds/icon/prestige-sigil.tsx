/**
 * VOZNYA Prestige Sigils (PHASE B — B1).
 *
 * The EMBLEMATIC icon register (docs/VOZNYA_VISUAL_IDENTITY_SYSTEM.md §1, §3):
 * one owned mark per prestige TIER WORLD, replacing the OS rank/division emoji
 * that previously stood in for rank/division/title status.
 *
 * Design law (carried from A4): the form ESCALATES with the tier, so prestige is
 * legible before any text — a stone sigil and an apex sigil are different SHAPES,
 * not just different colors:
 *
 *   stone    → a single rough facet (unproven)
 *   iron     → a forged chevron
 *   gold     → a rising double chevron
 *   platinum → a faceted crystal
 *   diamond  → a brilliant-cut gem
 *   master   → a crowned crystal
 *   apex     → a radiant star-crown (the platform's mythic peak)
 *
 * Rendering: 24×24 viewBox, tier color fill + stroke, optional aura. Inherits
 * size from font (1em) so sigils sit inline where emoji used to. Pure SSR-safe
 * presentation; takes a resolved PrestigeTier (truth stays in lib/ds/prestige).
 */
import { prestigeTier, type PrestigeTier, type PrestigeTierKey } from '@/lib/ds/prestige'

/** Inner 24×24 markup per tier. Uses `currentColor` for stroke; fill via props. */
const SIGIL: Record<PrestigeTierKey, string> = {
  // rough single facet — earthy, unfinished
  stone: '<path d="M12 4 6 9l2 9h8l2-9z" fill="var(--sig-fill)" stroke="var(--sig-stroke)" stroke-width="1.4" stroke-linejoin="round"/>',
  // forged chevron
  iron: '<path d="M5 14 12 6l7 8M5 14l7 4 7-4M5 14l7-3 7 3" fill="none" stroke="var(--sig-stroke)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  // rising double chevron
  gold: '<path d="M5 11 12 5l7 6M5 16l7-6 7 6" fill="none" stroke="var(--sig-stroke)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5 5 11l7-2 7 2z" fill="var(--sig-fill)" stroke="none"/>',
  // faceted crystal
  platinum: '<path d="M12 3 5 9l7 12 7-12z" fill="var(--sig-fill)" stroke="var(--sig-stroke)" stroke-width="1.3" stroke-linejoin="round"/><path d="M5 9h14M12 3v18M8.5 9 12 21M15.5 9 12 21" stroke="var(--sig-stroke)" stroke-width="1" fill="none" opacity="0.7"/>',
  // brilliant-cut gem
  diamond: '<path d="M7 4h10l3 5-8 11L4 9z" fill="var(--sig-fill)" stroke="var(--sig-stroke)" stroke-width="1.3" stroke-linejoin="round"/><path d="M4 9h16M7 4l5 5 5-5M12 9v11M9 9l3 11M15 9l-3 11" stroke="var(--sig-stroke)" stroke-width="0.9" fill="none" opacity="0.7"/>',
  // crowned crystal
  master: '<path d="M12 5 6 10l6 9 6-9z" fill="var(--sig-fill)" stroke="var(--sig-stroke)" stroke-width="1.2" stroke-linejoin="round"/><path d="M6 10h12M12 5v14M9 10l3 9M15 10l-3 9" stroke="var(--sig-stroke)" stroke-width="0.8" fill="none" opacity="0.65"/><path d="M5 7 7 3l2.5 2.5L12 2l2.5 3.5L17 3l2 4z" fill="var(--sig-fill)" stroke="var(--sig-stroke)" stroke-width="1.1" stroke-linejoin="round"/>',
  // radiant star-crown — mythic apex
  apex: '<path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.1 7.2 17.7l.9-5.4L4.2 8.5l5.4-.8z" fill="var(--sig-fill)" stroke="var(--sig-stroke)" stroke-width="1.1" stroke-linejoin="round"/><path d="M6 19l1.5-2.5M18 19l-1.5-2.5M12 18.5V22" stroke="var(--sig-stroke)" stroke-width="1.4" stroke-linecap="round"/>',
}

export function PrestigeSigil({
  tier,
  size = '1.15em',
  className,
  withAura = false,
}: {
  /** Tier world OR its key. */
  tier: PrestigeTier | PrestigeTierKey
  /** Any CSS length; defaults slightly larger than text so the emblem reads. */
  size?: string
  className?: string
  /** Render the tier aura behind the sigil (for hero/badge contexts). */
  withAura?: boolean
}) {
  const t = typeof tier === 'string' ? prestigeTier(tier) : tier
  // High tiers get a brighter fill; low tiers stay translucent/matte (unproven).
  const fill = t.index >= 4 ? `${t.color}E6` : t.index >= 2 ? `${t.color}AA` : `${t.color}55`
  const stroke = t.color

  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'inline-flex', width: size, height: size, lineHeight: 0 }}
      aria-hidden="true"
    >
      {withAura && t.glow && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-35%',
            background: t.aura,
            filter: 'blur(2px)',
            pointerEvents: 'none',
          }}
        />
      )}
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        style={
          {
            position: 'relative',
            ['--sig-fill' as string]: fill,
            ['--sig-stroke' as string]: stroke,
            filter: t.index >= 3 ? `drop-shadow(0 0 3px ${t.color}66)` : undefined,
          } as React.CSSProperties
        }
        dangerouslySetInnerHTML={{ __html: SIGIL[t.key] }}
      />
    </span>
  )
}
