'use client'

import { useApi } from '@/hooks/use-api'

type MeSummary = {
  authenticated: boolean
  registered?: boolean
  name?: string | null
  rank?: number | null
  mmrRank?: { name: string } | null
  reputation?: number | null
}

type Standing = {
  rank: number
  total: number
  balance: number
  toNext: number
  nextName: string | null
}

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * YouAreHere (Track 1 — «ты здесь») — плашка над таблицей лидеров с местом
 * текущего игрока. Раньше топы были чисто зрительскими: игрок не мог найти себя.
 * Молча скрывается для гостей/незарегистрированных/при отсутствии ранга.
 *
 * Два режима:
 *  • `endpoint` → {standing} (rank/total/toNext/nextName): показывает место «#N
 *    из M» И крючок-погоню «до <имя выше> N ешек» — социальное сравнение, а не
 *    просто позиция. Использует существующие данные (тот же баланс).
 *  • иначе fallback на `/api/me/summary` (как раньше), поле по `metric`.
 */
export function YouAreHere({
  metric = 'rank',
  label,
  endpoint,
  unit = 'ешек',
}: {
  metric?: 'rank'
  label?: string
  endpoint?: string
  unit?: string
}) {
  if (endpoint) return <YouAreHereStanding endpoint={endpoint} label={label} unit={unit} />
  return <YouAreHereSummary metric={metric} label={label} />
}

function YouAreHereStanding({ endpoint, label, unit }: { endpoint: string; label?: string; unit: string }) {
  const { data } = useApi<{ standing: Standing | null }>(endpoint, 0)
  const s = data?.standing
  if (!s) return null
  const isTop = s.rank === 1

  return (
    <div className="mx-auto mt-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            #{s.rank}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">
              {label ?? 'Твоё место'} <span className="text-muted-foreground">из {fmt(s.total)}</span>
            </div>
            {isTop ? (
              <div className="text-[11px] font-medium text-amber-300">Ты на вершине 👑</div>
            ) : s.nextName ? (
              <div className="truncate text-[11px] text-muted-foreground">
                до <span className="text-foreground">{s.nextName}</span> —{' '}
                <span className="font-semibold text-primary">{fmt(s.toNext)}</span> {unit}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function YouAreHereSummary({ metric, label }: { metric: 'rank'; label?: string }) {
  const { data } = useApi<MeSummary>('/api/me/summary', 0)

  if (!data || !data.authenticated || data.registered === false) return null
  const value = metric === 'rank' ? data.rank : null
  if (value == null) return null

  return (
    <div className="mx-auto mt-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            #{value}
          </span>
          <span className="text-sm font-medium text-foreground">
            {label ?? 'Твоё место в рейтинге'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{data.name ?? 'ты'}</span>
      </div>
    </div>
  )
}
