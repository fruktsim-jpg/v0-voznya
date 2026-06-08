import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { withdrawInventoryItem } from '@/lib/inventory-actions'
import { requestGiftDelivery } from '@/lib/bot-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/inventory/withdraw — вывести предмет (P2, Release 2.2).
 *
 * АВТО-ВЫДАЧА — основной сценарий (aiogram 3.28+). Порядок:
 *   1) просим бота выдать СРАЗУ (requestGiftDelivery → /internal/gifts/deliver):
 *        completed  → выдан, доставка closed (исчезнет из активного инвентаря);
 *        pending    → временная ошибка Telegram, повторит фоновый воркер;
 *        cancelled  → постоянная ошибка, бот оформил возврат стоимости;
 *   2) если бот недоступен (unreachable: нет конфига/сеть) — ставим флаг
 *      meta.withdraw_requested, чтобы воркер выдал позже (запасной путь).
 *
 * Владелец — из ПОДПИСАННОЙ сессии, не из тела. Body: { deliveryKey: string }.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'inventory_unavailable' }, { status: 503 })
  }

  let body: { deliveryKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const deliveryKey = (body.deliveryKey ?? '').toString().trim()
  if (!deliveryKey || deliveryKey.length > 64) {
    return NextResponse.json({ error: 'invalid_delivery_key' }, { status: 400 })
  }

  try {
    // 1) ОСНОВНОЙ путь: бот пытается выдать сразу.
    const d = await requestGiftDelivery(session.uid, deliveryKey)
    if (d.status === 'completed') {
      return NextResponse.json({ status: 'delivered' }, { status: 200 })
    }
    if (d.status === 'pending') {
      // Временная ошибка Telegram — бот оставил pending, воркер повторит. На
      // всякий случай помечаем заявку (флаг для воркера), не валим запрос.
      await withdrawInventoryItem(session.uid, deliveryKey).catch(() => {})
      return NextResponse.json({ status: 'pending' }, { status: 202 })
    }
    if (d.status === 'cancelled') {
      return NextResponse.json(
        { status: 'cancelled', refunded: Boolean(d.refunded) },
        { status: 200 },
      )
    }
    if (d.status === 'not_found') {
      return NextResponse.json({ status: 'not_found' }, { status: 404 })
    }
    if (d.status === 'not_pending') {
      return NextResponse.json({ status: 'not_pending' }, { status: 409 })
    }

    // 2) ЗАПАСНОЙ путь: бот недоступен (unreachable) или непонятный ответ —
    //    ставим флаг вывода, выдаст фоновый воркер.
    const r = await withdrawInventoryItem(session.uid, deliveryKey)
    const statusMap: Record<string, number> = {
      ok: 202, // принято в очередь
      not_found: 404,
      not_pending: 409,
    }
    return NextResponse.json(
      { status: r.status === 'ok' ? 'queued' : r.status, giftCode: r.giftCode ?? null },
      { status: statusMap[r.status] ?? 202 },
    )
  } catch (err) {
    console.error('inventory/withdraw failed', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}


