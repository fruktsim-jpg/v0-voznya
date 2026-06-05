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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-lg border p-2 transition-all sm:rounded-xl sm:p-3",
        unlocked
          ? "glass border-primary/30 bg-primary/5"
          : "border-border/50 bg-white/[0.02] opacity-50"
      )}
    >
      <div className="flex items-start gap-1.5 sm:gap-3">
        <div className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base transition-all sm:h-10 sm:w-10 sm:text-xl",
          unlocked 
            ? "bg-primary/20 scale-100" 
            : "bg-white/5 grayscale scale-90"
        )}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <h4 className={cn(
              "text-[11px] font-semibold leading-tight sm:text-sm",
              unlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {name}
            </h4>
            {unlocked && reward && reward > 0 && (
              <span className="shrink-0 text-[9px] font-bold text-primary sm:text-xs">
                +{reward}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[9px] text-muted-foreground line-clamp-1 sm:text-xs sm:line-clamp-2">
            {description}
          </p>
        </div>
      </div>
      {unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.02 + 0.15 }}
          className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] sm:right-2 sm:top-2 sm:h-5 sm:w-5 sm:text-[10px]"
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  )
}
