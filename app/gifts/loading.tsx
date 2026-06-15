import { RouteSkeleton, SkeletonTileGrid } from '@/components/v2/skeleton'

export default function Loading() {
  return (
    <RouteSkeleton icon="gift" title="Магазин" kicker="Подарки сообщества" accent="pink">
      <SkeletonTileGrid count={6} />
    </RouteSkeleton>
  )
}
