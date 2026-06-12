'use client'

import { useEffect, useState } from 'react'

/**
 * <AuditTrail> (CC Foundation) — drops the recent audit_log history for a target
 * into any editor. Reads /api/admin/audit?type=&id=. Every Command Center module
 * can show "who changed this, when" with one line.
 */

type Entry = {
  id: number
  actor_user_id: number
  actor_role: string | null
  action: string
  created_at: string
  meta: unknown
}

export function AuditTrail({
  targetType,
  targetId,
  limit = 10,
  refreshKey,
}: {
  targetType: string
  targetId?: string
  limit?: number
  /** Change this to force a reload (e.g. after a mutation). */
  refreshKey?: number | string
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const params = new URLSearchParams({ type: targetType, limit: String(limit) })
    if (targetId) params.set('id', targetId)
    fetch(`/api/admin/audit?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => {
        if (alive) setEntries(Array.isArray(d.entries) ? d.entries : [])
      })
      .catch(() => alive && setEntries([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [targetType, targetId, limit, refreshKey])

  if (loading) {
    return <p className="text-[11px] text-muted-foreground/70">История…</p>
  }
  if (entries.length === 0) {
    return <p className="text-[11px] text-muted-foreground/70">Изменений пока нет.</p>
  }

  return (
    <ul className="space-y-1">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground/80">{e.action}</span>
          <span>·</span>
          <span>{e.actor_role ?? 'admin'} id {e.actor_user_id}</span>
          <span>·</span>
          <span>{new Date(e.created_at).toLocaleString('ru-RU')}</span>
        </li>
      ))}
    </ul>
  )
}
