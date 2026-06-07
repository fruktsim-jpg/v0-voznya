import { NextRequest, NextResponse } from 'next/server'
import { verifyLoginWidget } from '@/lib/auth/telegram'
import { saveUserPhoto } from '@/lib/queries'
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
 * The bot remains the single source of truth for users: this route never
 * INSERTS. The only write is a narrow, cosmetic UPDATE of `users.photo_url`
 * (the avatar URL Telegram includes in the verified login payload), and only
 * for a row that already exists. If the verified user has never played, the
 * update touches 0 rows and the profile page shows "not registered yet".
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

  // Cosmetic-only: persist the Telegram avatar URL for an existing player.
  // UPDATE-only and self-guarded (never throws into the login path).
  await saveUserPhoto(verified.userId, verified.data.photo_url ?? null)

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
