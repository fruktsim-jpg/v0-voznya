'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AchievementBadgeProps {
  emoji: string
  name: string
  description: string
  unlocked: boolean
  reward?: number
  index?: number
}

export function AchievementBadge({ 
  emoji, 
  name, 
  description, 
  unlocked, 
  reward,
  index = 0 
}: AchievementBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-all",
        unlocked
          ? "glass border-primary/30 bg-primary/5"
          : "border-border/50 bg-white/[0.02] opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl transition-all",
          unlocked 
            ? "bg-primary/20 scale-100" 
            : "bg-white/5 grayscale scale-90"
        )}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-sm font-semibold leading-tight sm:text-base",
              unlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {name}
            </h4>
            {unlocked && reward && reward > 0 && (
              <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                +{reward}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
          {unlocked && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
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
