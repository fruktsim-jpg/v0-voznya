import { Card } from '@/components/v2/card'
import { Section } from '@/components/v2/section'
import { RarityBadge } from '@/components/v2/rarity-badge'
import { EmptyState } from '@/components/v2/empty-state'
import { rarityToken } from '@/lib/rarity'
import {
  buildAchievementStatus,
  prestigeTier,
  type AchievementStatus,
} from '@/lib/achievements-ux'

/**
 * AchievementsExperience (V3, поверхность №3) — система статуса, а не список:
 * — баннер престижа (сумма очков → титул-тир);
 * — витрина лучших достижений (по редкости);
 * — серии по категориям с прогресс-барами;
 * — недостающие достижения как мотивация;
 * — глобальная редкость («открыли X% игроков»).
 * Всё на существующих данных (каталог + факты разблокировок + глобальные
 * счётчики). Server component, mobile-first.
 */

function pctLabel(p: number | null): string | null {
  if (p == null) return null
  const v = p * 100
  if (v < 1) return 'редчайшее · <1%'
  return `${v < 10 ? v.toFixed(1) : Math.round(v)}% игроков`
}

function AchTile({ a, locked = false }: { a: AchievementStatus; locked?: boolean }) {
  const t = rarityToken(a.rarity)
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
        locked ? 'opacity-45 grayscale' : ''
      }`}
      style={{
        borderColor: a.rarity === 'common' || locked ? 'rgba(255,255,255,0.08)' : t.color,
        boxShadow: locked ? undefined : a.rarity === 'common' ? undefined : t.glow || undefined,
      }}
    >
      <span className="text-2xl" aria-hidden="true">
        {locked ? '🔒' : a.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-semibold text-foreground">{a.name}</span>
          {!locked && <RarityBadge rarity={a.rarity} />}
        </div>
        <div className="truncate text-xs text-muted-foreground">{a.description}</div>
        {!locked && pctLabel(a.globalPct) && (
          <div className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: t.color }}>
            {pctLabel(a.globalPct)}
          </div>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export function AchievementsExperience({
  owned,
  globalCounts,
  totalPlayers,
}: {
  owned: { code: string; unlockedAt: string }[]
  globalCounts?: Map<string, number>
  totalPlayers?: number
}) {
  const { series, best, prestige, ownedCount, totalCount } = buildAchievementStatus({
    owned,
    globalCounts,
    totalPlayers,
  })
  const tier = prestigeTier(prestige)
  const tierToken = rarityToken(tier.rarity)

  if (ownedCount === 0) {
    return (
      <Section title="Достижения" subtitle="Коллекция статуса" className="!px-0">
        <EmptyState
          icon="🏆"
          title="Коллекция пока пуста"
          description="Первое достижение откроет путь к статусу легенды Возни."
        />
      </Section>
    )
  }

  // Недостающие: самые ценные ещё не открытые (мотивация).
  const missing = series
    .flatMap((s) => s.items)
    .filter((a) => !a.owned && !a.hidden)
    .sort((x, y) => y.reward - x.reward)
    .slice(0, 4)

  return (
    <Section title="Достижения" subtitle="Коллекция статуса" className="!px-0">
      {/* Баннер престижа */}
      <Card
        variant={tier.rarity === 'common' ? 'default' : (tier.rarity as never)}
        className="mb-4 flex items-center gap-4"
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${tierToken.color}22`, color: tierToken.color }}
        >
          🏅
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: tierToken.color }}>
              {tier.label}
            </span>
            <RarityBadge rarity={tier.rarity} />
          </div>
          <div className="text-xs text-muted-foreground">
            {ownedCount} из {totalCount} достижений · {prestige.toLocaleString('ru-RU')} очков престижа
          </div>
          <div className="mt-1.5">
            <ProgressBar value={ownedCount} max={totalCount} color={tierToken.color} />
          </div>
        </div>
      </Card>

      {/* Витрина лучших */}
      <div className="mb-5">
        <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Лучшее</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {best.slice(0, 4).map((a) => (
            <AchTile key={a.code} a={a} />
          ))}
        </div>
      </div>

      {/* Серии по категориям */}
      <div className="space-y-4">
        {series.map((s) => {
          const catColor = rarityToken(
            s.owned === s.total ? 'legendary' : s.owned > 0 ? 'rare' : 'common',
          ).color
          return (
            <div key={s.category}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">{s.emoji}</span>
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {s.owned}/{s.total}
                </span>
              </div>
              <div className="mb-2">
                <ProgressBar value={s.owned} max={s.total} color={catColor} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {s.items.map((a) => (
                  <AchTile key={a.code} a={a} locked={!a.owned} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Недостающие — мотивация */}
      {missing.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            До чего стоит дотянуться
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {missing.map((a) => (
              <AchTile key={a.code} a={a} locked />
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}
