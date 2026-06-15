import { RouteSkeleton, SkeletonRows } from '@/components/v2/skeleton'

export default function Loading() {
  return (
    <RouteSkeleton icon="chart" title="Моя статистика" kicker="Кто ты и как растёшь" accent="teal">
      <SkeletonRows count={5} />
    </RouteSkeleton>
  )
}
