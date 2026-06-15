import { RouteSkeleton, SkeletonRows } from '@/components/v2/skeleton'

export default function Loading() {
  return (
    <RouteSkeleton icon="season" title="Сезон" accent="indigo">
      <SkeletonRows count={8} />
    </RouteSkeleton>
  )
}
