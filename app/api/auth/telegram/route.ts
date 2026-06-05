import { NextRequest, NextResponse } from 'next/server'
import { verifyLoginWidget } from '@/lib/auth/telegram'
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Telegram Login Widget callback (redirect mode).
 *
 * The widget redirects here with the signed login payload. We verify the HMAC,
 * issue a stateless session cookie and redirect to the user's profile.
 *
 * IMPORTANT: this route never writes to the database. The bot is the single
 * source of truth for users. If the verified user has never played, the profile
 * page itself shows a friendly "not registered yet" message.
 */
export async function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken || !process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL('/?auth=unconfigured', request.url))
  }

  const params: Record<string, string> = {}
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const verified = verifyLoginWidget(params, botToken)
  if (!verified) {
    return NextResponse.redirect(new URL('/?auth=failed', request.url))
  }

  const token = await createSessionToken({
    uid: verified.userId,
    username: verified.data.username ?? null,
    firstName: verified.data.first_name ?? null,
  })

  const response = NextResponse.redirect(
    new URL(`/profile/${verified.userId}`, request.url),
  )
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions())
  return response
}
