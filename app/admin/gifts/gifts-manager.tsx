'use client'

import { useEffect, useState } from 'react'
import type { Rarity } from '@/lib/rarity'
import { RARITY_ORDER } from '@/lib/rarity'
import type { ContentStatus } from '@/lib/admin/lifecycle'
import { CONTENT_STATUSES } from '@/lib/admin/lifecycle'
import { FEATURED_SURFACES, giftStudioSchema } from '@/lib/admin/schemas'
import {
  DataTable,
  AdminForm,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  SubmitButton,
  AssetUpload,
  PublishControl,
  StatusPill,
  AdminModal,
  AuditTrail,
  Feedback,
  useAdminMutation,
} from '@/components/admin/kit'
import { ItemArt } from '@/components/ds/item-art'

/**
 * Gift Studio (client) — a gift is a FIRST-CLASS VISUAL OBJECT, not a price row.
 * One screen authors both the gift_catalog row (pricing/delivery) and its
 * inventory_items definition (art/rarity/collection/lifecycle/featured) under
 * one auto-generated code. Built from the CC Foundation kit. Purchase/economy
 * stays the bot's job (Model 2).
 */

export type AdminGift = {
  code: string
  name: string
  description: string | null
  star_cost: number
  price_eshki: number
  telegram_gift_id: string | null
  stock: number | null
  reserved: number
  sold_count: number
  is_active: boolean
  sort_order: number
  rarity: string | null
  collection_code: string | null
  status: string | null
  featured_slot: string | null
  available_from: string | null
  available_until: string | null
  has_art: boolean
}

export type GiftCollectionOption = { code: string; name: string }

const fmt = (n: number) => n.toLocaleString('ru-RU')
const STAR_TO_ESHKI = 10
const NONE = '—'
const NEW_COLLECTION = '__new__'

const EMPTY = {
  name: '',
  description: '',
  rarity: 'rare' as Rarity,
  starCost: '15',
  priceEshki: '180',
  telegramGiftId: '',
  stock: '',
  sortOrder: '100',
  collectionCode: '',
  newCollectionName: '',
  status: 'draft' as ContentStatus,
  featuredSlot: '',
}

