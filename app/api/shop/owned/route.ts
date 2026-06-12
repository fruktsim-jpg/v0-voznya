import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { getOwnedGiftCodes } from '@/lib/shop-catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/shop/owned — gift codes the signed-in player already holds as pending
 * (so the Shop can mark "уже в инвентаре"). Owner is the SIGNED session, never
 * the request. Read-only. Returns { codes: [] } for guests / unmigrated DB so
 * the Shop simply shows no ownership hints.
 */
export async function GET() {
  const session = await getSession()
  if (!session || !isDbConfigured()) {
    return NextResponse.json({ codes: [] }, { status: 200 })
  }
  try {
    const codes = await getOwnedGiftCodes(session.uid)
    return NextResponse.json({ codes }, { status: 200 })
  } catch {
    return NextResponse.json({ codes: [] }, { status: 200 })
  }
}
