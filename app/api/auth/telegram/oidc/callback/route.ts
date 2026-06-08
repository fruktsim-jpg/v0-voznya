import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForIdToken,
  getOidcConfig,
  normalizeSub,
  verifyIdToken,
} from '@/lib/auth/oidc'
import { createLinkRequest, getUserIdBySub } from '@/lib/auth/account-link'
import { saveUserPhoto } from '@/lib/queries'

import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from '@/lib/auth/session'
import { externalUrl } from '@/lib/auth/external-origin'



export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Telegram OIDC callback (Authorization Code + PKCE).
 *
 * Validates the `state` against the cookie set by /start, exchanges `code` for
 * an id_token, and verifies its signature/issuer/audience/nonce.
 *
 * Telegram's OIDC `sub` is NOT the Telegram user id, so we resolve the real
 * users.user_id through the `account_links` table:
 *   - linked   -> issue the SAME Возня session cookie used by the classic
 *                 widget (JWT/session/cookie shape unchanged) and open the profile.
 *   - unlinked -> create a one-time link request and send the user to /link,
 *                 where they confirm ownership via the bot deep-link.
 *
 * The only DB write is the auth-only `oidc_link_requests` row (in the unlinked
 * branch). Game tables (users, balances, ...) stay read-only — the bot owns them.
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
    NextResponse.redirect(externalUrl(request, `/?auth=${reason}`)),
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

  let sub: string | null = null
  let claims: Awaited<ReturnType<typeof verifyIdToken>> | null = null
  try {
    const idToken = await exchangeCodeForIdToken({ code, codeVerifier, config })
    claims = await verifyIdToken(idToken, { clientId: config.clientId, nonce })
    sub = normalizeSub(claims.sub)
  } catch {
    return fail(request, 'verify_failed')
  }

  if (!sub) {
    return fail(request, 'sub_invalid')
  }

  // Resolve the real Telegram user id from the account_links table. The OIDC
  // sub itself is opaque and is never used as users.user_id.
  let userId: number | null = null
  try {
    userId = await getUserIdBySub(sub)
  } catch {
    return fail(request, 'db_unavailable')
  }

  // Not linked yet: create a one-time link request and send the user to /link
  // to confirm ownership through the bot deep-link. No session is issued until
  // the link is confirmed.
  if (userId === null) {
    let linkToken: string
    try {
      linkToken = await createLinkRequest(sub)
    } catch {
      return fail(request, 'db_unavailable')
    }
    return clearTempCookies(
      NextResponse.redirect(externalUrl(request, `/link?token=${linkToken}`)),
    )

  }

  // Cosmetic-only: persist the Telegram avatar (OIDC `picture` claim) for the
  // linked, existing player. UPDATE-only and self-guarded — never throws here.
  await saveUserPhoto(userId, claims.picture ?? null)

  // Linked: issue the standard session keyed on the real Telegram user id.
  const token = await createSessionToken({

    uid: userId,
    username: claims.preferredUsername ?? null,
    firstName: claims.name ?? null,
  })

  const response = clearTempCookies(
    NextResponse.redirect(externalUrl(request, `/profile/${userId}`)),
  )

  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions())
  return response
}


