import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { giftInventoryItem } from '@/lib/inventory-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/inventory/transfer — «Передать игроку Возни»: ВНУТРЕННЯЯ передача
 * предмета другому игроку Возни (без реальной Telegram-доставки).
 *
 * Отличается от /api/inventory/gift (та шлёт настоящий Telegram Gift): здесь
 * подарок ещё не выдан, поэтому передача = переназначение получателя
 * (recipient_user_id). Новый владелец сам решит судьбу (Оставить / Вывести /
 * Продать / Подарить / Передать). Универсально для Gifts / Premium / товаров.
 *
 * Отправитель — из ПОДПИСАННОЙ сессии. Body: { deliveryKey, recipient }.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'inventory_unavailable' }, { status: 503 })
  }

  let body: { deliveryKey?: string; recipient?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const deliveryKey = (body.deliveryKey ?? '').toString().trim()
  const recipient = (body.recipient ?? '').toString().trim()
  if (!deliveryKey || deliveryKey.length > 64) {
    return NextResponse.json({ error: 'invalid_delivery_key' }, { status: 400 })
  }
  if (!recipient || recipient.length > 64) {
    return NextResponse.json({ error: 'invalid_recipient' }, { status: 400 })
  }

  try {
    const r = await giftInventoryItem(session.uid, deliveryKey, recipient)
    const statusMap: Record<string, number> = {
      ok: 200,
      not_found: 404,
      not_pending: 409,
      recipient_not_found: 404,
      self_transfer: 400,
    }
    return NextResponse.json(
      {
        status: r.status,
        giftCode: r.giftCode ?? null,
        recipientUsername: r.recipientUsername ?? null,
      },
      { status: statusMap[r.status] ?? 200 },
    )
  } catch (err) {
    console.error('inventory/transfer failed', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
