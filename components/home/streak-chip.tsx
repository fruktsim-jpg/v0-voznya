'use client'

import { useApi } from '@/hooks/use-api'
import { Glyph } from '@/components/ds/icon'

type MeSummary = {
  authenticated: boolean
  registered?: boolean
  streak?: number | null
}

/** Russian plural: one / few (2-4) / many. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/**
 * StreakChip (Track 1 — surfacing) — показывает дневную серию игрока.
 * `streak` уже возвращается из `/api/me/summary` (identity.streak = ферм-серия),
 * но НИГДЕ на сайте не отображался — чистая потеря «крючка возвращения». Здесь
 * выводим серию на главной как заметную плашку. Новых данных/запросов к БД нет.
 * Молча скрывается для гостей и при серии 0 (нечего праздновать — нет шума).
 */
export function StreakChip() {
  const { data } = useApi<MeSummary>('/api/me/summary', 0)

  if (!data || !data.authenticated || data.registered === false) return null
  const streak = data.streak ?? 0
  if (streak <= 0) return null

  return (
    <section className="px-4 pt-5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div
          className="glass flex items-center gap-3 overflow-hidden rounded-2xl border border-[#FF8A3D]/35 px-4 py-3"
          style={{
            backgroundImage:
              'linear-gradient(110deg, rgba(255,138,61,0.14), rgba(255,193,61,0.06) 70%, transparent)',
          }}
        >
        <span className="text-2xl text-[var(--accent-gold)]" aria-hidden>
          <Glyph name="flame" />
        </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">
              Серия {streak} {plural(streak, 'день', 'дня', 'дней')} подряд
            </div>
            <div className="text-xs text-muted-foreground">
              Заходи каждый день, чтобы не сбить серию
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
