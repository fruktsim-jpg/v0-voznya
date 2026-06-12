// Case opening UX helpers (Stage 3) — CLIENT-safe types + reward mapping.
//
// This is the response→reward mapping for the case reveal: it shapes the
// server's REAL /api/cases/open result into the data the reveal UI renders. The
// opening itself is UNCHANGED — the bot's open_case stays the single writer
// (CSPRNG, balance, ledger, gift pending pipeline). No RNG here.

import { currencyRewardRarity, normalizeRarity, RARITY_ORDER, type Rarity } from '@/lib/rarity'
import type { ItemClass } from '@/lib/item-art/model'

const fmt = (n: number) => n.toLocaleString('ru-RU')

/**
 * Reward kind → canonical ItemClass, so the acquisition path (reel, reveal,
 * celebration) can resolve the SAME real manifest art the storefront/inventory
 * show. Currency has no item art (it renders its glyph), so it maps to null.
 * Premium gifts are detected by code and promoted to the `premium` class.
 */
export function rewardKindClass(
  rewardKind: string | null | undefined,
  rewardItemCode?: string | null,
): ItemClass | null {
  if (rewardKind === 'tg_gift') {
    return rewardItemCode && /premium/i.test(rewardItemCode) ? 'premium' : 'gift'
  }
  if (rewardKind === 'item') return 'collectible'
  return null // currency (and unknown) → no item art, glyph only
}

export type OpenResponse = {
  status?: string
  caseName?: string
  rewardKind?: string
  rewardItemCode?: string | null
  rewardItemName?: string | null
  rewardRarity?: string | null
  amount?: number | null
  qty?: number
  isJackpot?: boolean
  balance?: number | null
  deliveryKey?: string | null
  starCost?: number | null
  value?: number | null
  sellAmount?: number | null
  error?: string
}

export type ReelCell = {
  rarity: Rarity
  icon: string
  label: string
  /** Real item/gift code → resolves manifest art in the reel (null for currency). */
  code?: string | null
  /** Canonical class for art resolution (null for currency → glyph). */
  itemClass?: ItemClass | null
}

export type WonReward = {
  kind: string
  rarity: Rarity
  icon: string
  title: string
  subtitle: string
  qty: number
  isJackpot: boolean
  isPremium: boolean
  starCost: number | null
  value: number | null
  balance: number | null
  // For tg_gift — pending delivery key + sale amount (Keep / Sell / Withdraw).
  deliveryKey: string | null
  sellAmount: number | null
  /** Real item/gift code so the reveal resolves the actual authored art. */
  code: string | null
  /** Canonical class for art resolution (null for currency → glyph fallback). */
  itemClass: ItemClass | null
}

export function kindIcon(kind: string, isJackpot: boolean): string {
  if (kind === 'tg_gift') return '🎁'
  if (kind === 'currency') return isJackpot ? '💎' : '💰'
  return '🎖️'
}

/** True when a rarity should get the prestige treatment in the reveal. */
export function isHighTier(rarity: Rarity): boolean {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf('epic')
}

/** Human message for a failed / non-ok open (faithful port). */
export function failureMessage(httpStatus: number, data: OpenResponse): string {
  if (httpStatus === 401) return 'Войди через Telegram, чтобы открывать кейсы.'
  if (
    data.error === 'cases_open_unavailable' ||
    data.error === 'bot_unreachable' ||
    httpStatus === 503 ||
    httpStatus === 502
  )
    return 'Открытие временно недоступно. Попробуй ещё раз через пару секунд.'
  switch (data.status) {
    case 'not_enough':
      return 'Не хватает ешек на этот кейс.'
    case 'inactive':
      return 'Кейс сейчас недоступен.'
    case 'no_key':
      return 'Нужен ключ для этого кейса.'
    case 'not_found':
      return 'Кейс не найден.'
    default:
      return 'Не получилось открыть кейс. Попробуй позже.'
  }
}

/** Server response → reveal card model (faithful port of toWon()). */
export function toWonReward(data: OpenResponse): WonReward {
  const kind = data.rewardKind ?? 'currency'
  const isJackpot = Boolean(data.isJackpot)
  const isPremium = kind === 'tg_gift' && /premium/i.test(data.rewardItemCode ?? '')
  const code = data.rewardItemCode ?? null
  const itemClass = rewardKindClass(kind, code)

  if (kind === 'currency') {
    const amount = data.amount ?? 0
    return {
      kind,
      rarity: isJackpot ? 'legendary' : currencyRewardRarity(amount),
      icon: isJackpot ? '💎' : '💰',
      title: `${fmt(amount)} ешек`,
      subtitle: data.balance != null ? `Баланс: ${fmt(data.balance)}` : '',
      qty: 1,
      isJackpot,
      isPremium: false,
      starCost: null,
      value: amount,
      balance: data.balance ?? null,
      deliveryKey: null,
      sellAmount: null,
      code: null,
      itemClass: null,
    }
  }

  if (kind === 'tg_gift') {
    return {
      kind,
      rarity: isJackpot || isPremium ? 'mythic' : 'legendary',
      icon: '🎁',
      title: data.rewardItemName ?? data.rewardItemCode ?? 'Подарок',
      subtitle: '🎁 Подарок в инвентаре — реши его судьбу ниже.',
      qty: 1,
      isJackpot,
      isPremium,
      starCost: data.starCost ?? null,
      value: data.value ?? null,
      balance: data.balance ?? null,
      deliveryKey: data.deliveryKey ?? null,
      sellAmount: data.sellAmount ?? null,
      code,
      itemClass,
    }
  }

  const qty = data.qty && data.qty > 1 ? data.qty : 1
  return {
    kind,
    rarity: normalizeRarity(data.rewardRarity),
    icon: '🎖️',
    title: data.rewardItemName ?? data.rewardItemCode ?? 'Предмет',
    subtitle: '',
    qty,
    isJackpot,
    isPremium: false,
    starCost: null,
    value: data.value ?? null,
    balance: data.balance ?? null,
    deliveryKey: null,
    sellAmount: null,
    code,
    itemClass,
  }
}
