'use client'

import { useState } from 'react'
import type { ContentStatus } from '@/lib/admin/lifecycle'
import { CONTENT_STATUSES } from '@/lib/admin/lifecycle'
import { FEATURED_SURFACES, featuredSlotSchema } from '@/lib/admin/schemas'
import {
  DataTable,
  AdminForm,
  Field,
  TextInput,
  SelectInput,
  SubmitButton,
  PublishControl,
  StatusPill,
  AdminModal,
  Feedback,
  useAdminMutation,
} from '@/components/admin/kit'

/** Featured Slots manager — kit-based (Featured Slots, one engine many surfaces). */

export type AdminFeaturedSlot = {
  id: number
  surface: string
  ref_type: string
  ref_code: string
  title: string | null
  subtitle: string | null
  priority: number
  status: string
  available_from: string | null
  available_until: string | null
}

const REF_TYPES = [
  { value: 'item', label: 'Предмет' },
  { value: 'case', label: 'Кейс' },
  { value: 'collection', label: 'Коллекция' },
  { value: 'gift', label: 'Подарок' },
]

const EMPTY = {
  surface: 'HOME_HERO',
  refType: 'item',
  refCode: '',
  title: '',
  subtitle: '',
  priority: '100',
  status: 'draft' as ContentStatus,
}

export function FeaturedManager({
  initialSlots,
  canManage,
  canPublish,
}: {
  initialSlots: AdminFeaturedSlot[]
  canManage: boolean
  canPublish: boolean
}) {
  const [slots, setSlots] = useState<AdminFeaturedSlot[]>(initialSlots)
  const [form, setForm] = useState({ ...EMPTY })
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const { run, busy, msg, setMsg } = useAdminMutation()

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function reload() {
    const d = await run<{ slots: AdminFeaturedSlot[] }>('/api/admin/featured', { method: 'GET' })
    if (d) setSlots(Array.isArray(d.slots) ? d.slots : [])
  }

  async function submit() {
    const payload = {
      surface: form.surface,
      refType: form.refType,
      refCode: form.refCode.trim(),
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      priority: Number(form.priority) || 100,
      status: form.status,
      availableFrom: null,
      availableUntil: null,
    }
    const parsed = featuredSlotSchema.safeParse(payload)
    if (!parsed.success) {
      setMsg({ ok: false, text: parsed.error.issues[0].message })
      return
    }
    const d = await run('/api/admin/featured', {
      method: 'POST',
      json: payload,
      success: 'Слот создан.',
    })
    if (d) {
      setForm({ ...EMPTY })
      reload()
    }
  }

  async function transition(id: number, next: ContentStatus) {
    const d = await run('/api/admin/featured', {
      method: 'PATCH',
      json: { id, status: next },
      success: `Слот #${id} → ${next}.`,
    })
    if (d) reload()
  }

  async function doDelete(id: number) {
    const d = await run(`/api/admin/featured?id=${id}`, {
      method: 'DELETE',
      success: `Слот #${id} удалён.`,
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
              <Field label="Поверхность" required>
                <SelectInput value={form.surface} onChange={(v) => set('surface', v)} options={FEATURED_SURFACES} />
              </Field>
              <Field label="Тип ссылки" required>
                <SelectInput value={form.refType} onChange={(v) => set('refType', v)} options={REF_TYPES} />
              </Field>
              <Field label="Код цели" required hint="код предмета/кейса/коллекции">
                <TextInput value={form.refCode} onChange={(v) => set('refCode', v)} placeholder="relic_utrecht" mono />
              </Field>
              <Field label="Приоритет" hint="меньше = выше">
                <TextInput value={form.priority} onChange={(v) => set('priority', v)} />
              </Field>
              <Field label="Заголовок оверлея" hint="опц.">
                <TextInput value={form.title} onChange={(v) => set('title', v)} />
              </Field>
              <Field label="Подзаголовок" hint="опц.">
                <TextInput value={form.subtitle} onChange={(v) => set('subtitle', v)} />
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
              <SubmitButton busy={busy}>Создать слот</SubmitButton>
              <Feedback msg={msg} />
            </div>
          </AdminForm>
        </div>
      )}

      <DataTable<AdminFeaturedSlot>
        title="Слоты"
        rows={slots}
        rowKey={(s) => String(s.id)}
        empty="Пока нет слотов. Создай первый герой выше."
        columns={[
          {
            key: 'surface',
            header: 'Поверхность',
            cell: (s) => (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-foreground">{s.surface}</span>
                <StatusPill status={s.status} />
              </div>
            ),
          },
          {
            key: 'ref',
            header: 'Цель',
            cell: (s) => (
              <span className="text-[11px] text-muted-foreground">
                {s.ref_type}:<span className="font-mono"> {s.ref_code}</span> · prio {s.priority}
                {s.title ? ` · «${s.title}»` : ''}
              </span>
            ),
          },
        ]}
        actions={(s) => (
          <>
            <PublishControl
              status={s.status as ContentStatus}
              canPublish={canPublish}
              busy={busy}
              onTransition={(next) => transition(s.id, next)}
              compact
            />
            {canManage && (
              <button
                onClick={() => setConfirmDelete(s.id)}
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
        title="Удалить слот?"
        tone="danger"
        confirmLabel="Удалить"
        busy={busy}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete !== null && doDelete(confirmDelete)}
      >
        Слот #{confirmDelete} будет удалён с поверхности.
      </AdminModal>
    </div>
  )
}
