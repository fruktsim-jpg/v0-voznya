'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { rarityStyle, typeEmoji } from '@/lib/inventory'

/**
 * Cases admin manager (client). Lists case definitions, lets an admin create /
 * edit a case and manage its drop-list with live odds (weight / Σweight).
 * Every mutation calls the /api/admin/cases routes — no opening logic here.
 *
 * Falls back gracefully: if the cases tables are not migrated yet the page
 * simply shows an empty list and the create form still works once migrated.
 */

export type AdminCase = {
  item_code: string
  name: string
  description: string | null
  open_cost_kind: string
  open_cost_amount: number
  consumes_key: boolean
  is_active: boolean
  season_code: string | null
  reward_count: number
  total_weight: number
}

type Reward = {
  id: number
  reward_kind: string
  reward_item_code: string | null
  reward_item_name: string | null
  reward_item_rarity: string | null
  amount: string | null
  weight: number
  min_qty: number
  max_qty: number
  max_global_supply: number | null
  granted_count: number
  is_jackpot: boolean
}

const inputClass =
  'w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2'

const fmt = (n: number) => n.toLocaleString('ru-RU')

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
      {msg.text}
    </p>
  )
}

// --- Catalog (case items + reward items) ------------------------------------

type CatalogItem = { code: string; name: string | null; rarity: string | null; type: string | null }

function useItemCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    fetch('/api/admin/inventory')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => alive && setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [])
  return { items, loaded }
}

