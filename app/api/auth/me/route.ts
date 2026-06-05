import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { userExists } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Current session info.
 *
 * Kept intentionally for future use (shop, Mini App, inventory, account
 * settings). Returns the authenticated Telegram user id and whether that user
 * already exists in the game (`registered`). Never creates or mutates anything.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }

  let registered = false
  try {
    registered = await userExists(session.uid)
  } catch {
    // DB unavailable — report auth state honestly, leave registered unknown=false.
    registered = false
  }

  return NextResponse.json(
    {
      authenticated: true,
      userId: session.uid,
      username: session.username ?? null,
      firstName: session.firstName ?? null,
      registered,
    },
    { status: 200 },
  )
}
