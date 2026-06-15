import { RouteSkeleton, SkeletonRows } from '@/components/v2/skeleton'

export default function Loading() {
  return (
    <RouteSkeleton icon="dice" title="Казино" kicker="Азарт внутри экосистемы" accent="gold">
      <SkeletonRows count={6} />
    </RouteSkeleton>
  )
}
