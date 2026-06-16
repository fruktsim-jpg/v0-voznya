'use client'

import { useMemo, useState } from 'react'
import { ItemArt } from '@/components/ds/item-art'
import type { Rarity } from '@/lib/rarity'
import { RARITY_ORDER } from '@/lib/rarity'
import type { ContentStatus } from '@/lib/admin/lifecycle'
import { CONTENT_STATUSES } from '@/lib/admin/lifecycle'
import { ITEM_CLASSES, FEATURED_SURFACES, itemBuilderSchema } from '@/lib/admin/schemas'
import {
  DataTable,
  AdminForm,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  Toggle,
  SubmitButton,
  AssetUpload,
  PublishControl,
  StatusPill,
  AdminModal,
  AuditTrail,
  Feedback,
  useAdminMutation,
} from '@/components/admin/kit'

/**
 * IA-2 Item Builder (client) — assembled 100% from the CC Foundation kit. The
 * success test: upload PNG → create item → assign collection/rarity/
 * availability/featured slot → publish, all without code. Two-step asset link:
 * if a file is chosen, it's uploaded to /api/admin/assets (code == item code)
 * and published, THEN the item is saved — so art and item land together.
 */

export type AdminItem = {
  code: string
  name: string
  description: string | null
  item_class: string
  rarity: string
  collection_code: string | null
  series_total: number | null
  is_limited: boolean
  max_supply: number | null
  transferable: boolean
  stackable: boolean
  status: string
  asset_code: string | null
  featured_slot: string | null
  available_from: string | null
  available_until: string | null
  updated_at: string
}

export type CollectionOption = { code: string; name: string }

const EMPTY = {
  code: '',
  name: '',
  description: '',
  itemClass: 'collectible',
  rarity: 'rare' as Rarity,
  collectionCode: '',
  newCollectionName: '',
  seriesTotal: '',
  isLimited: false,
  maxSupply: '',
  transferable: true,
  stackable: false,
  availableFrom: '',
  availableUntil: '',
  status: 'draft' as ContentStatus,
  featuredSlot: '',
}

const NONE = '—'
const NEW_COLLECTION = '__new__'

