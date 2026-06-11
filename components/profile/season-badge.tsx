import Link from 'next/link'
import { getSeasonProfile, TITLE_LABELS } from '@/lib/season'
import { prestigeForDivision } from '@/lib/ds/prestige'
import { DivisionBadge } from '@/components/prestige'

/**
 * Сезонный блок профиля игрока (website-first). Показывает дивизион и титулы.
 * Безопасен к деплоям без сезонной схемы: при ошибке БД
 * (нет таблиц/колонок до миграции 0033) — тихо ничего не рендерит.
 *
 * A4: блок окрашен в ТИР-МИР дивизиона — Bronze и Diamond больше не выглядят
 * одинаково; рамка/фон/заголовок несут цвет дивизиона.
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

  const t = prestigeForDivision(profile.division.name)

  return (
    <Link
      href="/season"
      className="block overflow-hidden rounded-3xl border p-5 transition hover:opacity-95"
      style={{
        borderColor: `${t.color}40`,
        background: t.index >= 2 ? t.gradient : `${t.color}0d`,
        boxShadow: t.index >= 4 ? t.glow || undefined : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Сезон
          </div>
          <div className="mt-1.5">
            <DivisionBadge emoji={profile.division.emoji} name={profile.division.name} size="lg" />
          </div>
        </div>
        {profile.rank && (
          <div className="text-right">
            <div className="text-xl font-bold" style={{ color: t.color }}>
              #{profile.rank}
            </div>
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
