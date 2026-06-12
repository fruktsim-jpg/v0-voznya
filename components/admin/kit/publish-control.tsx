'use client'

import type { ContentStatus } from '@/lib/admin/lifecycle'
import { STATUS_META } from '@/lib/admin/lifecycle'

/**
 * <PublishControl> (CC Foundation) — renders the allowed lifecycle transition
 * buttons for the current status (from lib/admin/lifecycle), so every module
 * gets the same publish/retire/schedule/archive controls without hand-coding
 * them. The parent supplies `onTransition(next)` which calls its PATCH endpoint.
 */

const ACTION_TONE: Partial<Record<ContentStatus, string>> = {
  published: 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25',
  scheduled: 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25',
  review: 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25',
  retired: 'bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]',
  archived: 'bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]',
  draft: 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25',
}

export function PublishControl({
  status,
  onTransition,
  canPublish,
  busy = false,
  compact = false,
}: {
  status: ContentStatus
  onTransition: (next: ContentStatus) => void
  canPublish: boolean
  busy?: boolean
  compact?: boolean
}) {
  if (!canPublish) return null
  const next = STATUS_META[status]?.next ?? []
  if (next.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'gap-2'}`}>
      {next.map((to) => (
        <button
          key={to}
          type="button"
          onClick={() => onTransition(to)}
          disabled={busy}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
            ACTION_TONE[to] ?? 'bg-white/[0.04] text-foreground hover:bg-white/[0.08]'
          }`}
        >
          {transitionLabel(to)}
        </button>
      ))}
    </div>
  )
}

function transitionLabel(to: ContentStatus): string {
  switch (to) {
    case 'published':
      return 'Опубликовать'
    case 'scheduled':
      return 'Запланировать'
    case 'review':
      return 'На ревью'
    case 'retired':
      return 'Снять'
    case 'archived':
      return 'В архив'
    case 'draft':
      return 'В черновик'
    default:
      return to
  }
}
