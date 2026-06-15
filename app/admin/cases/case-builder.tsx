'use client'

import { useMemo, useState } from 'react'
import type { Rarity } from '@/lib/rarity'
import { RARITY_ORDER, rarityToken } from '@/lib/rarity'
import type { ContentStatus } from '@/lib/admin/lifecycle'
import { CONTENT_STATUSES } from '@/lib/admin/lifecycle'
import { caseBuilderSchema } from '@/lib/admin/schemas'
import { computeCaseEconomics, pct, rtpBand, type EconomyReward } from '@/lib/admin/case-economics'
import { ItemArt } from '@/components/ds/item-art'
import {
  AdminForm,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  SubmitButton,
  AssetUpload,
  Feedback,
  useAdminMutation,
} from '@/components/admin/kit'

/**
 * One-screen Case Builder (workflow-first). Name → image → price → visual
 * rewards (pick existing OR create inline) → percent chances → live EV/RTP/
 * rarity distribution → Publish. No codes, no weights, no context switches.
 * Posts to /api/admin/cases/builder (auto-codes the case item, inline-creates
 * new rewards, converts chances→weights). Opening stays the bot's job.
 */

export type CatalogItem = { code: string; name: string | null; rarity: string | null; type: string | null }

type DraftReward = {
  uid: number
  mode: 'existing' | 'new' | 'currency'
  itemCode: string
  newItemName: string
  newItemRarity: Rarity
  newItemValue: string
  amount: string
  chancePercent: string
  minQty: string
  maxQty: string
  maxGlobalSupply: string
  isJackpot: boolean
}

let _uid = 1
const emptyReward = (): DraftReward => ({
  uid: _uid++,
  mode: 'existing',
  itemCode: '',
  newItemName: '',
  newItemRarity: 'rare',
  newItemValue: '',
  amount: '',
  chancePercent: '10',
  minQty: '1',
  maxQty: '1',
  maxGlobalSupply: '',
  isJackpot: false,
})

const fmt = (n: number) => n.toLocaleString('ru-RU')

