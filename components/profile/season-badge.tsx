import Link from 'next/link'
import { getSeasonProfile, divisionProgress, TITLE_LABELS } from '@/lib/season'

/**
 * Сезонный блок профиля игрока (website-first). Показывает дивизион, сезонный
 * MMR, место и титулы. Безопасен к деплоям без сезонной схемы: при ошибке БД
 * (нет таблиц/колонок до миграции 0033) — тихо ничего не рендерит.
 */
export async function SeasonBadge({ userId }: { userId: number }) {
  let profile
  try {
    profile = await getSeasonProfile(userId)
  } catch {
    return null
  }

  // Нет сезонного прогресса — не засоряем профиль пустым блоком.
  if (profile.seasonMmr <= 0 && profile.titles.length === 0) return null

  const progress = divisionProgress(profile.seasonMmr)

  return (
    <Link
      href="/season"
      className="block rounded-3xl border border-primary/25 bg-primary/[0.05] p-5 transition hover:border-primary/40"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Сезон
          </div>
          <div className="mt-1 flex items-center gap-2 text-xl font-bold text-foreground">
            <span>{profile.division.emoji}</span>
            <span>{profile.division.name}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-primary">
            {profile.seasonMmr.toLocaleString('ru-RU')}
          </div>
          <div className="text-xs text-muted-foreground">
            MMR{profile.rank ? ` · #${profile.rank}` : ''}
          </div>
        </div>
      </div>

      {progress.next && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>До {progress.next.name}</span>
            <span>{progress.toNext.toLocaleString('ru-RU')} MMR</span>
          </div>
          <div className="h-2 rounded bg-white/[0.06]">
            <div
              className="h-2 rounded bg-primary"
              style={{ width: `${Math.round(progress.ratio * 100)}%` }}
            />
          </div>
        </div>
      )}

      {profile.titles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {profile.titles.map((code) => (
            <span
              key={code}
              className="rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-2.5 py-1 text-xs font-medium text-amber-200"
            >
              {TITLE_LABELS[code] ?? code}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
