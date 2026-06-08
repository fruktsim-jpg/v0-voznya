import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { requestGiftDelivery } from '@/lib/bot-client'
import { queueGiftToFriend } from '@/lib/inventory-actions'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/inventory/gift — «Подарить другу»: РЕАЛЬНАЯ Telegram-доставка
 * подарка другому пользователю по @username или Telegram ID (P0, Release 2.2).
 *
 * Это НЕ внутренняя передача предмета внутри Возни (та — /api/inventory/transfer).
 * Здесь бот реально отправляет Telegram Gift получателю через sendGift. Так как
 * sendGift требует числовой user_id, бот резолвит @username по своей таблице
 * users — поэтому получатель должен был хотя бы раз запускать бота.
 *
 * Исходы (от бота):
 *   completed         → подарок отправлен другу, предмет исчезает из инвентаря;
 *   pending           → временная ошибка, повторит воркер (предмет остаётся);
 *   cancelled         → постоянная ошибка + возврат стоимости плательщику;
 *   recipient_not_found / self_transfer → ошибка ввода;
 *   unreachable       → бот недоступен (нет конфига/сеть) — просим повторить.
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
    const d = await requestGiftDelivery(session.uid, deliveryKey, recipient)
    if (d.status === 'completed') {
      return NextResponse.json({ status: 'delivered' }, { status: 200 })
    }
    if (d.status === 'pending') {
      return NextResponse.json({ status: 'pending' }, { status: 202 })
    }
    if (d.status === 'cancelled') {
      return NextResponse.json(
        { status: 'cancelled', refunded: Boolean(d.refunded) },
        { status: 200 },
      )
    }
    if (d.status === 'unreachable') {
      // Бот недоступен (нет конфига/сеть) — НЕ тупик: ставим в очередь с
      // получателем, фоновый воркер бота отправит реальный подарок другу.
      const q = await queueGiftToFriend(session.uid, deliveryKey, recipient)
      if (q.status === 'ok') {
        return NextResponse.json({ status: 'queued' }, { status: 202 })
      }
      const qmap: Record<string, number> = { not_found: 404, not_pending: 409 }
      return NextResponse.json({ status: q.status }, { status: qmap[q.status] ?? 502 })
    }
    const map: Record<string, number> = {
      recipient_not_found: 404,
      self_transfer: 400,
      not_found: 404,
      not_pending: 409,
    }
    return NextResponse.json({ status: d.status }, { status: map[d.status] ?? 502 })

  } catch (err) {
    console.error('inventory/gift (telegram) failed', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
