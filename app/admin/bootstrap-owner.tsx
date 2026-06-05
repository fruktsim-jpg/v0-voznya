'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * One-time "become owner" button shown only when the panel detects the caller
 * is in ADMIN_IDS and `admin_roles` is still empty (see admin/layout.tsx).
 * Calls POST /api/admin/bootstrap-owner, then reloads so the now-owner session
 * lands on the real dashboard. After the first owner exists the button never
 * renders again (server-side check), and the endpoint itself stays inert.
 */
export function BootstrapOwner() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function claim() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/bootstrap-owner', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? `Ошибка ${res.status}`)
        setBusy(false)
        return
      }
      // Role granted — refresh server components so the gate now lets us in.
      router.refresh()
    } catch {
      setError('Сеть недоступна, попробуйте ещё раз')
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={claim}
        disabled={busy}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          border: '1px solid #2563eb',
          background: busy ? '#93b4f5' : '#2563eb',
          color: '#fff',
          cursor: busy ? 'default' : 'pointer',
          fontSize: 14,
        }}
      >
        {busy ? 'Назначаю…' : 'Стать владельцем (owner)'}
      </button>
      {error && (
        <p style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>{error}</p>
      )}
    </div>
  )
}
