import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { withdrawInventoryItem } from '@/lib/inventory-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/inventory/withdraw — request delivery of a pending item (P2).
 *
 * The item is already a pending gift_transaction (created at case open / shop
 * buy). Withdraw confirms intent: the row stays pending so the bot's
 * auto-delivery (deliver_gift) or manual /gifts_done picks it up. We only stamp
 * meta.withdraw_requested so the delivery queue is auditable. Owner is the
 * SIGNED session, never the body.
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
    const r = await withdrawInventoryItem(session.uid, deliveryKey)
    const statusMap: Record<string, number> = {
      ok: 200,
      not_found: 404,
      not_pending: 409,
    }
    return NextResponse.json(
      { status: r.status, giftCode: r.giftCode ?? null },
      { status: statusMap[r.status] ?? 200 },
    )
  } catch (err) {
    console.error('inventory/withdraw failed', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
