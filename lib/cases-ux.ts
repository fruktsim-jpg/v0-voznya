import {
  currencyRewardRarity,
  maxRarity,
  normalizeRarity,
  RARITY_ORDER,
  type Rarity,
} from '@/lib/rarity'
import type { ShowcaseCase, ShowcaseReward } from '@/lib/cases'
import type { GlyphName } from '@/components/ds/icon/glyph'
import type { ItemClass } from '@/lib/item-art/model'

/**
 * Cases UX helpers (VOZNYA EXPERIENCE V3 — поверхность №5). Кейсы — часть
 * ЭКОНОМИКИ и СТАТУСА, не отдельная игра: акцент на ЦЕННОСТИ наград, а не на
 * открытии. Чистые производные над существующими данными (case_definitions /
 * case_rewards), без новых таблиц. Никакого «казино-баннера».
 *
 * Порядок тиров, нормализация и валютная псевдо-редкость берутся из lib/rarity
 * (единый источник правды) — не дублируем, чтобы превью кейса и экран открытия
 * не разъезжались.
 */

/**
 * Редкость награды для витрины. Предмет → его собственная редкость; валюта →
 * псевдо-редкость по сумме (крупный выигрыш ценится выше). Джекпот/лимитка
 * поднимают тир — это «вау»-награды кейса.
 */
export function rewardRarity(r: ShowcaseReward): Rarity {
  let base: Rarity
  if (r.rewardKind === 'item') {
    base = normalizeRarity(r.rewardItemRarity)
  } else if (r.rewardKind === 'tg_gift') {
    // Реальный Telegram Gift / Premium — самые ценные награды кейса. Premium
    // (джекпот) поднимется до legendary ниже; остальные гифты — минимум epic.
    base = 'epic'
  } else {
    base = currencyRewardRarity(r.amount ?? 0)
  }
  if (r.isJackpot) base = maxRarity(base, 'legendary')
  else if (r.limited) base = maxRarity(base, 'epic')
  return base
}

export type RewardView = ShowcaseReward & { rarity: Rarity; label: string }

const fmt = (n: number) => n.toLocaleString('ru-RU')

/** Человеческая подпись награды (без количества). */
export function rewardLabel(r: ShowcaseReward): string {
  if (r.rewardKind === 'item') return r.rewardItemName ?? r.rewardItemCode ?? 'предмет'
  if (r.rewardKind === 'tg_gift') return r.rewardItemName ?? r.rewardItemCode ?? 'подарок'
  return `${fmt(r.amount ?? 0)} ешек`
}


/** Подпись количества для награды (×N или диапазон), либо ''. */
export function qtyLabel(r: ShowcaseReward): string {
  if (r.minQty === r.maxQty) return r.minQty > 1 ? `×${r.minQty}` : ''
  return `×${r.minQty}–${r.maxQty}`
}

/**
 * Категория кейса для хаба (Stage 3). Производная ТОЛЬКО из существующих
 * данных — новых колонок в БД нет. Эвристика:
 *   - premium  — есть награда Telegram Premium;
 *   - event    — задано окно (starts_at/ends_at) → ограниченное событие;
 *   - seasonal — задан season_code (но без жёсткого окна);
 *   - free     — открытие бесплатно или по ключу;
 *   - standard — всё остальное (за ешки).
 * Featured (главный кейс хаба) выбирается отдельно в layoutCases().
 */
export type CaseCategory = 'premium' | 'event' | 'seasonal' | 'free' | 'standard'

/**
 * Метаданные категорий. `glyph` — имя ОWNED-глифа (см. components/ds/icon),
 * не эмодзи: Cases говорит на том же визуальном языке, что и остальная система.
 */
export const CASE_CATEGORY_META: Record<CaseCategory, { label: string; glyph: string }> = {
  premium: { label: 'Premium', glyph: 'star' },
  event: { label: 'Событие', glyph: 'bolt' },
  seasonal: { label: 'Сезонные', glyph: 'season' },
  free: { label: 'Бесплатные', glyph: 'gift' },
  standard: { label: 'Кейсы', glyph: 'case' },
}

/**
 * Owned-глиф для арт-капсулы награды (вместо «📦-как-арт»). Реального арта у
 * наград нет (нет колонки image), поэтому показываем глиф на подложке цвета
 * редкости — это и есть «мечта», поданная премиально, а не безликая коробка.
 */
