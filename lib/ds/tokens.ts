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

/** Радиусы — «тактическая» шкала Figma (карточки 12–16px, не перекруглённые). */
export const RADIUS = {
  sm: 'rounded-md', // 10 — кнопки/инпуты
  md: 'rounded-lg', // 14 — карточки (var --radius)
  lg: 'rounded-xl', // 16 — крупные панели
  xl: 'rounded-2xl', // 16+ — листы/модалки
  pill: 'rounded-full',
} as const

/**
 * Мульти-акцентная палитра (Figma reference). Монохром-фиолет заменён системой
 * акцентов по контексту: прогрессия, престиж, социалка, награды, экономика,
 * опасность. Значения — CSS-переменные из `app/globals.css`. Использовать как
 * inline-цвет (`style={{ color: ACCENT.gold }}`) или Tailwind (`text-accent-gold`).
 */
export const ACCENT = {
  indigo: 'var(--accent-indigo)', // #4B69FF — MMR / прогрессия / основное действие
  violet: 'var(--accent-violet)', // #8847FF — престиж / премиум / бренд
  pink: 'var(--accent-pink)', // #EC4899 — социалка / подарки / комьюнити
  gold: 'var(--accent-gold)', // #FFD700 — легендарка / награды / валюта
  teal: 'var(--accent-teal)', // #14B8A6 — экономика / позитив / live
  red: 'var(--accent-red)', // #EB4B4B — мифик / джекпот / опасность
} as const

/**
 * Типографическая шкала — VOZNYA TYPE SYSTEM (PHASE B — B2). Пять ролей на трёх
 * шрифтах (Unbounded дисплей / Inter UI / JetBrains Mono числа). Контраст между
 * регистрами — намеренный (аудит A4.5: «Inter везде» = дженерик). CSS-утилиты
 * (.type-display/.section-title/.type-stat/.type-prestige/.type-economy) живут в
 * globals.css; здесь — готовые классы для компонентов.
 */
export const TYPE_SCALE = {
  /** 1. DISPLAY — заголовок экрана / геро-число (Unbounded, тяжёлый, плотный). */
  display: 'type-display text-3xl sm:text-4xl',
  /** 2. SECTION — заголовок секции, КАПС (Unbounded). */
  sectionTitle: 'section-title text-xl sm:text-2xl',
  h1: 'type-display text-2xl tracking-tight',
  h2: 'text-xl font-bold tracking-tight',
  h3: 'text-lg font-semibold',
  body: 'text-sm',
  caption: 'text-xs text-muted-foreground',
  /** Надзаголовок-«бровь»: КАПС, разрядка, приглушённый (LIVE FEED / FEATURED). */
  eyebrow: 'label-eyebrow',
  micro: 'text-[10px] uppercase tracking-wide text-muted-foreground',
  /** 3. STAT — крупные числа (баланс/MMR/счётчики): моно, tabular-nums. */
  stat: 'type-stat',
  /** 4. PRESTIGE — имена рангов/дивизионов/титулов (Unbounded, средний вес). */
  prestige: 'type-prestige',
  /** 5. ECONOMY — суммы валюты: моно, плотнее (пара с монетой ешки, B3). */
  economy: 'type-economy',
  /** Моноширинный — для серийников/шансов/ID. */
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
