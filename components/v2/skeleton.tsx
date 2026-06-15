import { ScreenHeader } from '@/components/v2/screen-header'
import type { GlyphName } from '@/components/ds/icon/glyph'
import type { ScreenAccent } from '@/lib/screen-signature'

/**
 * Skeleton primitives — premium shimmer placeholders used by route-level
 * loading.tsx files so navigation never shows a blank screen while server data
 * loads. Uses the already-built `.ds-skeleton` shimmer (globals.css), gated
 * behind prefers-reduced-motion there.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`ds-skeleton rounded-xl bg-white/[0.04] ${className}`} />
}

/** A grid of tile-shaped skeletons — matches the cases/shop/inventory layout. */
export function SkeletonTileGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass flex flex-col gap-3 rounded-2xl border border-border p-3"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/** A vertical list of row skeletons — leaderboards, feeds, history. */
export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass flex items-center gap-3 rounded-2xl border border-border p-3"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/**
 * Full route loading shell — instant header (no data) + a content skeleton, so
 * the screen reads as "loading this place", not "broken".
 */
export function RouteSkeleton({
  icon,
  title,
  kicker,
  accent,
  children,
}: {
  icon?: GlyphName
  title: string
  kicker?: string
  accent?: ScreenAccent
  children: React.ReactNode
}) {
  return (
    <main className="relative min-h-svh overflow-x-hidden">
      <ScreenHeader icon={icon} title={title} kicker={kicker} accent={accent} />
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-2 sm:px-6">{children}</div>
    </main>
  )
}