export function rewardGlyph(r: ShowcaseReward): GlyphName {
  if (r.rewardKind === 'tg_gift') return 'gift'
  if (r.rewardKind === 'currency') return 'coin'
  if (r.isJackpot) return 'crown'
  return 'trophy'
}

/**
 * Canonical ItemClass for a case reward — lets the ItemArt resolver fetch
 * real/templated art for the reward's underlying item code (P0 funnel). The
 * SVG `rewardGlyph` stays as the fallback when no asset exists yet.
 */
export function rewardItemClass(r: ShowcaseReward): ItemClass {
  if (r.rewardKind === 'tg_gift') return 'gift'
  if (r.rewardKind === 'currency') return 'currency'
  return 'collectible'
}

/** Доля каждого тира в кейсе (по суммарному шансу). Для полосы распределения. */
export type RaritySlice = { rarity: Rarity; chance: number }

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
  /** Самая ценная награда кейса (для строки «ради чего крутить»). */
  topReward: RewardView | null
  /** Суммарный шанс джекпот/лимит-наград (%), 0 если их нет. */
  jackpotChance: number
  /** Суммарный шанс выпадения любого Telegram Gift (tg_gift), %. */
  giftChance: number
  /** Суммарный шанс выпадения Telegram Premium (любой срок), %. */
  premiumChance: number

  /**
   * Полоса редкостей содержимого для «кейс-стейджа»: каждая награда — одна
   * плашка цвета своей редкости, в стабильном порядке от редкого к частому.
   * Чисто визуальный каркас будущей рулетки (никакого RNG/исхода).
   */
  rarityStrip: Rarity[]

  // --- Stage 3 derivations (presentation only) ---
  /** Производная категория для хаба. */
  category: CaseCategory
  /** Ограничен ли кейс по времени (есть ends_at в будущем). */
  isLimited: boolean
  /** Премиальный кейс (содержит Telegram Premium). */
  isPremiumCase: boolean
  /** Сколько наград в дроп-листе. */
  rewardCount: number
  /** Распределение редкостей по суммарному шансу (для полосы и детального экрана). */
  rarityDistribution: RaritySlice[]
  /** Человеческая «ради чего крутить» строка ценности. */
  valueProp: string | null
  /** Осталось времени до закрытия окна (мс), либо null. */
  endsInMs: number | null
  /**
   * РЕАЛЬНЫЙ остаток самой дефицитной лимитированной награды
   * (min по max_global_supply − granted_count), либо null если лимиток нет.
   * Источник честной срочности «осталось N». Никогда не выдумывается.
   */
  scarcest: { reward: RewardView; remaining: number } | null
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
  const jackpotRewards = rewardsView.filter((r) => r.isJackpot || r.limited)
  const hasJackpot = jackpotRewards.length > 0
  const jackpotChance = jackpotRewards.reduce((s, r) => s + r.chance, 0)
  const topReward = best[0] ?? null

  // Шансы реальных Telegram-наград (для строк «шанс Gift / шанс Premium»).
  const giftRewards = rewardsView.filter((r) => r.rewardKind === 'tg_gift')
  const giftChance = giftRewards.reduce((s, r) => s + r.chance, 0)
  const premiumChance = giftRewards
    .filter((r) => /premium/i.test(r.rewardItemCode ?? ''))
    .reduce((s, r) => s + r.chance, 0)


  // Каркас будущей рулетки: плашка на каждую награду, от редкого к частому.
  const rarityStrip = best.map((r) => r.rarity)

  // --- Stage 3 derivations ---
  const isPremiumCase = premiumChance > 0
  const now = Date.now()
  const endsAtMs = c.endsAt ? new Date(c.endsAt).getTime() : null
  const startsAtMs = c.startsAt ? new Date(c.startsAt).getTime() : null
  const endsInMs = endsAtMs != null && endsAtMs > now ? endsAtMs - now : null
  const hasWindow = endsAtMs != null || (startsAtMs != null && startsAtMs > 0)
  const isLimited = endsInMs != null
  const isFree =
    c.openCostKind === 'free' || (c.openCostKind !== 'currency' && !c.openCostAmount)

  const category: CaseCategory = isPremiumCase
    ? 'premium'
    : isLimited || hasWindow
      ? 'event'
      : c.seasonCode
        ? 'seasonal'
        : isFree && !c.consumesKey
          ? 'free'
          : 'standard'

  // Распределение редкостей по суммарному шансу — для полосы и детального экрана.
  const distMap = new Map<Rarity, number>()
  for (const r of rewardsView) {
    distMap.set(r.rarity, (distMap.get(r.rarity) ?? 0) + r.chance)
  }
  const rarityDistribution: RaritySlice[] = RARITY_ORDER.filter((r) => distMap.has(r))
    .map((rarity) => ({ rarity, chance: distMap.get(rarity) ?? 0 }))
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))

  // «Ради чего крутить»: топ-награда + её шанс, если она ощутимо редкая.
  let valueProp: string | null = null
  if (topReward && RARITY_ORDER.indexOf(topReward.rarity) >= RARITY_ORDER.indexOf('rare')) {
    valueProp = `${topReward.label} · ${chanceLabel(topReward.chance)}`
  } else if (topReward) {
    valueProp = topReward.label
  }

  // Самая дефицитная лимитированная награда — реальный остаток (N left). Берём
  // минимальный остаток среди наград с заданным max_global_supply. Только из
  // реальных данных: remaining приходит из БД (max_global_supply − granted_count).
  let scarcest: { reward: RewardView; remaining: number } | null = null
  for (const r of rewardsView) {
    if (r.remaining == null) continue
    if (scarcest == null || r.remaining < scarcest.remaining) {
      scarcest = { reward: r, remaining: r.remaining }
    }
  }

  return {
    ...c,
    rewardsView,
    best,
    topRarity,
    rareChance,
    hasJackpot,
    topReward,
    jackpotChance,
    giftChance,
    premiumChance,
    rarityStrip,
    category,
    isLimited,
    isPremiumCase,
    rewardCount: rewardsView.length,
    rarityDistribution,
    valueProp,
    endsInMs,
    scarcest,
  }
}

