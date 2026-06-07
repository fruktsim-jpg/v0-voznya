import { ACHIEVEMENTS, type Achievement } from '@/lib/voznya-bot'
import type { Rarity } from '@/lib/rarity'

/**
 * Achievements + Titles UX helpers (VOZNYA EXPERIENCE V3 — поверхность №3).
 * Превращает существующий каталог достижений и счётчики разблокировок в
 * СИСТЕМУ СТАТУСА: серии (категории), редкость (по награде + глобальной
 * редкости), прогресс, престиж и недостающие достижения. Никаких новых данных
 * и таблиц — только производные над `ACHIEVEMENTS` (зеркало бота) и фактами
 * разблокировок игрока. Чистые функции, можно звать и на сервере, и в UI.
 */

export type AchievementCategory =
  | 'economy'
  | 'casino'
  | 'duel'
  | 'treasure'
  | 'marriage'
  | 'nomination'
  | 'legend'
  | 'secret'

export const CATEGORY_META: Record<
  AchievementCategory,
  { label: string; emoji: string; order: number }
> = {
  legend: { label: 'Легенды Возни', emoji: '👑', order: 0 },
  economy: { label: 'Экономика', emoji: '💰', order: 1 },
  duel: { label: 'Дуэли', emoji: '⚔️', order: 2 },
  treasure: { label: 'Клады', emoji: '📦', order: 3 },
  casino: { label: 'Казино', emoji: '🎰', order: 4 },
  marriage: { label: 'Браки', emoji: '💍', order: 5 },
  nomination: { label: 'Номинации', emoji: '🏳️', order: 6 },
  secret: { label: 'Секретные', emoji: '🤫', order: 7 },
}

/**
 * Редкость достижения. Базируется на «престиже» (награде), а если известна
 * глобальная редкость (сколько игроков всего открыли при известном totalPlayers)
 * — поднимает тир для по-настоящему редких. Без новых систем.
 */
export function achievementRarity(
  reward: number,
  opts?: { unlocked?: number; totalPlayers?: number },
): Rarity {
  let base: Rarity =
    reward >= 1500
      ? 'legendary'
      : reward >= 700
        ? 'epic'
        : reward >= 200
          ? 'rare'
          : reward >= 50
            ? 'uncommon'
            : 'common'

  // Глобальная редкость: если открыли <2% игроков — это легенда независимо от
  // награды; <8% — минимум epic. Поднимаем, но не понижаем.
  if (opts?.totalPlayers && opts.totalPlayers > 20 && opts.unlocked != null) {
    const pct = opts.unlocked / opts.totalPlayers
    if (pct > 0 && pct < 0.02) base = maxRarity(base, 'legendary')
    else if (pct > 0 && pct < 0.08) base = maxRarity(base, 'epic')
  }
  return base
}

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
function maxRarity(a: Rarity, b: Rarity): Rarity {
  return RARITY_ORDER.indexOf(a) >= RARITY_ORDER.indexOf(b) ? a : b
}

export type AchievementStatus = Achievement & {
  rarity: Rarity
  owned: boolean
  /** Доля игроков, открывших достижение (0..1), если известно. */
  globalPct: number | null
  unlockedAt: string | null
}

export type CategorySeries = {
  category: AchievementCategory
  label: string
  emoji: string
  total: number
  owned: number
  items: AchievementStatus[]
}

/**
 * Собирает полную картину достижений игрока: статус каждого (owned/rarity/
 * глобальная редкость) и разбивку по сериям-категориям с прогрессом.
 * `ownedCodes` — коды открытых игроком (с датами); `globalCounts` — сколько
 * всего игроков открыли каждое (из getAchievementsProgress); `totalPlayers` —
 * размер сообщества для расчёта редкости.
 */
export function buildAchievementStatus(args: {
  owned: { code: string; unlockedAt: string }[]
  globalCounts?: Map<string, number>
  totalPlayers?: number
}): {
  all: AchievementStatus[]
  series: CategorySeries[]
  best: AchievementStatus[]
  prestige: number
  ownedCount: number
  totalCount: number
} {
  const ownedMap = new Map(args.owned.map((o) => [o.code, o.unlockedAt]))

  const all: AchievementStatus[] = ACHIEVEMENTS.map((a) => {
    const owned = ownedMap.has(a.code)
    const unlocked = args.globalCounts?.get(a.code) ?? undefined
    const globalPct =
      args.totalPlayers && args.totalPlayers > 0 && unlocked != null
        ? unlocked / args.totalPlayers
        : null
    return {
      ...a,
      owned,
      rarity: achievementRarity(a.reward, { unlocked, totalPlayers: args.totalPlayers }),
      globalPct,
      unlockedAt: ownedMap.get(a.code) ?? null,
    }
  })

  // Скрытые секретки показываем только если открыты.
  const visible = all.filter((a) => !a.hidden || a.owned)

  const byCat = new Map<AchievementCategory, AchievementStatus[]>()
  for (const a of visible) {
    const cat = a.category as AchievementCategory
    if (!byCat.has(cat)) byCat.set(cat, [])
    byCat.get(cat)!.push(a)
  }

  const series: CategorySeries[] = [...byCat.entries()]
    .map(([category, items]) => {
      const meta = CATEGORY_META[category] ?? { label: category, emoji: '🏅', order: 99 }
      return {
        category,
        label: meta.label,
        emoji: meta.emoji,
        total: items.length,
        owned: items.filter((i) => i.owned).length,
        items: items.sort((x, y) => Number(y.owned) - Number(x.owned) || y.reward - x.reward),
      }
    })
    .sort(
      (a, b) =>
        (CATEGORY_META[a.category]?.order ?? 99) - (CATEGORY_META[b.category]?.order ?? 99),
    )

  // Лучшие — открытые, по убыванию награды (редкости).
  const best = all
    .filter((a) => a.owned)
    .sort((x, y) => y.reward - x.reward)

  // Престиж — сумма наград открытых достижений (как «очки статуса»).
  const prestige = best.reduce((s, a) => s + a.reward, 0)

  const ownedCount = best.length
  const totalCount = ACHIEVEMENTS.filter((a) => !a.hidden).length

  return { all, series, best, prestige, ownedCount, totalCount }
}

/** Подпись престижности игрока по сумме очков достижений. */
export function prestigeTier(prestige: number): { label: string; rarity: Rarity } {
  if (prestige >= 8000) return { label: 'Легенда Возни', rarity: 'legendary' }
  if (prestige >= 4000) return { label: 'Ветеран', rarity: 'epic' }
  if (prestige >= 1500) return { label: 'Бывалый', rarity: 'rare' }
  if (prestige >= 300) return { label: 'Освоился', rarity: 'uncommon' }
  return { label: 'Новичок', rarity: 'common' }
}
