import { NextRequest, NextResponse } from 'next/server'
import {
  getClearedCookieOptions,
  getSessionCookieName,
} from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Clears the session cookie. Accepts POST (from UI) and GET (direct link). */
function clearSession(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL('/', request.url))
  response.cookies.set(getSessionCookieName(), '', getClearedCookieOptions())
  return response
}

export async function POST(request: NextRequest) {
  return clearSession(request)
}

export async function GET(request: NextRequest) {
  return clearSession(request)
}