/**
 * Раскладка кейсов для хаба (Stage 3). Выбирает FEATURED-кейс (самый ценный/
 * редкий) и группирует остальные по категориям в стабильном порядке. Чистая
 * сортировка/группировка над производными — без сетевых запросов и записи.
 */
export type CaseGroup = { category: CaseCategory; cases: CaseView[] }

const CATEGORY_ORDER: CaseCategory[] = ['premium', 'event', 'seasonal', 'standard', 'free']

export function layoutCases(cases: CaseView[]): {
  featured: CaseView | null
  groups: CaseGroup[]
} {
  if (cases.length === 0) return { featured: null, groups: [] }

  // Featured = высший тир, затем наличие джекпота, затем шанс джекпота. Так на
  // верх хаба попадает самый «вкусный» кейс — якорь внимания.
  const ranked = [...cases].sort((a, b) => {
    const tier = RARITY_ORDER.indexOf(b.topRarity) - RARITY_ORDER.indexOf(a.topRarity)
    if (tier !== 0) return tier
    if (a.hasJackpot !== b.hasJackpot) return a.hasJackpot ? -1 : 1
    return b.jackpotChance - a.jackpotChance
  })
  const featured = ranked[0] ?? null

  const rest = cases.filter((c) => c.itemCode !== featured?.itemCode)
  const byCat = new Map<CaseCategory, CaseView[]>()
  for (const c of rest) {
    const list = byCat.get(c.category) ?? []
    list.push(c)
    byCat.set(c.category, list)
  }

  const groups: CaseGroup[] = CATEGORY_ORDER.filter((cat) => byCat.has(cat)).map((category) => ({
    category,
    cases: (byCat.get(category) ?? []).sort((a, b) => a.openCostAmount - b.openCostAmount),
  }))

  return { featured, groups }
}

/** Короткая подпись «осталось …» для ограниченных кейсов. */
export function timeLeftLabel(ms: number | null): string | null {
  if (ms == null || ms <= 0) return null
  const totalMin = Math.floor(ms / 60000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  if (days >= 1) return `${days} дн ${hours} ч`
  if (hours >= 1) return `${hours} ч ${mins} мин`
  return `${mins} мин`
}


/** Подпись шанса в процентах с разумной точностью. */
export function chanceLabel(pct: number): string {
  if (pct >= 10) return `${pct.toFixed(0)}%`
  if (pct >= 1) return `${pct.toFixed(1)}%`
  return `${pct.toFixed(2)}%`
}
