/**
 * VOZNYA Icon System (PHASE B — B1).
 *
 * The platform's FUNCTIONAL icon register. Replaces emoji used as interface
 * language (actions, status, economy, navigation, metadata) with one owned,
 * stroke-consistent SVG set. This is register #1 of the three defined in
 * docs/VOZNYA_VISUAL_IDENTITY_SYSTEM.md §1:
 *   1. Functional   → THIS file (line icons, currentColor, 24px grid)
 *   2. Emblematic   → components/ds/icon/prestige-sigil.tsx (tier sigils)
 *   3. Collectible  → item art (NOT replaced in B1 — owner rule)
 *
 * Rules:
 *  - All glyphs are a single 24×24 viewBox, drawn with `stroke="currentColor"`,
 *    no fills, 1.75 stroke width, round caps/joins. They inherit text color and
 *    size via `width/height = 1em` so they sit inline with type like an emoji
 *    did — but owned and pixel-crisp at any DPR.
 *  - Pure presentation. No data, no state. Server-safe.
 *  - `aria-hidden` by default (decorative); pass `title` for a labeled icon.
 */
import type { SVGProps } from 'react'

export type GlyphName =
  // economy / rewards
  | 'coin'
  | 'vault'
  | 'gift'
  | 'case'
  | 'spark'
  | 'flame'
  | 'dice'
  | 'bank'
  | 'wallet'
  // navigation / surfaces
  | 'home'
  | 'inventory'
  | 'shop'
  | 'leaders'
  | 'profile'
  | 'season'
  | 'chart'
  | 'book'
  | 'search'
  // status / meta
  | 'bolt'
  | 'pulse'
  | 'trophy'
  | 'shield'
  | 'crown'
  | 'star'
  | 'chevronUp'
  | 'lock'
  | 'check'
  | 'users'
  | 'message'
  | 'swords'
  | 'sprout'
  | 'target'
  | 'medal'
  | 'moon'
  | 'heart'
  | 'refresh'

/**
 * Path data per glyph. Each string is the inner markup of a 24×24 <svg>.
 * Kept deliberately simple/geometric so the set reads as one family.
 */
const GLYPHS: Record<GlyphName, string> = {
  // --- economy / rewards ---
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 10.2c0-1.3 1.1-2.2 2.5-2.2s2.5.7 2.5 1.9c0 2.6-5 1.4-5 3.9 0 1.2 1.1 2 2.5 2s2.5-.9 2.5-2.2"/>',
  vault: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5v-2M12 17.5v-2M8.5 12h-2M17.5 12h-2"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 12.5h16M12 9v11M12 9c-1.5-3.5-5.5-3-5.5-.5 0 .3 .2 .5 .5 .5M12 9c1.5-3.5 5.5-3 5.5-.5 0 .3-.2 .5-.5 .5"/>',
  case: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/>',
  spark: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>',
  flame: '<path d="M12 3c3 3.5 5 6 5 9a5 5 0 0 1-10 0c0-1.4 .6-2.6 1.5-3.6 .3 1 .9 1.6 1.8 1.9C11 8.5 10.5 6 12 3z"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="9" cy="15" r="1.1"/><circle cx="15" cy="15" r="1.1"/>',
  bank: '<path d="M4 9.5 12 4l8 5.5M5 9.5h14M6.5 9.5V18M10 9.5V18M14 9.5V18M17.5 9.5V18M4 20h16"/>',
  wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 10h17M16 13.5h1.5"/>',
  // --- navigation / surfaces ---
  home: '<path d="M4 10.5 12 4l8 6.5M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5"/>',
  inventory: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  shop: '<path d="M4 8h16l-1 4.5a2 2 0 0 1-2 1.6H7a2 2 0 0 1-2-1.6L4 8zM4 8 6 4h12l2 4M8 20h8"/>',
  leaders: '<path d="M7 20v-6M12 20V8M17 20v-9M5 20h14"/>',
  profile: '<circle cx="12" cy="8.5" r="4"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
  season: '<circle cx="12" cy="12" r="8"/><path d="M12 4v4l3 1.5"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
  book: '<path d="M5 4.5h9a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H5zM5 4.5V17.5M19 6.5V20a2.5 2.5 0 0 0-2.5-2.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  // --- status / meta ---
  bolt: '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',
  pulse: '<path d="M3 12h4l2.5-7 4 14 2.5-7H21"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1.5A3.5 3.5 0 0 0 7 11M17 6h3v1.5A3.5 3.5 0 0 1 17 11M9.5 13.5 9 17h6l-.5-3.5M8 20h8"/>',
  shield: '<path d="M12 3 5 6v5c0 4.2 2.9 7.5 7 9 4.1-1.5 7-4.8 7-9V6z"/>',
  crown: '<path d="M4 8l3 8h10l3-8-4.5 3.5L12 5 8.5 11.5z"/>',
  star: '<path d="M12 3l2.6 5.8 6.4.6-4.8 4.2 1.4 6.3L12 17l-5.6 3 1.4-6.3L3 9.4l6.4-.6z"/>',
  chevronUp: '<path d="M5 14l7-6 7 6"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  check: '<path d="M5 12.5 10 17l9-10"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M16 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.2c2 .6 3.5 2.1 3.5 4.8"/>',
  message: '<path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/>',
  swords: '<path d="M14.5 3.5H20v5.5M20 4 11 13M3.5 14.5 9 9l6 6-5.5 5.5zM4 14l-1.5 1.5 2 2L6 16M14.5 16l3.5 3.5M3.5 9.5 9 4l1.5 1.5"/>',
  sprout: '<path d="M12 20v-7M12 13c0-3-2-5-5-5-1 0-2 .2-2 .2 0 3 2 5 5 5h2zM12 13c0-2.5 2-4.5 4.5-4.5.8 0 1.5 .2 1.5 .2 0 2.6-2 4.3-4.5 4.3z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  medal: '<circle cx="12" cy="14" r="5"/><path d="M8.5 9.5 6 3.5h4l2 4M15.5 9.5 18 3.5h-4l-2 4M12 12l.8 1.7 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2z"/>',
  moon: '<path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 3.5c0 5-7 9.5-7 9.5z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14 4.5L20 16M20 20v-4h-4"/>',
}

export function Glyph({
  name,
  title,
  className,
  strokeWidth = 1.75,
  ...rest
}: { name: GlyphName; title?: string; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      {...rest}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + GLYPHS[name] }}
    />
  )
}
