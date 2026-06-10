'use client'

// Shared gift-delivery actions (Stage 3 review fix) — SINGLE source of truth for
// the Sell / Withdraw network calls + status→message mapping used by BOTH the
// inventory inspect sheet (GiftActions) and the case reveal (GiftChoice).
//
// Why: the two surfaces previously duplicated this logic and had already drifted
// (the reveal collapsed `not_pending` / `no_value` into a generic error). One
// helper keeps the frozen contract (endpoints, payload `{ deliveryKey }`, status
// handling, notifyBalanceChanged) consistent wherever a gift's fate is decided.
//
// Endpoints are UNCHANGED: POST /api/inventory/sell, POST /api/inventory/withdraw.

import { notifyBalanceChanged } from '@/lib/balance-events'

export type SellResult =
  | { ok: true; amount: number | null }
  | { ok: false; message: string }

export type WithdrawResult =
  | { ok: true; message: string; refunded?: boolean }
  | { ok: false; message: string }

async function postDelivery(path: string, deliveryKey: string) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deliveryKey }),
  })
  const data = await res.json().catch(() => ({} as Record<string, unknown>))
  return { res, data: data as Record<string, unknown> }
}

/** Sell a pending gift for ешки. Fires notifyBalanceChanged() on success. */
export async function sellGift(deliveryKey: string): Promise<SellResult> {
  try {
    const { res, data } = await postDelivery('/api/inventory/sell', deliveryKey)
    if (res.ok && data.status === 'ok') {
      notifyBalanceChanged()
      return { ok: true, amount: typeof data.amount === 'number' ? data.amount : null }
    }
    return {
      ok: false,
      message:
        data.status === 'not_pending'
          ? 'Предмет уже обработан.'
          : data.status === 'no_value'
            ? 'Стоимость неизвестна.'
            : 'Не получилось продать.',
    }
  } catch {
    return { ok: false, message: 'Сеть недоступна.' }
  }
}

/**
 * Request withdrawal / Premium activation for a pending gift. Mirrors the
 * inventory sheet's status handling exactly. Fires notifyBalanceChanged() when a
 * cancellation refunds ешки.
 */
export async function withdrawGift(
  deliveryKey: string,
  isPremium: boolean,
): Promise<WithdrawResult> {
  try {
    const { res, data } = await postDelivery('/api/inventory/withdraw', deliveryKey)
    if (res.ok || res.status === 202) {
      if (data.status === 'delivered') {
        return {
          ok: true,
          message: isPremium ? '⭐ Premium активирован!' : '✅ Подарок пришёл в Telegram!',
        }
      }
      if (data.status === 'cancelled') {
        const refunded = Boolean(data.refunded)
        if (refunded) notifyBalanceChanged()
        return {
          ok: true,
          refunded,
          message: refunded ? '↩️ Выдать не вышло — ешки возвращены.' : 'Отменено.',
        }
      }
      if (data.status === 'pending' || data.status === 'queued') {
        return { ok: true, message: '⏳ В очереди на выдачу — придёт в Telegram.' }
      }
    }
    return {
      ok: false,
      message: data.status === 'not_pending' ? 'Предмет уже обработан.' : 'Не получилось.',
    }
  } catch {
    return { ok: false, message: 'Сеть недоступна.' }
  }
}
