'use client'

import { useEffect, useState } from 'react'
import {
  DURATION_PRESETS,
  WARN_MUTE_THRESHOLD,
  formatDuration,
  isActive,
  type ModerationAction,
} from '@/lib/moderation'

/**
 * Moderation card for a player (Player Studio). Lets a moderator ban, mute, warn
 * and lift those restrictions. The site writes the desired state into
 * `user_moderation` / `mod_warnings` (audited) and flags it for the bot, which
 * applies the real Telegram restriction on its next reconcile tick — so a ban
 * set here lands in Telegram within ~a minute, and mutes are enforced by the
 * bot's message backstop immediately.
 *
 * Gated server-side on MODERATION_BAN; this component is only rendered when the
 * operator has that permission.
 */

type Warning = {
  id: number
  reason: string | null
  active: boolean
  actorUserId: number | null
  createdAt: string
}

type State = {
  bannedUntil: string | null
  mutedUntil: string | null
  warnCount: number
  banReason: string | null
  muteReason: string | null
}

const EMPTY: State = {
  bannedUntil: null,
  mutedUntil: null,
  warnCount: 0,
  banReason: null,
  muteReason: null,
}

export function ModerationCard({ userId }: { userId: number }) {
  const [state, setState] = useState<State>(EMPTY)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState<number | null>(60 * 60) // 1h default
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function refresh() {
    try {
      const r = await fetch(`/api/admin/moderation?userId=${userId}`)
      if (!r.ok) return
      const d = await r.json()
      setState(d.state ?? EMPTY)
      setWarnings(Array.isArray(d.warnings) ? d.warnings : [])
    } catch {
      /* keep stale */
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function act(action: ModerationAction, withDuration: boolean) {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          durationSeconds: withDuration ? duration : undefined,
          reason: reason.trim() || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'ошибка')
      setMsg({ ok: true, text: ACTION_DONE[action] })
      setReason('')
      await refresh()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'ошибка' })
    } finally {
      setBusy(false)
    }
  }

  const banned = isActive(state.bannedUntil)
  const muted = isActive(state.mutedUntil)

  return (
    <div className="glass rounded-2xl border border-destructive/25 bg-gradient-to-br to-transparent p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🛡</span>
        <h3 className="text-sm font-semibold text-foreground">Модерация</h3>
      </div>

      {/* Current status */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <StatusTile
          emoji="🔨"
          label="Бан"
          value={banned ? `до ${fmtUntil(state.bannedUntil)}` : 'нет'}
          active={banned}
        />
        <StatusTile
          emoji="🔇"
          label="Мьют"
          value={muted ? `до ${fmtUntil(state.mutedUntil)}` : 'нет'}
          active={muted}
        />
        <StatusTile
          emoji="⚠️"
          label="Варны"
          value={`${state.warnCount}/${WARN_MUTE_THRESHOLD}`}
          active={state.warnCount > 0}
        />
      </div>

      {/* Duration presets (used by ban/mute) */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {DURATION_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setDuration(p.seconds)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
              duration === p.seconds
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Длительность бана/мьюта: <span className="text-foreground">{formatDuration(duration)}</span>
      </p>

      <input
        className="mb-3 w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2"
        placeholder="Причина (необязательно)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        {banned ? (
          <ActBtn label="Снять бан" tone="ok" disabled={busy} onClick={() => act('unban', false)} />
        ) : (
          <ActBtn label="Бан" tone="danger" disabled={busy} onClick={() => act('ban', true)} />
        )}
        {muted ? (
          <ActBtn label="Снять мьют" tone="ok" disabled={busy} onClick={() => act('unmute', false)} />
        ) : (
          <ActBtn label="Мьют" tone="warn" disabled={busy} onClick={() => act('mute', true)} />
        )}
        <ActBtn label="Варн" tone="warn" disabled={busy} onClick={() => act('warn', false)} />
        <ActBtn
          label="Снять варны"
          tone="ok"
          disabled={busy || state.warnCount === 0}
          onClick={() => act('unwarn', false)}
        />
      </div>

      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
          {msg.text}
        </p>
      )}

      {/* Recent warnings */}
      {warnings.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            История варнов
          </div>
          <div className="space-y-1">
            {warnings.slice(0, 5).map((w) => (
              <div
                key={w.id}
                className={`flex items-center justify-between text-[11px] ${
                  w.active ? 'text-foreground' : 'text-muted-foreground line-through'
                }`}
              >
                <span className="truncate">{w.reason || 'без причины'}</span>
                <span className="ml-2 shrink-0 text-muted-foreground">
                  {fmtUntil(w.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const ACTION_DONE: Record<ModerationAction, string> = {
  ban: 'Игрок забанен',
  unban: 'Бан снят',
  mute: 'Игрок в мьюте',
  unmute: 'Мьют снят',
  warn: 'Варн выдан',
  unwarn: 'Варны сняты',
}

function StatusTile({
  emoji,
  label,
  value,
  active,
}: {
  emoji: string
  label: string
  value: string
  active: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-2 ${
        active ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{emoji}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className={`mt-0.5 truncate text-xs font-semibold ${active ? 'text-destructive-foreground' : 'text-muted-foreground'}`}>
        {value}
      </div>
    </div>
  )
}

const TONE: Record<'danger' | 'warn' | 'ok', string> = {
  danger:
    'border-destructive/40 bg-destructive/10 text-destructive-foreground hover:bg-destructive/20',
  warn: 'border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20',
  ok: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20',
}

function ActBtn({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string
  tone: 'danger' | 'warn' | 'ok'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border py-2 text-xs font-semibold transition disabled:opacity-40 ${TONE[tone]}`}
    >
      {label}
    </button>
  )
}

function fmtUntil(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
