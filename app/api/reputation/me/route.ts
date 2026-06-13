import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getMyReputationStanding } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * The viewer's own reputation standing ("Где я?") for the reputation top.
 * Same reputation_entries aggregation as the board — position, total, and gap
 * to the next player above. { standing: null } when not logged in / not on the
 * board, so the UI hides the footer.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ standing: null })
    const standing = await getMyReputationStanding(session.uid)
    return NextResponse.json({ standing })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
