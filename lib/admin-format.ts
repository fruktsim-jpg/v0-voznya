// Client-safe display helpers for the admin platform. No DB / `pg` imports here
// so this is safe to use from client components. Keeps the admin UI consistent
// with the rest of the site (emoji + RU phrasing instead of raw action codes).

import { ACHIEVEMENTS } from '@/lib/voznya-bot'

const ACHIEVEMENT_NAME = new Map(ACHIEVEMENTS.map((a) => [a.code, `${a.emoji} ${a.name}`]))

export function achievementLabel(code: string | null): string {
  if (!code) return '—'
  return ACHIEVEMENT_NAME.get(code) ?? code
}

/** Visuals for an audit action: emoji + short RU verb + accent color class. */
export type ActionStyle = {
  emoji: string
  verb: string
  // Tailwind text color for the amount / accent.
  tone: string
}

const ACTION_STYLES: Record<string, ActionStyle> = {
  'economy.add': { emoji: '💰', verb: 'получил', tone: 'text-amber-300' },
  'economy.remove': { emoji: '💸', verb: 'потерял', tone: 'text-amber-300' },
  'mmr.add': { emoji: '🏆', verb: 'получил', tone: 'text-primary' },
  'mmr.remove': { emoji: '📉', verb: 'потерял', tone: 'text-primary' },
  'reputation.add': { emoji: '❤️', verb: 'получил', tone: 'text-rose-300' },
  'reputation.remove': { emoji: '🖤', verb: 'потерял', tone: 'text-rose-300' },
  'inventory.grant': { emoji: '🎒', verb: 'получил предмет', tone: 'text-sky-300' },
  'inventory.revoke': { emoji: '🗑', verb: 'лишился предмета', tone: 'text-sky-300' },
  'achievements.grant': { emoji: '🏅', verb: 'получил достижение', tone: 'text-emerald-300' },
  'achievements.revoke': { emoji: '➖', verb: 'лишился достижения', tone: 'text-emerald-300' },
  'role.bootstrap': { emoji: '👑', verb: 'стал владельцем', tone: 'text-primary' },
  'role.grant': { emoji: '🛡', verb: 'получил роль', tone: 'text-primary' },
  'role.revoke': { emoji: '🚫', verb: 'лишился роли', tone: 'text-primary' },
  'player.ban': { emoji: '🔨', verb: 'забанен', tone: 'text-destructive-foreground' },
  'player.unban': { emoji: '✅', verb: 'разбанен', tone: 'text-emerald-300' },
  'player.mute': { emoji: '🔇', verb: 'в мьюте', tone: 'text-amber-300' },
  'player.unmute': { emoji: '🔊', verb: 'размьючен', tone: 'text-emerald-300' },
  'player.warn': { emoji: '⚠️', verb: 'получил варн', tone: 'text-amber-300' },
  'player.unwarn': { emoji: '✅', verb: 'снятие варнов', tone: 'text-emerald-300' },
  'player.kick': { emoji: '👋', verb: 'кикнут', tone: 'text-destructive-foreground' },
  'player.cooldown_reset': { emoji: '⏱️', verb: 'сброс кулдаунов', tone: 'text-sky-300' },
}

export function actionStyle(action: string): ActionStyle {
  return (
    ACTION_STYLES[action] ?? {
      emoji: '•',
      verb: action,
      tone: 'text-muted-foreground',
    }
  )
}

export type AuditEntryLike = {
  action: string
  amount?: number | null
  target_id?: string | null
  target_type?: string | null
  meta?: Record<string, unknown> | null
}

/**
 * Turns a raw audit row into a human sentence fragment (without the actor /
 * target name, which the caller renders as links). e.g. for economy.add +500
 * returns "получил 500 ешек".
 */
export function humanizeAudit(entry: AuditEntryLike): { emoji: string; text: string; tone: string } {
  const style = actionStyle(entry.action)
  const amount = entry.amount != null ? Math.abs(Number(entry.amount)) : null
  const fmt = (n: number) => n.toLocaleString('ru-RU')

  let text = style.verb
  switch (entry.action) {
    case 'economy.add':
    case 'economy.remove':
      if (amount != null) text = `${style.verb} ${fmt(amount)} ешек`
      break
    case 'mmr.add':
    case 'mmr.remove':
      if (amount != null) text = `${style.verb} ${fmt(amount)} MMR`
      break
    case 'reputation.add':
    case 'reputation.remove':
      if (amount != null) text = `${style.verb} ${fmt(amount)} репутации`
      break
    case 'inventory.grant':
    case 'inventory.revoke':
      if (entry.target_id) text = `${style.verb} ${entry.target_id}`
      break
    case 'achievements.grant':
    case 'achievements.revoke':
      text = `${style.verb} «${achievementLabel(entry.target_id ?? null)}»`
      break
    case 'player.ban':
    case 'player.mute': {
      // Duration lives in meta.durationSeconds (site) — null/absent = permanent.
      const secs = entry.meta?.durationSeconds
      const dur =
        secs == null ? 'навсегда' : formatDurationShort(Number(secs))
      text = `${style.verb} (${dur})`
      break
    }
    case 'player.warn': {
      const count = entry.meta?.count
      text = count != null ? `${style.verb} (${Number(count)})` : style.verb
      break
    }
  }

  return { emoji: style.emoji, text, tone: style.tone }
}

/** Compact RU duration for audit lines (e.g. "1 д", "2 ч", "10 мин"). */
function formatDurationShort(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'навсегда'
  const days = Math.floor(seconds / 86400)
  if (days) return `${days} д`
  const hours = Math.floor((seconds % 86400) / 3600)
  if (hours) return `${hours} ч`
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${minutes || 1} мин`
}

/** Short RU label for an admin role. */
export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'owner':
      return '👑 Владелец'
    case 'admin':
      return '🛡 Админ'
    case 'moderator':
      return '⚖️ Модератор'
    case 'support':
      return '🎧 Саппорт'
    default:
      return '—'
  }
}
