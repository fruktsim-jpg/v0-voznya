import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured } from '@/lib/db'
import { getPlayerProgress } from '@/lib/player-progress'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Personal progress for the Guide's PERSONAL layer (which achievements have I
 * unlocked, what's my title). Requires a valid session; read-only. Degrades to
 * `{ authenticated: false }` for guests and `{ progress: null }` on DB trouble
 * so the Guide stays fully usable as a static catalog either way.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ authenticated: true, progress: null }, { status: 200 })
  }
  try {
    const progress = await getPlayerProgress(session.uid)
    return NextResponse.json({ authenticated: true, progress }, { status: 200 })
  } catch {
    return NextResponse.json({ authenticated: true, progress: null }, { status: 200 })
  }
}
