'use client'

import { useState } from 'react'
import { ItemArt } from '@/components/ds/item-art'
import type { Rarity } from '@/lib/rarity'
import type { ContentStatus } from '@/lib/admin/lifecycle'
import { codeSchema } from '@/lib/admin/schemas'
import {
  DataTable,
  AdminForm,
  Field,
  TextInput,
  SelectInput,
  SubmitButton,
  AssetUpload,
  PublishControl,
  StatusPill,
  AdminModal,
  Feedback,
  useAdminMutation,
} from '@/components/admin/kit'

/**
 * Asset Studio manager (client) — REBUILT on the CC Foundation kit (IA-1 → CC
 * Foundation proof of reuse). Same behavior as before, now assembled entirely
 * from shared primitives: AssetUpload + DataTable + PublishControl + StatusPill
 * + AdminForm + AdminModal + useAdminMutation. This is the test that the kit is
 * real — the next editor (IA-2) is built the same way, not hand-copied.
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

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`

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
  const [previewRarity, setPreviewRarity] = useState<Rarity>('legendary')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { run, busy, msg, setMsg } = useAdminMutation()

  async function reload() {
    const d = await run<{ assets: AdminAsset[] }>('/api/admin/assets', { method: 'GET' })
    if (d) setAssets(Array.isArray(d.assets) ? d.assets : [])
  }

  async function upload() {
    const parsed = codeSchema.safeParse(code)
    if (!parsed.success) {
      setMsg({ ok: false, text: parsed.error.issues[0].message })
      return
    }
    if (!file) {
      setMsg({ ok: false, text: 'Выбери PNG или WebP файл.' })
      return
    }
    const fd = new FormData()
    fd.append('code', parsed.data)
    fd.append('file', file)
    const d = await run<{ version: number; width: number | null; height: number | null }>(
      '/api/admin/assets',
      { method: 'POST', form: fd },
    )
    if (d) {
      setMsg({
        ok: true,
        text: `Загружено как черновик (v${d.version}${d.width ? `, ${d.width}×${d.height}` : ''}). Опубликуй, чтобы показать везде.`,
      })
      setCode('')
      setFile(null)
      reload()
    }
  }

  async function transition(assetCode: string, next: ContentStatus) {
    const d = await run('/api/admin/assets', {
      method: 'PATCH',
      json: { code: assetCode, status: next },
      success: `«${assetCode}» → ${next}.`,
    })
    if (d) reload()
  }

  async function doDelete(assetCode: string) {
    const d = await run(`/api/admin/assets?code=${encodeURIComponent(assetCode)}`, {
      method: 'DELETE',
      success: `«${assetCode}» удалён.`,
    })
    setConfirmDelete(null)
    if (d) reload()
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="glass rounded-2xl border border-border p-4">
          <AdminForm onSubmit={upload}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <Field label="Код предмета" required hint="например relic_zwolle">
                  <TextInput value={code} onChange={setCode} placeholder="relic_zwolle" mono />
                </Field>
                <Field label="Редкость превью" hint="только для просмотра капсулы">
                  <SelectInput
                    value={previewRarity}
                    onChange={(v) => setPreviewRarity(v as Rarity)}
                    options={RARITIES}
                  />
                </Field>
                <SubmitButton busy={busy}>Загрузить черновик</SubmitButton>
                <Feedback msg={msg} />
              </div>
              <AssetUpload
                file={file}
                onFile={setFile}
                previewRarity={previewRarity}
              />
            </div>
          </AdminForm>
        </div>
      )}

      <DataTable<AdminAsset>
        title="Загруженный арт"
        rows={assets}
        rowKey={(a) => a.code}
        empty="Пока ничего не загружено. Первый арт появится здесь."
        leading={(a) => (
          <ItemArt
            src={`/api/items/asset/${encodeURIComponent(a.code)}?preview=1&v=${a.version}`}
            rarity="rare"
            size="sm"
          />
        )}
        columns={[
          {
            key: 'code',
            header: 'Код',
            cell: (a) => (
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-sm text-foreground">{a.code}</span>
                <StatusPill status={a.status} />
              </div>
            ),
          },
          {
            key: 'meta',
            header: 'Файл',
            cell: (a) => (
              <span className="text-[11px] text-muted-foreground">
                {a.mime.replace('image/', '').toUpperCase()}
                {a.width ? ` · ${a.width}×${a.height}` : ''} · {kb(a.byte_size)} · v{a.version}
              </span>
            ),
          },
        ]}
        actions={(a) => (
          <>
            <PublishControl
              status={a.status as ContentStatus}
              canPublish={canPublish}
              busy={busy}
              onTransition={(next) => transition(a.code, next)}
              compact
            />
            {canManage && (
              <button
                onClick={() => setConfirmDelete(a.code)}
                disabled={busy}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-destructive-foreground/80 transition hover:bg-destructive/10 disabled:opacity-50"
              >
                Удалить
              </button>
            )}
          </>
        )}
      />

      <AdminModal
        open={confirmDelete !== null}
        title="Удалить арт?"
        tone="danger"
        confirmLabel="Удалить"
        busy={busy}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
      >
        Арт «{confirmDelete}» будет удалён. Предмет вернётся к глифу-заглушке.
      </AdminModal>
    </div>
  )
}
