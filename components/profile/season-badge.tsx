import Link from 'next/link'
import { getSeasonProfile, TITLE_LABELS } from '@/lib/season'

/**
 * Сезонный блок профиля игрока (website-first). Показывает дивизион и титулы.
 * Безопасен к деплоям без сезонной схемы: при ошибке БД
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
        {profile.rank && (
          <div className="text-right">
            <div className="text-xl font-bold text-primary">#{profile.rank}</div>
            <div className="text-xs text-muted-foreground">в сезоне</div>
          </div>
        )}
      </div>

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
