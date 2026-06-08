import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { getInventory } from '@/lib/inventory-list'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/inventory — the signed-in player's own inventory.
 *
 * Read-only. Returns stack items (cosmetics / keys / collectibles) and pending
 * Telegram Gifts / Premium as owned objects the player can Keep / Sell /
 * Withdraw. Owner comes from the SIGNED session (session.uid), never from the
 * request, so you can only read your own inventory.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'inventory_unavailable' }, { status: 503 })
  }

  try {
    const view = await getInventory(session.uid)
    return NextResponse.json(view, { status: 200 })
  } catch (err) {
    console.error('inventory read failed', err)
    return NextResponse.json({ error: 'inventory_error' }, { status: 500 })
  }
}
