'use client'

import { useRef, useState } from 'react'
import { ItemArt } from '@/components/ds/item-art'
import type { Rarity } from '@/lib/rarity'

/**
 * Asset Studio manager (client, IA-1). Upload → preview → publish lifecycle for
 * item art. Every mutation hits /api/admin/assets (re-checks perms, writes
 * audit). Preview renders through the REAL <ItemArt> (legacy `src` mode, since a
 * draft isn't in the published manifest yet), so what you see is what ships.
 *
 * NOTE: this is intentionally self-contained. CC Foundation (next milestone)
 * will extract the table/form/upload/publish/feedback patterns proven here into
 * a shared admin kit so the next editor isn't a hand copy.
 */

export type AdminAsset = {
  code: string
  mime: string
  width: number | null
  height: number | null
  byte_size: number
  status: string
  version: number
  updated_at: string
}

const inputClass =
  'w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2'

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'published'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : status === 'retired'
        ? 'bg-white/[0.04] text-muted-foreground border-white/10'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  const label = status === 'published' ? 'Опубликован' : status === 'retired' ? 'Снят' : 'Черновик'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {label}
    </span>
  )
}

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
      {msg.text}
    </p>
  )
}

export function AssetsManager({
  initialAssets,
  canManage,
  canPublish,
}: {
  initialAssets: AdminAsset[]
  canManage: boolean
  canPublish: boolean
}) {
  const [assets, setAssets] = useState<AdminAsset[]>(initialAssets)
  const [code, setCode] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [previewRarity, setPreviewRarity] = useState<Rarity>('legendary')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function reload() {
    const res = await fetch('/api/admin/assets')
    if (res.ok) {
      const d = await res.json()
      setAssets(Array.isArray(d.assets) ? d.assets : [])
    }
  }

  function pickFile(f: File | null) {
    setFile(f)
    setMsg(null)
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalPreview(f ? URL.createObjectURL(f) : null)
  }

  async function upload() {
    const c = code.trim()
    if (!/^[a-z0-9_]+$/i.test(c)) {
      setMsg({ ok: false, text: 'Код: только латиница, цифры и _' })
      return
    }
    if (!file) {
      setMsg({ ok: false, text: 'Выбери PNG или WebP файл.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('code', c)
      fd.append('file', file)
      const res = await fetch('/api/admin/assets', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
      setMsg({
        ok: true,
        text: `Загружено как черновик (v${data.version}${
          data.width ? `, ${data.width}×${data.height}` : ''
        }). Опубликуй, чтобы показать везде.`,
      })
      setCode('')
      pickFile(null)
      if (fileRef.current) fileRef.current.value = ''
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(assetCode: string, status: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: assetCode, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setMsg({ ok: true, text: `«${assetCode}» → ${status}.` })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(assetCode: string) {
    if (!confirm(`Удалить арт «${assetCode}»? Предмет вернётся к глифу-заглушке.`)) return
    setBusy(true)
    try {
      await fetch(`/api/admin/assets?code=${encodeURIComponent(assetCode)}`, {
        method: 'DELETE',
      })
      setMsg({ ok: true, text: `«${assetCode}» удалён.` })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload + live preview */}
      {canManage && (
        <div className="glass grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Код предмета</label>
              <input
                className={inputClass}
                placeholder="например relic_zwolle"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Файл (PNG / WebP, до 2 МБ)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/webp"
                className={inputClass}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Редкость превью (только для просмотра капсулы)
              </label>
              <select
                className={inputClass}
                value={previewRarity}
                onChange={(e) => setPreviewRarity(e.target.value as Rarity)}
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={upload}
              disabled={busy}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Загрузка…' : 'Загрузить черновик'}
            </button>
            <Feedback msg={msg} />
          </div>

          {/* Live preview through the real ItemArt capsule */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-black/20 p-4">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Превью
            </span>
            <ItemArt
              src={localPreview ?? undefined}
              rarity={previewRarity}
              size="xl"
            />
            <span className="text-[11px] text-muted-foreground">
              как в кейсах / магазине
            </span>
          </div>
        </div>
      )}

      {/* Asset list */}
      <div className="glass overflow-hidden rounded-2xl border border-border">
        <div className="border-b border-white/5 px-4 py-2 text-xs font-medium text-muted-foreground">
          Загруженный арт ({assets.length})
        </div>
        {assets.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Пока ничего не загружено. Первый арт появится здесь.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {assets.map((a) => (
              <li key={a.code} className="flex items-center gap-3 px-4 py-3">
                <ItemArt
                  src={`/api/items/asset/${encodeURIComponent(a.code)}?preview=1&v=${a.version}`}
                  rarity="rare"
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm text-foreground">{a.code}</span>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.mime.replace('image/', '').toUpperCase()}
                    {a.width ? ` · ${a.width}×${a.height}` : ''} · {kb(a.byte_size)} · v{a.version}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {canPublish && a.status !== 'published' && (
                    <button
                      onClick={() => setStatus(a.code, 'published')}
                      disabled={busy}
                      className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      Опубликовать
                    </button>
                  )}
                  {canPublish && a.status === 'published' && (
                    <button
                      onClick={() => setStatus(a.code, 'retired')}
                      disabled={busy}
                      className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      Снять
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => remove(a.code)}
                      disabled={busy}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-destructive-foreground/80 transition hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
