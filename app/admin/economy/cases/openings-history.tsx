'use client'

import { useEffect, useState } from 'react'

/**
 * Case openings history (client). Read-only view over the bot's append-only
 * `case_openings` ledger via GET /api/admin/cases/openings. Supports optional
 * filtering by case code; the bot is the only writer, the site never mutates it.
 */

type Opening = {
  id: string
  user_id: string
  user_name: string | null
  case_item_code: string
  reward_kind: string
  reward_item_code: string | null
  reward_item_name: string | null
  amount: string | null
  qty: number
  roll: number
  created_at: string
}

const fmt = (n: number | string | null) =>
  n == null ? '—' : Number(n).toLocaleString('ru-RU')

export function OpeningsHistory({
  cases,
}: {
  cases: { code: string; name: string }[]
}) {
  const [caseFilter, setCaseFilter] = useState<string>('')
  const [rows, setRows] = useState<Opening[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const qs = new URLSearchParams({ limit: '100' })
    if (caseFilter) qs.set('case', caseFilter)
    fetch(`/api/admin/cases/openings?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : { openings: [] }))
      .then((d) => alive && setRows(Array.isArray(d.openings) ? d.openings : []))
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [caseFilter])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Кейс
        </label>
        <select
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
          className="rounded-xl border border-input bg-white/[0.04] px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
        >
          <option value="">Все кейсы</option>
          {cases.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="glass rounded-2xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Загрузка…
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Пока нет открытий.
        </div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Когда</th>
                <th className="px-3 py-2 font-semibold">Игрок</th>
                <th className="px-3 py-2 font-semibold">Кейс</th>
                <th className="px-3 py-2 font-semibold">Награда</th>
                <th className="px-3 py-2 text-right font-semibold">Roll</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const reward =
                  o.reward_kind === 'currency'
                    ? `💰 ${fmt(o.amount)} ешек`
                    : `${o.reward_item_name ?? o.reward_item_code ?? 'предмет'} ×${o.qty}`
                return (
                  <tr key={o.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {o.user_name ?? `id ${o.user_id}`}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {o.case_item_code}
                    </td>
                    <td className="px-3 py-2 text-foreground">{reward}</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-muted-foreground">
                      {o.roll}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
