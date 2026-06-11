'use client'

/**
 * Motion primitives (A1 Motion System) — thin framer-motion wrappers that apply
 * the platform's SIGNATURE arrival so every surface enters the same confident
 * way. Use these instead of hand-rolling `initial/animate` per file.
 *
 *   <Reveal>        — single element fade-rise on mount / in-view.
 *   <StaggerList>   — container whose children populate in sequence.
 *   <StaggerItem>   — child of StaggerList.
 *
 * All honor reduced-motion (render static, fully visible). Transform+opacity
 * only. Presentation only.
 */

import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { VARIANTS } from '@/lib/ds/motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

type RevealProps = {
  children: ReactNode
  /** Animate when scrolled into view instead of immediately on mount. */
  inView?: boolean
  /** Use the celebratory overshoot curve (for reward-ish content). */
  reward?: boolean
  className?: string
  /** Optional stagger delay (seconds) for manual sequencing. */
  delay?: number
} & Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate' | 'whileInView'>

export function Reveal({ children, inView, reward, className, delay, ...rest }: RevealProps) {
  const reduced = useReducedMotion()
  const variant = reward ? VARIANTS.rewardPop : VARIANTS.arrive

  if (reduced) {
    return (
      <div className={className} {...(rest as Record<string, unknown>)}>
        {children}
      </div>
    )
  }

  const animateProps = inView
    ? { whileInView: 'show' as const, viewport: { once: true, margin: '-40px' } }
    : { animate: 'show' as const }

  return (
    <motion.div
      className={className}
      variants={variant}
      initial="hidden"
      transition={delay ? { delay } : undefined}
      {...animateProps}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

type StaggerListProps = {
  children: ReactNode
  inView?: boolean
  className?: string
} & Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate' | 'whileInView'>

export function StaggerList({ children, inView, className, ...rest }: StaggerListProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <div className={className} {...(rest as Record<string, unknown>)}>
        {children}
      </div>
    )
  }

  const animateProps = inView
    ? { whileInView: 'show' as const, viewport: { once: true, margin: '-40px' } }
    : { animate: 'show' as const }

  return (
    <motion.div
      className={className}
      variants={VARIANTS.staggerContainer}
      initial="hidden"
      {...animateProps}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Omit<
  HTMLMotionProps<'div'>,
  'variants'
>) {
  const reduced = useReducedMotion()
  if (reduced) {
    return (
      <div className={className} {...(rest as Record<string, unknown>)}>
        {children}
      </div>
    )
  }
  return (
    <motion.div className={className} variants={VARIANTS.staggerItem} {...rest}>
      {children}
    </motion.div>
  )
}
