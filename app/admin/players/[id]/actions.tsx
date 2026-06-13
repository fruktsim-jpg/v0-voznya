'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/lib/voznya-bot'
import { rarityStyle, typeEmoji } from '@/lib/inventory'


type LiveStats = { balance: number; mmr: number | null; reputation: number | null }

/**
 * Admin action panel for a player: economy, MMR, reputation, inventory and
 * achievements. Built around quick-amount buttons so a moderator rarely has to
 * type. Point actions (ешки/MMR/репутация) update the live stat tiles in place
 * from the API response — no full-page reload. Inventory/achievements still call
 * router.refresh() because their lists are server-rendered below. The server
 * re-checks permissions regardless of which buttons are shown.
 */
export function PlayerActions({
  userId,
  canEconomy,
  canInventory,
  canMmr,
  canReputation,
  canAchievements,
  canCooldowns,
  canGifts,
  initialStats,
  initialCooldowns,
}: {
  userId: number
  canEconomy: boolean
  canInventory: boolean
  canMmr: boolean
  canReputation: boolean
  canAchievements: boolean
  canCooldowns: boolean
  canGifts: boolean
  initialStats: LiveStats
  initialCooldowns: { action: string; remaining: number }[]
}) {
  const [stats, setStats] = useState<LiveStats>(initialStats)
  const fmt = (n: number) => n.toLocaleString('ru-RU')

  const tiles = [
    { emoji: '💰', label: 'Баланс', value: fmt(stats.balance), tone: 'text-amber-200' },
    { emoji: '🏆', label: 'MMR', value: stats.mmr == null ? '—' : fmt(stats.mmr), tone: 'text-primary' },
    {
      emoji: '❤️',
      label: 'Репутация',
      value: stats.reputation == null ? '—' : fmt(stats.reputation),
      tone: 'text-rose-200',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Live stat tiles — update instantly after a point action. */}
      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map((t) => (
          <div key={t.label} className="glass rounded-2xl border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{t.emoji}</span>
              <div className="min-w-0">
                <div className={`text-base font-bold ${t.tone}`}>{t.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {canEconomy && (
          <PointsCard
            userId={userId}
            emoji="💰"
            title="Ешки"
            endpoint="/api/admin/economy"
            presets={[100, 500, 1000]}
            unit="ешек"
            accent="amber"
            resultKey="balance"
            resultLabel="Баланс"
            onResult={(v) => setStats((s) => ({ ...s, balance: v }))}
            allowSet
          />
        )}
        {canMmr && (
          <PointsCard
            userId={userId}
            emoji="🏆"
            title="MMR"
            endpoint="/api/admin/mmr"
            presets={[50, 100, 500]}
            unit="MMR"
            accent="violet"
            resultKey="mmr"
            resultLabel="MMR"
            onResult={(v) => setStats((s) => ({ ...s, mmr: v }))}
          />
        )}
        {canReputation && (
          <PointsCard
            userId={userId}
            emoji="❤️"
            title="Репутация"
            endpoint="/api/admin/reputation"
            presets={[1, 5, 10]}
            unit="репутации"
            accent="rose"
            resultKey="reputation"
            resultLabel="Репутация"
            onResult={(v) => setStats((s) => ({ ...s, reputation: v }))}
          />
        )}
        {canInventory && <InventoryCard userId={userId} />}
        {canAchievements && <AchievementsCard userId={userId} />}
        {canCooldowns && <CooldownsCard userId={userId} initial={initialCooldowns} />}
        {canGifts && <GiftGrantCard userId={userId} />}
      </div>
    </div>
  )
}


type Accent = 'amber' | 'violet' | 'rose' | 'sky'

const ACCENT: Record<Accent, { border: string; text: string; chip: string }> = {
  amber: {
    border: 'border-amber-400/25',
    text: 'text-amber-200',
    chip: 'border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20',
  },
  violet: {
    border: 'border-primary/30',
    text: 'text-primary',
    chip: 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
  },
  rose: {
    border: 'border-rose-400/25',
    text: 'text-rose-200',
    chip: 'border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20',
  },
  sky: {
    border: 'border-sky-400/25',
    text: 'text-sky-200',
    chip: 'border-sky-400/30 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20',
  },
}

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-destructive-foreground'}`}>
      {msg.text}
    </p>
  )
}

const cardClass = (border: string) =>
  `glass rounded-2xl border ${border} bg-gradient-to-br to-transparent p-4`

const inputClass =
  'w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none ring-primary/40 transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2'

/** Add/remove card for journal-backed point systems with preset quick buttons. */
function PointsCard({
  userId,
  emoji,
  title,
  endpoint,
  presets,
  unit,
  accent,
  resultKey,
  resultLabel,
  onResult,
  allowSet = false,
}: {
  userId: number
  emoji: string
  title: string
  endpoint: string
  presets: number[]
  unit: string
  accent: Accent
  resultKey: string
  resultLabel: string
  onResult: (total: number) => void
  allowSet?: boolean
}) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const a = ACCENT[accent]

  async function send(value: number, direction: 'add' | 'remove' | 'set') {
    // add/remove need a positive integer; "set" accepts 0+ (target balance).
    const valid =
      direction === 'set'
        ? Number.isInteger(value) && value >= 0
        : Number.isInteger(value) && value > 0
    if (!valid) {
      setMsg({ ok: false, text: 'Введите корректное число.' })
      return
    }
    if (direction === 'set' && typeof window !== 'undefined') {
      if (!window.confirm(`Установить ${title} = ${value.toLocaleString('ru-RU')}?`)) return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: value, direction, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      const total = data[resultKey]
      setMsg({
        ok: true,
        text:
          total != null
            ? `Готово. ${resultLabel}: ${Number(total).toLocaleString('ru-RU')}.`
            : 'Готово.',
      })
      setAmount('')
      // Update the live tile in place instead of a full server refresh.
      if (total != null) onResult(Number(total))
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className={cardClass(a.border)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>

      {/* Quick presets */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            disabled={busy}
            onClick={() => send(p, 'add')}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${a.chip}`}
          >
            +{p.toLocaleString('ru-RU')}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Своя сумма (${unit})`}
          className={inputClass}
        />
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина (необязательно)"
        className={`mt-2 ${inputClass}`}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => send(Number(amount), 'add')}
          className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
        >
          Начислить
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => send(Number(amount), 'remove')}
          className="flex-1 rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-xs font-semibold text-destructive-foreground transition hover:bg-destructive/20 disabled:opacity-50"
        >
          Снять
        </button>
      </div>
      {allowSet && (
        <button
          type="button"
          disabled={busy}
          onClick={() => send(Number(amount), 'set')}
          className="mt-2 w-full rounded-xl border border-sky-400/40 bg-sky-400/10 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:opacity-50"
        >
          Установить баланс = значению
        </button>
      )}
      <Feedback msg={msg} />
    </div>
  )
}

