import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForIdToken,
  getOidcConfig,
  subToUserId,
  verifyIdToken,
} from '@/lib/auth/oidc'
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Telegram OIDC callback (Authorization Code + PKCE).
 *
 * Validates the `state` against the cookie set by /start, exchanges `code` for
 * an id_token, verifies its signature/issuer/audience/nonce, maps the `sub`
 * claim to the Telegram user id and issues the SAME Возня session cookie used
 * by the classic widget. JWT/session/cookie shape is unchanged.
 *
 * IMPORTANT: never writes to the database — the bot owns users. If the verified
 * user has never played, the profile page shows the "not registered" hint.
 */
function clearTempCookies(res: NextResponse): NextResponse {
  const expired = { path: '/', maxAge: 0 }
  res.cookies.set('tg_oidc_state', '', expired)
  res.cookies.set('tg_oidc_nonce', '', expired)
  res.cookies.set('tg_oidc_verifier', '', expired)
  return res
}

function fail(request: NextRequest, reason: string): NextResponse {
  return clearTempCookies(
    NextResponse.redirect(new URL(`/?auth=${reason}`, request.url)),
  )
}

export async function GET(request: NextRequest) {
  const config = getOidcConfig()
  if (!config || !process.env.AUTH_SECRET) {
    return fail(request, 'oidc_unconfigured')
  }

  const url = request.nextUrl
  const error = url.searchParams.get('error')
  if (error) {
    return fail(request, 'denied')
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) {
    return fail(request, 'failed')
  }

  // CSRF protection: state must match the cookie planted by /start.
  const expectedState = request.cookies.get('tg_oidc_state')?.value
  const nonce = request.cookies.get('tg_oidc_nonce')?.value
  const codeVerifier = request.cookies.get('tg_oidc_verifier')?.value
  if (!expectedState || state !== expectedState || !codeVerifier) {
    return fail(request, 'state_mismatch')
  }

  let userId: number | null = null
  let claims: Awaited<ReturnType<typeof verifyIdToken>> | null = null
  try {
    const idToken = await exchangeCodeForIdToken({ code, codeVerifier, config })
    claims = await verifyIdToken(idToken, { clientId: config.clientId, nonce })
    userId = subToUserId(claims.sub)
  } catch {
    return fail(request, 'verify_failed')
  }

  // The whole ecosystem keys on the numeric Telegram id. If sub isn't that
  // number we refuse rather than guess — the classic widget remains available.
  if (userId === null) {
    return fail(request, 'sub_unmapped')
  }

  const token = await createSessionToken({
    uid: userId,
    username: claims.preferredUsername ?? null,
    firstName: claims.name ?? null,
  })

  const response = clearTempCookies(
    NextResponse.redirect(new URL(`/profile/${userId}`, request.url)),
  )
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions())
  return response
}