export function CaseBuilder({
  catalog,
  canPublish,
  onCreated,
}: {
  catalog: CatalogItem[]
  canPublish: boolean
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rarity, setRarity] = useState<Rarity>('epic')
  const [costKind, setCostKind] = useState<'free' | 'currency'>('currency')
  const [costAmount, setCostAmount] = useState('250')
  const [status, setStatus] = useState<ContentStatus>('draft')
  const [file, setFile] = useState<File | null>(null)
  const [rewards, setRewards] = useState<DraftReward[]>([emptyReward()])
  const { run, busy, msg, setMsg } = useAdminMutation()

  const catByCode = useMemo(() => {
    const m = new Map<string, CatalogItem>()
    for (const it of catalog) m.set(it.code, it)
    return m
  }, [catalog])

  // Live economics from the draft (chances as the source of truth here).
  const econ = useMemo(() => {
    const price = costKind === 'currency' ? Number(costAmount) || 0 : 0
    const mapped: EconomyReward[] = rewards.map((r) => {
      const cat = r.mode === 'existing' ? catByCode.get(r.itemCode) : null
      const isCurrency = r.mode === 'currency'
      return {
        rewardKind: isCurrency ? 'currency' : 'item',
        amount: isCurrency ? Number(r.amount) || 0 : null,
        refValue:
          r.mode === 'new'
            ? Number(r.newItemValue) || 0
            : r.mode === 'existing'
              ? null // unknown ref_value at compose time for existing items
              : null,
        rarity: r.mode === 'new' ? r.newItemRarity : (cat?.rarity ?? 'rare'),
        weight: Number(r.chancePercent) || 0, // chances act as weights for ratios
        minQty: Number(r.minQty) || 1,
        maxQty: Number(r.maxQty) || 1,
        maxGlobalSupply: r.maxGlobalSupply ? Number(r.maxGlobalSupply) : null,
        isJackpot: r.isJackpot,
      }
    })
    return computeCaseEconomics(mapped, price)
  }, [rewards, costKind, costAmount, catByCode])

  const chanceTotal = rewards.reduce((s, r) => s + (Number(r.chancePercent) || 0), 0)

  function setReward(uid: number, patch: Partial<DraftReward>) {
    setRewards((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...patch } : r)))
  }

  function reset() {
    setName('')
    setDescription('')
    setRarity('epic')
    setCostKind('currency')
    setCostAmount('250')
    setStatus('draft')
    setFile(null)
    setRewards([emptyReward()])
    setMsg(null)
  }

  async function submit() {
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      rarity,
      openCostKind: costKind,
      openCostAmount: costKind === 'currency' ? Number(costAmount) : 0,
      consumesKey: costKind === 'free',
      status,
      featuredSlot: null as string | null,
      rewards: rewards.map((r) => ({
        kind: r.mode === 'currency' ? ('currency' as const) : ('item' as const),
        itemCode: r.mode === 'existing' ? r.itemCode || null : null,
        newItemName: r.mode === 'new' ? r.newItemName.trim() || null : null,
        newItemRarity: r.newItemRarity,
        newItemValue: r.mode === 'new' && r.newItemValue ? Number(r.newItemValue) : null,
        newItemCollectionCode: null,
        amount: r.mode === 'currency' && r.amount ? Number(r.amount) : null,
        chancePercent: Number(r.chancePercent) || 0,
        minQty: Number(r.minQty) || 1,
        maxQty: Number(r.maxQty) || 1,
        maxGlobalSupply: r.maxGlobalSupply ? Number(r.maxGlobalSupply) : null,
        isJackpot: r.isJackpot,
      })),
    }
    const parsed = caseBuilderSchema.safeParse(payload)
    if (!parsed.success) {
      setMsg({ ok: false, text: parsed.error.issues[0].message })
      return
    }

    const d = await run<{ code: string }>('/api/admin/cases/builder', {
      method: 'POST',
      json: payload,
      success: 'Кейс создан.',
    })
    if (!d) return

    if (file && d.code) {
      const fd = new FormData()
      fd.append('code', d.code)
      fd.append('file', file)
      const up = await run('/api/admin/assets', { method: 'POST', form: fd })
      if (up && canPublish) {
        await run('/api/admin/assets', { method: 'PATCH', json: { code: d.code, status: 'published' } })
      }
    }

    reset()
    onCreated()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 w-full rounded-2xl border border-primary/40 bg-primary/10 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20"
      >
        + Создать кейс
      </button>
    )
  }

  const band = rtpBand(econ.rtp)
  const bandColor =
    band === 'healthy' ? 'text-emerald-300' : band === 'high' ? 'text-amber-300' : band === 'low' ? 'text-destructive-foreground' : 'text-muted-foreground'

  return (
    <div className="mb-4 glass rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Новый кейс — один экран</h2>
        <button onClick={() => { reset(); setOpen(false) }} className="text-xs text-muted-foreground hover:underline">
          ✕ Свернуть
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: identity + rewards */}
        <AdminForm onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Название" required hint="код сгенерируется">
              <TextInput value={name} onChange={setName} placeholder="Кейс новичка" />
            </Field>
            <Field label="Редкость кейса">
              <SelectInput value={rarity} onChange={(v) => setRarity(v as Rarity)} options={RARITY_ORDER} />
            </Field>
          </div>
          <Field label="Описание">
            <TextArea value={description} onChange={setDescription} rows={2} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Стоимость открытия">
              <SelectInput
                value={costKind}
                onChange={(v) => setCostKind(v as 'free' | 'currency')}
                options={[
                  { value: 'currency', label: 'Ешки' },
                  { value: 'free', label: 'Бесплатно (ключ из инвентаря)' },
                ]}
              />
            </Field>
            {costKind === 'currency' && (
              <Field label="Цена, ешки">
                <TextInput value={costAmount} onChange={setCostAmount} />
              </Field>
            )}
          </div>

          {/* Rewards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Награды ({rewards.length}) · Σ шансов {chanceTotal.toFixed(1)}%
              </span>
              <button
                type="button"
                onClick={() => setRewards((rs) => [...rs, emptyReward()])}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
              >
                + Награда
              </button>
            </div>
            {chanceTotal !== 100 && (
              <p className="text-[11px] text-amber-300">
                Σ шансов {chanceTotal.toFixed(1)}% — нормализуется до 100% автоматически (важны пропорции).
              </p>
            )}
            {rewards.map((r) => (
              <RewardRow
                key={r.uid}
                r={r}
                catalog={catalog}
                onChange={(patch) => setReward(r.uid, patch)}
                onRemove={() => setRewards((rs) => (rs.length > 1 ? rs.filter((x) => x.uid !== r.uid) : rs))}
              />
            ))}
          </div>

          <Field label="Статус">
            <SelectInput value={status} onChange={(v) => setStatus(v as ContentStatus)} options={CONTENT_STATUSES.map((s) => ({ value: s, label: s }))} />
          </Field>

          <div className="flex items-center gap-3">
            <SubmitButton busy={busy}>Создать и опубликовать</SubmitButton>
            <Feedback msg={msg} />
          </div>
        </AdminForm>

        {/* Right: art + live economics */}
        <div className="space-y-3">
          <Field label="Арт кейса" hint="PNG/WebP">
            <AssetUpload file={file} onFile={setFile} previewRarity={rarity} size="lg" />
          </Field>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Экономика (вживую)</p>
            <div className="grid grid-cols-2 gap-2">
              <Mini label="EV" value={`${fmt(Math.round(econ.ev))} еш.`} />
              <Mini label="RTP" value={econ.rtp == null ? '—' : `${Math.round(econ.rtp * 100)}%`} className={bandColor} />
            </div>
            <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full border border-white/10">
              {econ.rarityDistribution.map((d) => (
                <div key={d.tier} title={`${rarityToken(d.tier).label}: ${pct(d.p)}`} style={{ width: `${d.p * 100}%`, background: rarityToken(d.tier).color }} />
              ))}
            </div>
            <div className="mt-2 space-y-0.5">
              {econ.rarityDistribution.map((d) => (
                <div key={d.tier} className="flex items-center justify-between text-[11px]">
                  <span style={{ color: rarityToken(d.tier).color }}>{rarityToken(d.tier).label}</span>
                  <span className="text-muted-foreground">{pct(d.p)}</span>
                </div>
              ))}
            </div>
            {econ.unpricedItemRows > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                EV учитывает только валюту и новые предметы с ценой; у существующих предметов цена подтянется после сохранения.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${className ?? 'text-foreground'}`}>{value}</div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-input bg-white/[0.04] px-2 py-1.5 text-sm text-foreground outline-none ring-primary/40 focus:border-primary/50 focus:ring-2'

function RewardRow({
  r,
  catalog,
  onChange,
  onRemove,
}: {
  r: DraftReward
  catalog: CatalogItem[]
  onChange: (patch: Partial<DraftReward>) => void
  onRemove: () => void
}) {
  const cat = r.mode === 'existing' ? catalog.find((c) => c.code === r.itemCode) : null
  const tier = (r.mode === 'new' ? r.newItemRarity : (cat?.rarity as Rarity)) ?? 'rare'
  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.02] p-2.5" style={{ borderColor: `${rarityToken(tier).color}44` }}>
      <div className="flex items-center gap-2">
        <ItemArt rarity={tier} size="sm" />
        <select
          value={r.mode}
          onChange={(e) => onChange({ mode: e.target.value as DraftReward['mode'] })}
          className={`${inputCls} max-w-[140px]`}
        >
          <option value="existing">Из каталога</option>
          <option value="new">Новый предмет</option>
          <option value="currency">Ешки</option>
        </select>

        {r.mode === 'existing' && (
          <select value={r.itemCode} onChange={(e) => onChange({ itemCode: e.target.value })} className={inputCls}>
            <option value="">— выбери предмет —</option>
            {catalog.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name ?? c.code} ({c.rarity ?? '—'})
              </option>
            ))}
          </select>
        )}
        {r.mode === 'new' && (
          <input className={inputCls} value={r.newItemName} onChange={(e) => onChange({ newItemName: e.target.value })} placeholder="Имя нового предмета" />
        )}
        {r.mode === 'currency' && (
          <input className={inputCls} type="number" min={1} value={r.amount} onChange={(e) => onChange({ amount: e.target.value })} placeholder="Сколько ешек" />
        )}

        <button type="button" onClick={onRemove} className="shrink-0 text-[11px] text-destructive-foreground/80 hover:underline">
          убрать
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block">
          <span className="mb-0.5 block text-[10px] text-muted-foreground">Шанс %</span>
          <input className={inputCls} type="number" min={0.01} step="0.1" value={r.chancePercent} onChange={(e) => onChange({ chancePercent: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] text-muted-foreground">Кол-во min</span>
          <input className={inputCls} type="number" min={1} value={r.minQty} onChange={(e) => onChange({ minQty: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] text-muted-foreground">Кол-во max</span>
          <input className={inputCls} type="number" min={1} value={r.maxQty} onChange={(e) => onChange({ maxQty: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] text-muted-foreground">Лимит (∞)</span>
          <input className={inputCls} type="number" min={1} value={r.maxGlobalSupply} onChange={(e) => onChange({ maxGlobalSupply: e.target.value })} placeholder="∞" />
        </label>
      </div>

      {r.mode === 'new' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-0.5 block text-[10px] text-muted-foreground">Редкость</span>
            <select value={r.newItemRarity} onChange={(e) => onChange({ newItemRarity: e.target.value as Rarity })} className={inputCls}>
              {RARITY_ORDER.map((rr) => (
                <option key={rr} value={rr}>{rr}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[10px] text-muted-foreground">Ценность, еш.</span>
            <input className={inputCls} type="number" min={0} value={r.newItemValue} onChange={(e) => onChange({ newItemValue: e.target.value })} />
          </label>
        </div>
      )}

      <label className="mt-2 flex items-center gap-2 text-[11px] text-foreground">
        <input type="checkbox" checked={r.isJackpot} onChange={(e) => onChange({ isJackpot: e.target.checked })} />
        Джекпот (подсветка)
      </label>
    </div>
  )
}