export function ItemBuilder({
  initialItems,
  collections,
  canManage,
  canPublish,
}: {
  initialItems: AdminItem[]
  collections: CollectionOption[]
  canManage: boolean
  canPublish: boolean
}) {
  const [items, setItems] = useState<AdminItem[]>(initialItems)
  const [form, setForm] = useState({ ...EMPTY })
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  // Catalog grows fastest of all admin lists — a name/code filter keeps it usable.
  const [query, setQuery] = useState('')

  const visibleItems = useMemo(() => {
    const s = query.trim().toLowerCase()
    if (!s) return items
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(s) ||
        it.code.toLowerCase().includes(s) ||
        it.item_class.toLowerCase().includes(s),
    )
  }, [items, query])
  const { run, busy, msg, setMsg } = useAdminMutation()

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function reload() {
    const d = await run<{ items: AdminItem[] }>('/api/admin/items', { method: 'GET' })
    if (d) setItems(Array.isArray(d.items) ? d.items : [])
  }

  function editItem(it: AdminItem) {
    setForm({
      code: it.code,
      name: it.name,
      description: it.description ?? '',
      itemClass: it.item_class,
      rarity: it.rarity as Rarity,
      collectionCode: it.collection_code ?? '',
      newCollectionName: '',
      seriesTotal: it.series_total == null ? '' : String(it.series_total),
      isLimited: it.is_limited,
      maxSupply: it.max_supply == null ? '' : String(it.max_supply),
      transferable: it.transferable,
      stackable: it.stackable,
      availableFrom: it.available_from ? it.available_from.slice(0, 16) : '',
      availableUntil: it.available_until ? it.available_until.slice(0, 16) : '',
      status: it.status as ContentStatus,
      featuredSlot: it.featured_slot ?? '',
    })
    setEditingCode(it.code)
    setFile(null)
    setMsg(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearForm() {
    setForm({ ...EMPTY })
    setEditingCode(null)
    setFile(null)
    setMsg(null)
  }

  function toIso(local: string): string | null {
    if (!local) return null
    const d = new Date(local)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  async function submit() {
    // Build the payload and validate client-side with the shared schema.
    // Workflow-first: on create, omit code (server auto-generates from name);
    // on edit, send the immutable code back.
    const usingNewCollection = form.collectionCode === NEW_COLLECTION
    const payload = {
      code: editingCode || undefined,
      name: form.name.trim(),
      description: form.description.trim() || null,
      itemClass: form.itemClass,
      rarity: form.rarity,
      collectionCode: usingNewCollection ? null : form.collectionCode || null,
      newCollectionName: usingNewCollection ? form.newCollectionName.trim() || null : null,
      seriesTotal: form.seriesTotal === '' ? null : Number(form.seriesTotal),
      isLimited: form.isLimited,
      maxSupply: form.maxSupply === '' ? null : Number(form.maxSupply),
      transferable: form.transferable,
      stackable: form.stackable,
      availableFrom: toIso(form.availableFrom),
      availableUntil: toIso(form.availableUntil),
      status: form.status,
      featuredSlot: form.featuredSlot || null,
    }
    const parsed = itemBuilderSchema.safeParse(payload)
    if (!parsed.success) {
      setMsg({ ok: false, text: parsed.error.issues[0].message })
      return
    }
    if (usingNewCollection && !form.newCollectionName.trim()) {
      setMsg({ ok: false, text: 'Введи название новой коллекции.' })
      return
    }

    // Step 1: save the item definition. The server resolves the final code
    // (auto-generated on create) and returns it so art can be attached to it.
    const d = await run<{ code: string; isUpdate: boolean }>('/api/admin/items', {
      method: 'POST',
      json: payload,
      success: editingCode ? 'Предмет обновлён.' : 'Предмет создан.',
    })
    if (!d) return

    // Step 2: if a new art file was chosen, upload + publish it under the
    // resolved item code so art and item stay together.
    if (file && d.code) {
      const fd = new FormData()
      fd.append('code', d.code)
      fd.append('file', file)
      const up = await run('/api/admin/assets', { method: 'POST', form: fd })
      if (up && canPublish) {
        await run('/api/admin/assets', {
          method: 'PATCH',
          json: { code: d.code, status: 'published' },
        })
      }
    }

    clearForm()
    reload()
  }

  async function transition(code: string, next: ContentStatus) {
    const d = await run('/api/admin/items', {
      method: 'PATCH',
      json: { code, status: next },
      success: `«${code}» → ${next}.`,
    })
    if (d) reload()
  }

  async function doDelete(code: string) {
    const d = await run(`/api/admin/items?code=${encodeURIComponent(code)}`, {
      method: 'DELETE',
      success: `«${code}» удалён.`,
    })
    setConfirmDelete(null)
    if (d) reload()
  }

  const collectionOptions = [
    { value: '', label: NONE },
    ...collections.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })),
    { value: NEW_COLLECTION, label: '+ Новая коллекция…' },
  ]
  const featuredOptions = [
    { value: '', label: NONE },
    ...FEATURED_SURFACES.map((s) => ({ value: s, label: s })),
  ]

  // Preview source: new file (handled by AssetUpload) or current published art.
  const existingSrc =
    editingCode && !file
      ? `/api/items/asset/${encodeURIComponent(editingCode)}?preview=1`
      : null

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="glass rounded-2xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {editingCode ? `Редактирование: ${editingCode}` : 'Новый предмет'}
            </h2>
            {editingCode && (
              <button
                onClick={clearForm}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                + Создать новый
              </button>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <AdminForm onSubmit={submit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Название" required hint="код сгенерируется автоматически">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Реликвия Утрехта" />
                </Field>
                <Field label="Код" hint={editingCode ? 'неизменяемый ключ' : 'создаётся из названия'}>
                  <TextInput
                    value={editingCode ?? '— сгенерируется —'}
                    onChange={() => {}}
                    mono
                    disabled
                  />
                </Field>
              </div>

              <Field label="Описание">
                <TextArea value={form.description} onChange={(v) => set('description', v)} rows={2} />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Класс">
                  <SelectInput
                    value={form.itemClass}
                    onChange={(v) => set('itemClass', v)}
                    options={ITEM_CLASSES}
                  />
                </Field>
                <Field label="Редкость">
                  <SelectInput
                    value={form.rarity}
                    onChange={(v) => set('rarity', v as Rarity)}
                    options={RARITY_ORDER}
                  />
                </Field>
                <Field label="Коллекция">
                  <SelectInput
                    value={form.collectionCode}
                    onChange={(v) => set('collectionCode', v)}
                    options={collectionOptions}
                  />
                </Field>
                {form.collectionCode === NEW_COLLECTION && (
                  <Field label="Название новой коллекции" required hint="код создастся автоматически">
                    <TextInput
                      value={form.newCollectionName}
                      onChange={(v) => set('newCollectionName', v)}
                      placeholder="Города Нидерландов"
                    />
                  </Field>
                )}
                <Field label="Слот «избранного»" hint="герой-поверхность (опц.)">
                  <SelectInput
                    value={form.featuredSlot}
                    onChange={(v) => set('featuredSlot', v)}
                    options={featuredOptions}
                  />
                </Field>
                <Field label="Доступен с" hint="для запланированных">
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 ring-primary/40"
                    value={form.availableFrom}
                    onChange={(e) => set('availableFrom', e.target.value)}
                  />
                </Field>
                <Field label="Доступен до" hint="для лимиток (опц.)">
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 ring-primary/40"
                    value={form.availableUntil}
                    onChange={(e) => set('availableUntil', e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-4 rounded-xl border border-white/5 bg-black/10 p-3">
                <Toggle checked={form.isLimited} onChange={(v) => set('isLimited', v)} label="Лимитированный" />
                <Toggle checked={form.transferable} onChange={(v) => set('transferable', v)} label="Передаваемый" />
                <Toggle checked={form.stackable} onChange={(v) => set('stackable', v)} label="Стакается" />
              </div>

              {form.isLimited && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Макс. тираж">
                    <TextInput value={form.maxSupply} onChange={(v) => set('maxSupply', v)} placeholder="100" />
                  </Field>
                  <Field label="Всего в серии">
                    <TextInput value={form.seriesTotal} onChange={(v) => set('seriesTotal', v)} placeholder="7" />
                  </Field>
                </div>
              )}

              <Field label="Статус жизненного цикла">
                <SelectInput
                  value={form.status}
                  onChange={(v) => set('status', v as ContentStatus)}
                  options={CONTENT_STATUSES.map((s) => ({ value: s, label: s }))}
                />
              </Field>

              <div className="flex items-center gap-3">
                <SubmitButton busy={busy}>{editingCode ? 'Сохранить' : 'Создать предмет'}</SubmitButton>
                <Feedback msg={msg} />
              </div>
            </AdminForm>

            <div className="space-y-3">
              <Field label="Арт предмета" hint="PNG/WebP — загрузится и опубликуется под кодом предмета">
                <AssetUpload
                  file={file}
                  onFile={setFile}
                  previewRarity={form.rarity}
                  existingSrc={existingSrc}
                />
              </Field>
              {editingCode && (
                <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">История</p>
                  <AuditTrail targetType="item" targetId={editingCode} limit={5} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DataTable<AdminItem>
        title="Предметы"
        rows={visibleItems}
        rowKey={(it) => it.code}
        empty={query.trim() ? 'Ничего не найдено по запросу.' : 'Пока нет предметов. Создай первый выше.'}
        toolbar={
          items.length > 6 ? (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, коду или классу…"
              className="w-full max-w-xs rounded-lg border border-border bg-white/[0.04] px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/40"
            />
          ) : undefined
        }
        leading={(it) => (
          <ItemArt
            src={
              it.asset_code
                ? `/api/items/asset/${encodeURIComponent(it.asset_code)}?preview=1`
                : undefined
            }
            rarity={it.rarity as Rarity}
            size="sm"
          />
        )}
        columns={[
          {
            key: 'name',
            header: 'Предмет',
            cell: (it) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => canManage && editItem(it)}
                  className="truncate text-sm text-foreground hover:underline"
                >
                  {it.name}
                </button>
                <StatusPill status={it.status} />
              </div>
            ),
          },
          {
            key: 'meta',
            header: 'Свойства',
            cell: (it) => (
              <span className="text-[11px] text-muted-foreground">
                <span className="font-mono">{it.code}</span> · {it.item_class} · {it.rarity}
                {it.collection_code ? ` · ${it.collection_code}` : ''}
                {it.featured_slot ? ` · ★${it.featured_slot}` : ''}
              </span>
            ),
          },
        ]}
        actions={(it) => (
          <>
            <PublishControl
              status={it.status as ContentStatus}
              canPublish={canPublish}
              busy={busy}
              onTransition={(next) => transition(it.code, next)}
              compact
            />
            {canManage && (
              <button
                onClick={() => setConfirmDelete(it.code)}
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
        title="Удалить предмет?"
        tone="danger"
        confirmLabel="Удалить"
        busy={busy}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
      >
        Определение «{confirmDelete}» будет удалено. Если предмет уже в инвентарях
        игроков, удаление заблокировано — используй «В архив».
      </AdminModal>
    </div>
  )
}
