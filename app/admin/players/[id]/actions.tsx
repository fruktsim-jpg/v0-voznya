'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Admin action forms for a player: economy (credit/debit) and inventory
 * (grant/revoke). Each submit hits its API route; on success the page is
 * refreshed so balances and tables reflect the change. Buttons are shown only
 * for capabilities the server already confirmed (canEconomy / canInventory),
 * but the API re-checks permissions regardless.
 */
export function PlayerActions({
  userId,
  canEconomy,
  canInventory,
}: {
  userId: number
  canEconomy: boolean
  canInventory: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 28,
      }}
    >
      {canEconomy && <EconomyForm userId={userId} />}
      {canInventory && <InventoryForm userId={userId} />}
    </div>
  )
}

const boxStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
  flex: '1 1 320px',
} as const

const inputStyle = {
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  width: '100%',
  boxSizing: 'border-box' as const,
}

const rowStyle = { display: 'flex', gap: 8, marginBottom: 8 } as const

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p style={{ marginTop: 8, color: msg.ok ? '#16a34a' : '#dc2626', fontSize: 13 }}>
      {msg.text}
    </p>
  )
}

function EconomyForm({ userId }: { userId: number }) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(direction: 'add' | 'remove') {
    const value = Number(amount)
    if (!Number.isInteger(value) || value <= 0) {
      setMsg({ ok: false, text: 'Введите положительное целое число.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/economy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: value, direction, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setMsg({
        ok: true,
        text: `Готово. Новый баланс: ${Number(data.balance).toLocaleString('ru-RU')}.`,
      })
      setAmount('')
      setReason('')
      router.refresh()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Ошибка' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={boxStyle}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Экономика</h3>
      <div style={rowStyle}>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Сумма (ешки)"
          style={inputStyle}
        />
      </div>
      <div style={rowStyle}>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Причина (необязательно)"
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('add')}
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #16a34a',
            background: '#16a34a',
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Начислить
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('remove')}
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #dc2626',
            background: '#fff',
            color: '#dc2626',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Снять
        </button>
      </div>
      <Feedback msg={msg} />
    </div>
  )
}

function InventoryForm({ userId }: { userId: number }) {
  const router = useRouter()
  const [itemCode, setItemCode] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
    <div style={boxStyle}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Инвентарь</h3>
      <div style={rowStyle}>
        <input
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
          placeholder="Код предмета (item_code)"
          style={inputStyle}
        />
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Кол-во"
          style={{ ...inputStyle, width: 90 }}
        />
      </div>
      <div style={rowStyle}>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Причина (необязательно)"
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('grant')}
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #2563eb',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Выдать
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('revoke')}
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #dc2626',
            background: '#fff',
            color: '#dc2626',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Отозвать
        </button>
      </div>
      <Feedback msg={msg} />
    </div>
  )
}
