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
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-3 transition-all",
        unlocked
          ? "glass border-primary/30 bg-primary/5"
          : "border-border/50 bg-white/[0.02] opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl transition-all",
          unlocked 
            ? "bg-primary/20 scale-100" 
            : "bg-white/5 grayscale scale-90"
        )}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-sm font-semibold leading-tight",
              unlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {name}
            </h4>
            {unlocked && reward && reward > 0 && (
              <span className="shrink-0 text-xs font-bold text-primary">
                +{reward}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </div>
      {unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.03 + 0.2 }}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px]"
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  )
}
