'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { rarityStyle, typeEmoji } from '@/lib/inventory'
import { ItemArt } from '@/components/ds/item-art'
import { rarityToken, RARITY_ORDER, type Rarity } from '@/lib/rarity'
import type { ContentStatus } from '@/lib/admin/lifecycle'
import { CONTENT_STATUSES } from '@/lib/admin/lifecycle'
import { AssetUpload, AdminModal, StatusPill } from '@/components/admin/kit'
import {
  computeCaseEconomics,
  simulateOpens,
  pct,
  rtpBand,
  type EconomyReward,
} from '@/lib/admin/case-economics'
import { CaseBuilder, type CatalogItem as BuilderCatalogItem } from './case-builder'

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
  rarity: string | null
  status: string | null
  has_art: boolean
  reward_count: number
  total_weight: number
}

type Reward = {
  id: number
  reward_kind: string
  reward_item_code: string | null
  reward_item_name: string | null
  reward_item_rarity: string | null
  reward_item_type: string | null
  reward_item_value: number | null
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

function useItemCatalog(exclude?: string) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    const qs = exclude ? `?exclude=${encodeURIComponent(exclude)}` : ''
    fetch(`/api/admin/inventory${qs}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => alive && setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [exclude])
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
  // Cases must never be selectable as a reward inside another case.
  const { items: all, loaded } = useItemCatalog('case')
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
  builderCatalog = [],
}: {
  initialCases: AdminCase[]
  canManage: boolean
  builderCatalog?: BuilderCatalogItem[]
}) {
  const [cases, setCases] = useState<AdminCase[]>(initialCases)
  const [selected, setSelected] = useState<string | null>(
    initialCases[0]?.item_code ?? null,
  )
  // Какой кейс сейчас редактируется в форме (null = ни один; создание — отдельно
  // в CaseBuilder).
  const [editing, setEditing] = useState<AdminCase | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminCase | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)
  // Filter/search for the list — scales past a handful of cases.
  const [q, setQ] = useState('')

  async function reloadCases() {
    const res = await fetch('/api/admin/cases')
    if (res.ok) {
      const d = await res.json()
      setCases(Array.isArray(d.cases) ? d.cases : [])
    }
  }

  async function doDelete(c: AdminCase) {
    setDeleting(true)
    setDeleteErr(null)
    try {
      const res = await fetch(`/api/admin/cases?code=${encodeURIComponent(c.item_code)}`, {
        method: 'DELETE',
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Не удалось удалить')
      setConfirmDelete(null)
      if (editing?.item_code === c.item_code) setEditing(null)
      if (selected === c.item_code) setSelected(null)
      await reloadCases()
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setDeleting(false)
    }
  }

  const current = cases.find((c) => c.item_code === selected) ?? null
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return cases
    return cases.filter(
      (c) => c.name.toLowerCase().includes(s) || c.item_code.toLowerCase().includes(s),
    )
  }, [cases, q])

  return (
    <div className="space-y-4">
      {/* СОЗДАНИЕ нового кейса — «один экран» (имя, арт-PNG, награды, проценты→
          веса, экономика вживую, жизненный цикл). */}
      {canManage && (
        <CaseBuilder
          catalog={builderCatalog}
          canPublish={canManage}
          onCreated={reloadCases}
        />
      )}

      {/* РЕДАКТИРОВАНИЕ существующего кейса — единая панель: имя/редкость/статус/
          стоимость + загрузка своего PNG + удаление. Появляется по кнопке. */}
      {canManage && editing && (
        <CaseEditor
          key={editing.item_code}
          editCase={editing}
          canPublish={canManage}
          onSaved={reloadCases}
          onClearEdit={() => setEditing(null)}
          onRequestDelete={() => setConfirmDelete(editing)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Case list */}
        <div className="space-y-2">
          {cases.length > 4 && (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск кейса…"
              className={inputClass}
            />
          )}
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl border border-border p-4 text-sm text-muted-foreground">
              {cases.length === 0
                ? `Кейсов пока нет. ${canManage ? 'Создай первый выше.' : ''}`
                : 'Ничего не найдено.'}
            </div>
          ) : (
            filtered.map((c) => {
              const tier = (c.rarity as Rarity) ?? 'epic'
              return (
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
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <ItemArt
                      src={c.has_art ? `/api/items/asset/${encodeURIComponent(c.item_code)}?preview=1` : undefined}
                      rarity={tier}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-foreground">{c.name}</span>
                        {c.status ? (
                          <StatusPill status={c.status} />
                        ) : (
                          !c.is_active && (
                            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                              выкл
                            </span>
                          )
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        <code>{c.item_code}</code> · дропов: {c.reward_count}
                        {' · '}
                        {c.open_cost_kind === 'currency' ? `${fmt(c.open_cost_amount)} еш` : 'ключ'}
                      </div>
                    </div>
                  </button>
                  {canManage && (
                    <div className="mt-2 flex items-center gap-2">
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
                        Редактировать
                      </button>
                      <a
                        href="/admin/economy/cases"
                        className="rounded-lg border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                      >
                        Аналитика
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteErr(null)
                          setConfirmDelete(c)
                        }}
                        className="ml-auto rounded-lg px-2 py-0.5 text-[11px] font-medium text-destructive-foreground/80 transition hover:bg-destructive/10"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              )
            })
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

      <AdminModal
        open={confirmDelete !== null}
        title="Удалить кейс?"
        tone="danger"
        confirmLabel={deleting ? 'Удаление…' : 'Удалить'}
        busy={deleting}
        onClose={() => !deleting && setConfirmDelete(null)}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
      >
        <p>
          Кейс «{confirmDelete?.name}» и его дроп-лист будут удалены. История
          открытий сохранится (леджер не трогаем). Если у игроков остались копии
          этого кейса в инвентаре — предмет не удалится, а станет неактивным.
        </p>
        {deleteErr && <p className="mt-2 text-xs text-destructive-foreground">{deleteErr}</p>}
      </AdminModal>
    </div>
  )
}


function CaseEditor({
  editCase,
  canPublish,
  onSaved,
  onClearEdit,
  onRequestDelete,
}: {
  editCase: AdminCase
  canPublish: boolean
  onSaved: () => void
  onClearEdit: () => void
  onRequestDelete: () => void
}) {
  const [name, setName] = useState(editCase.name)
  const [description, setDescription] = useState(editCase.description ?? '')
  const [rarity, setRarity] = useState<Rarity>((editCase.rarity as Rarity) ?? 'epic')
  const [costKind, setCostKind] = useState<'free' | 'currency'>(
    editCase.open_cost_kind === 'currency' ? 'currency' : 'free',
  )
  const [costAmount, setCostAmount] = useState(String(editCase.open_cost_amount ?? 0))
  const [consumesKey, setConsumesKey] = useState(editCase.consumes_key)
  const [status, setStatus] = useState<ContentStatus>(
    (editCase.status as ContentStatus) ?? (editCase.is_active ? 'published' : 'draft'),
  )
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const existingSrc =
    !file && editCase.has_art
      ? `/api/items/asset/${encodeURIComponent(editCase.item_code)}?preview=1`
      : null

  async function submit() {
    if (!name.trim()) {
      setMsg({ ok: false, text: 'Укажи название.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      // 1) Definition + catalog item (name, rarity, status, cost) in one save.
      const res = await fetch('/api/admin/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode: editCase.item_code,
          name: name.trim(),
          description: description.trim() || null,
          openCostKind: costKind,
          openCostAmount: costKind === 'currency' ? Number(costAmount) : 0,
          consumesKey,
          rarity,
          status,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Ошибка')

      // 2) Replace art (PNG/WebP) under the case code, then publish the asset.
      if (file) {
        const fd = new FormData()
        fd.append('code', editCase.item_code)
        fd.append('file', file)
        const up = await fetch('/api/admin/assets', { method: 'POST', body: fd })
        if (!up.ok) {
          const ud = await up.json().catch(() => ({}))
          throw new Error(ud.error || 'Не удалось загрузить арт')
        }
        if (canPublish) {
          await fetch('/api/admin/assets', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: editCase.item_code, status: 'published' }),
          })
        }
      }

      setMsg({ ok: true, text: 'Кейс сохранён.' })
      setFile(null)
      onSaved()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Редактирование: {editCase.name}
        </h3>
        <button
          type="button"
          onClick={onClearEdit}
          className="rounded-lg border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
        >
          ✕ Свернуть
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: identity + cost + lifecycle */}
        <div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Название</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">
                Код · неизменяемый
              </label>
              <input value={editCase.item_code} disabled className={`${inputClass} font-mono opacity-60`} />
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
              <label className="mb-1 block text-[11px] text-muted-foreground">Редкость кейса</label>
              <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)} className={inputClass}>
                {RARITY_ORDER.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Статус</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className={inputClass}>
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Стоимость открытия</label>
              <select
                value={costKind}
                onChange={(e) => setCostKind(e.target.value as 'free' | 'currency')}
                className={inputClass}
              >
                <option value="currency">Ешки</option>
                <option value="free">Бесплатно (ключ из инвентаря)</option>
              </select>
            </div>
            {costKind === 'currency' && (
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">Цена, ешки</label>
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

          <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={consumesKey} onChange={(e) => setConsumesKey(e.target.checked)} />
            Списывать кейс-ключ из инвентаря при открытии
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
            >
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onRequestDelete}
              className="rounded-xl border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive-foreground/90 transition hover:bg-destructive/10 disabled:opacity-50"
            >
              Удалить кейс
            </button>
            <Feedback msg={msg} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Награды и шансы редактируются ниже, в блоке «Награды». Экономика (EV/RTP)
            считается там же вживую.
          </p>
        </div>

        {/* Right: art upload */}
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">
            Арт кейса · PNG/WebP — загрузится и опубликуется под кодом кейса
          </label>
          <AssetUpload file={file} onFile={setFile} previewRarity={rarity} existingSrc={existingSrc} size="lg" />
        </div>
      </div>
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
  const [editing, setEditing] = useState<Reward | null>(null)

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

  // Economics: chances, EV, RTP, rarity distribution, supply pressure — derived
  // live from the same weights the bot uses. Price is the case open cost.
  const price = caseRow.open_cost_kind === 'currency' ? caseRow.open_cost_amount : 0
  const econ = useMemo(() => {
    const mapped: EconomyReward[] = rewards.map((r) => ({
      id: r.id,
      rewardKind: r.reward_kind === 'currency' ? 'currency' : 'item',
      amount: r.amount == null ? null : Number(r.amount),
      refValue: r.reward_item_value == null ? null : Number(r.reward_item_value),
      rarity: r.reward_item_rarity,
      weight: r.weight,
      minQty: r.min_qty,
      maxQty: r.max_qty,
      maxGlobalSupply: r.max_global_supply,
      grantedCount: r.granted_count,
      isJackpot: r.is_jackpot,
    }))
    return computeCaseEconomics(mapped, price)
  }, [rewards, price])

  return (
    <div className="space-y-4">
      {!loading && econ.hasDrops && <CaseEconomicsPanel econ={econ} />}

      <div className="glass rounded-2xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Награды: {caseRow.name}</h3>
            <p className="text-[11px] text-muted-foreground">
              {rewards.length} наград{rewards.length === 1 ? 'а' : ''} · цена открытия:{' '}
              {price > 0 ? `${fmt(price)} ешек` : 'ключ из инвентаря'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Загрузка…</div>
        ) : rewards.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-white/[0.02] p-4 text-sm text-muted-foreground">
            Наград нет. Добавь хотя бы одну — иначе кейс нельзя открыть.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {econ.rows.map((r) => {
              const reward = rewards.find((x) => x.id === r.id)!
              const tier = r.tier
              const token = rarityToken(tier)
              const isCurrency = r.rewardKind === 'currency'
              const isGift = reward.reward_kind === 'tg_gift' || reward.reward_item_type === 'gift'
              const label = isCurrency
                ? `${fmt(Number(reward.amount ?? 0))} ешек`
                : reward.reward_item_name ?? reward.reward_item_code ?? 'предмет'
              const qty =
                reward.min_qty === reward.max_qty
                  ? `×${reward.min_qty}`
                  : `×${reward.min_qty}–${reward.max_qty}`
              return (
                <div
                  key={r.id}
                  role={canManage ? 'button' : undefined}
                  tabIndex={canManage ? 0 : undefined}
                  onClick={canManage ? () => setEditing(reward) : undefined}
                  onKeyDown={
                    canManage
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setEditing(reward)
                          }
                        }
                      : undefined
                  }
                  className={`flex items-center gap-3 rounded-xl border bg-white/[0.02] p-2.5 ${
                    canManage ? 'cursor-pointer transition hover:bg-white/[0.05]' : ''
                  }`}
                  style={{ borderColor: `${token.color}55` }}
                >
                  <ItemArt
                    src={
                      !isCurrency && reward.reward_item_code
                        ? `/api/items/asset/${encodeURIComponent(reward.reward_item_code)}?preview=1`
                        : undefined
                    }
                    rarity={tier}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {r.isJackpot && <span className="shrink-0 text-xs">💎</span>}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={label}>
                        {label}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{qty}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      <span style={{ color: token.color }}>{token.label}</span>
                      {isGift && (
                        <span className="shrink-0 rounded bg-pink-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-pink-300">
                          🎁 подарок
                        </span>
                      )}
                      {!isCurrency && (
                        <span className="text-muted-foreground">
                          {reward.reward_item_value != null
                            ? `${fmt(Number(reward.reward_item_value))} еш.`
                            : 'без цены'}
                        </span>
                      )}
                      {reward.max_global_supply != null && (
                        <span className="text-amber-300">
                          лимит {reward.granted_count}/{reward.max_global_supply}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-semibold text-primary">{pct(r.p)}</div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await fetch(
                            `/api/admin/cases/${encodeURIComponent(caseRow.item_code)}/rewards?id=${r.id}`,
                            { method: 'DELETE' },
                          )
                          load()
                        }}
                        className="mt-1 text-[11px] text-destructive-foreground/80 underline-offset-2 hover:underline"
                      >
                        убрать
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {canManage && (
        <AddRewardForm caseRow={caseRow} onAdded={load} currentTotalWeight={econ.totalWeight} />
      )}
      </div>

      {!loading && econ.hasDrops && <SimulationPanel econ={econ} />}

      {editing && (
        <EditRewardModal
          caseRow={caseRow}
          reward={editing}
          price={price}
          rewards={rewards}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

/**
 * Edit an existing drop row in place — the operator can now click a reward to
 * change its weight/chance, quantity range, supply cap, jackpot flag, and (for
 * currency rows) the amount. Item/gift identity is fixed once added; to swap
 * the item, remove and re-add. PATCHes /api/admin/cases/[code]/rewards.
 */
function EditRewardModal({
  caseRow,
  reward,
  price,
  rewards,
  onClose,
  onSaved,
}: {
  caseRow: AdminCase
  reward: Reward
  price: number
  rewards: Reward[]
  onClose: () => void
  onSaved: () => void
}) {
  const isCurrency = reward.reward_kind === 'currency'
  const isGift = reward.reward_kind === 'tg_gift' || reward.reward_item_type === 'gift'
  const [weight, setWeight] = useState(String(reward.weight))
  const [minQty, setMinQty] = useState(String(reward.min_qty))
  const [maxQty, setMaxQty] = useState(String(reward.max_qty))
  const [amount, setAmount] = useState(reward.amount == null ? '' : String(reward.amount))
  const [supply, setSupply] = useState(
    reward.max_global_supply == null ? '' : String(reward.max_global_supply),
  )
  const [jackpot, setJackpot] = useState(reward.is_jackpot)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const title = isCurrency
    ? `${fmt(Number(reward.amount ?? 0))} ешек`
    : reward.reward_item_name ?? reward.reward_item_code ?? 'предмет'

  // Live odds preview: recompute drop % and case RTP as the operator drags the
  // weight slider, BEFORE saving. Other rows keep their stored weights; only
  // this row's weight is the live value. This is the same math the bot uses
  // (weight / Σweight), so the preview equals the real post-save odds.
  const wNum = Math.max(0, Number(weight) || 0)
  const preview = useMemo(() => {
    const mapped: EconomyReward[] = rewards.map((x) => ({
      id: x.id,
      rewardKind: x.reward_kind === 'currency' ? 'currency' : 'item',
      amount:
        x.id === reward.id && isCurrency
          ? Number(amount) || 0
          : x.amount == null
            ? null
            : Number(x.amount),
      refValue: x.reward_item_value == null ? null : Number(x.reward_item_value),
      rarity: x.reward_item_rarity,
      weight: x.id === reward.id ? wNum : x.weight,
      minQty: x.id === reward.id ? Number(minQty) || 1 : x.min_qty,
      maxQty: x.id === reward.id ? Number(maxQty) || 1 : x.max_qty,
      maxGlobalSupply: x.max_global_supply,
      grantedCount: x.granted_count,
      isJackpot: x.id === reward.id ? jackpot : x.is_jackpot,
    }))
    const econ = computeCaseEconomics(mapped, price)
    const thisRow = econ.rows.find((r) => r.id === reward.id)
    return {
      p: thisRow?.p ?? 0,
      rtp: econ.rtp,
      ev: econ.ev,
      totalWeight: econ.totalWeight,
    }
  }, [rewards, reward.id, wNum, minQty, maxQty, amount, jackpot, isCurrency, price])

  const band = rtpBand(preview.rtp)
  const bandColor =
    band === 'healthy'
      ? 'text-emerald-300'
      : band === 'high'
        ? 'text-amber-300'
        : band === 'low'
          ? 'text-destructive-foreground'
          : 'text-muted-foreground'

  // Slider ceiling: enough headroom to make this row dominant without typing.
  const sliderMax = Math.max(1000, ...rewards.map((x) => x.weight), wNum) * 1.5

  async function save() {
    if (Number(maxQty) < Number(minQty)) {
      setMsg({ ok: false, text: 'Макс. количество меньше минимального.' })
      return
    }
    if (isCurrency && (!amount.trim() || Number(amount) <= 0)) {
      setMsg({ ok: false, text: 'Укажи сумму ешек больше нуля.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(
        `/api/admin/cases/${encodeURIComponent(caseRow.item_code)}/rewards`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: reward.id,
            weight: Number(weight),
            minQty: Number(minQty),
            maxQty: Number(maxQty),
            amount: isCurrency ? Number(amount) : null,
            maxGlobalSupply: supply.trim() ? Number(supply) : null,
            isJackpot: jackpot,
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      onSaved()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Награда: ${title}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative w-full max-w-md rounded-2xl border border-border p-5 shadow-2xl">
        <h2 className="mb-3 text-base font-bold text-foreground">Награда: {title}</h2>
        <div className="space-y-3">
        {isGift && (
          <p className="rounded-lg border border-pink-500/25 bg-pink-500/10 px-3 py-2 text-[11px] text-pink-200">
            🎁 Это подарок — он выдаётся как Telegram-подарок (его можно продать
            или вывести), а стоимость берётся из каталога подарков.
          </p>
        )}
        {/* Live odds preview — updates as you drag the weight slider */}
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
          <div className="flex items-center gap-3">
            <OddsDonut p={preview.p} color={isGift ? '#f9a8d4' : rarityToken((reward.reward_item_rarity as Rarity) ?? 'rare').color} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Шанс выпадения
              </div>
              <div className="font-mono text-2xl font-bold text-foreground">{pct(preview.p)}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                вес {wNum} из {fmt(preview.totalWeight)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">RTP кейса</div>
              <div className={`font-mono text-lg font-semibold ${bandColor}`}>
                {preview.rtp == null ? '—' : `${Math.round(preview.rtp * 100)}%`}
              </div>
              <div className="text-[11px] text-muted-foreground">EV {fmt(Math.round(preview.ev))} еш.</div>
            </div>
          </div>
          {/* Weight slider — drag to set how often this drops */}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>реже</span>
              <span>вес (пропорция) · перетаскивай</span>
              <span>чаще</span>
            </div>
            <input
              type="range"
              min={1}
              max={sliderMax}
              step={1}
              value={Math.min(wNum, sliderMax)}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full accent-primary"
            />
          </div>
        </div>
        {!isCurrency && (
          <p className="text-[11px] text-muted-foreground">
            Предмет:{' '}
            <span className="text-foreground">
              {reward.reward_item_name ?? reward.reward_item_code}
            </span>
            {reward.reward_item_value != null && (
              <> · {fmt(Number(reward.reward_item_value))} еш.</>
            )}
            . Чтобы заменить предмет — удали награду и добавь заново.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {isCurrency && (
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] text-muted-foreground">Сколько ешек</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">Вес (число)</label>
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
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={jackpot} onChange={(e) => setJackpot(e.target.checked)} />
          Джекпот (подсветка)
        </label>
        <Feedback msg={msg} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground transition hover:bg-white/[0.04]"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="flex-1 rounded-xl border border-primary/40 bg-primary/15 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

/** Live economics: EV, RTP, rarity distribution, supply pressure. */
function CaseEconomicsPanel({ econ }: { econ: ReturnType<typeof computeCaseEconomics> }) {
  const band = rtpBand(econ.rtp)
  const bandColor =
    band === 'healthy'
      ? 'text-emerald-300'
      : band === 'high'
        ? 'text-amber-300'
        : band === 'low'
          ? 'text-destructive-foreground'
          : 'text-muted-foreground'
  return (
    <div className="glass rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Экономика кейса (вживую)</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Ожидаемая ценность" value={`${fmt(Math.round(econ.ev))} еш.`} />
        <Metric
          label="RTP (возврат)"
          value={econ.rtp == null ? '—' : `${Math.round(econ.rtp * 100)}%`}
          className={bandColor}
        />
        <Metric label="Цена открытия" value={econ.price > 0 ? `${fmt(econ.price)} еш.` : 'ключ'} />
        <Metric
          label="Маржа дома"
          value={econ.rtp == null ? '—' : `${Math.round((1 - econ.rtp) * 100)}%`}
        />
      </div>

      {econ.unpricedItemRows > 0 && (
        <p className="mt-2 text-[11px] text-amber-300">
          ⚠️ {econ.unpricedItemRows} предмет(ов) без цены (ref_value) — EV/RTP занижены.
        </p>
      )}

      {/* Recommended open price: lands RTP in the healthy band (~90%). The house
          keeps a small edge while the case still feels rewarding. */}
      {econ.ev > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              Рекомендуемая цена открытия (RTP ~90%)
            </span>
            <span className="font-mono text-sm font-semibold text-emerald-300">
              {fmt(Math.round(econ.ev / 0.9))} еш.
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            здоровый коридор: {fmt(Math.round(econ.ev / 1.0))}–{fmt(Math.round(econ.ev / 0.85))} еш.
            (RTP 100%–85%). Сейчас цена {econ.price > 0 ? `${fmt(econ.price)} еш.` : 'ключ'}.
          </p>
        </div>
      )}

      {/* Rarity distribution: donut (circular analytics) + legend/bar */}
      <div className="mt-4">
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          Распределение по редкости
        </p>
        <div className="flex items-center gap-4">
          <RarityDonut dist={econ.rarityDistribution} />
          <div className="min-w-0 flex-1">
            <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10">
              {econ.rarityDistribution.map((d) => (
                <div
                  key={d.tier}
                  title={`${rarityToken(d.tier).label}: ${pct(d.p)}`}
                  style={{ width: `${d.p * 100}%`, background: rarityToken(d.tier).color }}
                />
              ))}
            </div>
            <div className="mt-2 space-y-1">
              {econ.rarityDistribution.map((d) => (
                <div key={d.tier} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: rarityToken(d.tier).color }}
                    />
                    <span style={{ color: rarityToken(d.tier).color }}>{rarityToken(d.tier).label}</span>
                  </span>
                  <span className="font-mono text-muted-foreground">{pct(d.p)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Supply pressure */}
      {econ.supplyPressure.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            Давление на запас
          </p>
          <div className="space-y-1">
            {econ.supplyPressure.map((s) => (
              <div key={s.reward.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-28 shrink-0 truncate text-muted-foreground">
                  {s.reward.rewardKind === 'currency'
                    ? `${fmt(s.reward.amount ?? 0)} еш.`
                    : s.reward.rarity ?? 'предмет'}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full border border-white/10">
                  <div
                    className={s.pctConsumed > 80 ? 'h-full bg-destructive' : 'h-full bg-amber-400'}
                    style={{ width: `${Math.min(100, s.pctConsumed)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-muted-foreground">
                  {s.remaining}/{s.cap}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-base font-semibold ${className ?? 'text-foreground'}`}>
        {value}
      </div>
    </div>
  )
}

/**
 * Compact circular gauge for a single probability (0..1). Pure SVG, no deps —
 * the arc fills proportionally to the drop chance so the operator gets an
 * at-a-glance read while dragging the weight slider.
 */
function OddsDonut({ p, color, size = 56 }: { p: number; color: string; size?: number }) {
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, p))
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/10" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        style={{ transition: 'stroke-dashoffset 120ms ease-out' }}
      />
    </svg>
  )
}

/**
 * Donut chart of the rarity distribution. Stacks each tier's probability mass
 * as an arc segment around a ring — the circular "analytics" view of the same
 * data the linear bar shows, for a quicker read of case composition.
 */
function RarityDonut({
  dist,
  size = 132,
}: {
  dist: { tier: Rarity; p: number }[]
  size?: number
}) {
  const stroke = 16
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const total = dist.reduce((s, d) => s + d.p, 0) || 1
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/5" />
        {dist.map((d) => {
          const frac = d.p / total
          const seg = (
            <circle
              key={d.tier}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={rarityToken(d.tier).color}
              strokeWidth={stroke}
              strokeDasharray={`${c * frac} ${c * (1 - frac)}`}
              strokeDashoffset={-c * offset}
            />
          )
          offset += frac
          return seg
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">тиров</span>
        <span className="text-lg font-bold text-foreground">{dist.length}</span>
      </div>
    </div>
  )
}

/** Deterministic open simulation (100 / 1k / 10k) — instant, no RNG variance. */
function SimulationPanel({ econ }: { econ: ReturnType<typeof computeCaseEconomics> }) {
  const [opens, setOpens] = useState(1000)
  const sim = useMemo(() => simulateOpens(econ, opens), [econ, opens])
  return (
    <div className="glass rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Симуляция открытий</h3>
        <div className="flex gap-1">
          {[100, 1000, 10000].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setOpens(n)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                opens === n
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {fmt(n)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Потрачено" value={econ.price > 0 ? `${fmt(sim.totalSpent)} еш.` : '—'} />
        <Metric label="Возврат" value={`${fmt(Math.round(sim.totalReturned))} еш.`} />
        <Metric
          label="Итог (нетто)"
          value={econ.price > 0 ? `${sim.net >= 0 ? '+' : ''}${fmt(Math.round(sim.net))} еш.` : '—'}
          className={sim.net >= 0 ? 'text-emerald-300' : 'text-destructive-foreground'}
        />
        <Metric label="RTP" value={sim.rtp == null ? '—' : `${Math.round(sim.rtp * 100)}%`} />
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Ожидаемые выпадения по редкости
        </p>
        {sim.perTier.map((t) => (
          <div key={t.tier} className="flex items-center gap-2 text-[11px]">
            <span className="w-24 shrink-0" style={{ color: rarityToken(t.tier).color }}>
              {rarityToken(t.tier).label}
            </span>
            <span className="text-foreground">
              ~{fmt(Math.round(t.expectedHits))} раз
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground/70">
        Детерминированный прогноз (ожидание = шанс × N), без случайной дисперсии.
      </p>
    </div>
  )
}

function AddRewardForm({
  caseRow,
  onAdded,
  currentTotalWeight,
}: {
  caseRow: AdminCase
  onAdded: () => void
  currentTotalWeight: number
}) {
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
    // Guard before hitting the API so the operator gets instant feedback.
    if (kind === 'item' && !itemCode.trim()) {
      setMsg({ ok: false, text: 'Выбери предмет-награду.' })
      return
    }
    if (kind === 'currency' && (!amount.trim() || Number(amount) <= 0)) {
      setMsg({ ok: false, text: 'Укажи сумму ешек больше нуля.' })
      return
    }
    if (Number(maxQty) < Number(minQty)) {
      setMsg({ ok: false, text: 'Макс. количество меньше минимального.' })
      return
    }
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
      setJackpot(false)
      setSupply('')
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
        Добавить награду
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
        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-[10px] text-muted-foreground">Вес (пропорция)</label>
          <input
            type="number"
            min={1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
          <input
            type="range"
            min={1}
            max={Math.max(1000, currentTotalWeight * 2, Number(weight) || 1)}
            step={1}
            value={Math.min(Number(weight) || 1, Math.max(1000, currentTotalWeight * 2))}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1.5 w-full accent-emerald-400"
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
        Добавить награду
      </button>
      {Number(weight) > 0 && (
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          при этом весе шанс выпадения ≈{' '}
          <span className="font-mono text-primary">
            {pct(Number(weight) / (currentTotalWeight + Number(weight)))}
          </span>
        </p>
      )}
      <Feedback msg={msg} />
    </div>
  )
}