type CatalogItem = {
  code: string
  name: string | null
  rarity: string | null
  type: string | null
}

/** Loads the active item catalog once and caches it for the page session. */
function useItemCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/admin/inventory')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (alive) setItems(Array.isArray(d.items) ? d.items : [])
      })
      .catch(() => {
        if (alive) setItems([])
      })
      .finally(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  return { items, loaded }
}

/**
 * Searchable item picker (combobox) — no external deps. Filters the catalog by
 * code/name as the admin types and lets them pick with mouse or keyboard. Falls
 * back to free text if the catalog is empty (un-migrated DB) so the field never
 * blocks a valid manual code.
 */
function ItemPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
}) {
  const { items, loaded } = useItemCatalog()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selected = useMemo(
    () => items.find((i) => i.code === value) ?? null,
    [items, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, 50)
    return items
      .filter(
        (i) =>
          i.code.toLowerCase().includes(q) ||
          (i.name ?? '').toLowerCase().includes(q),
      )
      .slice(0, 50)
  }, [items, query])

  // No catalog available — degrade to a plain text input so the action still works.
  if (loaded && items.length === 0) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Код предмета"
        className={inputClass}
        disabled={disabled}
      />
    )
  }

  return (
    <div ref={boxRef} className="relative flex-1">
      <input
        value={open ? query : selected ? `${typeEmoji(selected.type ?? '')} ${selected.name ?? selected.code}` : value}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          setQuery('')
          setOpen(true)
        }}
        placeholder={loaded ? 'Поиск предмета…' : 'Загрузка каталога…'}
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
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {i.name ?? i.code}
                  </span>
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

