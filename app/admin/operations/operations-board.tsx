'use client'

import { useState } from 'react'
import {
  SERVICE_TOGGLES,
  GLOBAL_MODIFIERS,
  type Enforcement,
} from '@/lib/admin/operations-registry'

/**
 * Operations board (client) — global service toggles + global modifiers.
 *
 * Writes go to /api/admin/operations (app_settings rows the bot reads ≤60s).
 * Each lever shows an HONEST enforcement badge:
 *   • «живой» (enforced) — the bot honors it now.
 *   • «готов» (armed)    — stored, but the bot doesn't read it yet (needs bot
 *                          work). We never fake a working switch.
 * Optimistic UI with rollback on error. Owner-gated by the API.
 */

function EnforcementBadge({ enforcement }: { enforcement: Enforcement }) {
  if (enforcement === 'enforced') {
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
        живой
      </span>
    )
  }
  return (
    <span
      title="Флаг сохраняется, но бот его пока не читает — требуется доработка бота."
      className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
    >
      готов
    </span>
  )
}

export function OperationsBoard({
  canManage,
  initialValues,
}: {
  canManage: boolean
  initialValues: Record<string, unknown>
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function write(key: string, value: boolean | number) {
    if (!canManage) return
    setBusyKey(key)
    setMsg(null)
    const prev = values[key]
    setValues((v) => ({ ...v, [key]: value })) // optimistic
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'ошибка')
      setMsg({ ok: true, text: 'Сохранено.' })
    } catch (e) {
      setValues((v) => ({ ...v, [key]: prev })) // rollback
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'ошибка' })
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-8">
      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
          {msg.text}
        </p>
      )}

      {/* Services */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Сервисы
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SERVICE_TOGGLES.map((t) => {
            const raw = values[t.key]
            const on = typeof raw === 'boolean' ? raw : t.default
            const busy = busyKey === t.key
            return (
              <div
                key={t.key}
                className="glass flex items-start justify-between gap-3 rounded-2xl border border-border p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.emoji}</span>
                    <span className="font-semibold text-foreground">{t.label}</span>
                    <EnforcementBadge enforcement={t.enforcement} />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    <span className={on ? 'text-emerald-300' : 'text-destructive-foreground'}>
                      {on ? '🟢 включено' : '🔴 выключено'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.note}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={!canManage || busy}
                  onClick={() => write(t.key, !on)}
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-50 ${
                    on
                      ? 'border-emerald-400/40 bg-emerald-400/30'
                      : 'border-border bg-white/[0.06]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-all ${
                      on ? 'left-[22px]' : 'left-0.5'
                    }`}
                    style={{ height: 18, width: 18 }}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Modifiers */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Глобальные модификаторы
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Множители для ивентов (x2 ешки и т.п.). Фундамент готов — значения
          сохраняются; бот начнёт применять их после доработки экономического ядра.
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {GLOBAL_MODIFIERS.map((m) => {
            const raw = values[m.key]
            const val = typeof raw === 'number' ? raw : m.default
            const busy = busyKey === m.key
            const active = val !== 1
            return (
              <div
                key={m.key}
                className={`glass rounded-2xl border p-4 ${
                  active ? 'border-primary/40' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{m.emoji}</span>
                  <span className="font-semibold text-foreground">{m.label}</span>
                  <EnforcementBadge enforcement={m.enforcement} />
                  <span className={`ml-auto text-sm font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                    ×{val}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={!canManage || busy}
                      onClick={() => write(m.key, p)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                        val === p
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-border bg-white/[0.04] text-foreground hover:bg-white/[0.08]'
                      }`}
                    >
                      ×{p}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{m.note}</p>
              </div>
            )
          })}
        </div>
      </section>

      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Изменение глобальных переключателей доступно только владельцу.
        </p>
      )}
    </div>
  )
}
