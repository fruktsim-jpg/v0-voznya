import type { Rarity } from '@/lib/rarity'
import type { ShowcaseCase, ShowcaseReward } from '@/lib/cases'

/**
 * Cases UX helpers (VOZNYA EXPERIENCE V3 — поверхность №5). Кейсы — часть
 * ЭКОНОМИКИ и СТАТУСА, не отдельная игра: акцент на ЦЕННОСТИ наград, а не на
 * открытии. Чистые производные над существующими данными (case_definitions /
 * case_rewards), без новых таблиц. Никакого «казино-баннера».
 */

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

/** Нормализует строковую редкость предмета в тир системы (fallback common). */
function normalizeRarity(r: string | null | undefined): Rarity {
  const v = (r ?? '').toLowerCase()
  return (RARITY_ORDER as string[]).includes(v) ? (v as Rarity) : 'common'
}

/**
 * Редкость награды для витрины. Предмет → его собственная редкость; валюта →
 * псевдо-редкость по сумме (крупный выигрыш ценится выше). Джекпот/лимитка
 * поднимают тир — это «вау»-награды кейса.
 */
export function rewardRarity(r: ShowcaseReward): Rarity {
  let base: Rarity
  if (r.rewardKind === 'item') {
    base = normalizeRarity(r.rewardItemRarity)
  } else {
    const amount = r.amount ?? 0
    base =
      amount >= 10000
        ? 'legendary'
        : amount >= 3000
          ? 'epic'
          : amount >= 800
            ? 'rare'
            : amount >= 200
              ? 'uncommon'
              : 'common'
  }
  if (r.isJackpot) base = maxRarity(base, 'legendary')
  else if (r.limited) base = maxRarity(base, 'epic')
  return base
}

function maxRarity(a: Rarity, b: Rarity): Rarity {
  return RARITY_ORDER.indexOf(a) >= RARITY_ORDER.indexOf(b) ? a : b
}

export type RewardView = ShowcaseReward & { rarity: Rarity; label: string }

const fmt = (n: number) => n.toLocaleString('ru-RU')

/** Человеческая подпись награды (без количества). */
export function rewardLabel(r: ShowcaseReward): string {
  if (r.rewardKind === 'item') return r.rewardItemName ?? r.rewardItemCode ?? 'предмет'
  return `${fmt(r.amount ?? 0)} ешек`
}

/** Подпись количества для награды (×N или диапазон), либо ''. */
export function qtyLabel(r: ShowcaseReward): string {
  if (r.minQty === r.maxQty) return r.minQty > 1 ? `×${r.minQty}` : ''
  return `×${r.minQty}–${r.maxQty}`
}

export type CaseView = ShowcaseCase & {
  rewardsView: RewardView[]
  /** Лучшие награды (по редкости, затем шанс) — превью ценности. */
  best: RewardView[]
  /** Высший тир в кейсе — задаёт акцент карточки. */
  topRarity: Rarity
  /** Суммарный шанс редких выпадений (rare+). */
  rareChance: number
  /** Есть ли джекпот/лимитка. */
  hasJackpot: boolean
}

/** Обогащает кейс производными для витрины (ценность важнее открытия). */
export function buildCaseView(c: ShowcaseCase): CaseView {
  const rewardsView: RewardView[] = c.rewards.map((r) => ({
    ...r,
    rarity: rewardRarity(r),
    label: rewardLabel(r),
  }))

  const best = [...rewardsView].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.chance - a.chance,
  )

  const topRarity = best[0]?.rarity ?? 'common'
  const rareChance = rewardsView
    .filter((r) => RARITY_ORDER.indexOf(r.rarity) >= RARITY_ORDER.indexOf('rare'))
    .reduce((s, r) => s + r.chance, 0)
  const hasJackpot = rewardsView.some((r) => r.isJackpot || r.limited)

  return { ...c, rewardsView, best, topRarity, rareChance, hasJackpot }
}

/** Подпись шанса в процентах с разумной точностью. */
export function chanceLabel(pct: number): string {
  if (pct >= 10) return `${pct.toFixed(0)}%`
  if (pct >= 1) return `${pct.toFixed(1)}%`
  return `${pct.toFixed(2)}%`
}
