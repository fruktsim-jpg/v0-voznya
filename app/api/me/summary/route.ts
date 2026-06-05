import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getUserSummary } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Read-only summary for the header user menu (display name, ешки balance,
 * leaderboard rank). Requires a valid session. NEVER writes — the bot owns the
 * `users` table. Returns `registered: false` when the logged-in user has no row
 * in the game yet, and degrades to nulls when the DB is unavailable so the menu
 * can still show the profile/logout actions.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }

  try {
    const summary = await getUserSummary(session.uid)
    return NextResponse.json(
      {
        authenticated: true,
        userId: session.uid,
        registered: summary.registered,
        name: summary.name ?? session.firstName ?? session.username ?? null,
        balance: summary.balance,
        rank: summary.rank,
      },
      { status: 200 },
    )
  } catch {
    // DB unavailable — still report auth state and the name from the session.
    return NextResponse.json(
      {
        authenticated: true,
        userId: session.uid,
        registered: false,
        name: session.firstName ?? session.username ?? null,
        balance: null,
        rank: null,
      },
      { status: 200 },
    )
  }
}
