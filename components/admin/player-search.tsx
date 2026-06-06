'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { roleLabel } from '@/lib/admin-format'
import { formatCurrency } from '@/lib/pluralize'

type PlayerHit = {
  user_id: number
  username: string | null
  first_name: string | null
  balance: number
  role: string | null
}

/**
 * The primary entry point of the admin panel: a fast, autofocused search by
 * user_id / username / name. Debounced live results; Enter jumps to the first
 * hit. Matches the site's glass + violet design language.
 */
export function PlayerSearch({ autoFocus = true }: { autoFocus?: boolean }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<PlayerHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setHits([])
      setError(null)
      return
    }
    let alive = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/players?q=${encodeURIComponent(term)}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (!alive) return
        if (!res.ok) {
          setError(data.error || 'Ошибка поиска')
          setHits([])
        } else {
          setError(null)
          setHits(data.players ?? [])
        }
      } catch {
        if (alive) setError('Сеть недоступна')
      } finally {
        if (alive) setLoading(false)
      }
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q])

  function go(userId: number) {
    router.push(`/admin/players/${userId}`)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hits[0]) go(hits[0].user_id)
  }

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
          🔍
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск игрока — id, @username или имя"
          className="w-full rounded-2xl border border-border bg-white/[0.04] py-3.5 pl-11 pr-4 text-base text-foreground outline-none ring-primary/40 backdrop-blur transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            …
          </span>
        )}
      </form>

      {error && (
        <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {hits.length > 0 && (
        <ul className="mt-3 space-y-2">
          {hits.map((p) => (
            <li key={p.user_id}>
              <button
                onClick={() => go(p.user_id)}
                className="glass flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left transition hover:border-primary/40 hover:bg-primary/[0.06]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold text-foreground">
                  {(p.first_name ?? p.username ?? '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-foreground">
                      {p.first_name ?? 'Без имени'}
                    </span>
                    {p.role && (
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {roleLabel(p.role)}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.username ? `@${p.username} · ` : ''}id {p.user_id}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-amber-200">
                    {formatCurrency(p.balance)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    ешки
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && q.trim() && hits.length === 0 && !error && (
        <div className="mt-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-6 text-center text-sm text-muted-foreground">
          Никого не нашли по запросу «{q.trim()}»
        </div>
      )}
    </div>
  )
}
