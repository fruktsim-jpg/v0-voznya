/**
 * VOZNYA Motion System (PHASE A — Premium Platform Layer, A1).
 *
 * ONE motion language for the whole platform. This is NOT "nice animations" — it
 * is the layer that makes the product feel ALIVE and INTENTIONAL in the hand.
 * Every value below maps to an EMOTIONAL intent, not just a duration:
 *
 *   - anticipation → builds tension BEFORE a reward resolves;
 *   - arrival      → content enters with confidence (page/card/list);
 *   - response     → instant tactile answer to a tap/hover (it feels reactive);
 *   - reward       → the payoff curve (overshoot/settle) — earned, celebrated;
 *   - ceremony     → the rare, heavy moment (rank-up, mythic) — slow, weighty.
 *
 * Rules (carried from the case system, now platform-wide):
 *   - animate ONLY transform + opacity (compositor-friendly; no layout thrash);
 *   - everything degrades to instant under prefers-reduced-motion;
 *   - durations are tokens — components NEVER hard-code ad-hoc ms.
 *
 * Pure presentation. No data, no side effects, SSR-safe (constants only).
 */

/** Durations (ms). Named by emotional WEIGHT, not by size. */
export const DURATION = {
  /** 0 — reduced-motion / instant state swaps. */
  instant: 0,
  /** 120 — micro feedback (hover tint, icon swap). */
  micro: 120,
  /** 180 — taps, chips, small toggles (the "it responded" beat). */
  response: 180,
  /** 240 — standard enter/exit (cards, sheets, modals). */
  base: 240,
  /** 360 — emphasis (list stagger tail, section reveals). */
  emphasis: 360,
  /** 460 — reward reveal (matches the proven case-reveal-in curve). */
  reward: 460,
  /** 900 — ceremony beats (rank-up, mythic shard burst). */
  ceremony: 900,
} as const

/**
 * Easings. `decelerate` is the platform signature (the same cubic the case
 * reveal uses) — content arrives fast then settles, which reads as "confident."
 */
export const EASE = {
  /** Standard in/out for most transitions. */
  standard: [0.4, 0, 0.2, 1],
  /** Signature decelerate — fast in, soft settle (arrivals, reveals). */
  decelerate: [0.16, 1, 0.3, 1],
  /** Accelerate — exits that leave with intent. */
  accelerate: [0.4, 0, 1, 1],
} as const

/** Framer-motion spring presets (sheets, press, playful arrivals). */
export const SPRING = {
  /** Snappy, low-overshoot — UI controls, sheet snap. */
  snappy: { type: 'spring', stiffness: 520, damping: 36, mass: 0.9 },
  /** Bouncy — playful arrivals (reward chips, badges popping in). */
  bouncy: { type: 'spring', stiffness: 420, damping: 22, mass: 0.8 },
  /** Heavy — ceremony weight (division world materializing). */
  heavy: { type: 'spring', stiffness: 180, damping: 26, mass: 1.2 },
} as const

/** Seconds helper — framer-motion uses seconds, our tokens are ms. */
export const sec = (ms: number) => ms / 1000

/**
 * Tailwind utility classes for the most common interaction motions, so simple
 * surfaces get the platform feel WITHOUT importing framer-motion. These compose
 * the emotional vocabulary the owner asked for (hover / press states).
 */
export const MOTION_CLASS = {
  /** Tap-compress for interactive tiles (the tactile "press"). */
  press: 'transition-transform duration-150 active:scale-[0.97]',
  /** Card hover: lift + brighten (desktop), compress on touch. */
  cardHover:
    'transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]',
  /** Button press + hover brighten. */
  button: 'transition-[transform,background-color,opacity] duration-150 active:scale-[0.97]',
  /** Generic smooth color/opacity (chips, links). */
  tint: 'transition-[color,background-color,opacity,border-color] duration-150',
} as const

/**
 * Shared framer-motion variants. Import these instead of redefining per file so
 * the whole platform enters the SAME way. `arrive` = the signature decelerate
 * fade-rise; `stagger*` = list orchestration for "the world populating in."
 */
export const VARIANTS = {
  /** Content arrival: fade + small rise + settle. */
  arrive: {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: sec(DURATION.base), ease: EASE.decelerate },
    },
  },
  /** Reward arrival: overshoot scale (earned, celebratory). */
  rewardPop: {
    hidden: { opacity: 0, scale: 0.92, y: 10 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: sec(DURATION.reward), ease: EASE.decelerate },
    },
  },
  /** Stagger container — children populate in sequence (a list "coming alive"). */
  staggerContainer: {
    hidden: {},
    show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
  },
  /** Stagger child — pairs with staggerContainer. */
  staggerItem: {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: sec(DURATION.base), ease: EASE.decelerate },
    },
  },
} as const

export type MotionDuration = keyof typeof DURATION
