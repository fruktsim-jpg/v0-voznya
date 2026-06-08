import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { sellInventoryItem } from '@/lib/inventory-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/inventory/sell — sell a pending inventory item for eshki (P5).
 *
 * Atomic against the shared DB (faithful port of the bot's sell_gift): credits
 * floor(full_value × ITEM_SELL_RATE), flips the delivery to cancelled, frees
 * the shop pool reservation for purchases. Owner is the SIGNED session, never
 * the body — you can only sell your OWN item.
 *
 * Body: { deliveryKey: string }.
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
    const r = await sellInventoryItem(session.uid, deliveryKey)
    const statusMap: Record<string, number> = {
      ok: 200,
      not_found: 404,
      not_pending: 409,
      no_value: 409,
    }
    return NextResponse.json(
      {
        status: r.status,
        amount: r.amount ?? null,
        balance: r.balance ?? null,
        giftCode: r.giftCode ?? null,
      },
      { status: statusMap[r.status] ?? 200 },
    )
  } catch (err) {
    console.error('inventory/sell failed', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
