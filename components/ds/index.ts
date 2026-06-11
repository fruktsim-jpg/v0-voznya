/**
 * VOZNYA Design System — единая точка импорта (Redesign Master Plan §3).
 *
 * `components/ds/` развивает существующий `components/v2/`: новые примитивы
 * живут здесь, а проверенные V2-компоненты ре-экспортируются, чтобы экраны
 * могли импортировать всё из одного места без переноса файлов. Это снижает
 * риск миграции — старые пути продолжают работать.
 *
 * Токены: `lib/ds/tokens.ts`. Редкости: `lib/rarity.ts`.
 */

// --- Новые примитивы DS ---
export { Badge, type BadgeTone } from './badge'
export { Stat } from './stat'
export { Avatar } from './avatar'
export { ProgressBar, SegmentedProgress } from './progress-bar'
export { Chip, ChipGroup } from './chip'
export { Sheet } from './sheet'
export { Modal } from './modal'
export { ItemArt } from './item-art'
export { SectionTitle } from './section-title'
export { CurrencyDisplay } from './currency-display'

// --- A1 Motion System ---
export { Reveal, StaggerList, StaggerItem } from './motion'
export { AnimatedCounter } from './animated-counter'
export { Skeleton, SkeletonCard, SkeletonRow } from './skeleton'
export { Toaster, toast } from './toast'

// --- Проверенные примитивы V2 (ре-экспорт, файлы не переносим) ---
export { Card, type CardVariant } from '@/components/v2/card'
export { RarityBadge } from '@/components/v2/rarity-badge'
export { CollectibleTile } from '@/components/v2/collectible'
export { Section } from '@/components/v2/section'
export { ScreenHeader } from '@/components/v2/screen-header'
export { PageHero } from '@/components/v2/page-hero'

// --- Токены ---
export {
  SPACE,
  RADIUS,
  ACCENT,
  TYPE_SCALE,
  ELEVATION,
  MOTION,
  NAV_HEIGHT,
  rarity,
  RARITY_TOKENS,
  type Rarity,
} from '@/lib/ds/tokens'

// --- A1 Motion tokens ---
export {
  DURATION,
  EASE,
  SPRING,
  MOTION_CLASS,
  VARIANTS,
  sec,
  type MotionDuration,
} from '@/lib/ds/motion'
