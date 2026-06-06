'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type AchievementRarity = 'normal' | 'legend' | 'secret'

interface AchievementBadgeProps {
  emoji: string
  name: string
  description: string
  unlocked: boolean
  reward?: number
  index?: number
  rarity?: AchievementRarity
  /** Hidden secret that is still locked — render as a mystery, no spoilers. */
  mystery?: boolean
}

export function AchievementBadge({
  emoji,
  name,
  description,
  unlocked,
  reward,
  index = 0,
  rarity = 'normal',
  mystery = false,
}: AchievementBadgeProps) {
  const isLegend = rarity === 'legend'
  const isSecret = rarity === 'secret'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 transition-all',
        // Locked baseline
        !unlocked && 'border-border/50 bg-white/[0.02] opacity-60',
        // Unlocked — common
        unlocked && !isLegend && !isSecret && 'glass border-primary/30 bg-primary/5',
        // Unlocked — legendary: warm gold, glow, gradient edge
        unlocked &&
          isLegend &&
          'border-amber-400/50 bg-gradient-to-br from-amber-400/[0.12] to-amber-500/[0.04] shadow-[0_0_24px_-6px] shadow-amber-500/40',
        // Unlocked — secret: violet mystery vibe
        unlocked &&
          isSecret &&
          'border-violet-400/50 bg-gradient-to-br from-violet-400/[0.12] to-fuchsia-500/[0.04] shadow-[0_0_24px_-8px] shadow-violet-500/40',
      )}
    >
      {/* Legendary shimmer accent */}
      {unlocked && isLegend && (
        <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-amber-400/20 blur-2xl" />
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl transition-all',
            !unlocked && 'bg-white/5 grayscale scale-90',
            unlocked && !isLegend && !isSecret && 'bg-primary/20 scale-100',
            unlocked && isLegend && 'bg-amber-400/20 scale-100',
            unlocked && isSecret && 'bg-violet-400/20 scale-100',
          )}
        >
          {mystery ? '🔒' : emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                'text-sm font-semibold leading-tight sm:text-base',
                !unlocked && 'text-muted-foreground',
                unlocked && !isLegend && !isSecret && 'text-foreground',
                unlocked && isLegend && 'text-amber-200',
                unlocked && isSecret && 'text-violet-200',
              )}
            >
              {mystery ? '???' : name}
            </h4>
            <div className="flex shrink-0 items-center gap-1.5">
              {isLegend && (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                  Легенда
                </span>
              )}
              {isSecret && unlocked && (
                <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                  Секрет
                </span>
              )}
              {unlocked && !mystery && reward && reward > 0 && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-bold',
                    isLegend
                      ? 'bg-amber-400/20 text-amber-300'
                      : isSecret
                        ? 'bg-violet-400/20 text-violet-300'
                        : 'bg-primary/20 text-primary',
                  )}
                >
                  +{reward}
                </span>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            {mystery ? 'Скрытое достижение — открой его в боте' : description}
          </p>
          {unlocked && !mystery && (
            <div
              className={cn(
                'mt-2 flex items-center gap-1.5 text-xs font-medium',
                isLegend ? 'text-amber-300' : isSecret ? 'text-violet-300' : 'text-primary',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                  isLegend
                    ? 'bg-amber-400 text-black'
                    : isSecret
                      ? 'bg-violet-400 text-black'
                      : 'bg-primary text-primary-foreground',
                )}
              >
                ✓
              </span>
              <span>Выполнено</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
