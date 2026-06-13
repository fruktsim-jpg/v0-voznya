import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getMyWealthStanding } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * The viewer's own wealth standing ("Где я?") for the top-rich leaderboard.
 * Same `users.balance` data as the top list — just the position, total, and gap
 * to the next player above. Returns { standing: null } when not logged in or no
 * row, so the UI simply hides the "you are here" footer.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ standing: null })
    const standing = await getMyWealthStanding(session.uid)
    return NextResponse.json({ standing })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
