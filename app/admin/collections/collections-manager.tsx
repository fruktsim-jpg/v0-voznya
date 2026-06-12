'use client'

import { useState } from 'react'
import type { ContentStatus } from '@/lib/admin/lifecycle'
import { CONTENT_STATUSES } from '@/lib/admin/lifecycle'
import { collectionSchema } from '@/lib/admin/schemas'
import {
  DataTable,
  AdminForm,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  SubmitButton,
  PublishControl,
  StatusPill,
  AdminModal,
  Feedback,
  useAdminMutation,
} from '@/components/admin/kit'

/** Collections manager — kit-based (Collections Foundation). */

export type AdminCollection = {
  code: string
  name: string
  description: string | null
  kind: string
  season_code: string | null
  sort_order: number
  status: string
  item_count: number
}

const KINDS = [
  { value: 'permanent', label: 'Постоянная' },
  { value: 'seasonal', label: 'Сезонная' },
  { value: 'event', label: 'Событийная' },
]

const EMPTY = {
  code: '',
  name: '',
  description: '',
  kind: 'permanent',
  seasonCode: '',
  sortOrder: '100',
  status: 'draft' as ContentStatus,
}

export function CollectionsManager({
  initialCollections,
  canManage,
  canPublish,
}: {
  initialCollections: AdminCollection[]
  canManage: boolean
  canPublish: boolean
}) {
  const [collections, setCollections] = useState<AdminCollection[]>(initialCollections)
  const [form, setForm] = useState({ ...EMPTY })
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { run, busy, msg, setMsg } = useAdminMutation()

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function reload() {
    const d = await run<{ collections: AdminCollection[] }>('/api/admin/collections', { method: 'GET' })
    if (d) setCollections(Array.isArray(d.collections) ? d.collections : [])
  }

  function edit(c: AdminCollection) {
    setForm({
      code: c.code,
      name: c.name,
      description: c.description ?? '',
      kind: c.kind,
      seasonCode: c.season_code ?? '',
      sortOrder: String(c.sort_order),
      status: c.status as ContentStatus,
    })
    setEditing(true)
    setMsg(null)
  }

  function clearForm() {
    setForm({ ...EMPTY })
    setEditing(false)
    setMsg(null)
  }

  async function submit() {
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      kind: form.kind,
      seasonCode: form.seasonCode || null,
      sortOrder: Number(form.sortOrder) || 100,
      status: form.status,
    }
    const parsed = collectionSchema.safeParse(payload)
    if (!parsed.success) {
      setMsg({ ok: false, text: parsed.error.issues[0].message })
      return
    }
    const d = await run('/api/admin/collections', {
      method: 'POST',
      json: payload,
      success: editing ? 'Коллекция обновлена.' : 'Коллекция создана.',
    })
    if (d) {
      clearForm()
      reload()
    }
  }

  async function transition(code: string, next: ContentStatus) {
    const d = await run('/api/admin/collections', {
      method: 'PATCH',
      json: { code, status: next },
      success: `«${code}» → ${next}.`,
    })
    if (d) reload()
  }

  async function doDelete(code: string) {
    const d = await run(`/api/admin/collections?code=${encodeURIComponent(code)}`, {
      method: 'DELETE',
      success: `«${code}» удалена.`,
    })
    setConfirmDelete(null)
    if (d) reload()
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="glass rounded-2xl border border-border p-4">
          <AdminForm onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Код" required>
                <TextInput value={form.code} onChange={(v) => set('code', v)} placeholder="cities_nl" mono disabled={editing} />
              </Field>
              <Field label="Название" required>
                <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Города Нидерландов" />
              </Field>
            </div>
            <Field label="Описание">
              <TextArea value={form.description} onChange={(v) => set('description', v)} rows={2} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Тип">
                <SelectInput value={form.kind} onChange={(v) => set('kind', v)} options={KINDS} />
              </Field>
              <Field label="Сезон" hint="для сезонных (опц.)">
                <TextInput value={form.seasonCode} onChange={(v) => set('seasonCode', v)} placeholder="s1" mono />
              </Field>
              <Field label="Порядок">
                <TextInput value={form.sortOrder} onChange={(v) => set('sortOrder', v)} />
              </Field>
            </div>
            <Field label="Статус">
              <SelectInput
                value={form.status}
                onChange={(v) => set('status', v as ContentStatus)}
                options={CONTENT_STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </Field>
            <div className="flex items-center gap-3">
              <SubmitButton busy={busy}>{editing ? 'Сохранить' : 'Создать'}</SubmitButton>
              {editing && (
                <button type="button" onClick={clearForm} className="text-xs text-muted-foreground hover:underline">
                  Новая коллекция
                </button>
              )}
              <Feedback msg={msg} />
            </div>
          </AdminForm>
        </div>
      )}

      <DataTable<AdminCollection>
        title="Коллекции"
        rows={collections}
        rowKey={(c) => c.code}
        empty="Пока нет коллекций."
        columns={[
          {
            key: 'name',
            header: 'Коллекция',
            cell: (c) => (
              <div className="flex items-center gap-2">
                <button onClick={() => canManage && edit(c)} className="text-sm text-foreground hover:underline">
                  {c.name}
                </button>
                <StatusPill status={c.status} />
              </div>
            ),
          },
          {
            key: 'meta',
            header: 'Свойства',
            cell: (c) => (
              <span className="text-[11px] text-muted-foreground">
                <span className="font-mono">{c.code}</span> · {c.kind} · {c.item_count} предметов
              </span>
            ),
          },
        ]}
        actions={(c) => (
          <>
            <PublishControl
              status={c.status as ContentStatus}
              canPublish={canPublish}
              busy={busy}
              onTransition={(next) => transition(c.code, next)}
              compact
            />
            {canManage && (
              <button
                onClick={() => setConfirmDelete(c.code)}
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
        title="Удалить коллекцию?"
        tone="danger"
        confirmLabel="Удалить"
        busy={busy}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
      >
        Коллекция «{confirmDelete}» будет удалена. Если в ней есть предметы,
        удаление заблокировано.
      </AdminModal>
    </div>
  )
}
