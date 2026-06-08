import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { createGiftClaimLink } from '@/lib/inventory-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/inventory/gift-link — «Подарить по ссылке» (P0, Release 2.2).
 *
 * Для подарка тому, кто ещё НЕ запускал бота: sendGift умеет слать только по
 * user_id, поэтому незнакомцу напрямую отправить нельзя. Вместо этого помечаем
 * pending-доставку claim-токеном и отдаём ссылку
 * ``https://t.me/<bot>?start=gift_<token>``. Получатель открывает её, запускает
 * бота и забирает РЕАЛЬНЫЙ подарок (бот: /start gift_<token> → claim).
 *
 * Отправитель — из ПОДПИСАННОЙ сессии. Body: { deliveryKey }.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'inventory_unavailable' }, { status: 503 })
  }

  // Имя бота для сборки t.me-ссылки. Без него ссылку не построить.
  const botUsername = (
    process.env.NEXT_PUBLIC_BOT_USERNAME ||
    process.env.BOT_USERNAME ||
    ''
  )
    .trim()
    .replace(/^@/, '')
  if (!botUsername) {
    return NextResponse.json({ error: 'bot_username_not_configured' }, { status: 503 })
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
    const r = await createGiftClaimLink(session.uid, deliveryKey)
    if (r.status === 'ok' && r.claimToken) {
      const url = `https://t.me/${botUsername}?start=gift_${r.claimToken}`
      return NextResponse.json({ status: 'ok', url }, { status: 200 })
    }
    const map: Record<string, number> = { not_found: 404, not_pending: 409 }
    return NextResponse.json({ status: r.status }, { status: map[r.status] ?? 502 })
  } catch (err) {
    console.error('inventory/gift-link failed', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
