'use client'

import type { ContentStatus } from '@/lib/admin/lifecycle'
import { STATUS_META } from '@/lib/admin/lifecycle'

/**
 * <StatusPill> (CC Foundation) — THE shared status badge. Reads the platform
 * lifecycle vocabulary (lib/admin/lifecycle), so every module shows the same
 * words and colors for draft/review/scheduled/published/retired/archived.
 */

const TONE: Record<string, string> = {
  neutral: 'bg-white/[0.04] text-foreground border-white/10',
  info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  muted: 'bg-white/[0.04] text-muted-foreground border-white/10',
  danger: 'bg-destructive/15 text-destructive-foreground border-destructive/30',
}

export function StatusPill({
  status,
  className = '',
}: {
  status: ContentStatus | string
  className?: string
}) {
  const meta = STATUS_META[status as ContentStatus]
  const tone = meta ? TONE[meta.tone] : TONE.neutral
  const label = meta?.label ?? status
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone} ${className}`}
    >
      {label}
    </span>
  )
}
