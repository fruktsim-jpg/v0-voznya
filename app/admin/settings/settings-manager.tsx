'use client'

import { useMemo, useState } from 'react'

/**
 * App settings admin manager (Admin V2, Stage 9). Lists DB overrides grouped by
 * category, lets an owner add/edit/remove a setting. Values are stored as JSONB,
 * so the editor accepts raw JSON (number, string, boolean, object, array). The
 * bot reads the same table via `app.settings.dynamic` and picks up changes
 * within its cache TTL (~60s). Removing a key reverts to the code default.
 */

export type AdminSetting = {
  key: string
  value: unknown
  category: string
  description: string | null
  updated_by: string | null
  updated_at: string
}

const inputClass =
  'w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2'

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
      {msg.text}
    </p>
  )
}

export function SettingsManager({
  initialSettings,
  canManage,
}: {
  initialSettings: AdminSetting[]
  canManage: boolean
}) {
  const [settings, setSettings] = useState<AdminSetting[]>(initialSettings)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Add/edit form state.
  const [key, setKey] = useState('')
  const [category, setCategory] = useState('economy')
  const [description, setDescription] = useState('')
  const [valueText, setValueText] = useState('')

  const grouped = useMemo(() => {
    const m = new Map<string, AdminSetting[]>()
    for (const s of settings) {
      const list = m.get(s.category) ?? []
      list.push(s)
      m.set(s.category, list)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [settings])

  async function refresh() {
    const r = await fetch('/api/admin/settings')
    const d = r.ok ? await r.json() : { settings: [] }
    setSettings(Array.isArray(d.settings) ? d.settings : [])
  }

  async function save() {
    if (!canManage) return
    const trimmedKey = key.trim()
    if (!trimmedKey) {
      setMsg({ ok: false, text: 'Укажите ключ (например casino.max_bet).' })
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(valueText)
    } catch {
      setMsg({ ok: false, text: 'Значение должно быть валидным JSON (число, "строка", true/false, [], {}).' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: trimmedKey,
          value: parsed,
          category: category.trim() || 'general',
          description: description.trim() || null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'ошибка сохранения')
      setMsg({ ok: true, text: `Сохранено: ${trimmedKey}` })
      setKey('')
      setDescription('')
      setValueText('')
      await refresh()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'ошибка' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(k: string) {
    if (!canManage) return
    if (!confirm(`Удалить переопределение «${k}»? Бот вернётся к значению из кода.`)) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch(`/api/admin/settings?key=${encodeURIComponent(k)}`, {
        method: 'DELETE',
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'ошибка удаления')
      setMsg({ ok: true, text: `Удалено: ${k}` })
      await refresh()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'ошибка' })
    } finally {
      setBusy(false)
    }
  }

  function editInto(s: AdminSetting) {
    setKey(s.key)
    setCategory(s.category)
    setDescription(s.description ?? '')
    setValueText(JSON.stringify(s.value))
    setMsg(null)
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="glass rounded-2xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Добавить / изменить настройку
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Ключ</span>
              <input
                className={inputClass}
                placeholder="casino.max_bet"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Категория</span>
              <input
                className={inputClass}
                placeholder="economy"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-muted-foreground">
              Значение (JSON)
            </span>
            <input
              className={`${inputClass} font-mono`}
              placeholder='1000  или  "текст"  или  true'
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-muted-foreground">
              Описание (необязательно)
            </span>
            <input
              className={inputClass}
              placeholder="Максимальная ставка в казино"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Сохранить
          </button>
          <Feedback msg={msg} />
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Переопределений пока нет — бот использует значения из кода. Добавьте
          ключ выше, чтобы изменить параметр без деплоя.
        </div>
      ) : (
        grouped.map(([cat, rows]) => (
          <div key={cat} className="glass rounded-2xl border border-border p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {cat}
            </h2>
            <div className="space-y-2">
              {rows.map((s) => (
                <div
                  key={s.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white/[0.02] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm text-foreground">{s.key}</div>
                    {s.description && (
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    )}
                  </div>
                  <code className="rounded-lg bg-black/30 px-2 py-1 text-xs text-emerald-300">
                    {JSON.stringify(s.value)}
                  </code>
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editInto(s)}
                        className="rounded-lg border border-border px-3 py-1 text-xs text-foreground transition hover:bg-white/[0.06]"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(s.key)}
                        className="rounded-lg border border-destructive/40 px-3 py-1 text-xs text-destructive-foreground transition hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Сбросить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
