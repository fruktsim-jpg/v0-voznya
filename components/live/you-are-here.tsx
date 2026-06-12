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

/**
 * YouAreHere (Track 1 — «ты здесь») — тонкая плашка над таблицей лидеров,
 * которая показывает место текущего игрока. Раньше топы были чисто
 * зрительскими: игрок не мог найти себя. Использует уже существующий
 * `/api/me/summary` (rank = место по балансу), новых данных не добавляет.
 * Молча скрывается для гостей/незарегистрированных/при отсутствии ранга.
 *
 * `metric` выбирает, какое поле summary показать как «место».
 */
export function YouAreHere({
  metric = 'rank',
  label,
}: {
  metric?: 'rank'
  label?: string
}) {
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
