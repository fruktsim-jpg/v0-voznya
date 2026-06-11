/**
 * Skeleton (A1 Motion System) — premium loading placeholders.
 *
 * Replaces blank space / spinners with shaped, shimmering placeholders so the
 * layout never janks and waiting feels intentional. Pure presentation; the
 * shimmer (.ds-skeleton) is reduced-motion safe (static under reduce).
 */

import type { CSSProperties } from 'react'

export function Skeleton({
  className,
  style,
  rounded = 'rounded-lg',
}: {
  className?: string
  style?: CSSProperties
  rounded?: string
}) {
  return <div className={`ds-skeleton ${rounded} ${className ?? ''}`} style={style} aria-hidden="true" />
}

/** A ready-made card skeleton (art + two lines) for grids/lists. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-3 ${className ?? ''}`}>
      <Skeleton className="aspect-square w-full" rounded="rounded-lg" />
      <Skeleton className="mt-3 h-3 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  )
}

/** A ranked-row skeleton (avatar + label + value) for leaderboards/feeds. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 ${className ?? ''}`}>
      <Skeleton className="h-10 w-10" rounded="rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-2 h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  )
}
