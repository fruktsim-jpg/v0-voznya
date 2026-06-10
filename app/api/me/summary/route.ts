import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getAdminSession } from '@/lib/auth/admin-session'
import { getIdentityProgression } from '@/lib/identity'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Read-only identity/progression summary shared by the header user menu and the
 * persistent PlayerContextBar (VOZNYA REDESIGN — Home Hub). Requires a valid
 * session. NEVER writes — the bot owns the `users` table.
 *
 * It returns the SAME identity/progression slice the Home hero uses
 * (`getIdentityProgression`), so the shell bar and Home can never drift. The
 * original fields (name/balance/rank/photoUrl/registered) are preserved for
 * backward compatibility; progression fields (mmr/rank tier/season/division/
 * streak/reputation/family) are additive. Degrades to nulls when the DB is
 * unavailable so the menu can still show profile/logout actions.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }

  try {
    // Admin role drives the "Админка" entry in the header menu. Read-only.
    // Degrades to false on any error (e.g. missing admin_roles table).
    const adminSession = await getAdminSession().catch(() => null)
    const identity = await getIdentityProgression(session.uid)
    return NextResponse.json(
      {
        authenticated: true,
        userId: session.uid,
        registered: identity.registered,
        name: identity.name ?? session.firstName ?? session.username ?? null,
        balance: identity.balance,
        rank: identity.rank,
        photoUrl: identity.photoUrl,
        isAdmin: !!adminSession,
        // Progression (read-only, additive). Shared with the Home hero.
        mmr: identity.mmr,
        mmrRank: identity.mmrRank,
        reputation: identity.reputation,
        streak: identity.streak,
        season: identity.season,
        family: identity.family,
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
        isAdmin: false,
      },
      { status: 200 },
    )
  }

}
