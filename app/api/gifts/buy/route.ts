import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { buyGift } from '@/lib/shop-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/gifts/buy — купить подарок/Premium за ешки прямо с сайта (P4).
 *
 * Покупка выполняется НА СТОРОНЕ САЙТА, но против ОБЩЕЙ с ботом базы и в одной
 * транзакции (lib/shop-actions.buyGift — точный порт buy_gift бота). После
 * покупки подарок попадает в инвентарь как pending: игрок сам решает —
 * хранить / продать / вывести. Реальную выдачу через Telegram делает бот.
 *
 * Покупателя берём из ПОДПИСАННОЙ сессии (session.uid), а НЕ из тела запроса.
 *
 * Тело запроса: { code: string }.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'shop_unavailable' }, { status: 503 })
  }

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const code = (body.code ?? '').toString().trim()
  if (!code || code.length > 64) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }

  try {
    const r = await buyGift(session.uid, code)
    const statusMap: Record<string, number> = {
      ok: 200,
      not_found: 404,
      inactive: 409,
      sold_out: 409,
      not_enough: 402,
    }
    return NextResponse.json(
      {
        status: r.status,
        giftName: r.giftName ?? null,
        price: r.price ?? null,
        balance: r.balance ?? null,
        deliveryKey: r.deliveryKey ?? null,
      },
      { status: statusMap[r.status] ?? 200 },
    )
  } catch (err) {
    console.error('gifts/buy failed', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
