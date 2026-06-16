/**
 * Moderation constants and helpers — TypeScript mirror of the bot's
 * `voznya-bot/app/settings/moderation.py`. Keep the two in sync: thresholds and
 * durations must match so the bot and the admin panel show identical rules.
 *
 * The bot is the source of truth (it actually bans/mutes via Telegram). The
 * site writes audited state into `user_moderation` / `mod_warnings`, which the
 * bot reads and enforces.
 */

// How many active warnings trigger an automatic mute (mirror WARN_MUTE_THRESHOLD).
export const WARN_MUTE_THRESHOLD = 3

// Auto-mute duration when the warn threshold is reached, seconds (mirror).
export const WARN_MUTE_SECONDS = 24 * 60 * 60

// How long a single warning stays active before it expires, seconds.
// 0 = warnings never expire.
export const WARN_TTL_SECONDS = 30 * 24 * 60 * 60

// Default mute length when no duration is given, seconds (mirror).
export const DEFAULT_MUTE_SECONDS = 60 * 60

/** Moderation actions the panel can request. */
export type ModerationAction =
  | 'ban'
  | 'unban'
  | 'mute'
  | 'unmute'
  | 'warn'
  | 'unwarn'

/** Audit action code written for each moderation operation (mirror bot codes). */
export const MOD_AUDIT_ACTION: Record<ModerationAction, string> = {
  ban: 'player.ban',
  unban: 'player.unban',
  mute: 'player.mute',
  unmute: 'player.unmute',
  warn: 'player.warn',
  unwarn: 'player.unwarn',
}

/** Quick-duration presets (seconds) offered in the UI. null = permanent. */
export const DURATION_PRESETS: { label: string; seconds: number | null }[] = [
  { label: '10 мин', seconds: 10 * 60 },
  { label: '1 час', seconds: 60 * 60 },
  { label: '1 день', seconds: 24 * 60 * 60 },
  { label: '7 дней', seconds: 7 * 24 * 60 * 60 },
  { label: 'Навсегда', seconds: null },
]

/** Human-readable duration in RU (matches the bot's format_duration spirit). */
export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return 'навсегда'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days) parts.push(`${days} д`)
  if (hours) parts.push(`${hours} ч`)
  if (minutes) parts.push(`${minutes} мин`)
  return parts.join(' ') || 'навсегда'
}

/** Current moderation state of a player (shape returned to the panel). */
export type ModerationState = {
  bannedUntil: string | null
  mutedUntil: string | null
  warnCount: number
  banReason: string | null
  muteReason: string | null
}

/** Whether a restriction timestamp is currently active. */
export function isActive(until: string | null): boolean {
  if (!until) return false
  return new Date(until).getTime() > Date.now()
}