/** Searchable picker over the catalog, optionally filtered to one type. */
function ItemPicker({
  value,
  onChange,
  disabled,
  onlyType,
  placeholder,
}: {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  onlyType?: string
  placeholder?: string
}) {
  const { items: all, loaded } = useItemCatalog()
  const items = useMemo(
    () => (onlyType ? all.filter((i) => i.type === onlyType) : all),
    [all, onlyType],
  )
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selected = useMemo(() => items.find((i) => i.code === value) ?? null, [items, value])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = s
      ? items.filter(
          (i) => i.code.toLowerCase().includes(s) || (i.name ?? '').toLowerCase().includes(s),
        )
      : items
    return base.slice(0, 50)
  }, [items, q])

  if (loaded && items.length === 0) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Код предмета'}
        className={inputClass}
        disabled={disabled}
      />
    )
  }

  return (
    <div ref={boxRef} className="relative flex-1">
      <input
        value={open ? q : selected ? `${typeEmoji(selected.type ?? '')} ${selected.name ?? selected.code}` : value}
        onChange={(e) => {
          setQ(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          setQ('')
          setOpen(true)
        }}
        placeholder={loaded ? (placeholder ?? 'Поиск предмета…') : 'Загрузка каталога…'}
        className={inputClass}
        disabled={disabled || !loaded}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Ничего не найдено</div>
          ) : (
            filtered.map((i) => {
              const rs = rarityStyle(i.rarity ?? 'common')
              return (
                <button
                  key={i.code}
                  type="button"
                  onClick={() => {
                    onChange(i.code)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-white/5 ${i.code === value ? 'bg-white/5' : ''}`}
                >
                  <span className="text-base">{typeEmoji(i.type ?? '')}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{i.name ?? i.code}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${rs.className}`}>
                    {rs.label}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// --- Main manager -----------------------------------------------------------

export function CasesManager({
  initialCases,
  canManage,
}: {
  initialCases: AdminCase[]
  canManage: boolean
}) {
  const [cases, setCases] = useState<AdminCase[]>(initialCases)
  const [selected, setSelected] = useState<string | null>(
    initialCases[0]?.item_code ?? null,
  )
  // P0-1: какой кейс сейчас редактируется в форме (null = режим создания).
  const [editing, setEditing] = useState<AdminCase | null>(null)

  async function reloadCases() {
    const res = await fetch('/api/admin/cases')
    if (res.ok) {
      const d = await res.json()
      setCases(Array.isArray(d.cases) ? d.cases : [])
    }
  }

  const current = cases.find((c) => c.item_code === selected) ?? null

  return (
    <div className="space-y-4">
      {canManage && (
        <CaseForm
          onSaved={reloadCases}
          setSelected={setSelected}
          editCase={editing}
          onClearEdit={() => setEditing(null)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Case list */}
        <div className="space-y-2">
          {cases.length === 0 ? (
            <div className="glass rounded-2xl border border-border p-4 text-sm text-muted-foreground">
              Кейсов пока нет. {canManage ? 'Создай первый выше.' : ''}
            </div>
          ) : (
            cases.map((c) => (
              <div
                key={c.item_code}
                className={`glass w-full rounded-2xl border p-3 transition ${
                  c.item_code === selected
                    ? 'border-primary/50 bg-primary/[0.06]'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelected(c.item_code)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-foreground">🎁 {c.name}</span>
                    {!c.is_active && (
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        выкл
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    <code>{c.item_code}</code> · дропов: {c.reward_count}
                  </div>
                </button>
                {canManage && (
                  <div className="mt-2 flex items-center gap-2">
                    {/* P0-1: явное редактирование — грузит данные кейса в форму. */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(c)
                        setSelected(c.item_code)
                        if (typeof window !== 'undefined') {
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                      className="rounded-lg border border-primary/40 px-2 py-0.5 text-[11px] font-medium text-primary transition hover:bg-primary/15"
                    >
                      ✏️ Редактировать
                    </button>
                    {/* P0-3: переход к аналитике этого кейса. */}
                    <a
                      href="/admin/economy/cases"
                      className="rounded-lg border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    >
                      📊 Аналитика
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Drop-list editor for the selected case */}
        <div>
          {current ? (
            <RewardEditor key={current.item_code} caseRow={current} canManage={canManage} />
          ) : (
            <div className="glass rounded-2xl border border-border p-6 text-sm text-muted-foreground">
              Выбери кейс слева, чтобы увидеть дроп-лист и шансы.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function CaseForm({
  onSaved,
  setSelected,
  editCase,
  onClearEdit,
}: {
  onSaved: () => void
  setSelected: (code: string) => void
  /** P0-1: если задан — форма работает в режиме редактирования этого кейса. */
  editCase: AdminCase | null
  onClearEdit: () => void
}) {
  const [itemCode, setItemCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [costKind, setCostKind] = useState<'free' | 'currency'>('free')
  const [costAmount, setCostAmount] = useState('0')
  const [consumesKey, setConsumesKey] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const isEdit = editCase !== null

  // P0-1: при выборе «Редактировать» подгружаем данные кейса в форму.
  useEffect(() => {
    if (!editCase) return
    setItemCode(editCase.item_code)
    setName(editCase.name)
    setDescription(editCase.description ?? '')
    setCostKind(editCase.open_cost_kind === 'currency' ? 'currency' : 'free')
    setCostAmount(String(editCase.open_cost_amount ?? 0))
    setConsumesKey(editCase.consumes_key)
    setIsActive(editCase.is_active)
    setMsg(null)
  }, [editCase])

  function resetForm() {
    setItemCode('')
    setName('')
    setDescription('')
    setCostKind('free')
    setCostAmount('0')
    setConsumesKey(true)
    setIsActive(true)
    setMsg(null)
    onClearEdit()
  }


  async function submit() {
    if (!itemCode.trim() || !name.trim()) {
      setMsg({ ok: false, text: 'Укажи предмет-кейс и название.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode: itemCode.trim(),
          name: name.trim(),
          description: description.trim() || null,
          openCostKind: costKind,
          openCostAmount: costKind === 'currency' ? Number(costAmount) : 0,
          consumesKey,
          isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setMsg({ ok: true, text: data.isUpdate ? 'Кейс обновлён.' : 'Кейс создан.' })
      onSaved()
      setSelected(itemCode.trim())
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isEdit ? '✏️' : '🎁'}</span>
          <h3 className="text-sm font-semibold text-foreground">
            {isEdit ? `Редактирование: ${editCase?.name}` : 'Создать кейс'}
          </h3>
        </div>
        {isEdit && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
          >
            ✕ Отменить
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">
            Предмет-кейс (type=case){isEdit ? ' · нельзя менять' : ''}
          </label>
          <ItemPicker
            value={itemCode}
            onChange={setItemCode}
            disabled={busy || isEdit}
            onlyType="case"
            placeholder="Поиск кейса в каталоге…"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Кейс новичка"
            className={inputClass}
          />
        </div>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание (необязательно)"
        rows={2}
        className={`mt-2 ${inputClass}`}
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Стоимость открытия</label>
          <select
            value={costKind}
            onChange={(e) => setCostKind(e.target.value as 'free' | 'currency')}
            className={inputClass}
          >
            <option value="free">Бесплатно</option>
            <option value="currency">Ешки</option>
          </select>
        </div>
        {costKind === 'currency' && (
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">Сколько ешек</label>
            <input
              type="number"
              min={1}
              value={costAmount}
              onChange={(e) => setCostAmount(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={consumesKey}
            onChange={(e) => setConsumesKey(e.target.checked)}
          />
          Списывать кейс из инвентаря
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Активен
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="mt-3 w-full rounded-xl border border-primary/40 bg-primary/15 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
      >
        Сохранить кейс
      </button>
      <Feedback msg={msg} />
      <p className="mt-2 text-[11px] text-muted-foreground">
        Предмет-кейс (type=case) должен уже существовать в каталоге — каталог
        предметов ведёт бот. Кейс с типом стоимости «бесплатно» обязан списывать
        кейс из инвентаря.
      </p>
    </div>
  )
}

function RewardEditor({
  caseRow,
  canManage,
}: {
  caseRow: AdminCase
  canManage: boolean
}) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseRow.item_code)}/rewards`)
      const d = await res.json()
      setRewards(Array.isArray(d.rewards) ? d.rewards : [])
    } catch {
      setRewards([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseRow.item_code])

  const totalWeight = rewards.reduce((s, r) => s + r.weight, 0)

  return (
    <div className="glass rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Дроп-лист: {caseRow.name}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Σ весов: {fmt(totalWeight)} · строк: {rewards.length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Загрузка…</div>
      ) : rewards.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-white/[0.02] p-4 text-sm text-muted-foreground">
          Дропов нет. Добавь хотя бы один — иначе кейс нельзя открыть.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rewards.map((r) => {
            const pct = totalWeight > 0 ? (r.weight / totalWeight) * 100 : 0
            const label =
              r.reward_kind === 'currency'
                ? `💰 ${fmt(Number(r.amount ?? 0))} ешек`
                : `${r.reward_item_name ?? r.reward_item_code ?? 'предмет'}`
            const rs = r.reward_kind === 'item' ? rarityStyle(r.reward_item_rarity ?? 'common') : null
            const qty = r.min_qty === r.max_qty ? `×${r.min_qty}` : `×${r.min_qty}–${r.max_qty}`
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {r.is_jackpot && '💎 '}
                  {label} <span className="text-muted-foreground">{qty}</span>
                  {rs && (
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${rs.className}`}>
                      {rs.label}
                    </span>
                  )}
                  {r.max_global_supply != null && (
                    <span className="ml-2 text-[11px] text-amber-300">
                      лимит {r.granted_count}/{r.max_global_supply}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-xs text-primary">
                  {pct < 10 ? pct.toFixed(2) : pct.toFixed(1)}%
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">вес {r.weight}</span>
                {canManage && (
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(
                        `/api/admin/cases/${encodeURIComponent(caseRow.item_code)}/rewards?id=${r.id}`,
                        { method: 'DELETE' },
                      )
                      load()
                    }}
                    className="shrink-0 rounded-lg border border-destructive/40 px-2 py-0.5 text-[11px] text-destructive-foreground transition hover:bg-destructive/20"
                  >
                    ✕
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canManage && <AddRewardForm caseRow={caseRow} onAdded={load} />}
    </div>
  )
}

function AddRewardForm({ caseRow, onAdded }: { caseRow: AdminCase; onAdded: () => void }) {
  const [kind, setKind] = useState<'item' | 'currency'>('item')
  const [itemCode, setItemCode] = useState('')
  const [amount, setAmount] = useState('')
  const [weight, setWeight] = useState('100')
  const [minQty, setMinQty] = useState('1')
  const [maxQty, setMaxQty] = useState('1')
  const [supply, setSupply] = useState('')
  const [jackpot, setJackpot] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(
        `/api/admin/cases/${encodeURIComponent(caseRow.item_code)}/rewards`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rewardKind: kind,
            rewardItemCode: kind === 'item' ? itemCode.trim() : null,
            amount: kind === 'currency' ? Number(amount) : null,
            weight: Number(weight),
            minQty: Number(minQty),
            maxQty: Number(maxQty),
            maxGlobalSupply: supply.trim() ? Number(supply) : null,
            isJackpot: jackpot,
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setMsg({ ok: true, text: 'Дроп добавлен.' })
      setItemCode('')
      setAmount('')
      onAdded()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-white/[0.02] p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Добавить дроп
      </h4>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as 'item' | 'currency')}
          className={inputClass}
        >
          <option value="item">Предмет</option>
          <option value="currency">Ешки</option>
        </select>
        {kind === 'item' ? (
          <ItemPicker value={itemCode} onChange={setItemCode} disabled={busy} />
        ) : (
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Сколько ешек"
            className={inputClass}
          />
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">Вес</label>
          <input
            type="number"
            min={1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">Кол-во min</label>
          <input
            type="number"
            min={1}
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">Кол-во max</label>
          <input
            type="number"
            min={1}
            value={maxQty}
            onChange={(e) => setMaxQty(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">Лимит (∞ пусто)</label>
          <input
            type="number"
            min={1}
            value={supply}
            onChange={(e) => setSupply(e.target.value)}
            placeholder="∞"
            className={inputClass}
          />
        </div>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={jackpot} onChange={(e) => setJackpot(e.target.checked)} />
        Джекпот (подсветка)
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="mt-2 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
      >
        Добавить дроп
      </button>
      <Feedback msg={msg} />
    </div>
  )
}
