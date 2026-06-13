'use client'

import { useMemo, useState } from 'react'
import {
  SETTINGS_REGISTRY,
  SETTINGS_BY_KEY,
  KNOWN_SETTING_KEYS,
  validateSetting,
  type SettingDef,
} from '@/lib/admin/settings-schema'
import type { AdminSetting } from './settings-manager'
import { SettingsManager } from './settings-manager'

/**
 * HumanSettings — the humanized Settings surface (Settings Humanization).
 * Renders the typed registry as real operator controls grouped by domain
 * (Casino/Farm/Daily/Duels/Season/Economy). The operator never sees raw keys or
 * JSON. Values write to the SAME `app_settings` table the bot reads — each save
 * POSTs the registry's exact key. Unknown (unregistered) overrides drop into the
 * legacy raw editor below, so nothing is hidden.
 */

/**
 * Per-domain visual identity — turns each settings group from a plain card into
 * a self-contained control module (icon + accent rail + header summary). This is
 * the Settings V2 "panels, not a form" step: same registry, same writes, richer
 * surface so the operator reads it as Казино / Ферма / Экономика modules.
 */
const GROUP_META: Record<string, { emoji: string; accent: string; rail: string }> = {
  casino: { emoji: '🎰', accent: 'from-rose-400/[0.10]', rail: 'bg-rose-400/60' },
  farm: { emoji: '🌾', accent: 'from-emerald-400/[0.10]', rail: 'bg-emerald-400/60' },
  daily: { emoji: '📅', accent: 'from-sky-400/[0.10]', rail: 'bg-sky-400/60' },
  duels: { emoji: '⚔️', accent: 'from-amber-400/[0.10]', rail: 'bg-amber-400/60' },
  season: { emoji: '🏆', accent: 'from-primary/[0.10]', rail: 'bg-primary/60' },
  economy: { emoji: '💹', accent: 'from-violet-400/[0.10]', rail: 'bg-violet-400/60' },
}

const fmtVal = (def: SettingDef, v: number | boolean | string): string => {
  if (def.control === 'toggle') return v ? 'вкл' : 'выкл'
  if (def.control === 'percent') return `${Math.round(Number(v) * 100)}%`
  if (def.control === 'duration') {
    const s = Number(v)
    if (s % 3600 === 0) return `${s / 3600} ч`
    if (s % 60 === 0) return `${s / 60} мин`
    return `${s} сек`
  }
  return `${Number(v).toLocaleString('ru-RU')}${def.unit ? ` ${def.unit}` : ''}`
}

function currentValue(def: SettingDef, stored: Map<string, unknown>): number | boolean | string {
  const has = stored.has(def.key)
  const raw = stored.get(def.key)
  if (!has || raw == null) return def.default
  if (def.control === 'toggle') return Boolean(raw)
  if (def.control === 'number' || def.control === 'duration' || def.control === 'percent') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : def.default
  }
  return String(raw)
}

