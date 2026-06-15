import { RouteSkeleton, SkeletonTileGrid } from '@/components/v2/skeleton'

export default function Loading() {
  return (
    <RouteSkeleton icon="case" title="Кейсы" kicker="Открывай и поднимайся" accent="indigo">
      <SkeletonTileGrid count={6} />
    </RouteSkeleton>
  )
}
