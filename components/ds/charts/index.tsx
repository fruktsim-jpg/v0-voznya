'use client'

/**
 * DS Charts — обёртки над recharts с тёмной темой Возни (Redesign Master Plan
 * §3.5). Все компоненты — client (recharts работает только в браузере) и чисто
 * презентационные: принимают готовые данные. Потребляются админ-аналитикой.
 *
 * recharts — тяжёлая зависимость, поэтому обёртки грузятся ЛЕНИВО через
 * next/dynamic (ssr: false): графики не попадают в начальный бандл и не
 * рендерятся на сервере. До загрузки чанка показывается лёгкий скелет.
 * Именованные экспорты сохранены — потребители не меняются.
 */
import dynamic from 'next/dynamic'

function ChartSkeleton({ height }: { height?: number | string }) {
  return (
    <div
      aria-hidden="true"
      className="w-full animate-pulse rounded-xl bg-white/[0.04]"
      style={{ height: height ?? '100%' }}
    />
  )
}

export const AreaTrend = dynamic(
  () => import('./area-trend').then((m) => m.AreaTrend),
  { ssr: false, loading: () => <ChartSkeleton height={180} /> },
)

export const RadialGauge = dynamic(
  () => import('./radial-gauge').then((m) => m.RadialGauge),
  { ssr: false, loading: () => <ChartSkeleton height={92} /> },
)

export const Sparkline = dynamic(
  () => import('./sparkline').then((m) => m.Sparkline),
  { ssr: false, loading: () => <ChartSkeleton height={40} /> },
)