function ControlRow({
  def,
  stored,
  isOverride,
  canManage,
  onSave,
  onReset,
  busy,
}: {
  def: SettingDef
  stored: Map<string, unknown>
  isOverride: boolean
  canManage: boolean
  onSave: (def: SettingDef, value: number | boolean | string) => void
  onReset: (def: SettingDef) => void
  busy: boolean
}) {
  const cur = currentValue(def, stored)
  // Duration edits in a human unit (minutes) while storing seconds.
  const [draft, setDraft] = useState<string>(() => {
    if (def.control === 'toggle') return ''
    if (def.control === 'percent') return String(Math.round(Number(cur) * 100))
    if (def.control === 'duration') return String(Math.round(Number(cur) / 60))
    return String(cur)
  })
  const [localErr, setLocalErr] = useState<string | null>(null)

  function commit() {
    let value: number | boolean | string
    if (def.control === 'percent') value = Number(draft) / 100
    else if (def.control === 'duration') value = Math.round(Number(draft) * 60)
    else value = Number(draft)
    const res = validateSetting(def, value)
    if ('error' in res) {
      setLocalErr(res.error)
      return
    }
    setLocalErr(null)
    onSave(def, res.value)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white/[0.02] p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{def.label}</span>
          {def.liveNow ? (
            <span className="rounded-full border border-emerald-400/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-emerald-300">живой</span>
          ) : (
            <span
              className="rounded-full border border-amber-400/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-amber-300/90"
              title="Бот применит значение, когда начнёт читать этот ключ. Сохранение безопасно."
            >
              готов
            </span>
          )}
          {isOverride && (
            <span className="rounded-full border border-amber-400/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-amber-300">изменено</span>
          )}
        </div>
        {def.help && <div className="mt-0.5 text-[11px] text-muted-foreground">{def.help}</div>}
        <div className="mt-0.5 text-[10px] text-muted-foreground/70">
          Сейчас: {fmtVal(def, cur)} · по умолчанию: {fmtVal(def, def.default)}
        </div>
        {localErr && <div className="mt-1 text-[11px] text-destructive-foreground">{localErr}</div>}
      </div>

      {def.control === 'toggle' ? (
        <button
          type="button"
          disabled={!canManage || busy}
          onClick={() => onSave(def, !cur)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${cur ? 'bg-emerald-500/70' : 'bg-white/10'}`}
          aria-pressed={Boolean(cur)}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${cur ? 'left-6' : 'left-1'}`} />
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              disabled={!canManage || busy}
              value={draft}
              min={def.control === 'percent' ? (def.min ?? 0) * 100 : def.control === 'duration' ? (def.min ?? 0) / 60 : def.min}
              max={def.control === 'percent' ? (def.max ?? 0) * 100 : def.control === 'duration' ? (def.max ?? 0) / 60 : def.max}
              onChange={(e) => setDraft(e.target.value)}
              className="w-24 rounded-xl border border-input bg-white/[0.04] px-2.5 py-1.5 text-sm text-foreground outline-none ring-primary/40 focus:border-primary/50 focus:ring-2 disabled:opacity-50"
            />
            <span className="text-[11px] text-muted-foreground">
              {def.control === 'percent' ? '%' : def.control === 'duration' ? 'мин' : def.unit}
            </span>
          </div>
          {canManage && (
            <button
              type="button"
              disabled={busy}
              onClick={commit}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              Сохранить
            </button>
          )}
        </div>
      )}

      {canManage && isOverride && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onReset(def)}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-white/[0.06] disabled:opacity-50"
          title="Вернуть значение из кода"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}

export function HumanSettings({
  initialSettings,
  canManage,
}: {
  initialSettings: AdminSetting[]
  canManage: boolean
}) {
  const [settings, setSettings] = useState<AdminSetting[]>(initialSettings)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const stored = useMemo(() => new Map(settings.map((s) => [s.key, s.value])), [settings])
  const unknown = useMemo(() => settings.filter((s) => !KNOWN_SETTING_KEYS.has(s.key)), [settings])

  async function refresh() {
    const r = await fetch('/api/admin/settings')
    const d = r.ok ? await r.json() : { settings: [] }
    setSettings(Array.isArray(d.settings) ? d.settings : [])
  }

  async function onSave(def: SettingDef, value: number | boolean | string) {
    if (!canManage) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: def.key,
          value,
          category: SETTINGS_REGISTRY.find((g) => g.settings.includes(def))?.id ?? 'general',
          description: def.label,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'ошибка сохранения')
      setMsg({ ok: true, text: `Сохранено: ${def.label}` })
      await refresh()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'ошибка' })
    } finally {
      setBusy(false)
    }
  }

  async function onReset(def: SettingDef) {
    if (!canManage) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch(`/api/admin/settings?key=${encodeURIComponent(def.key)}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'ошибка сброса')
      setMsg({ ok: true, text: `Сброшено к умолчанию: ${def.label}` })
      await refresh()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>{msg.text}</p>
      )}

      {SETTINGS_REGISTRY.map((group) => {
        const meta = GROUP_META[group.id] ?? { emoji: '⚙️', accent: 'from-white/[0.04]', rail: 'bg-white/20' }
        const liveCount = group.settings.filter((s) => s.liveNow).length
        const overrideCount = group.settings.filter((s) => stored.has(s.key)).length
        return (
          <div
            key={group.id}
            className={`glass relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br to-transparent p-4 pl-5 ${meta.accent}`}
          >
            {/* accent rail */}
            <span className={`absolute inset-y-0 left-0 w-1 ${meta.rail}`} />
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-lg">
                  {meta.emoji}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                  {group.blurb && <p className="text-[11px] text-muted-foreground">{group.blurb}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {liveCount > 0 && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {liveCount} живых
                  </span>
                )}
                {overrideCount > 0 && (
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {overrideCount} изменено
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {group.settings.map((def) => (
                <ControlRow
                  key={def.key}
                  def={def}
                  stored={stored}
                  isOverride={stored.has(def.key)}
                  canManage={canManage}
                  onSave={onSave}
                  onReset={onReset}
                  busy={busy}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Anything not in the registry stays editable via the raw editor. */}
      {unknown.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Прочие параметры (raw)
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Ключи без человеческого контрола. Их можно перенести в реестр
            (`lib/admin/settings-schema.ts`), чтобы получить нормальный интерфейс.
          </p>
          <SettingsManager initialSettings={unknown} canManage={canManage} />
        </div>
      )}
    </div>
  )
}
