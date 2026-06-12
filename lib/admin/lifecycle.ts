// =============================================================================
// VOZNYA — CONTENT LIFECYCLE (CC Foundation)
// =============================================================================
//
// THE single source of truth for content status across every Command Center
// module (items, collections, assets, featured slots, cases…). Owner directive:
// NOT active/inactive — a real publishing lifecycle:
//
//   draft → review → scheduled → published → retired → archived
//
// `StatusPill`, `PublishControl`, and all admin APIs read these definitions so
// the whole platform speaks one vocabulary. Public-facing surfaces treat ONLY
// `published` (and `scheduled` once its window opens) as live.
// =============================================================================

export const CONTENT_STATUSES = [
  'draft',
  'review',
  'scheduled',
  'published',
  'retired',
  'archived',
] as const

export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export function isContentStatus(v: unknown): v is ContentStatus {
  return typeof v === 'string' && (CONTENT_STATUSES as readonly string[]).includes(v)
}

type StatusMeta = {
  label: string // RU label for admin UI
  tone: 'neutral' | 'info' | 'warn' | 'success' | 'muted' | 'danger'
  /** Live to the public (subject to availability window for `scheduled`). */
  isLive: boolean
  /** Allowed next statuses from this one (drives PublishControl actions). */
  next: ContentStatus[]
}

export const STATUS_META: Record<ContentStatus, StatusMeta> = {
  draft: {
    label: 'Черновик',
    tone: 'warn',
    isLive: false,
    next: ['review', 'scheduled', 'published', 'archived'],
  },
  review: {
    label: 'На ревью',
    tone: 'info',
    isLive: false,
    next: ['draft', 'scheduled', 'published', 'archived'],
  },
  scheduled: {
    label: 'Запланирован',
    tone: 'info',
    isLive: true, // live once available_from passes
    next: ['draft', 'published', 'retired', 'archived'],
  },
  published: {
    label: 'Опубликован',
    tone: 'success',
    isLive: true,
    next: ['retired', 'scheduled', 'archived'],
  },
  retired: {
    label: 'Снят',
    tone: 'muted',
    isLive: false,
    next: ['published', 'archived'],
  },
  archived: {
    label: 'В архиве',
    tone: 'muted',
    isLive: false,
    next: ['draft'],
  },
}

/** Statuses considered live for public reads (SQL: status IN (...)). */
export const LIVE_STATUSES: ContentStatus[] = (CONTENT_STATUSES as readonly ContentStatus[]).filter(
  (s) => STATUS_META[s].isLive,
)

/** Whether a transition from→to is allowed. */
export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return STATUS_META[from]?.next.includes(to) ?? false
}

/**
 * Is this row live RIGHT NOW given status + availability window?
 * `published` → live unless an `until` has passed. `scheduled` → live only once
 * `from` has arrived (and before `until`). Everything else → not live.
 */
export function isLiveNow(
  status: ContentStatus,
  availableFrom?: Date | string | null,
  availableUntil?: Date | string | null,
  now: Date = new Date(),
): boolean {
  if (!STATUS_META[status]?.isLive) return false
  const from = availableFrom ? new Date(availableFrom) : null
  const until = availableUntil ? new Date(availableUntil) : null
  if (status === 'scheduled' && from && now < from) return false
  if (until && now > until) return false
  return true
}
