'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/lib/voznya-bot'

/**
 * Admin action panel for a player: economy, MMR, reputation, inventory and
 * achievements. Built around quick-amount buttons so a moderator rarely has to
 * type. Each submit hits its API route and refreshes the page on success. The
 * server re-checks permissions regardless of which buttons are shown.
 */
export function PlayerActions({
  userId,
  canEconomy,
  canInventory,
  canMmr,
  canReputation,
  canAchievements,
}: {
  userId: number
  canEconomy: boolean
  canInventory: boolean
  canMmr: boolean
  canReputation: boolean
  canAchievements: boolean
}) {
  return (
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
        />
      )}
      {canInventory && <InventoryCard userId={userId} />}
      {canAchievements && <AchievementsCard userId={userId} />}
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
}) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const a = ACCENT[accent]

  async function send(value: number, direction: 'add' | 'remove') {
    if (!Number.isInteger(value) || value <= 0) {
      setMsg({ ok: false, text: 'Введите положительное целое число.' })
      return
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
      <Feedback msg={msg} />
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
        <input
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
          placeholder="Код предмета"
          className={inputClass}
        />
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
