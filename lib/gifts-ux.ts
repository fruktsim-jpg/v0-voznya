import type { Rarity } from '@/lib/rarity'

/**
 * Gifts UX helpers (VOZNYA EXPERIENCE V3 — поверхность №4). Превращает каталог
 * Telegram Gifts в КОЛЛЕКЦИОННУЮ систему: редкость по цене в ешках + признак
 * лимитированности (по запасу). Никаких новых данных/таблиц — только производное
 * над существующими полями gift_catalog (price_eshki, stock). Чистые функции.
 */

/**
 * Редкость подарка по цене в ешках (дороже → престижнее), с поднятием тира для
 * лимитированных (ограниченный запас = коллекционная ценность).
 */
export function giftRarity(priceEshki: number, opts?: { limited?: boolean }): Rarity {
  let base: Rarity =
    priceEshki >= 25000
      ? 'legendary'
      : priceEshki >= 8000
        ? 'epic'
        : priceEshki >= 2500
          ? 'rare'
          : priceEshki >= 500
            ? 'uncommon'
            : 'common'

  // Лимитка ценится выше: поднимаем на тир, но не ниже rare.
  if (opts?.limited) {
    const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
    const bumped = order[Math.min(order.indexOf(base) + 1, order.length - 1)]
    base = order.indexOf(bumped) >= order.indexOf('rare') ? bumped : 'rare'
  }
  return base
}

/** Эмодзи-иконка подарка по коду/мете (без новых данных — простая эвристика). */
export function giftIcon(code: string, metaEmoji?: string | null): string {
  if (metaEmoji) return metaEmoji
  const c = code.toLowerCase()
  if (c.includes('premium')) return '⭐'
  if (c.includes('heart') || c.includes('love')) return '❤️'
  if (c.includes('rose') || c.includes('bouquet') || c.includes('flower')) return '🌹'
  if (c.includes('ring')) return '💍'
  if (c.includes('diamond')) return '💎'
  if (c.includes('crown') || c.includes('king')) return '👑'
  if (c.includes('rocket')) return '🚀'
  if (c.includes('cake') || c.includes('birthday')) return '🎂'
  if (c.includes('champagne')) return '🍾'
  if (c.includes('cup') || c.includes('trophy')) return '🏆'
  if (c.includes('gem')) return '💎'
  // Сезонные collectible-мишки и ёлка (новый каталог, Release 2.2).
  if (c.includes('tree')) return '🎄'
  if (c.includes('clown')) return '🤡'
  if (c.includes('bear')) return '🧸'
  if (c.includes('box')) return '🎁'
  if (c.includes('star')) return '⭐'
  return '🎁'

}
