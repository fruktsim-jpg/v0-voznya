import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Badge (DS) — компактная плашка-метка дизайн-системы. Универсальная: статусы,
 * счётчики, лейблы тиров (для редкости есть отдельный RarityBadge). Server
 * component, без интерактива.
 */
export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-border bg-white/[0.04] text-muted-foreground',
  primary: 'border-primary/40 bg-primary/10 text-primary',
  success: 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]',
  warning: 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]',
  danger: 'border-destructive/40 bg-destructive/10 text-[#ef4444]',
  info: 'border-[#3b82f6]/40 bg-[#3b82f6]/10 text-[#3b82f6]',
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
