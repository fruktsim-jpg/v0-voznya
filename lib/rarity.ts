/**
 * Единая система редкостей Возни (VOZNYA_UI_UX_V2_IMPLEMENTATION_PLAN §3,
 * VOZNYA_EVENTS_SYSTEM §3). Используется кейсами, подарками, достижениями,
 * бейджами и важностью событий. Чистый presentational-слой, без данных.
 */

export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'

/**
 * Канонический порядок тиров (от частого к редкому). ЕДИНЫЙ источник правды —
 * используется для сравнения/сортировки редкостей везде (кейсы, открытие,
 * витрины). Не дублировать в других модулях, чтобы тиры не разъезжались.
 */
export const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
]

/** Нормализует строковую редкость в тир системы (fallback common). */
export function normalizeRarity(r: string | null | undefined): Rarity {
  const v = (r ?? '').toLowerCase()
  return (RARITY_ORDER as string[]).includes(v) ? (v as Rarity) : 'common'
}

/** Возвращает более высокий из двух тиров. */
export function maxRarity(a: Rarity, b: Rarity): Rarity {
  return RARITY_ORDER.indexOf(a) >= RARITY_ORDER.indexOf(b) ? a : b
}

/**
 * Псевдо-редкость для валютной награды по сумме (крупный выигрыш ценится выше).
 * ЕДИНЫЙ источник правды: используется и в превью кейса (cases-ux), и в экране
 * выпадения (case-open-ux), чтобы один и тот же выигрыш не показывался разными
 * тирами до и после открытия.
 */
export function currencyRewardRarity(amount: number): Rarity {
  return amount >= 10000
    ? 'legendary'
    : amount >= 3000
      ? 'epic'
      : amount >= 800
        ? 'rare'
        : amount >= 200
          ? 'uncommon'
          : 'common'
}

export type RarityToken = {
  label: string
  /** Базовый цвет тира (border / text accent). */
  color: string
  /** CSS box-shadow для свечения (или '' для common). */
  glow: string
  /** Tailwind-классы текста/границы (используют произвольные значения). */
  textClass: string
  borderClass: string
  /**
   * Радиальный фон капсулы предмета (ItemArt / CollectibleTile). Тонкое
   * свечение цвета редкости из центра. Презентационный слой.
   */
  capsule: string
  /**
   * Линейный градиент тира для крупных акцентов (большая арт-капсула,
   * подложка инспектора предмета). У common — нейтральный, у топ-тиров — цветной.
   */
  gradient: string
}

/**
 * Палитра редкостей — точные цвета Counter-Strike (визуальный референс Figma,
 * VOZNYA REDESIGN). Это якорь «престижа/коллекции» всей платформы: тиры читаются
 * мгновенно и одинаково в кейсах, инвентаре, подарках, событиях и профиле.
 *
 *   common    #B0C3D9  стально-серый   (Consumer)
 *   uncommon  #5E98D9  светло-синий    (Industrial)
 *   rare      #4B69FF  синий           (Mil-Spec)
 *   epic      #8847FF  фиолетовый      (Restricted)
 *   legendary #FFD700  золотой         (особый / премиум)
 *   mythic    #EB4B4B  красный         (Covert / вершина)
 */
export const RARITY_TOKENS: Record<Rarity, RarityToken> = {
  common: {
    label: 'Обычное',
    color: '#B0C3D9',
    glow: '',
    textClass: 'text-[#B0C3D9]',
    borderClass: 'border-white/10',
    capsule: 'radial-gradient(circle at 50% 35%, rgba(176,195,217,0.18), transparent 70%)',
    gradient: 'linear-gradient(135deg, rgba(176,195,217,0.22) 0%, rgba(176,195,217,0.06) 100%)',
  },
  uncommon: {
    label: 'Необычное',
    color: '#5E98D9',
    glow: '0 0 16px -4px rgba(94,152,217,0.50)',
    textClass: 'text-[#5E98D9]',
    borderClass: 'border-[#5E98D9]/45',
    capsule: 'radial-gradient(circle at 50% 35%, rgba(94,152,217,0.28), transparent 70%)',
    gradient: 'linear-gradient(135deg, rgba(94,152,217,0.35) 0%, rgba(94,152,217,0.10) 100%)',
  },
  rare: {
    label: 'Редкое',
    color: '#4B69FF',
    glow: '0 0 18px -4px rgba(75,105,255,0.55)',
    textClass: 'text-[#4B69FF]',
    borderClass: 'border-[#4B69FF]/50',
    capsule: 'radial-gradient(circle at 50% 35%, rgba(75,105,255,0.30), transparent 70%)',
    gradient: 'linear-gradient(135deg, rgba(75,105,255,0.40) 0%, rgba(75,105,255,0.10) 100%)',
  },
  epic: {
    label: 'Эпическое',
    color: '#8847FF',
    glow: '0 0 22px -3px rgba(136,71,255,0.60)',
    textClass: 'text-[#9D6BFF]',
    borderClass: 'border-[#8847FF]/55',
    capsule: 'radial-gradient(circle at 50% 35%, rgba(136,71,255,0.34), transparent 70%)',
    gradient: 'linear-gradient(135deg, rgba(136,71,255,0.45) 0%, rgba(136,71,255,0.12) 100%)',
  },
  legendary: {
    label: 'Легендарное',
    color: '#E8B54D',
    glow: '0 0 28px -2px rgba(232,181,77,0.45)',
    textClass: 'text-[#E8B54D]',
    borderClass: 'border-[#E8B54D]/55',
    capsule: 'radial-gradient(circle at 50% 35%, rgba(232,181,77,0.28), transparent 70%)',
    gradient: 'linear-gradient(135deg, rgba(232,181,77,0.36) 0%, rgba(232,181,77,0.09) 100%)',
  },
  mythic: {
    label: 'Мифическое',
    color: '#E0564F',
    glow: '0 0 30px -3px rgba(224,86,79,0.45)',
    textClass: 'text-[#E0564F]',
    borderClass: 'border-[#E0564F]/60',
    capsule: 'radial-gradient(circle at 50% 35%, rgba(224,86,79,0.30), transparent 70%)',
    gradient: 'linear-gradient(135deg, #8847FF 0%, #E0564F 55%, #E8B54D 100%)',
  },
}

export function rarityToken(rarity: Rarity | null | undefined): RarityToken {
  return RARITY_TOKENS[rarity ?? 'common']
}

/**
 * Премиум-градиент вершины (mythic / Telegram Gift / джекпот): фиолетовый →
 * красный → золото. Самый «дорогой» акцент платформы.
 */
export const MYTHIC_GRADIENT =
  'linear-gradient(135deg, #8847FF 0%, #EB4B4B 55%, #FFD700 100%)'
