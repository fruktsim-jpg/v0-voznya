/**
 * VOZNYA Design System — формализованные токены (Redesign Master Plan §3).
 *
 * Это presentational-слой: единый источник правды для отступов, радиусов,
 * типографики и движения, чтобы все экраны читались как один продукт. Цвета
 * живут в `app/globals.css` (CSS-переменные `--background`/`--primary`/…),
 * редкости — в `lib/rarity.ts`. Здесь — только то, что удобно держать в TS:
 * шкалы и хелперы для классов, без побочных эффектов и без `pg`/`./db`.
 *
 * Никакой бизнес-логики. Изменение значений здесь меняет только внешний вид.
 */

import { RARITY_TOKENS, type Rarity } from '@/lib/rarity'

/** Шкала отступов (4px база). Совпадает с Tailwind spacing. */
export const SPACE = {
  '2xs': '0.25rem', // 4
  xs: '0.5rem', // 8
  sm: '0.75rem', // 12
  md: '1rem', // 16
  lg: '1.5rem', // 24
  xl: '2rem', // 32
  '2xl': '3rem', // 48
} as const

/** Радиусы. `--radius` (0.875rem) — каноничный lg. */
export const RADIUS = {
  sm: 'rounded-lg', // 8
  md: 'rounded-xl', // 12
  lg: 'rounded-2xl', // 14 (var --radius)
  xl: 'rounded-3xl', // 18
  pill: 'rounded-full',
} as const

/** Типографическая шкала. Geist (latin+cyrillic) грузится в layout. */
export const TYPE_SCALE = {
  display: 'text-3xl font-bold tracking-tight sm:text-4xl',
  h1: 'text-2xl font-bold tracking-tight',
  h2: 'text-xl font-semibold',
  h3: 'text-lg font-semibold',
  body: 'text-sm',
  caption: 'text-xs text-muted-foreground',
  micro: 'text-[10px] uppercase tracking-wide text-muted-foreground',
  /** Моноширинный — для чисел/серийников/шансов/ID. */
  mono: 'font-mono tabular-nums',
} as const

/** Тени/возвышение — мягкие, через glow, без жёстких теней. */
export const ELEVATION = {
  panel: '0 8px 30px -12px rgba(0,0,0,0.6)',
  floating: '0 8px 30px -12px rgba(0,0,0,0.7)',
} as const

/** Длительности и пружины анимаций. */
export const MOTION = {
  micro: 150,
  transition: 200,
  emphasis: 300,
  /** Тап-сжатие для интерактивных тайлов. */
  tapClass: 'transition active:scale-[0.98]',
} as const

/** Высота нижней навигации (нужна для отступов контента). */
export const NAV_HEIGHT = 64

/** Удобный доступ к токену редкости из tokens-слоя. */
export function rarity(r: Rarity | null | undefined) {
  return RARITY_TOKENS[r ?? 'common']
}

export { RARITY_TOKENS, type Rarity }
