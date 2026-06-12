import type { ReactNode } from 'react'
import { rarityToken, type Rarity } from '@/lib/rarity'
import { cn } from '@/lib/utils'
import { resolveItemArt } from '@/lib/item-art/resolve'
import type { ItemArtRef, ItemArtResolution, ItemClass } from '@/lib/item-art/model'

/**
 * ItemArt (DS) — THE single art capsule for every desirable object in VOZNYA
 * (inventory item, gift, case, case reward, achievement reward, collection
 * piece). P0 makes this the ONE rendering path: all surfaces funnel through it.
 *
 * Two ways to use it:
 *   A) Resolved-by-ref (preferred): pass `code` / `itemClass` / `rarity` (or a
 *      pre-resolved `resolution`) and ItemArt asks the resolver for art. The
 *      resolver applies the fallback hierarchy: unique → template → glyph → box.
 *   B) Legacy direct: pass `src` + `glyph` explicitly (kept so existing callers
 *      keep working during the funnel migration).
 *
 * Rarity drives the capsule (border / glow / radial wash) in BOTH modes. The
 * component is presentational and ownership-agnostic: `locked` only dims; it
 * never changes which art is chosen. Server component (no hooks, no fetch).
 */
const SIZES = {
  sm: 'h-14 w-14 text-2xl rounded-xl',
  md: 'h-20 w-20 text-4xl rounded-2xl',
  lg: 'h-28 w-28 text-6xl rounded-2xl',
  xl: 'h-40 w-40 text-8xl rounded-3xl',
} as const

export function ItemArt({
  // --- resolved-by-ref (preferred) ---
  code,
  itemClass,
  resolution,
  // --- legacy direct ---
  src,
  glyph,
  // --- shared ---
  rarity = 'common',
  size = 'md',
  locked = false,
  className = '',
}: {
  /** Item code — resolver looks up unique/template art for it. */
  code?: string | null
  /** Item class — drives the canonical glyph fallback + template lookup. */
  itemClass?: ItemClass | null
  /** Pre-resolved art (when a parent already called resolveItemArt). */
  resolution?: ItemArtResolution | null
  /** Legacy: explicit image URL. Overrides resolution if provided. */
  src?: string | null
  /** Legacy/override: fallback glyph (emoji/icon) when no art. */
  glyph?: ReactNode
  rarity?: Rarity
  size?: keyof typeof SIZES
  locked?: boolean
  className?: string
}) {
  // Resolve art unless an explicit legacy `src` was passed.
  let resolved: ItemArtResolution | null = resolution ?? null
  if (!resolved && src == null && (code != null || itemClass != null)) {
    resolved = resolveItemArt({
      code,
      itemClass,
      rarity,
      glyph: typeof glyph === 'string' ? glyph : null,
    })
  }

  const effectiveSrc = src ?? resolved?.src ?? null
  const effectiveRarity = resolved?.rarity ?? rarity
  // Glyph precedence: explicit prop → resolver glyph → box.
  const effectiveGlyph: ReactNode = glyph ?? resolved?.glyph ?? '📦'
  const placeholder = resolved?.placeholder ?? null

  const t = rarityToken(effectiveRarity)
  const accent = effectiveRarity !== 'common' && !locked

  return (
    <span
      className={cn(
        'relative flex items-center justify-center overflow-hidden border',
        SIZES[size],
        locked ? 'opacity-50 grayscale' : '',
        className,
      )}
      style={{
        background: t.capsule,
        borderColor: accent ? t.color : 'rgba(255,255,255,0.10)',
        boxShadow: accent ? t.glow || undefined : undefined,
      }}
    >
      {/* Фоновое свечение тира */}
      {accent && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1/3 left-1/2 h-full w-full -translate-x-1/2 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: t.color }}
        />
      )}

      {locked ? (
        <span aria-hidden="true" className="relative">🔒</span>
      ) : effectiveSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={effectiveSrc}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="relative h-full w-full object-contain"
          style={
            placeholder
              ? { backgroundImage: `url(${placeholder})`, backgroundSize: 'cover' }
              : undefined
          }
        />
      ) : (
        <span aria-hidden="true" className="relative">
          {effectiveGlyph}
        </span>
      )}
    </span>
  )
}