function InventoryCard({ userId }: { userId: number }) {
  const router = useRouter()
  const [itemCode, setItemCode] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const a = ACCENT.sky


  async function submit(action: 'grant' | 'revoke') {
    const code = itemCode.trim()
    const qty = Number(quantity)
    if (!code) {
      setMsg({ ok: false, text: 'Укажите код предмета.' })
      return
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setMsg({ ok: false, text: 'Количество — положительное целое.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemCode: code, quantity: qty, action, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setMsg({ ok: true, text: action === 'grant' ? 'Предмет выдан.' : 'Предмет отозван.' })
      setReason('')
      router.refresh()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cardClass(a.border)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🎒</span>
        <h3 className="text-sm font-semibold text-foreground">Инвентарь</h3>
      </div>
      <div className="flex gap-2">
        <ItemPicker value={itemCode} onChange={setItemCode} disabled={busy} />
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Кол-во"
          className={`${inputClass} w-20`}
        />
      </div>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина (необязательно)"
        className={`mt-2 ${inputClass}`}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('grant')}
          className="flex-1 rounded-xl border border-sky-500/40 bg-sky-500/15 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/25 disabled:opacity-50"
        >
          Выдать
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('revoke')}
          className="flex-1 rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-xs font-semibold text-destructive-foreground transition hover:bg-destructive/20 disabled:opacity-50"
        >
          Отозвать
        </button>
      </div>
      <Feedback msg={msg} />
    </div>
  )
}

function AchievementsCard({ userId }: { userId: number }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(action: 'grant' | 'revoke') {
    const value = code.trim()
    if (!value) {
      setMsg({ ok: false, text: 'Выберите достижение.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: value, action, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      const noop = data.changed === false
      setMsg({
        ok: true,
        text: noop
          ? 'Без изменений (уже в этом состоянии).'
          : action === 'grant'
            ? 'Достижение выдано.'
            : 'Достижение отозвано.',
      })
      setReason('')
      router.refresh()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cardClass('border-emerald-400/25')}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🏅</span>
        <h3 className="text-sm font-semibold text-foreground">Достижения</h3>
      </div>
      <select
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={inputClass}
      >
        <option value="">— выберите достижение —</option>
        {ACHIEVEMENT_CATEGORIES.map((cat) => {
          const items = ACHIEVEMENTS.filter((ac) => ac.category === cat.code)
          if (items.length === 0) return null
          return (
            <optgroup key={cat.code} label={`${cat.emoji} ${cat.name}`}>
              {items.map((ac) => (
                <option key={ac.code} value={ac.code}>
                  {ac.emoji} {ac.name}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина (необязательно)"
        className={`mt-2 ${inputClass}`}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('grant')}
          className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
        >
          Выдать
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('revoke')}
          className="flex-1 rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-xs font-semibold text-destructive-foreground transition hover:bg-destructive/20 disabled:opacity-50"
        >
          Отозвать
        </button>
      </div>
      <Feedback msg={msg} />
    </div>
  )
}

/** Human labels for cooldown actions (operator never sees raw keys). */
const COOLDOWN_LABELS: Record<string, string> = {
  farm: '🌾 Ферма',
  casino: '🎰 Казино',
  duel: '⚔️ Дуэль',
}

const fmtRemaining = (sec: number): string => {
  if (sec <= 0) return 'готово'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h} ч ${m} мин`
  if (m > 0) return `${m} мин`
  return `${Math.floor(sec)} сек`
}

/**
 * Cooldowns card — reset farm/casino/duel (or all) for a player. Mirrors the
 * bot's clear_cooldown by deleting `cooldowns` rows; the bot reads that table
 * live, so the player can act again immediately. Confirm + optional reason +
 * audit; refreshes the remaining-time list from the API after each reset.
 */
function CooldownsCard({
  userId,
  initial,
}: {
  userId: number
  initial: { action: string; remaining: number }[]
}) {
  const [cooldowns, setCooldowns] = useState(initial)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const a = ACCENT.sky

  const byAction = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of cooldowns) m.set(c.action, c.remaining)
    return m
  }, [cooldowns])

  async function refresh() {
    try {
      const r = await fetch(`/api/admin/cooldowns?userId=${userId}`)
      const d = r.ok ? await r.json() : { cooldowns: [] }
      setCooldowns(Array.isArray(d.cooldowns) ? d.cooldowns : [])
    } catch {
      /* keep stale list */
    }
  }

  async function reset(action: 'farm' | 'casino' | 'duel' | 'all') {
    const label = action === 'all' ? 'все кулдауны' : COOLDOWN_LABELS[action] ?? action
    if (!confirm(`Сбросить ${label} для игрока?`)) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/cooldowns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, action, reason: reason.trim() || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'ошибка')
      const cleared: string[] = Array.isArray(d.cleared) ? d.cleared : []
      setMsg({
        ok: true,
        text: cleared.length ? `Сброшено: ${cleared.join(', ')}` : 'Активных кулдаунов не было',
      })
      setReason('')
      await refresh()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cardClass(a.border)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">⏱️</span>
        <h3 className="text-sm font-semibold text-foreground">Кулдауны</h3>
      </div>

      <div className="mb-3 space-y-1.5">
        {(['farm', 'casino', 'duel'] as const).map((act) => {
          const remaining = byAction.get(act) ?? 0
          const active = remaining > 0
          return (
            <div
              key={act}
              className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-3 py-2"
            >
              <span className="text-xs text-foreground">{COOLDOWN_LABELS[act]}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] ${active ? 'text-amber-300' : 'text-muted-foreground'}`}>
                  {fmtRemaining(remaining)}
                </span>
                <button
                  type="button"
                  disabled={busy || !active}
                  onClick={() => reset(act)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${a.chip}`}
                >
                  Сбросить
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <input
        className={inputClass}
        placeholder="Причина (необязательно)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => reset('all')}
        className="mt-3 w-full rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-xs font-semibold text-destructive-foreground transition hover:bg-destructive/20 disabled:opacity-50"
      >
        Сбросить всё
      </button>
      <Feedback msg={msg} />
    </div>
  )
}

type GrantableGift = {
  code: string
  name: string
  starCost: number
  priceEshki: number
  remaining: number | null
  isPremium: boolean
}

/**
 * Gift grant card — grant a gift (incl. Telegram Premium) to a player. Creates
 * a PENDING gift_transactions row via /api/admin/gifts/grant (the bot's grant
 * contract); delivery/refund then happen in the player's Подарки block (which
 * reuses the bot's deliver/refund). Premium is just a gift with a premium code,
 * so it needs no separate flow. Confirm + reason + audit.
 */
function GiftGrantCard({ userId }: { userId: number }) {
  const [gifts, setGifts] = useState<GrantableGift[]>([])
  const [code, setCode] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const a = ACCENT.amber

  useEffect(() => {
    let alive = true
    fetch('/api/admin/gifts/grant')
      .then((r) => (r.ok ? r.json() : { gifts: [] }))
      .then((d) => {
        if (!alive) return
        const list: GrantableGift[] = Array.isArray(d.gifts) ? d.gifts : []
        setGifts(list)
        setLoaded(true)
      })
      .catch(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  const selected = gifts.find((g) => g.code === code)

  async function grant() {
    if (!code) {
      setMsg({ ok: false, text: 'Выбери подарок.' })
      return
    }
    const label = selected?.name ?? code
    if (typeof window !== 'undefined' && !window.confirm(`Выдать «${label}» игроку?`)) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/gifts/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, reason: reason.trim() || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'ошибка')
      setMsg({
        ok: true,
        text: `Выдан «${d.name ?? label}» (ожидает доставки — см. блок «Подарки»).`,
      })
      setReason('')
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cardClass(a.border)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🎁</span>
        <h3 className="text-sm font-semibold text-foreground">Выдать подарок / Premium</h3>
      </div>

      <select
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={inputClass}
        disabled={busy || !loaded}
      >
        <option value="">{loaded ? '— выбери подарок —' : 'загрузка…'}</option>
        {gifts.filter((g) => g.isPremium).length > 0 && (
          <optgroup label="⭐ Telegram Premium">
            {gifts
              .filter((g) => g.isPremium)
              .map((g) => (
                <option key={g.code} value={g.code} disabled={g.remaining === 0}>
                  {g.name}
                  {g.remaining != null ? ` (${g.remaining} шт.)` : ''}
                </option>
              ))}
          </optgroup>
        )}
        <optgroup label="🎀 Подарки">
          {gifts
            .filter((g) => !g.isPremium)
            .map((g) => (
              <option key={g.code} value={g.code} disabled={g.remaining === 0}>
                {g.name}
                {g.remaining != null ? ` (${g.remaining} шт.)` : ''}
              </option>
            ))}
        </optgroup>
      </select>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина (необязательно)"
        className={`mt-2 ${inputClass}`}
      />

      <button
        type="button"
        disabled={busy || !code}
        onClick={grant}
        className="mt-2 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
      >
        Выдать
      </button>
      <p className="mt-1 text-[10px] text-muted-foreground/70">
        Создаёт ожидающую доставку. Отметить выданным/вернуть — в блоке «Подарки».
      </p>
      <Feedback msg={msg} />
    </div>
  )
}
