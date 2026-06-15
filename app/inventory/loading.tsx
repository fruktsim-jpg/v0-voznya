import { RouteSkeleton, SkeletonTileGrid } from '@/components/v2/skeleton'

export default function Loading() {
  return (
    <RouteSkeleton icon="inventory" title="Инвентарь" kicker="Твоя коллекция" accent="indigo">
      <SkeletonTileGrid count={9} />
    </RouteSkeleton>
  )
}