export function GiftsManager({
  initialGifts,
  collections,
  canManage,
  canPublish,
}: {
  initialGifts: AdminGift[]
  collections: GiftCollectionOption[]
  canManage: boolean
  canPublish: boolean
}) {
  const [gifts, setGifts] = useState<AdminGift[]>(initialGifts)
  const [form, setForm] = useState({ ...EMPTY })
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { run, busy, msg, setMsg } = useAdminMutation()

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function reload() {
    const d = await run<{ gifts: AdminGift[] }>('/api/admin/gifts', { method: 'GET' })
    if (d) setGifts(Array.isArray(d.gifts) ? d.gifts : [])
  }

  function edit(g: AdminGift) {
    setForm({
      name: g.name,
      description: g.description ?? '',
      rarity: (g.rarity as Rarity) ?? 'rare',
      starCost: String(g.star_cost),
      priceEshki: String(g.price_eshki),
      telegramGiftId: g.telegram_gift_id ?? '',
      stock: g.stock == null ? '' : String(g.stock),
      sortOrder: String(g.sort_order),
      collectionCode: g.collection_code ?? '',
      newCollectionName: '',
      // Legacy gifts (gift_catalog seed, no authored inventory_items row) have a
      // NULL status. Defaulting to 'draft' would HIDE a currently-live gift on
      // the next save (shop lifecycle gate). Seed from its real shop visibility:
      // active legacy gift → 'published', so editing/replacing art never hides it.
      status: (g.status as ContentStatus) ?? (g.is_active ? 'published' : 'draft'),
      featuredSlot: g.featured_slot ?? '',
    })
    setEditingCode(g.code)
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
    const usingNew = form.collectionCode === NEW_COLLECTION
    const payload = {
      code: editingCode || undefined,
      name: form.name.trim(),
      description: form.description.trim() || null,
      rarity: form.rarity,
      starCost: Number(form.starCost),
      priceEshki: Number(form.priceEshki),
      telegramGiftId: form.telegramGiftId.trim() || null,
      stock: form.stock.trim() === '' ? null : Number(form.stock),
      sortOrder: Number(form.sortOrder) || 100,
      collectionCode: usingNew ? null : form.collectionCode || null,
      newCollectionName: usingNew ? form.newCollectionName.trim() || null : null,
      availableFrom: null as string | null,
      availableUntil: null as string | null,
      status: form.status,
      featuredSlot: form.featuredSlot || null,
    }
    const parsed = giftStudioSchema.safeParse(payload)
    if (!parsed.success) {
      setMsg({ ok: false, text: parsed.error.issues[0].message })
      return
    }
    if (usingNew && !form.newCollectionName.trim()) {
      setMsg({ ok: false, text: 'Введи название новой коллекции.' })
      return
    }

    // Step 1: author the gift (catalog + visual definition). Server returns code.
    const d = await run<{ code: string; belowCost: boolean }>('/api/admin/gifts', {
      method: 'POST',
      json: payload,
      success: editingCode ? 'Подарок обновлён.' : 'Подарок создан.',
    })
    if (!d) return
    if (d.belowCost) setMsg({ ok: true, text: 'Сохранено. ⚠️ цена ниже себестоимости в звёздах.' })

    // Step 2: attach art under the resolved code (shared-art model).
    if (file && d.code) {
      const fd = new FormData()
      fd.append('code', d.code)
      fd.append('file', file)
      const up = await run('/api/admin/assets', { method: 'POST', form: fd })
      if (up && canPublish) {
        await run('/api/admin/assets', { method: 'PATCH', json: { code: d.code, status: 'published' } })
      }
    }

    clearForm()
    reload()
  }

  async function transition(code: string, next: ContentStatus) {
    // Move the gift's visual definition through the lifecycle (keeps is_active synced).
    const d = await run('/api/admin/items', {
      method: 'PATCH',
      json: { code, status: next },
      success: `«${code}» → ${next}.`,
    })
    if (d) reload()
  }

  async function doDelete(code: string) {
    const d = await run(`/api/admin/gifts?code=${encodeURIComponent(code)}`, {
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

  const starCostNum = Number(form.starCost) || 0
  const priceNum = Number(form.priceEshki) || 0
  const suggested = starCostNum * STAR_TO_ESHKI
  const marginPct = suggested > 0 ? Math.round(((priceNum - suggested) / suggested) * 100) : 0

  const existingSrc =
    editingCode && !file ? `/api/items/asset/${encodeURIComponent(editingCode)}?preview=1` : null

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="glass rounded-2xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {editingCode ? `Редактирование: ${form.name || editingCode}` : 'Новый подарок'}
            </h2>
            {editingCode && (
              <button onClick={clearForm} className="text-xs text-muted-foreground hover:underline">
                + Создать новый
              </button>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <AdminForm onSubmit={submit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Название" required hint="код сгенерируется автоматически">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Сердечко" />
                </Field>
                <Field label="Код" hint={editingCode ? 'неизменяемый' : 'из названия'}>
                  <TextInput value={editingCode ?? '— сгенерируется —'} onChange={() => {}} mono disabled />
                </Field>
              </div>

              <Field label="Описание">
                <TextArea value={form.description} onChange={(v) => set('description', v)} rows={2} />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Редкость">
                  <SelectInput value={form.rarity} onChange={(v) => set('rarity', v as Rarity)} options={RARITY_ORDER} />
                </Field>
                <Field label="Коллекция">
                  <SelectInput value={form.collectionCode} onChange={(v) => set('collectionCode', v)} options={collectionOptions} />
                </Field>
                {form.collectionCode === NEW_COLLECTION && (
                  <Field label="Название новой коллекции" required hint="код создастся автоматически">
                    <TextInput value={form.newCollectionName} onChange={(v) => set('newCollectionName', v)} placeholder="Праздничные" />
                  </Field>
                )}
                <Field label="Слот «избранного»" hint="герой-поверхность (опц.)">
                  <SelectInput value={form.featuredSlot} onChange={(v) => set('featuredSlot', v)} options={featuredOptions} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Себест. ★">
                  <TextInput value={form.starCost} onChange={(v) => set('starCost', v)} />
                </Field>
                <Field label="Цена, ешки">
                  <TextInput value={form.priceEshki} onChange={(v) => set('priceEshki', v)} />
                </Field>
                <Field label="Запас" hint="∞ пусто">
                  <TextInput value={form.stock} onChange={(v) => set('stock', v)} />
                </Field>
                <Field label="Сортировка">
                  <TextInput value={form.sortOrder} onChange={(v) => set('sortOrder', v)} />
                </Field>
              </div>

              <Field label="Telegram Gift ID" hint="для будущей выдачи (опц.)">
                <TextInput value={form.telegramGiftId} onChange={(v) => set('telegramGiftId', v)} mono />
              </Field>

              <Field label="Статус жизненного цикла">
                <SelectInput
                  value={form.status}
                  onChange={(v) => set('status', v as ContentStatus)}
                  options={CONTENT_STATUSES.map((s) => ({ value: s, label: s }))}
                />
              </Field>

              <p className="text-[11px] text-muted-foreground">
                Ориентир цены: {fmt(suggested)} ешек (1★≈10).{' '}
                <span className={marginPct < 0 ? 'text-destructive-foreground' : 'text-emerald-300'}>
                  наценка {marginPct >= 0 ? '+' : ''}
                  {marginPct}%
                </span>
              </p>

              <div className="flex items-center gap-3">
                <SubmitButton busy={busy}>{editingCode ? 'Сохранить' : 'Создать подарок'}</SubmitButton>
                <Feedback msg={msg} />
              </div>
            </AdminForm>

            <div className="space-y-3">
              <Field label="Арт подарка" hint="PNG/WebP — загрузится и опубликуется под кодом подарка">
                <AssetUpload file={file} onFile={setFile} previewRarity={form.rarity} existingSrc={existingSrc} />
              </Field>
              {editingCode && (
                <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">История</p>
                  <AuditTrail targetType="gift" targetId={editingCode} limit={5} />
                </div>
              )}
              {editingCode && <GiftStats code={editingCode} />}
            </div>
          </div>
        </div>
      )}

      <DataTable<AdminGift>
        title="Подарки"
        rows={gifts}
        rowKey={(g) => g.code}
        empty="Подарков пока нет. Создай первый выше."
        leading={(g) => (
          <ItemArt
            src={g.has_art ? `/api/items/asset/${encodeURIComponent(g.code)}?preview=1` : undefined}
            rarity={(g.rarity as Rarity) ?? 'rare'}
            size="sm"
          />
        )}
        columns={[
          {
            key: 'name',
            header: 'Подарок',
            cell: (g) => (
              <div className="flex items-center gap-2">
                <button onClick={() => canManage && edit(g)} className="truncate text-sm text-foreground hover:underline">
                  {g.name}
                </button>
                {g.status ? <StatusPill status={g.status} /> : !g.is_active && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">выкл</span>
                )}
              </div>
            ),
          },
          {
            key: 'meta',
            header: 'Свойства',
            cell: (g) => (
              <span className="text-[11px] text-muted-foreground">
                <span className="font-mono">{g.code}</span> · {fmt(g.price_eshki)} еш · {g.star_cost}★
                {g.rarity ? ` · ${g.rarity}` : ''}
                {g.collection_code ? ` · ${g.collection_code}` : ''}
                {g.featured_slot ? ` · ★${g.featured_slot}` : ''}
                {g.sold_count > 0 ? ` · продано ${g.sold_count}` : ''}
              </span>
            ),
          },
        ]}
        actions={(g) => (
          <>
            {g.status && (
              <PublishControl
                status={g.status as ContentStatus}
                canPublish={canPublish}
                busy={busy}
                onTransition={(next) => transition(g.code, next)}
                compact
              />
            )}
            {canManage && (
              <button
                onClick={() => setConfirmDelete(g.code)}
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
        title="Удалить подарок?"
        tone="danger"
        confirmLabel="Удалить"
        busy={busy}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
      >
        Подарок «{confirmDelete}» будет удалён из каталога. Если он уже в
        инвентарях игроков, визуальное определение сохранится — используй «В архив».
      </AdminModal>
    </div>
  )
}

type GiftStatsData = {
  purchases: number
  refunds: number
  revenueEshki: number
  delivery: { completed: number; pending: number; cancelled: number }
  starsRealized: number
  marginEshki: number
  inInventories: { holders: number; quantity: number }
  droppedByCases: number
}

/** Object-local gift analytics (read-only) shown when editing a gift. */
function GiftStats({ code }: { code: string }) {
  const [data, setData] = useState<GiftStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/admin/gifts/${encodeURIComponent(code)}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [code])

  return (
    <div className="rounded-xl border border-white/5 bg-black/10 p-3">
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Статистика объекта</p>
      {loading ? (
        <p className="text-[11px] text-muted-foreground">Загрузка…</p>
      ) : !data ? (
        <p className="text-[11px] text-muted-foreground">Нет данных.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Куплено" value={fmt(data.purchases)} />
          <Stat label="Выручка" value={`${fmt(data.revenueEshki)} еш`} />
          <Stat label="В инвентарях" value={`${fmt(data.inInventories.quantity)} (${fmt(data.inInventories.holders)})`} />
          <Stat label="Выдано (Telegram)" value={fmt(data.delivery.completed)} />
          <Stat label="В очереди" value={fmt(data.delivery.pending)} />
          <Stat label="Возвраты" value={fmt(data.refunds)} />
          <Stat label="Маржа" value={`${fmt(data.marginEshki)} еш`} className={data.marginEshki >= 0 ? 'text-emerald-300' : 'text-destructive-foreground'} />
          <Stat label="В кейсах" value={fmt(data.droppedByCases)} />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${className ?? 'text-foreground'}`}>{value}</div>
    </div>
  )
}

