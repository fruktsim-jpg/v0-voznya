'use client'

import { useState } from 'react'

/**
 * Gift catalog admin manager (client). Lists catalog rows and lets an admin
 * create/edit/delete a gift. Every mutation calls /api/admin/gifts (re-checks
 * gift.manage, writes audit). Stage 1: assortment + pricing only — no purchase
 * flow, no Telegram delivery. Shows a live margin hint (1★ ≈ 10 ешек).
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
}

const inputClass =
  'w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2'

const fmt = (n: number) => n.toLocaleString('ru-RU')
const STAR_TO_ESHKI = 10

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
      {msg.text}
    </p>
  )
}

const EMPTY = {
  code: '',
  name: '',
  description: '',
  starCost: '15',
  priceEshki: '180',
  telegramGiftId: '',
  stock: '',
  isActive: true,
  sortOrder: '100',
}

export function GiftsManager({
  initialGifts,
  canManage,
}: {
  initialGifts: AdminGift[]
  canManage: boolean
}) {
  const [gifts, setGifts] = useState<AdminGift[]>(initialGifts)
  const [form, setForm] = useState({ ...EMPTY })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // P0-2: явный режим редактирования (код подарка, который правим).
  const [editingCode, setEditingCode] = useState<string | null>(null)

  async function reload() {
    const res = await fetch('/api/admin/gifts')
    if (res.ok) {
      const d = await res.json()
      setGifts(Array.isArray(d.gifts) ? d.gifts : [])
    }
  }

  function edit(g: AdminGift) {
    setForm({
      code: g.code,
      name: g.name,
      description: g.description ?? '',
      starCost: String(g.star_cost),
      priceEshki: String(g.price_eshki),
      telegramGiftId: g.telegram_gift_id ?? '',
      stock: g.stock == null ? '' : String(g.stock),
      isActive: g.is_active,
      sortOrder: String(g.sort_order),
    })
    setEditingCode(g.code)
    setMsg(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearForm() {
    setForm({ ...EMPTY })
    setEditingCode(null)
    setMsg(null)
  }


  async function submit() {
    if (!form.code.trim() || !form.name.trim()) {
      setMsg({ ok: false, text: 'Укажи код и название.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          starCost: Number(form.starCost),
          priceEshki: Number(form.priceEshki),
          telegramGiftId: form.telegramGiftId.trim() || null,
          stock: form.stock.trim() === '' ? null : Number(form.stock),
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      const warn = data.belowCost ? ' ⚠️ цена ниже себестоимости в звёздах' : ''
      setMsg({ ok: true, text: (data.isUpdate ? 'Подарок обновлён.' : 'Подарок создан.') + warn })
      setForm({ ...EMPTY })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(code: string) {
    await fetch(`/api/admin/gifts?code=${encodeURIComponent(code)}`, { method: 'DELETE' })
    reload()
  }

  const starCostNum = Number(form.starCost) || 0
  const priceNum = Number(form.priceEshki) || 0
  const suggested = starCostNum * STAR_TO_ESHKI
  const marginPct = suggested > 0 ? Math.round(((priceNum - suggested) / suggested) * 100) : 0

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="glass rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{editingCode ? '✏️' : '🎀'}</span>
              <h3 className="text-sm font-semibold text-foreground">
                {editingCode ? `Редактирование: ${form.name || editingCode}` : 'Создать подарок'}
              </h3>
            </div>
            {/* P0-3: переход к аналитике продаж подарков. */}
            <a
              href="/admin/economy/gifts"
              className="rounded-lg border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              📊 Аналитика продаж
            </a>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Код</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="gift_heart"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Название</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Сердечко"
                className={inputClass}
              />
            </div>
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Описание (необязательно)"
            rows={2}
            className={`mt-2 ${inputClass}`}
          />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">Себест. ★</label>
              <input
                type="number"
                min={0}
                value={form.starCost}
                onChange={(e) => setForm({ ...form, starCost: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">Цена, ешки</label>
              <input
                type="number"
                min={0}
                value={form.priceEshki}
                onChange={(e) => setForm({ ...form, priceEshki: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">Запас (∞ пусто)</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="∞"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">Сортировка</label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <input
            value={form.telegramGiftId}
            onChange={(e) => setForm({ ...form, telegramGiftId: e.target.value })}
            placeholder="telegram_gift_id (если известен, для будущей выдачи)"
            className={`mt-2 ${inputClass}`}
          />
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Активен
            </label>
            <span className="text-[11px] text-muted-foreground">
              Ориентир цены: {fmt(suggested)} ешек (1★≈10).{' '}
              <span className={marginPct < 0 ? 'text-destructive-foreground' : 'text-emerald-300'}>
                наценка {marginPct >= 0 ? '+' : ''}
                {marginPct}%
              </span>
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="flex-1 rounded-xl border border-primary/40 bg-primary/15 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
            >
              Сохранить
            </button>
            {(form.code || editingCode) && (
              <button
                type="button"
                onClick={clearForm}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/5"
              >
                {editingCode ? '✕ Отменить' : 'Сброс'}
              </button>
            )}

          </div>
          <Feedback msg={msg} />
        </div>
      )}

      {gifts.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-4 text-sm text-muted-foreground">
          Подарков пока нет. {canManage ? 'Создай первый выше.' : ''}
        </div>
      ) : (
        <div className="space-y-2">
          {gifts.map((g) => {
            const below = g.price_eshki < g.star_cost * STAR_TO_ESHKI
            return (
              <div
                key={g.code}
                className="glass flex items-center gap-3 rounded-2xl border border-border p-3"
              >
                <span className="text-xl">🎀</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-foreground">{g.name}</span>
                    {!g.is_active && (
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        выкл
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    <code>{g.code}</code> · {fmt(g.price_eshki)} ешек · {g.star_cost}★
                    {below && <span className="ml-1 text-destructive-foreground">ниже себест.</span>}
                    {' · '}
                    запас: {g.stock == null ? '∞' : g.stock}
                    {g.sold_count > 0 && ` · продано: ${g.sold_count}`}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => edit(g)}
                      className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-foreground transition hover:bg-white/5"
                    >
                      Изм.
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(g.code)}
                      className="rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] text-destructive-foreground transition hover:bg-destructive/20"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
