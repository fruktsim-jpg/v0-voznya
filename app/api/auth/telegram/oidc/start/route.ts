import { NextRequest, NextResponse } from 'next/server'
import {
  buildAuthorizationUrl,
  codeChallengeS256,
  getOidcConfig,
  randomUrlSafe,
} from '@/lib/auth/oidc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Begin the Telegram OIDC Authorization Code (+ PKCE) flow.
 *
 * Generates state, nonce and a PKCE code_verifier, stashes them in short-lived
 * httpOnly cookies, then redirects the browser to Telegram's authorization
 * endpoint. The callback route validates everything and issues the normal
 * Возня session. No DB access here.
 *
 * If OIDC isn't configured, redirect home with a flag — the UI falls back to the
 * classic Login Widget.
 */
const TEN_MINUTES = 60 * 10

function tempCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TEN_MINUTES,
  }
}

export async function GET(request: NextRequest) {
  const config = getOidcConfig()
  if (!config) {
    return NextResponse.redirect(new URL('/?auth=oidc_unconfigured', request.url))
  }

  const state = randomUrlSafe()
  const nonce = randomUrlSafe()
  const codeVerifier = randomUrlSafe(48)
  const codeChallenge = codeChallengeS256(codeVerifier)

  const authUrl = buildAuthorizationUrl({ config, state, nonce, codeChallenge })

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('tg_oidc_state', state, tempCookieOptions())
  response.cookies.set('tg_oidc_nonce', nonce, tempCookieOptions())
  response.cookies.set('tg_oidc_verifier', codeVerifier, tempCookieOptions())
  return response
}
